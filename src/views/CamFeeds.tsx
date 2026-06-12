import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MonitorPlay,
  Plus,
  Trash2,
  Video,
  Wifi,
  Activity,
  ShieldCheck,
  Server,
} from "lucide-react";

export default function CamFeeds() {
  const [cameras, setCameras] = useState([
    {
      id: "1",
      name: "Loading Dock A",
      url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1",
    },
  ]);

  const [selectedCam, setSelectedCam] = useState<string | null>("1");
  const [newCamName, setNewCamName] = useState("");
  const [newCamUrl, setNewCamUrl] = useState("");

  const handleAddCamera = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!newCamName || !newCamUrl) return;

    const newCam = {
      id: Date.now().toString(),
      name: newCamName,
      url: newCamUrl,
    };

    setCameras([...cameras, newCam]);
    setNewCamName("");
    setNewCamUrl("");

    if (!selectedCam) {
      setSelectedCam(newCam.id);
    }
  };

  const handleDelete = (e: { stopPropagation: () => void }, id: string) => {
    e.stopPropagation();
    const updated = cameras.filter((c) => c.id !== id);
    setCameras(updated);
    if (selectedCam === id) {
      setSelectedCam(updated.length > 0 ? updated[0].id : null);
    }
  };

  const activeCam = cameras.find((c) => c.id === selectedCam);

  return (
    <div className="w-full min-h-screen p-6 flex flex-col space-y-6 bg-[#0B0B0D] text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Security Overview
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Live IP Camera Monitoring System
          </p>
        </div>

        {/* Network Status indicator */}
        <div className="flex items-center space-x-2 bg-[#121317] px-3 py-1.5 rounded-lg border border-[#22252C] text-xs">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[#A1A1AA] font-mono">System Online</span>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Left Column (Wide) - Camera Feed */}
        <div className="lg:col-span-8 bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#22252C]">
            <div className="flex items-center space-x-2">
              <MonitorPlay className="w-4.5 h-4.5 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Feed {activeCam ? `- ${activeCam.name}` : ""}
              </h3>
            </div>
            {activeCam && (
              <span className="text-[10px] font-mono text-[#A1A1AA] bg-[#171A20] px-2 py-1 rounded border border-[#22252C]">
                {activeCam.url}
              </span>
            )}
          </div>

          <div className="flex-grow mt-4 bg-[#0B0B0D] rounded-lg border border-[#22252C] overflow-hidden relative group">
            {activeCam ? (
              <iframe
                src={activeCam.url}
                className="w-full h-full border-0"
                allowFullScreen
                title={activeCam.name}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#A1A1AA]">
                <Video className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-xs uppercase tracking-widest">
                  No Camera Selected
                </p>
              </div>
            )}

            {/* Overlay recording indicator */}
            {activeCam && (
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 backdrop-blur px-2 py-1 rounded border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-mono text-white">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Narrow) - Camera Management */}
        <div className="lg:col-span-4 bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col h-[600px]">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Server className="w-4.5 h-4.5 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Camera Management
              </h3>
            </div>
          </div>

          {/* Add New Camera Form */}
          <form
            onSubmit={handleAddCamera}
            className="mt-4 space-y-3 pb-5 border-b border-[#22252C]"
          >
            <div>
              <label className="block text-[10px] text-[#A1A1AA] uppercase tracking-wider mb-1">
                Camera Name
              </label>
              <input
                type="text"
                value={newCamName}
                onChange={(e) => setNewCamName(e.target.value)}
                placeholder="e.g. Loading Dock B"
                className="w-full bg-[#171A20] border border-[#22252C] rounded text-xs text-white px-3 py-2 focus:outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#A1A1AA] uppercase tracking-wider mb-1">
                IP / HTTPS URL
              </label>
              <input
                type="text"
                value={newCamUrl}
                onChange={(e) => setNewCamUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#171A20] border border-[#22252C] rounded text-xs text-white px-3 py-2 font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!newCamName || !newCamUrl}
              className="w-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Add Camera</span>
            </button>
          </form>

          {/* Camera List */}
          <div className="flex-grow overflow-y-auto mt-4 space-y-2 pr-1 custom-scrollbar">
            {cameras.length === 0 ? (
              <p className="text-center text-xs text-[#A1A1AA] mt-8">
                No cameras added yet.
              </p>
            ) : (
              cameras.map((cam) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={cam.id}
                  onClick={() => setSelectedCam(cam.id)}
                  className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCam === cam.id
                      ? "border-[#FF6B35] bg-[#FF6B35]/10"
                      : "border-[#22252C] bg-[#171A20] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <Video
                        className={`w-4 h-4 ${selectedCam === cam.id ? "text-[#FF6B35]" : "text-zinc-500"}`}
                      />
                      <span className="text-sm font-bold text-white">
                        {cam.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, cam.id)}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] text-[#A1A1AA] font-mono truncate mt-2 opacity-70">
                    {cam.url}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
