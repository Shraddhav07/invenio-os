"""
CV Inventory OS - FastAPI Backend
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
from typing import Optional, List
import asyncio

app = FastAPI(title="CV Inventory OS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# WEBSOCKET MANAGER
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

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
        self.active_shelf_id: Optional[str] = None
        self.current_polygon_points: list = []  # In NATIVE pixel coords

        # Data
        self.db_filename = "cv_inventory_db.json"
        
        # New Normalized DB Schema
        self.full_db: dict = {
            "products": {},
            "cameras": {},
            "shelves": {},
            "detections": {},
            "aruco_markers": {}
        }
        self.cam_key: str = "0"
        
        # We also need a background task to push WS updates
        self.loop = None

        # ArUco setup
        self._setup_aruco()

    # Output frame is always 1280x720 (16:9) regardless of camera native resolution.
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
                    data = json.load(f)
                    # Migrate old DB if necessary
                    if "metadata" in data:
                        self.full_db = {
                            "products": {},
                            "cameras": {},
                            "shelves": {},
                            "detections": {},
                            "aruco_markers": {}
                        }
                    else:
                        self.full_db = data
                        if "products" not in self.full_db: self.full_db["products"] = {}
                        if "cameras" not in self.full_db: self.full_db["cameras"] = {}
                        if "shelves" not in self.full_db: self.full_db["shelves"] = {}
                        if "detections" not in self.full_db: self.full_db["detections"] = {}
                        if "aruco_markers" not in self.full_db: self.full_db["aruco_markers"] = {}
            except Exception as e:
                print(f"DB read error: {e}")

    def write_db(self):
        try:
            with open(self.db_filename, "w") as f:
                json.dump(self.full_db, f, indent=4)
        except Exception as e:
            print(f"DB write error: {e}")

    def load_for_camera(self):
        self.read_db()
        if self.cam_key not in self.full_db["cameras"]:
            self.full_db["cameras"][self.cam_key] = {
                "device_id": self.cam_key,
                "name": f"Camera {self.cam_key}",
                "location": "Warehouse",
                "is_active": True
            }
            self.write_db()

    async def _notify_ws(self):
        await manager.broadcast({"type": "inventory_update", "data": self.full_db})

    def notify_ws(self):
        try:
            if self.loop is not None and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(self._notify_ws(), self.loop)
        except Exception as e:
            pass

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

            self.cam_key = str(cam_id)
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
            with self.lock:
                if not self.is_running or self.vid is None:
                    break
                vid = self.vid

            ret, frame = vid.read()
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
        frame = cv2.resize(frame, (CVEngine.OUTPUT_W, CVEngine.OUTPUT_H), interpolation=cv2.INTER_LINEAR)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if self.modern_api:
            corners, ids, _ = self.detector.detectMarkers(gray)
        else:
            corners, ids, _ = aruco.detectMarkers(gray, self.aruco_dict, parameters=self.parameters)

        detected = []

        with self.lock:
            db_changed = False
            if ids is not None:
                for i in range(len(ids)):
                    m_id = str(int(ids[i][0]))
                    m_corners = corners[i][0]
                    cx = int((m_corners[0][0] + m_corners[2][0]) / 2.0)
                    cy = int((m_corners[0][1] + m_corners[2][1]) / 2.0)
                    detected.append((m_id, cx, cy))
                    
                    # Update detection
                    self.full_db["detections"][m_id] = {
                        "camera_id": self.cam_key,
                        "aruco_marker_id": m_id,
                        "x": cx,
                        "y": cy,
                        "timestamp": time.time()
                    }
                    db_changed = True

                    # Auto-capture new markers as products
                    if m_id not in self.full_db["aruco_markers"]:
                        sku = f"SKU-{m_id}-{int(time.time())}"
                        self.full_db["products"][m_id] = {
                            "sku": sku,
                            "name": f"Auto Product {m_id}",
                            "category": "Uncategorized",
                            "zone": "TBD",
                            "assigned_shelf": "",
                            "current_shelf": "",
                            "status": "verified",
                            "quantity": 1,
                            "aruco_marker_id": m_id
                        }
                        self.full_db["aruco_markers"][m_id] = {
                            "marker_id": m_id,
                            "type": "product",
                            "linked_product_id": m_id,
                            "linked_shelf_id": None
                        }
                        db_changed = True

            self.detected_markers = detected
            current_visible = [m for m, _, _ in detected]

            # --- Draw Shelf Zones ---
            active_shelf_polygons = {}
            for s_id, s_data in self.full_db["shelves"].items():
                if s_data.get("camera_id") != self.cam_key:
                    continue
                if s_id in current_visible:
                    # Anchor is the shelf marker
                    anchor = self.full_db["detections"].get(s_id)
                    if anchor and time.time() - anchor.get("timestamp", 0) < 2.0:
                        ax, ay = anchor["x"], anchor["y"]
                        rel_poly = s_data.get("polygon", [])
                        if rel_poly:
                            abs_poly = [(ax + dx, ay + dy) for dx, dy in rel_poly]
                            pts = np.array(abs_poly, np.int32)
                            active_shelf_polygons[s_id] = pts
                            cv2.polylines(frame, [pts.reshape((-1, 1, 2))], True, (0, 255, 255), 2)
                            name = s_data.get("name", f"Shelf {s_id}")
                            cv2.putText(frame, name, abs_poly[0], cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)

            # --- Draw Tags & Collision ---
            for m_id, cx, cy in detected:
                marker_info = self.full_db["aruco_markers"].get(m_id)
                if marker_info:
                    m_type = marker_info["type"]
                    if m_type == "shelf":
                        shelf_data = self.full_db["shelves"].get(m_id, {})
                        color = (0, 215, 255)
                        label = f"Shelf: {shelf_data.get('name', m_id)}"
                    else:
                        product_data = self.full_db["products"].get(m_id, {})
                        new_shelf = None
                        for s_id, poly in active_shelf_polygons.items():
                            if cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0:
                                new_shelf = s_id
                                break

                        if product_data.get("current_shelf") != (new_shelf or ""):
                            product_data["current_shelf"] = new_shelf or ""
                            db_changed = True

                        if new_shelf:
                            shelf_data = self.full_db["shelves"].get(new_shelf, {})
                            shelf_name = shelf_data.get("name", f"ID {new_shelf}")
                            
                            label = f"{product_data.get('name', 'Product')} (In {shelf_name})"
                            color = (0, 255, 0)

                            s_anchor = self.full_db["detections"].get(new_shelf)
                            if s_anchor:
                                cv2.line(frame, (cx, cy), (s_anchor["x"], s_anchor["y"]), color, 1)
                        else:
                            label = f"Product: {product_data.get('name', 'Product')}"
                            color = (0, 255, 0)
                else:
                    color = (200, 200, 200)
                    label = f"ID {m_id} (unknown)"

                cv2.circle(frame, (cx, cy), 6, color, -1)
                cv2.putText(frame, label, (cx - 20, cy - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

            if db_changed:
                self.write_db()
                self.notify_ws()

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
    x: float
    y: float
    display_w: float
    display_h: float

class TagSavePayload(BaseModel):
    type: str
    name: str
    locked_product_id: Optional[str] = ""

# ==========================================
# ROUTES
# ==========================================

@app.on_event("startup")
async def startup_event():
    engine.loop = asyncio.get_event_loop()

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
            time.sleep(0.033)

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
    if not engine.is_running:
        return {"status": "ignored"}

    scale_x = engine.native_w / payload.display_w if payload.display_w > 0 else 1.0
    scale_y = engine.native_h / payload.display_h if payload.display_h > 0 else 1.0

    nx = int(payload.x * scale_x)
    ny = int(payload.y * scale_y)

    with engine.lock:
        if engine.app_state == "MAPPING_SHELF":
            engine.current_polygon_points.append((nx, ny))
            pts_count = len(engine.current_polygon_points)

            if pts_count < 4:
                return {"status": "mapping", "message": f"Mapping shelf: click point {pts_count + 1} of 4..."}

            visible_ids = [m for m, _, _ in engine.detected_markers]
            if str(engine.active_shelf_id) not in visible_ids:
                engine.current_polygon_points = []
                engine.app_state = "IDLE"
                return {"status": "error", "message": "Anchor tag lost! Keep the tag visible while drawing."}

            anchor = engine.full_db["detections"].get(str(engine.active_shelf_id))
            if not anchor:
                engine.current_polygon_points = []
                engine.app_state = "IDLE"
                return {"status": "error", "message": "Anchor tracking lost. Try again."}

            ax, ay = anchor["x"], anchor["y"]
            rel_poly = [(px - ax, py - ay) for px, py in engine.current_polygon_points]
            
            s_id = str(engine.active_shelf_id)
            if s_id not in engine.full_db["shelves"]:
                engine.full_db["shelves"][s_id] = {
                    "camera_id": engine.cam_key,
                    "aruco_marker_id": s_id,
                    "name": f"Shelf {s_id}",
                    "zone": "General",
                    "polygon": rel_poly
                }
            else:
                engine.full_db["shelves"][s_id]["polygon"] = rel_poly
                engine.full_db["shelves"][s_id]["camera_id"] = engine.cam_key

            engine.write_db()
            engine.notify_ws()
            engine.current_polygon_points = []
            engine.app_state = "IDLE"
            return {"status": "zone_saved", "message": "Shelf area saved! Status: IDLE."}

        for m_id, cx, cy in engine.detected_markers:
            dist = ((nx - cx) ** 2 + (ny - cy) ** 2) ** 0.5
            if dist < 40:
                marker_info = engine.full_db["aruco_markers"].get(m_id, {})
                m_type = marker_info.get("type", "Product").capitalize()
                
                if m_type == "Shelf":
                    existing = engine.full_db["shelves"].get(m_id, {})
                else:
                    existing = engine.full_db["products"].get(m_id, {})

                data = {
                    "type": m_type,
                    "name": existing.get("name", ""),
                }
                return {
                    "status": "open_popup",
                    "marker_id": m_id,
                    "data": data,
                }

    return {"status": "no_action", "message": "No tag found at that location."}


@app.post("/tags/{marker_id}")
def save_tag(marker_id: int, payload: TagSavePayload, start_mapping: bool = False):
    m_id = str(marker_id)
    with engine.lock:
        if payload.type == "Shelf":
            if m_id in engine.full_db["products"]:
                del engine.full_db["products"][m_id]
            engine.full_db["shelves"][m_id] = {
                "camera_id": engine.cam_key,
                "aruco_marker_id": m_id,
                "name": payload.name,
                "zone": "General",
                "polygon": engine.full_db["shelves"].get(m_id, {}).get("polygon", [])
            }
            engine.full_db["aruco_markers"][m_id] = {
                "marker_id": m_id,
                "type": "shelf",
                "linked_product_id": None,
                "linked_shelf_id": m_id
            }
        else:
            if m_id in engine.full_db["shelves"]:
                del engine.full_db["shelves"][m_id]
            existing = engine.full_db["products"].get(m_id, {})
            sku = existing.get("sku", f"SKU-{m_id}-{int(time.time())}")
            engine.full_db["products"][m_id] = {
                "sku": sku,
                "name": payload.name,
                "category": existing.get("category", "Uncategorized"),
                "zone": existing.get("zone", "TBD"),
                "assigned_shelf": "",
                "current_shelf": existing.get("current_shelf", ""),
                "status": "verified",
                "quantity": 1,
                "aruco_marker_id": m_id
            }
            engine.full_db["aruco_markers"][m_id] = {
                "marker_id": m_id,
                "type": "product",
                "linked_product_id": m_id,
                "linked_shelf_id": None
            }

        engine.write_db()
        engine.notify_ws()

        if start_mapping and payload.type == "Shelf":
            engine.app_state = "MAPPING_SHELF"
            engine.active_shelf_id = m_id
            engine.current_polygon_points = []
            return {"status": "mapping_started", "message": f"Mapping '{payload.name}': click the 4 corners of the shelf area."}

    return {"status": "saved", "message": f"{payload.type} '{payload.name}' saved."}


@app.post("/zones/clear")
def clear_zones():
    with engine.lock:
        for s_id in engine.full_db["shelves"]:
            if engine.full_db["shelves"][s_id].get("camera_id") == engine.cam_key:
                engine.full_db["shelves"][s_id]["polygon"] = []
        engine.app_state = "IDLE"
        engine.current_polygon_points = []
        engine.write_db()
        engine.notify_ws()
    return {"status": "ok", "message": "All zones cleared."}


@app.get("/state")
def get_state():
    with engine.lock:
        return {
            "app_state": engine.app_state,
            "polygon_points_count": len(engine.current_polygon_points),
            "active_shelf_id": engine.active_shelf_id,
            "detected_count": len(engine.detected_markers),
        }

@app.get("/inventory")
def get_inventory():
    """Returns normalized db state"""
    with engine.lock:
        return engine.full_db

@app.websocket("/ws/inventory")
async def websocket_inventory(websocket: WebSocket):
    await manager.connect(websocket)
    with engine.lock:
        await websocket.send_json({"type": "inventory_update", "data": engine.full_db})
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)