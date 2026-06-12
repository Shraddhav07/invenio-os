import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface ForkliftWorkerProps {
  position: [number, number, number];
  label: string;
  status: string;
  color: string;
  progress: number;
  name: string;
}

export const ForkliftWorker: React.FC<ForkliftWorkerProps> = ({
  position,
  label,
  status,
  color,
  progress,
  name,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const carriesLoad = status === "moving_to_shelf" || status === "placing_item";
  const isYielding = label.includes("Yield");

  const smoothPos = useRef(new THREE.Vector3(...position));
  const lastTarget = useRef<[number, number, number]>(position);

  if (
    Math.abs(position[0] - lastTarget.current[0]) > 2.5 ||
    Math.abs(position[2] - lastTarget.current[2]) > 2.5
  ) {
    smoothPos.current.set(...position);
  }
  lastTarget.current = position;

  useFrame((_state, delta) => {
    if (groupRef.current) {
      const targetPos = new THREE.Vector3(...position);
      smoothPos.current.lerp(targetPos, Math.min(1.0, delta * 9.5));
      groupRef.current.position.copy(smoothPos.current);

      const diff = new THREE.Vector3().subVectors(targetPos, smoothPos.current);
      if (diff.lengthSq() > 0.002) {
        const angle = Math.atan2(diff.x, diff.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          angle,
          delta * 8.0,
        );
      }
    }
  });

  return (
    <group ref={groupRef}>
      {isYielding && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 16]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0.6} />
        </mesh>
      )}

      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.35, 1.3]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.35, -0.5]}>
        <boxGeometry args={[0.9, 0.5, 0.3]} />
        <meshStandardMaterial color="#22252C" metalness={0.8} />
      </mesh>

      <mesh position={[-0.5, 0.15, 0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 16]} />
        <meshStandardMaterial color="#171A20" roughness={0.9} />
      </mesh>
      <mesh position={[0.5, 0.15, 0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 16]} />
        <meshStandardMaterial color="#171A20" roughness={0.9} />
      </mesh>
      <mesh position={[-0.5, 0.15, -0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 16]} />
        <meshStandardMaterial color="#171A20" roughness={0.9} />
      </mesh>
      <mesh position={[0.5, 0.15, -0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 16]} />
        <meshStandardMaterial color="#171A20" roughness={0.9} />
      </mesh>

      <mesh position={[-0.38, 0.65, 0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>
      <mesh position={[0.38, 0.65, 0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>
      <mesh position={[-0.38, 0.65, -0.4]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>
      <mesh position={[0.38, 0.65, -0.4]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>

      <mesh position={[0, 0.95, -0.15]}>
        <boxGeometry args={[0.8, 0.03, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 0.7, 0.68]}>
        <boxGeometry args={[0.5, 0.9, 0.05]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0.76]}>
        <boxGeometry args={[0.6, 0.08, 0.15]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>

      <mesh position={[-0.2, 0.15, 0.95]}>
        <boxGeometry args={[0.08, 0.02, 0.45]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.95} />
      </mesh>
      <mesh position={[0.2, 0.15, 0.95]}>
        <boxGeometry args={[0.08, 0.02, 0.45]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.95} />
      </mesh>

      {carriesLoad && (
        <mesh position={[0, 0.34, 0.95]}>
          <boxGeometry args={[0.55, 0.35, 0.45]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.8} />
        </mesh>
      )}

      <Html position={[0, 1.6, 0]} center distanceFactor={14}>
        <div
          className={`px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-[#121317] text-white shadow-xl whitespace-nowrap select-none pointer-events-none flex flex-col space-y-0.5 transition-all ${isYielding ? "ring-2 ring-red-500 animate-pulse" : ""}`}
        >
          <div className="flex items-center space-x-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] font-extrabold text-white">{name}</span>
          </div>
          <div
            className={`text-[8px] font-medium ${isYielding ? "text-red-400" : "text-zinc-400"}`}
          >
            {label}
          </div>
          {status !== "idle" && !isYielding && (
            <div className="flex items-center space-x-2 pt-0.5">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden w-16">
                <div
                  className="h-full bg-[#FF6B35] transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-[#FF6B35] font-bold">
                {Math.round(progress * 100)}% Complete
              </span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
