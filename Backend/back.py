"""
CV Inventory OS - FastAPI Backend
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import cv2
import cv2.aruco as aruco
import numpy as np
import json
import os
import threading
import time
from typing import Optional

app = FastAPI(title="CV Inventory OS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# GLOBAL STATE
# ==========================================

class CVEngine:
    def __init__(self):
        self.vid: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.lock = threading.Lock()

        # Frame dimensions (native camera resolution)
        self.native_w = 640
        self.native_h = 480

        # Latest annotated frame (JPEG bytes)
        self.latest_frame_bytes: Optional[bytes] = None

        # Latest detected markers in NATIVE coords: [(id, cx, cy)]
        self.detected_markers: list = []

        # App state machine
        self.app_state = "IDLE"         # "IDLE" | "MAPPING_SHELF"
        self.active_shelf_id: Optional[int] = None
        self.current_polygon_points: list = []  # In NATIVE pixel coords

        # Data
        self.db_filename = "cv_inventory_db.json"
        self.full_db: dict = {"metadata": {}, "cameras": {}}
        self.global_metadata: dict = {}   # { int_id: {type, name, locked_product_id, current_shelf} }
        self.zones: list = []             # [{id, relative_polygon}]
        self.cam_tracking: dict = {}      # { int_id: {last_cx, last_cy} }
        self.cam_key: str = "0"

        # ArUco setup
        self._setup_aruco()

    # Output frame is always 1280x720 (16:9) regardless of camera native resolution.
    # This makes coordinate space identical to the frontend aspect-video container,
    # so clicks always land exactly where you clicked with no letterbox offset.
    OUTPUT_W = 1280
    OUTPUT_H = 720

    def _setup_aruco(self):
        try:
            self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_APRILTAG_36h10)
            self.parameters = aruco.DetectorParameters()
            self.detector = aruco.ArucoDetector(self.aruco_dict, self.parameters)
            self.modern_api = True
        except AttributeError:
            self.aruco_dict = aruco.Dictionary_get(aruco.DICT_APRILTAG_36h10)
            self.parameters = aruco.DetectorParameters_create()
            self.modern_api = False

    # ==========================================
    # JSON PERSISTENCE
    # ==========================================
    def read_db(self):
        if os.path.exists(self.db_filename):
            try:
                with open(self.db_filename, "r") as f:
                    self.full_db = json.load(f)
            except Exception as e:
                print(f"DB read error: {e}")
                self.full_db = {"metadata": {}, "cameras": {}}

    def write_db(self):
        self.full_db["metadata"] = {str(k): v for k, v in self.global_metadata.items()}
        self.full_db["cameras"][self.cam_key] = {
            "zones": self.zones,
            "tracking": {str(k): v for k, v in self.cam_tracking.items()},
        }
        try:
            with open(self.db_filename, "w") as f:
                json.dump(self.full_db, f, indent=4)
        except Exception as e:
            print(f"DB write error: {e}")

    def load_for_camera(self):
        self.read_db()
        self.global_metadata = {int(k): v for k, v in self.full_db.get("metadata", {}).items()}
        cam_data = self.full_db.get("cameras", {}).get(self.cam_key, {"zones": [], "tracking": {}})
        self.zones = cam_data.get("zones", [])
        self.cam_tracking = {int(k): v for k, v in cam_data.get("tracking", {}).items()}

    # ==========================================
    # CAMERA THREAD
    # ==========================================
    def start(self, cam_id: str) -> bool:
        with self.lock:
            if self.vid is not None:
                self.vid.release()

            src = int(cam_id) if cam_id.isdigit() else cam_id
            self.vid = cv2.VideoCapture(src)

            if not self.vid.isOpened():
                self.vid = None
                return False

            self.cam_key = cam_id
            # We normalise every frame to OUTPUT_W x OUTPUT_H before detection,
            # so native_w/h always reflects the output space, not the camera sensor.
            self.native_w = CVEngine.OUTPUT_W
            self.native_h = CVEngine.OUTPUT_H

            self.load_for_camera()
            self.is_running = True

        t = threading.Thread(target=self._capture_loop, daemon=True)
        t.start()
        return True

    def stop(self):
        with self.lock:
            self.is_running = False
            if self.vid:
                self.vid.release()
                self.vid = None
            self.latest_frame_bytes = None
            self.detected_markers = []
            self.app_state = "IDLE"
            self.current_polygon_points = []

    def _capture_loop(self):
        while True:
            # Check running state without holding the lock during read
            with self.lock:
                if not self.is_running or self.vid is None:
                    break
                vid = self.vid  # local ref

            ret, frame = vid.read()  # blocking call — must NOT hold lock here
            if not ret:
                time.sleep(0.05)
                continue

            annotated = self._process_frame(frame)

            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            with self.lock:
                self.latest_frame_bytes = buf.tobytes()

    # ==========================================
    # FRAME PROCESSING & ANNOTATION
    # ==========================================
    def _process_frame(self, frame: np.ndarray) -> np.ndarray:
        # Step 1: Resize to fixed 16:9 output — all coordinate math runs in this space.
        # Using INTER_LINEAR for speed; INTER_AREA gives slightly better downscale quality
        # but is slower. Swap if quality matters more than FPS.
        frame = cv2.resize(frame, (CVEngine.OUTPUT_W, CVEngine.OUTPUT_H), interpolation=cv2.INTER_LINEAR)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if self.modern_api:
            corners, ids, _ = self.detector.detectMarkers(gray)
        else:
            corners, ids, _ = aruco.detectMarkers(gray, self.aruco_dict, parameters=self.parameters)

        detected = []

        with self.lock:
            if ids is not None:
                for i in range(len(ids)):
                    m_id = int(ids[i][0])
                    m_corners = corners[i][0]
                    cx = int((m_corners[0][0] + m_corners[2][0]) / 2.0)
                    cy = int((m_corners[0][1] + m_corners[2][1]) / 2.0)
                    detected.append((m_id, cx, cy))
                    if m_id not in self.cam_tracking:
                        self.cam_tracking[m_id] = {}
                    self.cam_tracking[m_id]["last_cx"] = cx
                    self.cam_tracking[m_id]["last_cy"] = cy

            self.detected_markers = detected
            current_visible = [m for m, _, _ in detected]

            # --- Draw Shelf Zones ---
            active_shelf_polygons = {}
            for zone in self.zones:
                z_id = zone["id"]
                if z_id in current_visible:
                    anchor = self.cam_tracking.get(z_id, {})
                    ax, ay = anchor.get("last_cx"), anchor.get("last_cy")
                    if ax is not None and ay is not None:
                        abs_poly = [(ax + dx, ay + dy) for dx, dy in zone["relative_polygon"]]
                        pts = np.array(abs_poly, np.int32)
                        active_shelf_polygons[z_id] = pts
                        cv2.polylines(frame, [pts.reshape((-1, 1, 2))], True, (0, 255, 255), 2)
                        name = self.global_metadata.get(z_id, {}).get("name", f"Zone {z_id}")
                        cv2.putText(frame, name, abs_poly[0], cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)

            # --- Draw Tags & Collision ---
            db_changed = False
            for m_id, cx, cy in detected:
                if m_id in self.global_metadata:
                    data = self.global_metadata[m_id]
                    if data["type"] == "Shelf":
                        color = (0, 215, 255)
                        label = f"Shelf: {data['name']}"
                    else:  # Product
                        new_shelf = None
                        for s_id, poly in active_shelf_polygons.items():
                            if cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0:
                                new_shelf = s_id
                                break

                        if data.get("current_shelf") != new_shelf:
                            data["current_shelf"] = new_shelf
                            db_changed = True

                        if new_shelf is not None:
                            shelf_data = self.global_metadata.get(new_shelf, {})
                            shelf_name = shelf_data.get("name", f"ID {new_shelf}")
                            locked_id = shelf_data.get("locked_product_id")
                            is_misplaced = bool(locked_id and str(locked_id).strip() and str(locked_id).strip() != str(m_id))

                            if is_misplaced:
                                label = f"MISPLACED in {shelf_name}!"
                                color = (0, 0, 255)
                            else:
                                label = f"{data['name']} (In {shelf_name})"
                                color = (0, 255, 0)

                            s_anchor = self.cam_tracking.get(new_shelf, {})
                            sax, say = s_anchor.get("last_cx"), s_anchor.get("last_cy")
                            if sax and say:
                                cv2.line(frame, (cx, cy), (sax, say), color, 1)
                        else:
                            label = f"Product: {data['name']}"
                            color = (0, 255, 0)
                else:
                    color = (200, 200, 200)
                    label = f"ID {m_id} (click to assign)"

                cv2.circle(frame, (cx, cy), 6, color, -1)
                cv2.putText(frame, label, (cx - 20, cy - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

            if db_changed:
                self.write_db()

            # --- Draw in-progress polygon ---
            if self.app_state == "MAPPING_SHELF" and self.current_polygon_points:
                for pt in self.current_polygon_points:
                    cv2.circle(frame, pt, 6, (0, 165, 255), -1)
                if len(self.current_polygon_points) > 1:
                    pts_arr = np.array(self.current_polygon_points, np.int32).reshape((-1, 1, 2))
                    cv2.polylines(frame, [pts_arr], False, (0, 165, 255), 2)

        return frame


engine = CVEngine()


# ==========================================
# REQUEST MODELS
# ==========================================

class ClickPayload(BaseModel):
    # Coordinates in DISPLAY space (browser pixels)
    x: float
    y: float
    # Display dimensions so backend can scale to native
    display_w: float
    display_h: float

class TagSavePayload(BaseModel):
    type: str
    name: str
    locked_product_id: Optional[str] = ""


# ==========================================
# ROUTES
# ==========================================

@app.post("/camera/start")
def camera_start(cam_id: str = "0"):
    ok = engine.start(cam_id)
    if not ok:
        return JSONResponse({"status": "failed", "message": "Could not open camera."}, status_code=400)
    return {"status": "ok", "native_w": engine.native_w, "native_h": engine.native_h}


@app.post("/camera/stop")
def camera_stop():
    engine.stop()
    return {"status": "ok"}


@app.get("/video_feed")
def video_feed():
    """MJPEG stream endpoint. Browsers require specific headers to render inline."""
    def generate():
        while engine.is_running:
            with engine.lock:
                frame = engine.latest_frame_bytes
            if frame:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(frame)).encode() + b"\r\n"
                    b"\r\n" + frame + b"\r\n"
                )
            else:
                time.sleep(0.01)
            time.sleep(0.033)  # ~30fps cap

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.get("/camera/dimensions")
def camera_dimensions():
    return {"native_w": engine.native_w, "native_h": engine.native_h}


@app.post("/canvas/click")
def canvas_click(payload: ClickPayload):
    """
    Receives a click in DISPLAY coordinates.
    Scales to native coordinates, then handles tag click or polygon point.
    """
    if not engine.is_running:
        return {"status": "ignored"}

    # Scale from display space → native space
    scale_x = engine.native_w / payload.display_w if payload.display_w > 0 else 1.0
    scale_y = engine.native_h / payload.display_h if payload.display_h > 0 else 1.0

    nx = int(payload.x * scale_x)
    ny = int(payload.y * scale_y)

    with engine.lock:
        # --- MAPPING MODE: collect polygon points ---
        if engine.app_state == "MAPPING_SHELF":
            engine.current_polygon_points.append((nx, ny))
            pts_count = len(engine.current_polygon_points)

            if pts_count < 4:
                return {"status": "mapping", "message": f"Mapping shelf: click point {pts_count + 1} of 4..."}

            # 4th point reached — finalize zone
            visible_ids = [m for m, _, _ in engine.detected_markers]
            if engine.active_shelf_id not in visible_ids:
                engine.current_polygon_points = []
                engine.app_state = "IDLE"
                return {"status": "error", "message": "Anchor tag lost! Keep the tag visible while drawing."}

            anchor = engine.cam_tracking.get(engine.active_shelf_id, {})
            ax, ay = anchor.get("last_cx"), anchor.get("last_cy")

            if ax is None or ay is None:
                engine.current_polygon_points = []
                engine.app_state = "IDLE"
                return {"status": "error", "message": "Anchor tracking lost. Try again."}

            rel_poly = [(px - ax, py - ay) for px, py in engine.current_polygon_points]
            engine.zones = [z for z in engine.zones if z["id"] != engine.active_shelf_id]
            engine.zones.append({"id": engine.active_shelf_id, "relative_polygon": rel_poly})
            engine.write_db()
            engine.current_polygon_points = []
            engine.app_state = "IDLE"
            return {"status": "zone_saved", "message": "Shelf area saved! Status: IDLE."}

        # --- IDLE MODE: check if user clicked near a tag ---
        for m_id, cx, cy in engine.detected_markers:
            dist = ((nx - cx) ** 2 + (ny - cy) ** 2) ** 0.5
            if dist < 40:
                existing = engine.global_metadata.get(m_id, {"type": "Shelf", "name": "", "locked_product_id": "", "current_shelf": None})
                return {
                    "status": "open_popup",
                    "marker_id": m_id,
                    "data": existing,
                }

    return {"status": "no_action", "message": "No tag found at that location."}


@app.post("/tags/{marker_id}")
def save_tag(marker_id: int, payload: TagSavePayload, start_mapping: bool = False):
    with engine.lock:
        existing_shelf = engine.global_metadata.get(marker_id, {}).get("current_shelf")
        engine.global_metadata[marker_id] = {
            "type": payload.type,
            "name": payload.name,
            "locked_product_id": payload.locked_product_id or None,
            "current_shelf": existing_shelf,
        }
        engine.write_db()

        if start_mapping and payload.type == "Shelf":
            engine.app_state = "MAPPING_SHELF"
            engine.active_shelf_id = marker_id
            engine.current_polygon_points = []
            return {"status": "mapping_started", "message": f"Mapping '{payload.name}': click the 4 corners of the shelf area."}

    return {"status": "saved", "message": f"{payload.type} '{payload.name}' saved."}


@app.post("/zones/clear")
def clear_zones():
    with engine.lock:
        engine.zones = []
        engine.app_state = "IDLE"
        engine.current_polygon_points = []
        engine.write_db()
    return {"status": "ok", "message": "All zones cleared."}


@app.get("/state")
def get_state():
    """Poll endpoint for current app state (mapping progress etc)."""
    with engine.lock:
        return {
            "app_state": engine.app_state,
            "polygon_points_count": len(engine.current_polygon_points),
            "active_shelf_id": engine.active_shelf_id,
            "detected_count": len(engine.detected_markers),
        }


@app.get("/inventory")
def get_inventory():
    """Returns all known tags split into shelves and products with live status."""
    with engine.lock:
        visible_ids = {m for m, _, _ in engine.detected_markers}
        shelves = []
        products = []

        for tag_id, data in engine.global_metadata.items():
            entry = {
                "id": tag_id,
                "name": data.get("name", f"ID {tag_id}"),
                "online": tag_id in visible_ids,
            }
            if data.get("type") == "Shelf":
                has_zone = any(z["id"] == tag_id for z in engine.zones)
                locked = data.get("locked_product_id")
                entry["has_zone"] = has_zone
                entry["locked_product_id"] = locked
                shelves.append(entry)
            else:
                current_shelf = data.get("current_shelf")
                shelf_name = None
                if current_shelf is not None:
                    shelf_name = engine.global_metadata.get(current_shelf, {}).get("name")
                # Misplaced check
                is_misplaced = False
                if current_shelf is not None:
                    locked = engine.global_metadata.get(current_shelf, {}).get("locked_product_id")
                    if locked and str(locked).strip() != str(tag_id):
                        is_misplaced = True
                entry["current_shelf"] = current_shelf
                entry["shelf_name"] = shelf_name
                entry["misplaced"] = is_misplaced
                products.append(entry)

        return {"shelves": shelves, "products": products}