import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MonitorPlay,
  Play,
  Square,
  Trash2,
  Video,
  Activity,
  Server,
  Crosshair,
  Settings,
  ShieldCheck,
  Map,
  Package,
  Archive,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";

const API_URL = "http://localhost:8000";
const POLL_INTERVAL = 500;

interface TagData {
  type?: string;
  name?: string;
  locked_product_id?: string;
  current_shelf?: number | null;
}

interface PopupState {
  isOpen: boolean;
  markerId: number | string | null;
  data: TagData;
}

interface ShelfEntry {
  id: number;
  name: string;
  online: boolean;
  has_zone: boolean;
  locked_product_id?: string | null;
}

interface ProductEntry {
  id: number;
  name: string;
  online: boolean;
  current_shelf: number | null;
  shelf_name: string | null;
  misplaced: boolean;
}

interface Inventory {
  shelves: ShelfEntry[];
  products: ProductEntry[];
}

export default function CamFeeds() {
  const [status, setStatus] = useState<string>("IDLE. Waiting to start...");
  const [camId, setCamId] = useState<string>("0");
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [streamSrc, setStreamSrc] = useState<string>("");
  const [streamError, setStreamError] = useState<boolean>(false);
  const [mappingState, setMappingState] = useState<string>("IDLE");
  const [pointsCount, setPointsCount] = useState<number>(0);
  const [inventory, setInventory] = useState<Inventory>({
    shelves: [],
    products: [],
  });

  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    markerId: null,
    data: {},
  });

  // Ref to the <img> element for getBoundingClientRect
  const imgRef = useRef<HTMLImageElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==========================================
  // STATE POLLING (mapping progress feedback)
  // ==========================================
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const [stateRes, invRes] = await Promise.all([
          fetch(`${API_URL}/state`),
          fetch(`${API_URL}/inventory`),
        ]);
        const data = await stateRes.json();
        const inv = await invRes.json();

        setMappingState(data.app_state);
        setPointsCount(data.polygon_points_count ?? 0);
        setInventory(inv);

        if (data.app_state === "MAPPING_SHELF") {
          setStatus(
            `Mapping shelf area — click point ${(data.polygon_points_count ?? 0) + 1} of 4 on the video.`,
          );
        }
      } catch {
        // backend offline, skip
      }
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ==========================================
  // CAMERA CONTROLS
  // ==========================================
  const startCamera = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!camId) return;

    const safeCamId = encodeURIComponent(camId);
    const res = await fetch(`${API_URL}/camera/start?cam_id=${safeCamId}`, {
      method: "POST",
    });
    const data = await res.json();

    if (data.status === "failed") {
      setStatus("ERROR: Could not open camera. Check ID / URL.");
      setIsStreamActive(false);
      return;
    }

    setStatus("Camera running — click a detected tag to assign it.");
    setStreamError(false);
    setIsStreamActive(true);
    startPolling();

    // Set via React state — avoids React/DOM timing race that causes black frame
    setStreamSrc(`${API_URL}/video_feed?t=${Date.now()}`);
  };

  const stopCamera = async () => {
    await fetch(`${API_URL}/camera/stop`, { method: "POST" });
    setStatus("Camera stopped.");
    setIsStreamActive(false);
    setStreamSrc("");
    setStreamError(false);
    setMappingState("IDLE");
    stopPolling();
  };

  const clearZones = async () => {
    await fetch(`${API_URL}/zones/clear`, { method: "POST" });
    setStatus("All zones cleared.");
    setMappingState("IDLE");
  };

  // ==========================================
  // CLICK HANDLER — coordinate scaling
  // ==========================================
  const handleVideoClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (popup.isOpen || !isStreamActive) return;

    const img = imgRef.current;
    if (!img) return;

    // Display-space rect of the <img> element as rendered in the browser
    const rect = img.getBoundingClientRect();
    const display_w = rect.width;
    const display_h = rect.height;

    // Click position relative to the rendered image
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Send display coords + display dimensions to backend.
    // Backend scales to native resolution itself.
    const res = await fetch(`${API_URL}/canvas/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, display_w, display_h }),
    });
    const result = await res.json();

    if (result.status === "open_popup") {
      setPopup({
        isOpen: true,
        markerId: result.marker_id,
        data: result.data || { type: "Shelf", name: "", locked_product_id: "" },
      });
    } else if (result.message) {
      setStatus(result.message);
    }

    if (result.status === "zone_saved" || result.status === "IDLE") {
      setMappingState("IDLE");
    }
  };

  // ==========================================
  // SAVE TAG
  // ==========================================
  const saveTag = async (startMapping: boolean = false) => {
    if (!popup.data.name?.trim()) {
      setStatus("Please enter a name for this tag.");
      return;
    }

    const res = await fetch(
      `${API_URL}/tags/${popup.markerId}?start_mapping=${startMapping}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: popup.data.type || "Shelf",
          name: popup.data.name || "",
          locked_product_id: popup.data.locked_product_id || "",
        }),
      },
    );
    const result = await res.json();
    setStatus(result.message || "Saved.");
    setPopup({ isOpen: false, markerId: null, data: {} });

    if (startMapping) {
      setMappingState("MAPPING_SHELF");
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  const isMappingActive = mappingState === "MAPPING_SHELF";

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col space-y-6 bg-[#0B0B0D] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
            CV Inventory OS
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Smart Polygon Mapper & Live Tracking
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#121317] px-3 py-1.5 rounded-lg border border-[#22252C] text-xs">
          <div
            className={`w-2 h-2 rounded-full ${isStreamActive ? "bg-[#22C55E] animate-pulse" : "bg-[#EF4444]"}`}
          />
          <span className="text-[#A1A1AA] font-mono">
            {isStreamActive ? "System Online" : "System Offline"}
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Camera Feed */}
        <div className="lg:col-span-8 bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#22252C]">
            <div className="flex items-center space-x-2">
              <MonitorPlay className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Feed {isStreamActive ? `— Source ${camId}` : ""}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isMappingActive && (
                <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded text-[10px] font-mono text-orange-400">
                  <Map className="w-3 h-3" />
                  Click point {pointsCount + 1} of 4
                </div>
              )}
              {isStreamActive && (
                <div className="flex items-center space-x-1.5 bg-black/50 px-2 py-1 rounded border border-[#22252C]">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-white">LIVE</span>
                </div>
              )}
            </div>
          </div>

          {/*
            IMPORTANT: This wrapper must be `relative` and overflow-hidden.
            The <img> fills it entirely with object-contain so aspect ratio
            is preserved. getBoundingClientRect() on the img gives us the
            exact rendered size for coordinate scaling.
          */}
          <div className="w-full aspect-video mt-4 bg-[#0B0B0D] rounded-lg border border-[#22252C] overflow-hidden relative flex items-center justify-center">
            {isStreamActive && !streamError ? (
              <img
                ref={imgRef}
                alt="Camera Feed"
                src={streamSrc}
                onClick={handleVideoClick}
                onError={() => {
                  setStreamError(true);
                  setStatus(
                    "Stream error — check backend is running and CORS is allowed.",
                  );
                }}
                className={`w-full h-full object-contain block select-none ${isMappingActive ? "cursor-crosshair" : "cursor-pointer"}`}
                draggable="false"
              />
            ) : isStreamActive && streamError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#A1A1AA] p-6">
                <Video className="w-12 h-12 mb-3 text-red-500 opacity-60" />
                <p className="text-xs uppercase tracking-widest text-red-400">
                  Stream Error
                </p>
                <p className="text-[10px] mt-2 opacity-70 text-center max-w-xs">
                  Backend is running but the video stream failed to load. Make
                  sure{" "}
                  <code className="text-orange-400">
                    http://localhost:8000/video_feed
                  </code>{" "}
                  is reachable from the browser and CORS is enabled.
                </p>
                <button
                  onClick={() => {
                    setStreamError(false);
                    setStreamSrc(`${API_URL}/video_feed?t=${Date.now()}`);
                  }}
                  className="mt-4 px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35] hover:text-white rounded transition-all"
                >
                  Retry Stream
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#A1A1AA] p-6">
                <Video className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-xs uppercase tracking-widest">
                  No Active Stream
                </p>
                <p className="text-[10px] mt-2 opacity-50 text-center max-w-xs">
                  Connect to a camera source from the management panel to begin
                  mapping and tracking.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-6 min-h-0 h-full">
          {/* Connection Panel */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C]">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Settings className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Connection Settings
              </h3>
            </div>

            <form onSubmit={startCamera} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] text-[#A1A1AA] uppercase tracking-wider mb-1">
                  Camera ID or URL
                </label>
                <input
                  type="text"
                  value={camId}
                  onChange={(e) => setCamId(e.target.value)}
                  placeholder="e.g. 0, 1, or http://..."
                  className="w-full bg-[#171A20] border border-[#22252C] rounded text-xs text-white px-3 py-2 font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
              </div>

              <div className="flex gap-2">
                {!isStreamActive ? (
                  <button
                    type="submit"
                    disabled={!camId}
                    className="flex-1 bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <Play className="w-4 h-4" />
                    Start Stream
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white flex items-center justify-center gap-2 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Stop Stream
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Engine Management */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C]">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Server className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Engine Management
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <button
                onClick={clearZones}
                className="w-full bg-[#171A20] text-[#A1A1AA] border border-[#22252C] hover:border-red-500/50 hover:text-red-400 flex items-center justify-center gap-2 py-2.5 rounded transition-all text-xs font-bold uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Zones
              </button>

              {/* Status console */}
              <div className="bg-[#0B0B0D] border border-[#22252C] rounded-lg p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FF6B35]" />
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold">
                    System Status
                  </span>
                </div>
                <p className="text-xs font-mono text-emerald-400 leading-relaxed break-words pl-1 mt-2">
                  {">"} {status}
                </p>
              </div>

              {/* Mapping progress bar */}
              {isMappingActive && (
                <div className="bg-[#0B0B0D] border border-orange-500/30 rounded-lg p-3">
                  <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold mb-2">
                    Area Mapping Progress
                  </p>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-colors ${i < pointsCount ? "bg-orange-500" : "bg-[#22252C]"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-2">
                    {pointsCount} / 4 corners placed
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Panel */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col flex-1 min-h-[300px]">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C] shrink-0">
              <Archive className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Inventory
              </h3>
              <span className="ml-auto text-[10px] font-mono text-[#A1A1AA]">
                {inventory.shelves.length}S / {inventory.products.length}P
              </span>
            </div>

            <div className="mt-3 space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Shelves */}
              {inventory.shelves.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Shelves
                  </p>
                  <div className="space-y-1.5">
                    {inventory.shelves.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between bg-[#0B0B0D] border border-[#22252C] rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {s.online ? (
                            <Wifi className="w-3 h-3 text-[#22C55E] shrink-0" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                          )}
                          <span className="text-xs text-white font-mono truncate">
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {s.has_zone && (
                            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                              Mapped
                            </span>
                          )}
                          {s.locked_product_id && (
                            <span className="text-[9px] bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 px-1.5 py-0.5 rounded font-mono">
                              #{s.locked_product_id}
                            </span>
                          )}
                          <span className="text-[9px] text-[#A1A1AA] font-mono">
                            ID {s.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {inventory.products.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Products
                  </p>
                  <div className="space-y-1.5">
                    {inventory.products.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between bg-[#0B0B0D] border rounded-lg px-3 py-2 ${
                          p.misplaced ? "border-red-500/40" : "border-[#22252C]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.online ? (
                            <Wifi className="w-3 h-3 text-[#22C55E] shrink-0" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs text-white font-mono truncate">
                              {p.name}
                            </p>
                            {p.shelf_name && (
                              <p
                                className={`text-[9px] truncate ${p.misplaced ? "text-red-400" : "text-[#A1A1AA]"}`}
                              >
                                {p.misplaced ? "⚠ " : ""}
                                {p.misplaced
                                  ? `Misplaced in ${p.shelf_name}`
                                  : `In ${p.shelf_name}`}
                              </p>
                            )}
                            {!p.shelf_name && (
                              <p className="text-[9px] text-[#A1A1AA]">
                                Not on any shelf
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {p.misplaced && (
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-[9px] text-[#A1A1AA] font-mono">
                            ID {p.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {inventory.shelves.length === 0 &&
                inventory.products.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-[#A1A1AA]">
                    <Package className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest opacity-50">
                      No tags assigned yet
                    </p>
                    <p className="text-[9px] opacity-40 mt-1 text-center">
                      Click a detected tag on the video feed to assign it
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Popup */}
      <AnimatePresence>
        {popup.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#121317] p-6 rounded-xl border border-[#22252C] w-full max-w-[400px] shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#22252C]">
                <Crosshair className="w-5 h-5 text-[#FF6B35]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tag Assignment:{" "}
                  <span className="text-[#FF6B35]">#{popup.markerId}</span>
                </h2>
              </div>

              {/* Type Toggle */}
              <div className="mb-5 flex bg-[#171A20] rounded-lg p-1 border border-[#22252C]">
                {["Shelf", "Product"].map((t) => (
                  <button
                    key={t}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                      (popup.data.type || "Shelf") === t
                        ? "bg-[#22252C] text-white"
                        : "text-[#A1A1AA] hover:text-white"
                    }`}
                    onClick={() =>
                      setPopup({ ...popup, data: { ...popup.data, type: t } })
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mb-4 space-y-1">
                <label className="block text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                  Name / Label
                </label>
                <input
                  type="text"
                  autoFocus
                  className="w-full bg-[#171A20] border border-[#22252C] rounded text-xs text-white px-3 py-2 focus:outline-none focus:border-[#FF6B35] transition-colors"
                  placeholder="e.g. A1, Widget-X"
                  value={popup.data.name || ""}
                  onChange={(e) =>
                    setPopup({
                      ...popup,
                      data: { ...popup.data, name: e.target.value },
                    })
                  }
                />
              </div>

              {popup.data.type !== "Product" && (
                <div className="mb-6 space-y-1">
                  <label className="block text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                    Lock to Product ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#171A20] border border-[#22252C] rounded text-xs text-white px-3 py-2 font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
                    placeholder="e.g. 99"
                    value={popup.data.locked_product_id || ""}
                    onChange={(e) =>
                      setPopup({
                        ...popup,
                        data: {
                          ...popup.data,
                          locked_product_id: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-[#22252C]">
                <button
                  onClick={() =>
                    setPopup({ isOpen: false, markerId: null, data: {} })
                  }
                  className="px-4 py-2 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveTag(false)}
                  className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E] hover:text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Save Info
                </button>
                {popup.data.type !== "Product" && (
                  <button
                    onClick={() => saveTag(true)}
                    className="bg-[#FF6B35] text-black hover:bg-[#ff7b4b] px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                  >
                    <Map className="w-3.5 h-3.5" />
                    Assign Area
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
