import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useInvenioStore } from "../store/store";
import { WarehouseScene } from "../components/3d/WarehouseScene";


export const WarehouseMapView: React.FC = () => {
  const { shelves, focusedShelfId, activePath, workers } = useInvenioStore();

  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);


  const [resetTrigger, setResetTrigger] = useState(-1);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (focusedShelfId && shelves[focusedShelfId]) {
      setSelectedShelfId(focusedShelfId);
    }
  }, [focusedShelfId, shelves]);

  // You can now keep the rest of your 2D UI (HUD, Sidebar) exactly as it is!
  // Insert the <Canvas> component and render your new <WarehouseScene /> inside it.

  return (
    <div className="w-full h-full relative flex overflow-hidden bg-[#0B0B0D]">
      {/* HUD Elements omitted for brevity */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={() => {
            useInvenioStore.getState().clearActivePath();
            setSelectedShelfId(null);
            setResetTrigger(Date.now());
          }}
          className="bg-[#121317]/80 backdrop-blur-md border border-[#22252C] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#171A20] hover:border-[#FF6B35]/50 transition-all shadow-lg"
        >
          Reset Camera & Path
        </button>
      </div>

      <div className="flex-1 h-full canvas-container bg-[#0B0B0D] relative">
        <Canvas camera={{ position: [0, 14, 16], fov: 50 }}>
          <WarehouseScene
            shelves={shelves}
            onSelectShelf={(shelf) => setSelectedShelfId(shelf?.id || null)}
            focusedShelfId={focusedShelfId}
            activePath={activePath}
            workers={workers}
            resetTrigger={resetTrigger}
            onResetDone={() => setResetTrigger(-1)}
            controlsRef={controlsRef}
          />
          <OrbitControls
            ref={controlsRef}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={4}
            maxDistance={28}
          />
        </Canvas>
      </div>

      {/* Detail Drawer Sidebar omitted for brevity */}
    </div>
  );
};
