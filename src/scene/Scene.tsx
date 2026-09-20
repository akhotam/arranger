import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { CameraRig } from './CameraRig'
import { ConnectionLines } from './ConnectionLines'
import { gizmo, ObjectMesh } from './ObjectMesh'
import { SpaceView } from './SpaceView'

// Blender convention, floor is XY and Z points up
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

export function Scene() {
  const objects = useStore((s) => s.project?.objects ?? [])
  const select = useStore((s) => s.select)

  return (
    <Canvas
      onPointerMissed={() => { if (!gizmo.active) select(null) }}
      onCreated={({ gl }) => { gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault()) }}
    >
      <color attach="background" args={['#222']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, -3, 5]} intensity={1.2} />
      <directionalLight position={[-3, 2, 1]} intensity={0.4} />
      <CameraRig />
      <SpaceView />
      {objects.map((o) => (
        <ObjectMesh key={o.id} obj={o} />
      ))}
      <ConnectionLines />
    </Canvas>
  )
}
