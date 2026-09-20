import { Grid } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'

// drei Grid lies in local XZ, this rotation drops it onto the world floor
const GRID_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0]

export function SpaceView() {
  const space = useStore((s) => s.project?.space)
  const mode = useStore((s) => s.mode)
  const bounded = space?.kind === 'bounded' ? space : null

  const outline = useMemo(
    () => (bounded ? new THREE.EdgesGeometry(new THREE.PlaneGeometry(bounded.w, bounded.d)) : null),
    [bounded?.w, bounded?.d],
  )
  const box = useMemo(
    () => (bounded ? new THREE.EdgesGeometry(new THREE.BoxGeometry(bounded.w, bounded.d, bounded.h)) : null),
    [bounded?.w, bounded?.d, bounded?.h],
  )

  if (!space) return null

  if (!bounded) {
    return <Grid rotation={GRID_ROTATION} infiniteGrid cellSize={10} sectionSize={100} fadeDistance={5000} cellColor="#444" sectionColor="#666" />
  }

  const { w, d, h } = bounded
  const cell = Math.pow(10, Math.floor(Math.log10(Math.max(w, d))) - 1)
  return (
    <group position={[w / 2, d / 2, 0]}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#2e2e2e" />
      </mesh>
      <Grid rotation={GRID_ROTATION} args={[w, d]} cellSize={cell} sectionSize={cell * 10} fadeDistance={1e9} fadeStrength={0} cellColor="#444" sectionColor="#777" />
      <lineSegments geometry={outline!}>
        <lineBasicMaterial color="#aaa" />
      </lineSegments>
      {mode === '3d' && (
        <lineSegments geometry={box!} position={[0, 0, h / 2]}>
          <lineBasicMaterial color="#666" />
        </lineSegments>
      )}
    </group>
  )
}
