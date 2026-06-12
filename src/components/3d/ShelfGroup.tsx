import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Shelf } from "../../store/types";
import { useInvenioStore } from "../../store/store";
import { getShelfCapacity } from "../../store/utils";
interface ShelfGroupProps {
  shelf: Shelf;
  onSelect: (shelf: Shelf) => void;
  isFocused: boolean;
}

export const ShelfGroup: React.FC<ShelfGroupProps> = ({
  shelf,
  onSelect,
  isFocused,
}) => {
  const { status, position } = shelf;
  const [hovered, setHovered] = useState(false);
  const { inventory, focusedItemSku } = useInvenioStore();

  const shelfItems = inventory.filter((item) => item.currentShelf === shelf.id);
  const totalQty = shelfItems.reduce((acc, item) => acc + item.quantity, 0);
  const capacity = getShelfCapacity(shelf.id);
  const occupiedPercent = Math.min(
    100,
    Math.round((totalQty / capacity) * 100),
  );

  const getStatusMaterial = () => {
    if (status === "verified")
      return {
        color: "#22C55E",
        emissive: "#22C55E",
        emissiveIntensity: hovered ? 0.4 : 0.1,
      };
    if (status === "pending")
      return {
        color: "#F59E0B",
        emissive: "#F59E0B",
        emissiveIntensity: hovered ? 0.5 : 0.2,
      };
    return {
      color: "#EF4444",
      emissive: "#EF4444",
      emissiveIntensity: hovered ? 0.7 : 0.3,
    };
  };

  const pulseRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      pulseRef.current.emissiveIntensity =
        0.5 + Math.sin(clock.getElapsedTime() * 8) * 0.5;
    }
  });

  const slotPositions: [number, number, number][] = [
    [-0.4, -0.15, 0],
    [0.4, -0.15, 0],
    [-0.4, 0.55, 0],
    [0.4, 0.55, 0],
    [0, 1.25, 0],
  ];

  // Add your existing 'REC' shelf logic here from the original file...
  // For brevity, standard shelf rendering is shown below:

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(shelf);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[-0.75, 0.4, -0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#4A4E54"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0.75, 0.4, -0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#4A4E54"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[-0.75, 0.4, 0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#4A4E54"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0.75, 0.4, 0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#4A4E54"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.7]} />
        <meshStandardMaterial color="#171A20" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.7]} />
        <meshStandardMaterial color="#171A20" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.7]} />
        <meshStandardMaterial color="#171A20" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.12]} />
        <meshStandardMaterial {...getStatusMaterial()} roughness={0.1} />
      </mesh>

      {isFocused && (
        <group position={[0, 0.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.1, 1.2, 32]} />
            <meshBasicMaterial
              color="#FF6B35"
              side={THREE.DoubleSide}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.16, 0.35, 4]} />
            <meshBasicMaterial color="#FF6B35" />
          </mesh>
        </group>
      )}

      <Html position={[0, 1.75, 0]} center distanceFactor={14}>
        <div className="px-1.5 py-0.5 text-[7px] font-mono font-bold rounded bg-[#121317]/90 border border-zinc-800 text-zinc-400 select-none whitespace-nowrap">
          {shelf.name}: {occupiedPercent}% Full
        </div>
      </Html>

      {shelfItems.slice(0, 5).map((item, idx) => (
        <group key={item.sku} position={slotPositions[idx]}>
          <mesh>
            <boxGeometry args={[0.32, 0.32, 0.42]} />
            <meshStandardMaterial
              ref={focusedItemSku === item.sku ? pulseRef : null}
              color={
                focusedItemSku === item.sku
                  ? "#FF6B35"
                  : item.status === "error"
                    ? "#EF4444"
                    : "#C29B72"
              }
              emissive={focusedItemSku === item.sku ? "#FF6B35" : undefined}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
