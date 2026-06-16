import React, { useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { DaySnapshot, getFloorStatus, FloorData, hasRectification, InspectionStatus, Task } from '../data/constructionData'

const FLOOR_W = 6
const FLOOR_H = 1.05
const FLOOR_D = 4
const GAP = 0.08

const FLOOR_COLORS: Record<string, string> = {
  completed: '#4ade80',
  'in-progress': '#38bdf8',
  pending: '#64748b',
}

const RECTIFICATION_COLOR = '#fbbf24'
const PENDING_COLOR = '#64748b'
const ACCEPTED_COLOR = '#4ade80'

const INSPECTION_COLORS: Record<InspectionStatus, string> = {
  accepted: ACCEPTED_COLOR,
  pending: PENDING_COLOR,
  rejected: RECTIFICATION_COLOR,
}

interface TaskBarProps {
  task: Task
  index: number
  total: number
}

function TaskBar({ task, index, total }: TaskBarProps) {
  const fillRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const topLightRef = useRef<THREE.Mesh>(null!)
  const { inspection, progress } = task
  const isRejected = inspection === 'rejected'
  const isAccepted = inspection === 'accepted'
  const isPending = inspection === 'pending'
  const barColor = INSPECTION_COLORS[inspection]

  const barW = 0.75
  const barH = FLOOR_H * 0.78
  const spacing = (FLOOR_W - 0.6) / (total - 1)
  const x = -FLOOR_W / 2 + 0.3 + index * spacing
  const z = FLOOR_D / 2 + 0.1

  const fillHeight = barH * Math.max(0.05, progress / 100)

  useFrame((state) => {
    if (isRejected) {
      const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 2.5 + index * 0.5) * 0.6
      if (glowRef.current) {
        ;(glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + pulse * 0.8
      }
      if (topLightRef.current) {
        ;(topLightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + pulse * 0.8
      }
    }
  })

  const fillY = -barH / 2 + fillHeight / 2

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[barW, barH, 0.1]} />
        <meshStandardMaterial
          color="#0b1220"
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0.98}
        />
      </mesh>

      <mesh ref={fillRef} position={[0, fillY, 0.06]}>
        <boxGeometry args={[barW - 0.12, fillHeight - 0.05, 0.06]} />
        <meshStandardMaterial
          color={barColor}
          emissive={barColor}
          emissiveIntensity={isRejected ? 0.8 : isAccepted ? 0.55 : 0.3}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>

      {isRejected && (
        <mesh ref={glowRef} position={[0, 0, 0.12]}>
          <boxGeometry args={[barW + 0.2, barH + 0.2, 0.01]} />
          <meshStandardMaterial
            color={RECTIFICATION_COLOR}
            emissive={RECTIFICATION_COLOR}
            emissiveIntensity={0.9}
            transparent
            opacity={0.35}
          />
        </mesh>
      )}

      <mesh ref={topLightRef} position={[0, FLOOR_H / 2 + 0.18, 0]}>
        <boxGeometry args={[barW * 0.9, 0.12, FLOOR_D + 0.2]} />
        <meshStandardMaterial
          color={barColor}
          emissive={barColor}
          emissiveIntensity={isRejected ? 0.9 : isAccepted ? 0.5 : 0.25}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={isPending && progress < 100 ? 0.5 : 0.85}
        />
      </mesh>

      {isPending && progress >= 100 && (
        <mesh position={[0, barH / 2 + 0.1, 0.06]}>
          <boxGeometry args={[barW, 0.1, 0.06]} />
          <meshStandardMaterial
            color={PENDING_COLOR}
            emissive={PENDING_COLOR}
            emissiveIntensity={0.6}
            roughness={0.3}
          />
        </mesh>
      )}

      <mesh position={[0, -barH / 2 - 0.1, 0.06]}>
        <boxGeometry args={[barW, 0.08, 0.05]} />
        <meshStandardMaterial
          color={barColor}
          emissive={barColor}
          emissiveIntensity={isRejected ? 0.9 : 0.5}
          roughness={0.25}
        />
      </mesh>
    </group>
  )
}

interface FloorMeshProps {
  floor: FloorData
  index: number
  snapshot: DaySnapshot
  hovered: number | null
  setHovered: (v: number | null) => void
  setTooltipData: (v: { x: number; y: number; floor: FloorData } | null) => void
  flyTo: (idx: number) => void
}

function FloorMesh({ floor, index, snapshot, hovered, setHovered, setTooltipData, flyTo }: FloorMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const edgeRef = useRef<THREE.LineSegments>(null!)
  const status = getFloorStatus(floor)
  const hasRect = hasRectification(floor)
  const baseColor = FLOOR_COLORS[status]
  const color = hasRect ? RECTIFICATION_COLOR : baseColor
  const isHovered = hovered === index
  const y = index * (FLOOR_H + GAP) + FLOOR_H / 2

  useFrame((state) => {
    if (!meshRef.current) return
    const targetScale = isHovered ? 1.06 : 1
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1)
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.1)

    if (edgeRef.current && hasRect) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.5
      ;(edgeRef.current.material as THREE.LineBasicMaterial).opacity = 0.3 + pulse * 0.5
    }
  })

  const handlePointerOver = useCallback((e: THREE.Event & { clientX?: number; clientY?: number }) => {
    setHovered(index)
    if (e.clientX !== undefined && e.clientY !== undefined) {
      setTooltipData({ x: e.clientX, y: e.clientY, floor })
    }
  }, [index, floor, setHovered, setTooltipData])

  const handlePointerOut = useCallback(() => {
    setHovered(null)
    setTooltipData(null)
  }, [setHovered, setTooltipData])

  const handleClick = useCallback(() => {
    flyTo(index)
  }, [index, flyTo])

  const barGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(FLOOR_W + 0.12, 0.06, FLOOR_D + 0.12)
    return geo
  }, [])

  const edgeGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(FLOOR_W * 1.02, FLOOR_H * 1.05, FLOOR_D * 1.02)
    const edges = new THREE.EdgesGeometry(geo)
    return edges
  }, [])

  return (
    <group position={[0, y, 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[FLOOR_W, FLOOR_H, FLOOR_D]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.1}
          transparent
          opacity={isHovered ? 0.95 : 0.85}
        />
      </mesh>

      {hasRect && (
        <lineSegments ref={edgeRef} geometry={edgeGeo}>
          <lineBasicMaterial color={RECTIFICATION_COLOR} transparent opacity={0.6} linewidth={2} />
        </lineSegments>
      )}

      <mesh position={[0, FLOOR_H / 2 + 0.03, 0]} geometry={barGeo}>
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.0} />
      </mesh>

      {floor.tasks.map((task, ti) => (
        <TaskBar
          key={task.name}
          task={task}
          index={ti}
          total={floor.tasks.length}
        />
      ))}

      {floor.tasks.map((task, ti) => {
        const barW = 0.7
        const barH = FLOOR_H * 0.75
        const spacing = (FLOOR_W - 0.8) / (floor.tasks.length - 1)
        const x = -FLOOR_W / 2 + 0.4 + ti * spacing
        const inspColor = INSPECTION_COLORS[task.inspection]
        const isRej = task.inspection === 'rejected'
        return (
          <group key={`back-${task.name}`} position={[x, 0, -FLOOR_D / 2 - 0.08]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[barW, barH, 0.08]} />
              <meshStandardMaterial
                color="#0f172a"
                roughness={0.6}
                metalness={0.2}
                transparent
                opacity={0.95}
              />
            </mesh>
            <mesh position={[0, -barH / 2 + Math.max(0.04, task.progress / 100) * barH / 2, 0.05]}>
              <boxGeometry args={[barW - 0.1, Math.max(0.04, task.progress / 100) * barH - 0.04, 0.05]} />
              <meshStandardMaterial
                color={inspColor}
                emissive={inspColor}
                emissiveIntensity={isRej ? 0.7 : 0.35}
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          </group>
        )
      })}

      {Array.from({ length: 3 }).map((_, wi) => (
        <React.Fragment key={wi}>
          <mesh position={[-1.5 + wi * 1.5, 0, FLOOR_D / 2 + 0.01]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshStandardMaterial
              color={status === 'completed' ? '#bae6fd' : status === 'in-progress' ? (hasRect ? '#fef3c7' : '#e0f2fe') : '#334155'}
              emissive={status === 'completed' ? '#38bdf8' : status === 'in-progress' ? (hasRect ? '#fbbf24' : '#38bdf8') : '#000000'}
              emissiveIntensity={0.15}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[-1.5 + wi * 1.5, 0, -FLOOR_D / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshStandardMaterial
              color={status === 'completed' ? '#bae6fd' : status === 'in-progress' ? (hasRect ? '#fef3c7' : '#e0f2fe') : '#334155'}
              emissive={status === 'completed' ? '#38bdf8' : status === 'in-progress' ? (hasRect ? '#fbbf24' : '#38bdf8') : '#000000'}
              emissiveIntensity={0.15}
              transparent
              opacity={0.7}
            />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0f172a" roughness={1} metalness={0} />
    </mesh>
  )
}

function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, '#1e293b', '#1e293b']}
      position={[0, -0.04, 0]}
    />
  )
}

interface SceneContentProps {
  snapshot: DaySnapshot
  hovered: number | null
  setHovered: (v: number | null) => void
  setTooltipData: (v: { x: number; y: number; floor: FloorData } | null) => void
  focusFloor: number | null
}

function SceneContent({ snapshot, hovered, setHovered, setTooltipData, focusFloor }: SceneContentProps) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 4, 14))
  const lookRef = useRef(new THREE.Vector3(0, 4, 0))
  const active = useRef(false)
  const controlsRef = useRef<any>(null)

  const flyTo = useCallback((floorIndex: number) => {
    const y = floorIndex * (FLOOR_H + GAP) + FLOOR_H / 2 + 1.5
    targetRef.current.set(5, y, 8)
    lookRef.current.set(0, y - 0.5, 0)
    active.current = true
  }, [])

  useFrame(() => {
    if (!active.current) return
    camera.position.lerp(targetRef.current, 0.04)
    const d = camera.position.distanceTo(targetRef.current)
    if (d < 0.05) {
      active.current = false
    }
    if (controlsRef.current) {
      controlsRef.current.target.lerp(lookRef.current, 0.04)
    }
  })

  React.useEffect(() => {
    if (focusFloor !== null) {
      flyTo(focusFloor)
    }
  }, [focusFloor, flyTo])

  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 25, 50]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 15, 8]} intensity={0.9} color="#e2e8f0" castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#38bdf8" />
      <pointLight position={[0, 20, 0]} intensity={0.2} color="#38bdf8" />

      <Ground />
      <GridFloor />

      {snapshot.floors.map((floor, i) => (
        <FloorMesh
          key={floor.id}
          floor={floor}
          index={i}
          snapshot={snapshot}
          hovered={hovered}
          setHovered={setHovered}
          setTooltipData={setTooltipData}
          flyTo={flyTo}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={true}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 4, 0]}
      />

      <Environment preset="city" />
    </>
  )
}

interface SceneProps {
  snapshot: DaySnapshot
  hovered: number | null
  setHovered: (v: number | null) => void
  setTooltipData: (v: { x: number; y: number; floor: FloorData } | null) => void
  focusFloor: number | null
}

function Scene({ snapshot, hovered, setHovered, setTooltipData, focusFloor }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [12, 12, 14], fov: 45 }}
      style={{ background: 'transparent' }}
    >
      <SceneContent
        snapshot={snapshot}
        hovered={hovered}
        setHovered={setHovered}
        setTooltipData={setTooltipData}
        focusFloor={focusFloor}
      />
    </Canvas>
  )
}

export default Scene
