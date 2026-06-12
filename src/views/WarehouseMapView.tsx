import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useInvenioStore } from "../store/store";
import { WarehouseScene } from "../components/3d/WarehouseScene";
import type { Shelf } from "../store/types";

export const WarehouseMapView: React.FC = () => {
  const { shelves, focusedShelfId, activePath, workers } = useInvenioStore();

  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [resetTrigger, setResetTrigger] = useState(-1);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (selectedShelf && shelves[selectedShelf.id]) {
      setSelectedShelf(shelves[selectedShelf.id]);
    }
  }, [shelves, selectedShelf]);

  useEffect(() => {
    if (focusedShelfId && shelves[focusedShelfId]) {
      setSelectedShelf(shelves[focusedShelfId]);
    }
  }, [focusedShelfId, shelves]);

  // You can now keep the rest of your 2D UI (HUD, Sidebar) exactly as it is!
  // Insert the <Canvas> component and render your new <WarehouseScene /> inside it.

  return (
    <div className="w-full h-full relative flex overflow-hidden bg-[#0B0B0D]">
      {/* HUD Elements omitted for brevity */}

      <div className="flex-1 h-full canvas-container bg-[#0B0B0D] relative">
        <Canvas camera={{ position: [0, 14, 16], fov: 50 }}>
          <WarehouseScene
            shelves={shelves}
            onSelectShelf={setSelectedShelf}
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
