import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useInvenioStore } from "../../store/store";

interface CameraControllerProps {
  focusedShelfPos: [number, number, number] | null;
  resetTrigger: number;
  onResetDone: () => void;
  controlsRef: React.RefObject<any>;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  focusedShelfPos,
  resetTrigger,
  onResetDone,
  controlsRef,
}) => {
  const { camera } = useThree();
  const lastReset = useRef(-1);
  const { followingWorkerId, workers, focusedShelfId } = useInvenioStore();

  const lastFollowedWorkerId = useRef<string | null>(null);
  const lastTarget = useRef<THREE.Vector3 | null>(null);
  const lastFocusedShelfId = useRef<string | null>(null);
  const isLerpingShelf = useRef(false);

  if (followingWorkerId !== lastFollowedWorkerId.current) {
    lastFollowedWorkerId.current = followingWorkerId;
    lastTarget.current = null;
  }

  if (focusedShelfId !== lastFocusedShelfId.current) {
    lastFocusedShelfId.current = focusedShelfId;
    if (focusedShelfId) isLerpingShelf.current = true;
  }

  // Add the useFrame logic here exactly as it is in your original file
  // (Omitted for brevity)

  return null;
};
