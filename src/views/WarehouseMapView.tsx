import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useInvenioStore, type Shelf, getShelfCapacity, isShelfAllowedForCategory, getRecommendedZones } from '../store/store'
import { MapPin, Navigation, Info, X, Zap, Clock, RotateCcw } from 'lucide-react'

// Stylized forklift vehicle representation using primitive geometries
const ForkliftWorker: React.FC<{ 
  position: [number, number, number] 
  label: string 
  status: string 
  color: string
  progress: number
  name: string
}> = ({ position, label, status, color, progress, name }) => {
  const groupRef = useRef<THREE.Group>(null)
  const carriesLoad = status === 'moving_to_shelf' || status === 'placing_item'
  const isYielding = label.includes('Yield')

  // Smooth position and rotation tracking refs
  const smoothPos = useRef(new THREE.Vector3(...position))
  const lastTarget = useRef<[number, number, number]>(position)

  // Snap position if it's a huge teleport (e.g. initial setup or manual override resets)
  if (
    Math.abs(position[0] - lastTarget.current[0]) > 2.5 ||
    Math.abs(position[2] - lastTarget.current[2]) > 2.5
  ) {
    smoothPos.current.set(...position)
  }
  lastTarget.current = position

  useFrame((_state, delta) => {
    if (groupRef.current) {
      const targetPos = new THREE.Vector3(...position)
      // Smoothly lerp towards target coordinate
      smoothPos.current.lerp(targetPos, Math.min(1.0, delta * 9.5))
      groupRef.current.position.copy(smoothPos.current)

      // Rotate group toward movement vector
      const diff = new THREE.Vector3().subVectors(targetPos, smoothPos.current)
      if (diff.lengthSq() > 0.002) {
        const angle = Math.atan2(diff.x, diff.z)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, delta * 8.0)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Yield Warning Aura */}
      {isYielding && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 16]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Chassis */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.35, 1.3]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Back counterweight */}
      <mesh position={[0, 0.35, -0.5]} >
        <boxGeometry args={[0.9, 0.5, 0.3]} />
        <meshStandardMaterial color="#22252C" metalness={0.8} />
      </mesh>

      {/* Wheels */}
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

      {/* Cabin cage */}
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
      {/* Roof */}
      <mesh position={[0, 0.95, -0.15]}>
        <boxGeometry args={[0.8, 0.03, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Lift Mast */}
      <mesh position={[0, 0.7, 0.68]}>
        <boxGeometry args={[0.5, 0.9, 0.05]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.9} />
      </mesh>

      {/* Fork carriage */}
      <mesh position={[0, 0.3, 0.76]}>
        <boxGeometry args={[0.6, 0.08, 0.15]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>

      {/* Forks */}
      <mesh position={[-0.2, 0.15, 0.95]}>
        <boxGeometry args={[0.08, 0.02, 0.45]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.95} />
      </mesh>
      <mesh position={[0.2, 0.15, 0.95]}>
        <boxGeometry args={[0.08, 0.02, 0.45]} />
        <meshStandardMaterial color="#A1A1AA" metalness={0.95} />
      </mesh>

      {/* Cargo box on forks */}
      {carriesLoad && (
        <mesh position={[0, 0.34, 0.95]}>
          <boxGeometry args={[0.55, 0.35, 0.45]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.8} />
        </mesh>
      )}

      {/* Floating Task indicator */}
      <Html position={[0, 1.6, 0]} center distanceFactor={14}>
        <div className={`px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-[#121317] text-white shadow-xl whitespace-nowrap select-none pointer-events-none flex flex-col space-y-0.5 transition-all ${
          isYielding ? 'ring-2 ring-red-500 animate-pulse' : ''
        }`}>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-extrabold text-white">{name}</span>
          </div>
          <div className={`text-[8px] font-medium ${isYielding ? 'text-red-400' : 'text-zinc-400'}`}>
            {label}
          </div>
          {status !== 'idle' && !isYielding && (
            <div className="flex items-center space-x-2 pt-0.5">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden w-16">
                <div className="h-full bg-[#FF6B35] transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <span className="text-[7px] font-mono text-[#FF6B35] font-bold">{Math.round(progress * 100)}% Complete</span>
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

// Zone Outline Box helper
const ZoneBoundary: React.FC<{ 
  name: string
  position: [number, number, number]
  size: [number, number, number]
  color: string 
}> = ({ name, position, size, color }) => {
  return (
    <group position={position}>
      {/* Floor plane boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <planeGeometry args={[size[0], size[2]]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Wireframe boundary box */}
      <mesh position={[0, size[1] / 2 - 0.5, 0]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
      </mesh>

      {/* HTML floating label */}
      <Html position={[0, size[1] / 2 + 0.3, 0]} center distanceFactor={12}>
        <div className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border border-zinc-800 bg-[#121317] text-zinc-300 pointer-events-none select-none whitespace-nowrap">
          {name}
        </div>
      </Html>
    </group>
  )
}

// Shelf Mesh that renders and registers clicks
const ShelfGroup: React.FC<{ 
  shelf: Shelf
  onSelect: (shelf: Shelf) => void
  isFocused: boolean
}> = ({ shelf, onSelect, isFocused }) => {
  const { status, position } = shelf
  const [hovered, setHovered] = useState(false)
  const { inventory, focusedItemSku } = useInvenioStore()

  // Calculate real occupancy percentage rate
  const shelfItems = inventory.filter(item => item.currentShelf === shelf.id)
  const totalQty = shelfItems.reduce((acc, item) => acc + item.quantity, 0)
  const capacity = getShelfCapacity(shelf.id)
  const occupiedPercent = Math.min(100, Math.round((totalQty / capacity) * 100))

  // Color mapping based on status
  const getStatusMaterial = () => {
    if (status === 'verified') return { color: '#22C55E', emissive: '#22C55E', emissiveIntensity: hovered ? 0.4 : 0.1 }
    if (status === 'pending') return { color: '#F59E0B', emissive: '#F59E0B', emissiveIntensity: hovered ? 0.5 : 0.2 }
    return { color: '#EF4444', emissive: '#EF4444', emissiveIntensity: hovered ? 0.7 : 0.3 } // misplaced
  }

  const matProps = getStatusMaterial()

  // Pulse effect ref for targeted shelf items
  const pulseRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const time = clock.getElapsedTime()
      pulseRef.current.emissiveIntensity = 0.5 + Math.sin(time * 8) * 0.5
    }
  })

  // Slot coordinates for boxes
  const slotPositions: [number, number, number][] = [
    [-0.4, -0.15, 0],
    [0.4, -0.15, 0],
    [-0.4, 0.55, 0],
    [0.4, 0.55, 0],
    [0, 1.25, 0]
  ]

  const isRec = shelf.id === 'REC'

  if (isRec) {
    const recSlotPositions: [number, number, number][] = [
      [-0.6, 0.15, -0.3],
      [-0.2, 0.15, -0.3],
      [0.2, 0.15, -0.3],
      [0.6, 0.15, -0.3],
      [-0.6, 0.15, 0.3],
      [-0.2, 0.15, 0.3],
      [0.2, 0.15, 0.3],
      [0.6, 0.15, 0.3],
    ]
    
    const usedSlots = shelfItems.reduce((acc, curr) => acc + Math.ceil(curr.quantity / 10), 0)

    return (
      <group 
        position={position}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(shelf)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Draw subtle yellow outline for floor receiving dock boundary */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <planeGeometry args={[1.8, 1.4]} />
          <meshBasicMaterial color={hovered ? "#FF6B35" : "#F59E0B"} transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Dock Outline border */}
        <mesh position={[0, -0.39, 0]}>
          <boxGeometry args={[1.8, 0.02, 1.4]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.8} transparent opacity={0.3} />
        </mesh>

        {/* Highlight pointer if focused */}
        {isFocused && (
          <group position={[0, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.1, 1.2, 32]} />
              <meshBasicMaterial color="#FF6B35" side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.16, 0.35, 4]} />
              <meshBasicMaterial color="#FF6B35" />
            </mesh>
          </group>
        )}

        {/* Dynamic Occupancy Rate Tag */}
        <Html position={[0, 0.8, 0]} center distanceFactor={14}>
          <div className="px-1.5 py-0.5 text-[7px] font-mono font-bold rounded bg-[#121317]/90 border border-amber-500/30 text-amber-500 select-none whitespace-nowrap">
            Receiving Area: {usedSlots}/20 Slots
          </div>
        </Html>

        {/* Render actual boxes on the floor */}
        {(() => {
          const boxesToRender: { sku: string; name: string; isFocusedItem: boolean }[] = []
          shelfItems.forEach(item => {
            const slotsNeeded = Math.ceil(item.quantity / 20)
            for (let i = 0; i < slotsNeeded; i++) {
              boxesToRender.push({
                sku: `${item.sku}-${i}`,
                name: item.name,
                isFocusedItem: focusedItemSku === item.sku
              })
            }
          })
          
          return boxesToRender.slice(0, 8).map((box, idx) => {
            const pos = recSlotPositions[idx] || [0, 0.15, 0]
            return (
              <group key={box.sku} position={pos}>
                <mesh>
                  <boxGeometry args={[0.32, 0.25, 0.42]} />
                  {box.isFocusedItem ? (
                    <meshStandardMaterial 
                      ref={pulseRef}
                      color="#FF6B35" 
                      emissive="#FF6B35"
                      emissiveIntensity={0.8}
                      roughness={0.1}
                    />
                  ) : (
                    <meshStandardMaterial 
                      color="#C29B72" 
                      roughness={0.7} 
                    />
                  )}
                </mesh>
                {box.isFocusedItem && idx === 0 && (
                  <Html position={[0, 0.35, 0]} center distanceFactor={11}>
                    <div className="px-2 py-0.5 bg-[#FF6B35] text-white border border-white/20 rounded shadow-[0_0_12px_#FF6B35] text-[7px] font-extrabold uppercase whitespace-nowrap animate-bounce">
                      LOCATED
                    </div>
                  </Html>
                )}
              </group>
            )
          })
        })()}
      </group>
    )
  }

  return (
    <group 
      position={position} 
      onClick={(e) => {
        e.stopPropagation()
        onSelect(shelf)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {/* Corner Pillars (High-contrast metal rack columns) */}
      <mesh position={[-0.75, 0.4, -0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial color="#4A4E54" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.75, 0.4, -0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial color="#4A4E54" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.75, 0.4, 0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial color="#4A4E54" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.75, 0.4, 0.35]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial color="#4A4E54" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Horizontal Shelves */}
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

      {/* Status indicator bar at top of shelf */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.12]} />
        <meshStandardMaterial {...matProps} roughness={0.1} />
      </mesh>

      {/* Highlight pointer if focused by AI navigation */}
      {isFocused && (
        <group position={[0, 0.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.1, 1.2, 32]} />
            <meshBasicMaterial color="#FF6B35" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.16, 0.35, 4]} />
            <meshBasicMaterial color="#FF6B35" />
          </mesh>
        </group>
      )}

      {/* Dynamic Shelf Occupancy Rate Tag */}
      <Html position={[0, 1.75, 0]} center distanceFactor={14}>
        <div className="px-1.5 py-0.5 text-[7px] font-mono font-bold rounded bg-[#121317]/90 border border-zinc-800 text-zinc-400 select-none whitespace-nowrap">
          {shelf.name}: {occupiedPercent}% Full
        </div>
      </Html>

      {/* Render actual storage boxes based on items assigned */}
      {shelfItems.slice(0, 5).map((item, idx) => {
        const isFocusedItem = focusedItemSku === item.sku
        const pos = slotPositions[idx]
        const baseColor = item.status === 'error' ? '#EF4444' : '#C29B72'

        return (
          <group key={item.sku} position={pos}>
            <mesh>
              <boxGeometry args={[0.32, 0.32, 0.42]} />
              {isFocusedItem ? (
                <meshStandardMaterial 
                  ref={pulseRef}
                  color="#FF6B35" 
                  emissive="#FF6B35"
                  emissiveIntensity={0.8}
                  roughness={0.1}
                />
              ) : (
                <meshStandardMaterial 
                  color={baseColor} 
                  roughness={0.7} 
                />
              )}
            </mesh>
            {isFocusedItem && (
              <Html position={[0, 0.35, 0]} center distanceFactor={11}>
                <div className="px-2 py-0.5 bg-[#FF6B35] text-white border border-white/20 rounded shadow-[0_0_12px_#FF6B35] text-[7px] font-extrabold uppercase whitespace-nowrap animate-bounce">
                  LOCATED
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

// Controller for Camera lerp to focused shelf or active worker
const CameraController: React.FC<{ 
  focusedShelfPos: [number, number, number] | null;
  resetTrigger: number;
  onResetDone: () => void;
  controlsRef: React.RefObject<any>;
}> = ({ focusedShelfPos, resetTrigger, onResetDone, controlsRef }) => {
  const { camera } = useThree()
  const lastReset = useRef(-1)
  const { followingWorkerId, workers, focusedShelfId } = useInvenioStore()
  
  // Follow vehicle tracking state
  const lastFollowedWorkerId = useRef<string | null>(null)
  const lastTarget = useRef<THREE.Vector3 | null>(null)

  // Shelf focus transition state
  const lastFocusedShelfId = useRef<string | null>(null)
  const isLerpingShelf = useRef(false)

  // Reset tracking state if followingWorkerId changes
  if (followingWorkerId !== lastFollowedWorkerId.current) {
    lastFollowedWorkerId.current = followingWorkerId
    lastTarget.current = null
  }

  // Detect shelf focus change
  if (focusedShelfId !== lastFocusedShelfId.current) {
    lastFocusedShelfId.current = focusedShelfId
    if (focusedShelfId) {
      isLerpingShelf.current = true
    }
  }

  useFrame((_state, delta) => {
    if (resetTrigger > lastReset.current) {
      // Lerp camera back to default view
      const targetCamX = 0
      const targetCamY = 14
      const targetCamZ = 16
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, delta * 3.5)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, delta * 3.5)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, delta * 3.5)
      
      if (controlsRef.current) {
        const ctrl = controlsRef.current
        ctrl.target.x = THREE.MathUtils.lerp(ctrl.target.x, 0, delta * 3.5)
        ctrl.target.y = THREE.MathUtils.lerp(ctrl.target.y, 0, delta * 3.5)
        ctrl.target.z = THREE.MathUtils.lerp(ctrl.target.z, 0, delta * 3.5)
        ctrl.update()
      }
      
      const dist = Math.sqrt(
        Math.pow(camera.position.x - targetCamX, 2) +
        Math.pow(camera.position.y - targetCamY, 2) +
        Math.pow(camera.position.z - targetCamZ, 2)
      )
      if (dist < 0.1) {
        lastReset.current = resetTrigger
        onResetDone()
      }
    } else if (followingWorkerId && workers[followingWorkerId]) {
      // Follow active forklift worker in real-time
      const workerPos = workers[followingWorkerId].position
      const currentTarget = new THREE.Vector3(workerPos[0], workerPos[1] + 0.5, workerPos[2])
      
      if (controlsRef.current) {
        const ctrl = controlsRef.current
        
        if (!lastTarget.current) {
          // Put the camera at a nice default viewing distance relative to the worker: further back and higher!
          const offset = new THREE.Vector3(0, 6.5, 9.0)
          camera.position.copy(currentTarget).add(offset)
          ctrl.target.copy(currentTarget)
        } else {
          // Smoothly shift target position first
          const prevTarget = ctrl.target.clone()
          
          ctrl.target.x = THREE.MathUtils.lerp(ctrl.target.x, currentTarget.x, delta * 4.5)
          ctrl.target.y = THREE.MathUtils.lerp(ctrl.target.y, currentTarget.y, delta * 4.5)
          ctrl.target.z = THREE.MathUtils.lerp(ctrl.target.z, currentTarget.z, delta * 4.5)
          
          // Move the camera by the smooth difference of the target's displacement this frame
          const shift = new THREE.Vector3().subVectors(ctrl.target, prevTarget)
          camera.position.add(shift)
        }
        
        ctrl.update()
        lastTarget.current = currentTarget.clone()
      }
    } else if (focusedShelfPos && isLerpingShelf.current) {
      // Lerp camera position closer to shelf with safe offset
      const targetCamX = focusedShelfPos[0]
      const targetCamY = focusedShelfPos[1] + 3.0 // further back
      const targetCamZ = focusedShelfPos[2] + 6.5 // further back
      
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, delta * 3.5)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, delta * 3.5)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, delta * 3.5)
      
      if (controlsRef.current) {
        const ctrl = controlsRef.current
        ctrl.target.x = THREE.MathUtils.lerp(ctrl.target.x, focusedShelfPos[0], delta * 3.5)
        ctrl.target.y = THREE.MathUtils.lerp(ctrl.target.y, focusedShelfPos[1] + 0.5, delta * 3.5)
        ctrl.target.z = THREE.MathUtils.lerp(ctrl.target.z, focusedShelfPos[2], delta * 3.5)
        ctrl.update()
      }

      // Stop lerping if camera is close enough to target to allow user rotation
      const dist = Math.sqrt(
        Math.pow(camera.position.x - targetCamX, 2) +
        Math.pow(camera.position.y - targetCamY, 2) +
        Math.pow(camera.position.z - targetCamZ, 2)
      )
      if (dist < 0.1) {
        isLerpingShelf.current = false
      }
    }
  })
  
  return null
}

const WarehouseScene: React.FC<{ 
  shelves: Record<string, Shelf>;
  onSelectShelf: (shelf: Shelf) => void;
  focusedShelfId: string | null;
  activePath: [number, number, number][] | null;
  workers: Record<string, any>;
  resetTrigger: number;
  onResetDone: () => void;
  controlsRef: React.RefObject<any>;
}> = ({ shelves, onSelectShelf, focusedShelfId, activePath, workers, resetTrigger, onResetDone, controlsRef }) => {
  
  // Find focus shelf coordinates
  const focusedShelfPos = focusedShelfId && shelves[focusedShelfId] 
    ? shelves[focusedShelfId].position 
    : null

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-10, 20, -10]} intensity={0.3} />
      
      {/* Overhead Spotlights fixture */}
      <group position={[0, 8, 0]}>
        <mesh position={[0, 0, -5]}>
          <boxGeometry args={[24, 0.08, 0.08]} />
          <meshStandardMaterial color="#22252C" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[24, 0.08, 0.08]} />
          <meshStandardMaterial color="#22252C" />
        </mesh>
        <mesh position={[0, 0, 5]}>
          <boxGeometry args={[24, 0.08, 0.08]} />
          <meshStandardMaterial color="#22252C" />
        </mesh>
        
        {[-10, -5, 0, 5, 10].map((x) => (
          <React.Fragment key={x}>
            <mesh position={[x, -0.1, 0]}>
              <cylinderGeometry args={[0.12, 0.16, 0.3, 16]} />
              <meshStandardMaterial color="#121317" metalness={0.8} />
            </mesh>
            <spotLight 
              position={[x, -0.3, 0]} 
              angle={Math.PI / 4.5} 
              penumbra={0.6} 
              intensity={1.5} 
              distance={12} 
              color="#FFFFFF"
            />
          </React.Fragment>
        ))}
      </group>

      {/* Warehouse Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#0B0B0D" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Grid helpers */}
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

      {/* Zones outlines */}
      <ZoneBoundary name="Zone A" position={[-4, 1, 0]} size={[3.5, 2.5, 6]} color="#22252C" />
      <ZoneBoundary name="Zone B" position={[0, 1, 0]} size={[3.5, 2.5, 6]} color="#22252C" />
      <ZoneBoundary name="Zone C" position={[4, 1, 0]} size={[3.5, 2.5, 6]} color="#22252C" />
      <ZoneBoundary name="Hazard Storage" position={[-8, 1, 0]} size={[3.5, 2.5, 10]} color="#EF4444" />
      <ZoneBoundary name="Cold Storage" position={[8, 1, 0]} size={[3.5, 2.5, 10]} color="#FF6B35" />
      
      {/* Dock zones */}
      <ZoneBoundary name="Receiving Area" position={[0, 0.6, 9]} size={[6, 1.2, 3]} color="#22252C" />
      <ZoneBoundary name="Dispatch Area" position={[6, 0.6, 9]} size={[4, 1.2, 3]} color="#22252C" />

      {/* Entrance structure mock */}
      <mesh position={[0, 0.1, 11]}>
        <boxGeometry args={[1.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#22252C" />
      </mesh>

      {/* Shelves */}
      {Object.values(shelves).map((shelf) => (
        <ShelfGroup 
          key={shelf.id} 
          shelf={shelf} 
          onSelect={onSelectShelf} 
          isFocused={focusedShelfId === shelf.id}
        />
      ))}

      {/* Search Route Path */}
      {activePath && activePath.length > 0 && (
        <Line 
          points={activePath} 
          color="#FF6B35" 
          lineWidth={4} 
          dashed={false} 
        />
      )}

      {/* Forklift Paths - render dynamically for all active workers */}
      {Object.values(workers).map((worker) => {
        if (worker.path && worker.status !== 'idle') {
          return (
            <Line 
              key={worker.id}
              points={worker.path} 
              color={worker.color} 
              lineWidth={1.5} 
              dashed={true} 
              dashScale={1.5}
            />
          )
        }
        return null
      })}

      {/* Forklift Workers */}
      {Object.values(workers).map((worker) => (
        <ForkliftWorker 
          key={worker.id}
          position={worker.position} 
          label={worker.label} 
          status={worker.status} 
          color={worker.color}
          progress={worker.progress}
          name={worker.name}
        />
      ))}

      {/* Camera controller tracking */}
      <CameraController 
        focusedShelfPos={focusedShelfPos} 
        resetTrigger={resetTrigger}
        onResetDone={onResetDone}
        controlsRef={controlsRef}
      />
    </>
  )
}


export const WarehouseMapView: React.FC = () => {
  const { 
    shelves, 
    focusedShelfId, 
    activePath, 
    pathDistance, 
    pathETA, 
    clearActivePath,
    inventory,
    workers,
    followingWorkerId,
    setFollowingWorkerId
  } = useInvenioStore()
  
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null)
  const [resetTrigger, setResetTrigger] = useState(-1)
  const controlsRef = useRef<any>(null)

  // Sync selected shelf state
  useEffect(() => {
    if (selectedShelf) {
      const updated = shelves[selectedShelf.id]
      if (updated) {
        setSelectedShelf(updated)
      }
    }
  }, [shelves, selectedShelf])

  // Reset selected shelf when pathfinding starts focusing something else
  useEffect(() => {
    if (focusedShelfId && shelves[focusedShelfId]) {
      setSelectedShelf(shelves[focusedShelfId])
    }
  }, [focusedShelfId, shelves])

  const shelfItems = selectedShelf 
    ? inventory.filter(item => item.currentShelf === selectedShelf.id || (item.assignedShelf === selectedShelf.id && item.status === 'verified'))
    : []

  return (
    <div className="w-full h-full relative flex overflow-hidden bg-[#0B0B0D]">
      {/* 3D Render Canvas container */}
      <div className="flex-1 h-full canvas-container bg-[#0B0B0D] relative">
        {/* Floating Controls HUD */}
        <div className="absolute top-4 left-4 z-10 p-3.5 bg-[#121317] border border-[#22252C] rounded-lg flex flex-col space-y-2 max-w-xs text-zinc-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-white">Digital Twin View</h2>
          </div>
          <p className="text-[9px] text-[#A1A1AA] leading-relaxed">
            Drag to rotate, right-click to pan, scroll to zoom. Click on a shelf to view its active item registry tags.
          </p>

          {followingWorkerId && (
            <div className="flex items-center justify-between bg-[#FF6B35]/10 border border-[#FF6B35]/30 p-2 rounded-md my-1">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-ping" />
                <span className="text-[9px] font-bold text-white uppercase font-mono">Tracking: {followingWorkerId.toUpperCase()}</span>
              </div>
              <button 
                onClick={() => setFollowingWorkerId(null)}
                className="text-zinc-500 hover:text-zinc-350 transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3 text-[9px] pt-1.5 border-t border-[#22252C]">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span>Verified</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span>Misplaced</span>
            </div>
          </div>

          {/* Reset Camera View Button */}
          <button
            onClick={() => {
              setResetTrigger(Date.now());
              setFollowingWorkerId(null);
            }}
            className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 mt-2 bg-[#FF6B35]/10 hover:bg-[#FF6B35]/25 border border-[#FF6B35]/30 text-[#FF6B35] rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Camera View</span>
          </button>
        </div>

        {/* AI Navigation HUD */}
        {activePath && (
          <div className="absolute bottom-4 left-4 z-10 p-4 bg-[#121317] border border-[#FF6B35]/30 rounded-lg w-72 flex flex-col space-y-2 text-zinc-300 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-[#FF6B35] animate-bounce" />
                <span className="text-[10px] font-bold text-[#FF6B35] tracking-wide uppercase">AI Pathfinding Active</span>
              </div>
              <button 
                onClick={clearActivePath}
                className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded bg-zinc-800/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-[#171A20] border border-[#22252C] p-2 rounded flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#FF6B35]" />
                <div>
                  <div className="text-[8px] text-[#A1A1AA] uppercase tracking-wider leading-none">Distance</div>
                  <div className="text-[11px] font-bold text-white mt-1 font-mono leading-none">{pathDistance} m</div>
                </div>
              </div>
              
              <div className="bg-[#171A20] border border-[#22252C] p-2 rounded flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#FF6B35]" />
                <div>
                  <div className="text-[8px] text-[#A1A1AA] uppercase tracking-wider leading-none">Walk ETA</div>
                  <div className="text-[11px] font-bold text-white mt-1 font-mono leading-none">{pathETA} sec</div>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <OrbitControls ref={controlsRef} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={4} maxDistance={28} />
        </Canvas>
      </div>

      {/* Info / Detail Drawer Panel */}
      <div className={`w-80 h-full border-l border-[#22252C] bg-[#121317] flex flex-col transition-all duration-300 ${
        selectedShelf ? 'translate-x-0' : 'translate-x-full absolute right-0'
      } z-10`}>
        {selectedShelf && (
          <>
            {/* Shelf Title & Status Header */}
            <div className="p-4 border-b border-[#22252C] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4.5 h-4.5 text-[#FF6B35]" />
                <div>
                  <h3 className="text-xs font-bold text-white">{selectedShelf.name}</h3>
                  <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA]">Zone: {selectedShelf.zone}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedShelf(null)
                  if (focusedShelfId === selectedShelf.id) {
                    clearActivePath()
                  }
                }}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Health Meter Card */}
            <div className="p-4 border-b border-[#22252C]/50 bg-black/10">
              <span className="text-[9px] uppercase tracking-widest text-[#A1A1AA]">Node Status Indicator</span>
              <div className="mt-2 flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedShelf.status === 'verified' ? 'bg-[#22C55E]' :
                  selectedShelf.status === 'pending' ? 'bg-[#F59E0B]' :
                  'bg-[#EF4444]'
                }`} />
                <span className="text-xs font-medium text-white">
                  {selectedShelf.status === 'verified' ? 'Verified' :
                   selectedShelf.status === 'pending' ? 'Pending Verification' :
                   'Misplaced'}
                </span>
              </div>
            </div>

            {/* Content Inventory list */}
            <div className="flex-1 p-4 overflow-y-auto">
              <span className="text-[9px] uppercase tracking-widest text-[#A1A1AA] mb-2 block">Item Registry</span>
              {shelfItems.length === 0 ? (
                <div className="py-12 text-center text-[#A1A1AA] border border-dashed border-[#22252C] rounded-lg flex flex-col items-center">
                  <Info className="w-5 h-5 text-zinc-600 mb-2" />
                  <span className="text-[10px] font-medium">No items scanned</span>
                  <span className="text-[8px] text-zinc-600 mt-1">Sensor data stream is empty</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shelfItems.map((item) => {
                    const isAllowed = isShelfAllowedForCategory(item.category, selectedShelf.id, shelves)
                    return (
                      <div 
                        key={item.sku} 
                        className={`p-3 rounded-lg border flex flex-col space-y-1.5 transition-all ${
                          item.status === 'error' || !isAllowed ? 'bg-[#EF4444]/5 border-[#EF4444]/20' : 
                          item.status === 'pending' ? 'bg-[#F59E0B]/5 border-[#F59E0B]/20' : 
                          'bg-[#171A20] border-[#22252C]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white">{item.name}</span>
                          <span className="text-[9px] font-mono text-[#A1A1AA]">{item.sku}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#22252C]/60">
                          <span className="text-zinc-500">Category: <span className="text-zinc-400 font-medium">{item.category}</span></span>
                          <span className="text-zinc-500">Qty: <span className="text-[#FF6B35] font-mono font-bold">{item.quantity}</span></span>
                        </div>
                        {item.status === 'error' && item.currentShelf !== 'REC' && item.assignedShelf !== selectedShelf.id && (
                          <div className="mt-1 bg-[#EF4444]/10 p-1.5 rounded border border-[#EF4444]/20 text-[9px] text-[#EF4444] leading-normal">
                            Assigned to <strong>{item.assignedShelf}</strong>, scanned here.
                          </div>
                        )}
                        {!isAllowed && (
                          <div className="mt-1.5 bg-[#EF4444]/10 p-2 rounded border border-[#EF4444]/30 text-[9px] text-[#EF4444] leading-relaxed">
                            <span className="font-bold block uppercase tracking-wide text-[7px] mb-0.5">Category-to-Zone Violation</span>
                            Category "{item.category}" is not permitted in {selectedShelf.zone}.
                            <div className="mt-1 text-zinc-400">Recommended Zones: {getRecommendedZones(item.category).join(', ')}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Telemetry stats */}
            <div className="p-4 border-t border-[#22252C] bg-black/20 text-[9px] text-[#A1A1AA] space-y-2">
              <div className="flex justify-between">
                <span>Spatial Coordinates:</span>
                <span className="font-mono text-zinc-300">[{selectedShelf.position.join(', ')}]</span>
              </div>
              <div className="flex justify-between">
                <span>Receiver ID:</span>
                <span className="font-mono text-[#FF6B35]">ESP32-PN532-{selectedShelf.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Signal Strength:</span>
                <span className="font-mono text-zinc-300">-64 dBm</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
