import React from "react";
import { Grid, Line } from "@react-three/drei";
type Shelf = any;
import { ForkliftWorker } from "./ForkliftWorker";
import { ZoneBoundary } from "./ZoneBoundary";
import { ShelfGroup } from "./ShelfGroup";
import { CameraController } from "./CameraController";

export const WarehouseScene: React.FC<{
  shelves: Record<string, Shelf>;
  onSelectShelf: (shelf: Shelf) => void;
  focusedShelfId: string | null;
  activePath: [number, number, number][] | null;
  workers: Record<string, any>;
  resetTrigger: number;
  onResetDone: () => void;
  controlsRef: React.RefObject<any>;
}> = ({
  shelves,
  onSelectShelf,
  focusedShelfId,
  activePath,
  workers,
  resetTrigger,
  onResetDone,
  controlsRef,
}) => {
  const focusedShelfPos =
    focusedShelfId && shelves[focusedShelfId]
      ? shelves[focusedShelfId].position
      : null;

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[-10, 20, -10]} intensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial
          color="#0B0B0D"
          roughness={0.95}
          metalness={0.1}
        />
      </mesh>

      <Grid
        position={[0, -0.49, 0]}
        args={[32, 32]}
        cellSize={1.0}
        cellThickness={1.0}
        cellColor="#22252C"
        sectionSize={4.0}
        sectionThickness={1.2}
        sectionColor="#22252C"
        fadeDistance={25}
      />

      <ZoneBoundary
        name="Zone A"
        position={[-4, 0, 0]}
        size={[3.5, 2.5, 6]}
        color="#22252C"
      />
      <ZoneBoundary
        name="Zone B"
        position={[0, 0, 0]}
        size={[3.5, 2.5, 6]}
        color="#22252C"
      />
      <ZoneBoundary
        name="Zone C"
        position={[4, 0, 0]}
        size={[3.5, 2.5, 6]}
        color="#22252C"
      />
      <ZoneBoundary
        name="Hazard Storage"
        position={[-8, 0, 0]}
        size={[3.5, 2.5, 10]}
        color="#EF4444"
      />
      <ZoneBoundary
        name="Cold Storage"
        position={[8, 0, 0]}
        size={[3.5, 2.5, 10]}
        color="#FF6B35"
      />

      {Object.values(shelves).map((shelf) => (
        <ShelfGroup
          key={shelf.id}
          shelf={shelf}
          onSelect={onSelectShelf}
          isFocused={focusedShelfId === shelf.id}
        />
      ))}

      <Line 
        points={activePath && activePath.length > 0 ? activePath : [[0, 0, 0], [0, 0, 0]]} 
        color="#FF6B35" 
        lineWidth={4} 
        visible={!!(activePath && activePath.length > 0)}
      />

      {Object.values(workers).map((worker) => (
        <React.Fragment key={worker.id}>
          <Line
            points={worker.path && worker.path.length > 0 ? worker.path : [[0, 0, 0], [0, 0, 0]]}
            color={worker.color}
            lineWidth={1.5}
            dashed={true}
            dashScale={1.5}
            visible={!!(worker.path && worker.path.length > 0 && worker.status !== "idle")}
          />
          <ForkliftWorker
            position={worker.position}
            label={worker.label}
            status={worker.status}
            color={worker.color}
            progress={worker.progress}
            name={worker.name}
          />
        </React.Fragment>
      ))}

      <CameraController
        focusedShelfPos={focusedShelfPos}
        resetTrigger={resetTrigger}
        onResetDone={onResetDone}
        controlsRef={controlsRef}
      />
    </>
  );
};
