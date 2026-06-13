import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInvenioStore } from "./store/store";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertCircle,
  Navigation,
} from "lucide-react";

// Import views
import { DashboardView } from "./views/DashboardView";
import { WarehouseMapView } from "./views/WarehouseMapView";
import { InventoryView } from "./views/InventoryView";
import { AIAssistantView } from "./views/AIAssistantView";
import { AlertsView } from "./views/AlertsView";
import CamFeeds from "./views/CamFeeds";

// Helper component to render active page route
const RouteContainer: React.FC = () => {
  const activeRoute = useInvenioStore((state) => state.activeRoute);

  switch (activeRoute) {
    case "dashboard":
      return <DashboardView />;
    case "twin":
      return <WarehouseMapView />;
    case "inventory":
      return <InventoryView />;
    case "assistant":
      return <AIAssistantView />;
    case "camfeeds":
      return <CamFeeds />;
    case "alerts":
      return <AlertsView />;
    default:
      return <DashboardView />;
  }
};

function App() {
  const {
    followWorkerPrompt,
    setFollowWorkerPrompt,
    setFollowingWorkerId,
    setRoute,
  } = useInvenioStore();

  // Theme is locked to dark
  useEffect(() => {
    document.documentElement.className = "dark";
  }, []);

  // Fetch initial inventory on mount
  useEffect(() => {
    useInvenioStore.getState().fetchInventory();
  }, []);

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#0B0B0D] text-white select-none">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main View Area */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-[#0B0B0D]">
        {/* Ctrl+K search indicator header bar */}
        <header className="h-11 px-6 border-b border-[#22252C] flex items-center justify-between shrink-0 bg-[#121317]">
          <div className="flex items-center space-x-2 text-xs text-zinc-500">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono font-bold text-4xs">
              Ctrl + K
            </kbd>
            <span>to launch command center</span>
          </div>
        </header>

        {/* Dynamic transition container */}
        <div className="flex-1 overflow-hidden relative bg-[#0B0B0D]">
          <AnimatePresence mode="wait">
            <motion.div
              key={useInvenioStore((state) => state.activeRoute)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full h-full absolute inset-0"
            >
              <RouteContainer />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Global Toast Notifications Overlay */}
      <div className="absolute top-16 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-auto">
        <AnimatePresence>
          {useInvenioStore((state) => state.notifications).map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`flex items-start gap-3 p-4 rounded-lg bg-[#18191E]/95 border-l-4 shadow-xl backdrop-blur-md ${
                notif.type === "success"
                  ? "border-l-emerald-500"
                  : notif.type === "error"
                    ? "border-l-rose-500"
                    : notif.type === "warning"
                      ? "border-l-amber-500"
                      : "border-l-blue-500"
              } border border-zinc-800`}
            >
              <div className="shrink-0 mt-0.5">
                {notif.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {notif.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                {notif.type === "warning" && (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                {notif.type === "info" && (
                  <Info className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-100">
                  {notif.message}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {notif.timestamp}
                </span>
              </div>
              <button
                onClick={() =>
                  useInvenioStore.getState().dismissNotification(notif.id)
                }
                className="shrink-0 p-0.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Follow Worker Prompt Dialog Modal */}
      <AnimatePresence>
        {followWorkerPrompt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setFollowWorkerPrompt(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#121317] border border-[#FF6B35]/25 rounded-2xl p-6 shadow-2xl z-10 pointer-events-auto text-zinc-100 flex flex-col space-y-4"
            >
              <div className="flex items-center space-x-3 text-[#FF6B35]">
                <div className="p-2.5 bg-[#FF6B35]/15 rounded-xl border border-[#FF6B35]/20 animate-pulse">
                  <Navigation className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#FF6B35]">
                    Live Telemetry Follow
                  </h3>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Follow {followWorkerPrompt.toUpperCase()} Forklift?
                  </h4>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                The camera will automatically lock on to the vehicle's spatial
                coordinates and track its pathfinding route in real-time across
                the warehouse floor.
              </p>

              <div className="flex items-center gap-3 pt-2 font-mono text-[10px]">
                <button
                  onClick={() => {
                    setFollowingWorkerId(followWorkerPrompt);
                    setRoute("twin");
                    setFollowWorkerPrompt(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#FF8A5B] text-black font-extrabold transition-all uppercase tracking-wider text-center"
                >
                  Yes, Follow
                </button>
                <button
                  onClick={() => {
                    setFollowWorkerPrompt(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-350 border border-zinc-700/50 font-bold transition-all uppercase tracking-wider text-center"
                >
                  No, Ignore
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
