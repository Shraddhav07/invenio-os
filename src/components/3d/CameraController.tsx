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

  useFrame((state, delta) => {
    // If a reset was triggered
    if (resetTrigger > lastReset.current) {
      isLerpingShelf.current = false;
      
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 5);
      }
      state.camera.position.lerp(new THREE.Vector3(0, 14, 16), delta * 5);
      
      if (state.camera.position.distanceTo(new THREE.Vector3(0, 14, 16)) < 0.5) {
         lastReset.current = resetTrigger;
         onResetDone();
      }
    } else if (isLerpingShelf.current && focusedShelfPos) {
      const targetVec = new THREE.Vector3(focusedShelfPos[0], focusedShelfPos[1], focusedShelfPos[2]);
      // Position camera above and slightly pulled back from the focused shelf
      const camPos = new THREE.Vector3(focusedShelfPos[0], focusedShelfPos[1] + 6, focusedShelfPos[2] + 8);
      
      state.camera.position.lerp(camPos, delta * 4);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetVec, delta * 4);
      }

      if (state.camera.position.distanceTo(camPos) < 0.2) {
        isLerpingShelf.current = false;
      }
    }
  });

  return null;
};
