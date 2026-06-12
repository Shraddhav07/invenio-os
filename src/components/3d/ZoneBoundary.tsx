import React from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface ZoneBoundaryProps {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export const ZoneBoundary: React.FC<ZoneBoundaryProps> = ({
  name,
  position,
  size,
  color,
}) => {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <planeGeometry args={[size[0], size[2]]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, size[1] / 2 - 0.5, 0]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
      </mesh>

      <Html position={[0, size[1] / 2 + 0.3, 0]} center distanceFactor={12}>
        <div className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border border-zinc-800 bg-[#121317] text-zinc-300 pointer-events-none select-none whitespace-nowrap">
          {name}
        </div>
      </Html>
    </group>
  );
};
