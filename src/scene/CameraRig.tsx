import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import type { Space } from '../model/types'

const UNBOUNDED_EXTENT = 500

function extents(space: Space): { cx: number; cy: number; w: number; d: number } {
  if (space.kind === 'bounded') return { cx: space.w / 2, cy: space.d / 2, w: space.w, d: space.d }
  return { cx: 0, cy: 0, w: UNBOUNDED_EXTENT, d: UNBOUNDED_EXTENT }
}

export function CameraRig() {
  const mode = useStore((s) => s.mode)
  const space = useStore((s) => s.project?.space)
  const size = useThree((s) => s.size)
  const { cx, cy, w, d } = useMemo(() => extents(space ?? { kind: 'unbounded' }), [space])
  const far = Math.max(w, d) * 20

  if (mode === '2d') {
    // pixels per unit, leaving a margin around the space
    const zoom = Math.min(size.width / w, size.height / d) * 0.85
    return (
      <>
        <OrthographicCamera key="ortho" makeDefault position={[cx, cy, far / 2]} up={[0, 1, 0]} zoom={zoom} near={0.1} far={far} />
        <OrbitControls
          key="ortho-controls"
          makeDefault
          target={[cx, cy, 0]}
          enableRotate={false}
          mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
          zoomToCursor
        />
      </>
    )
  }

  const dist = Math.max(w, d)
  return (
    <>
      <PerspectiveCamera key="persp" makeDefault position={[cx - dist * 0.8, cy - dist * 0.9, dist * 0.7]} fov={45} near={0.1} far={far} />
      <OrbitControls
        key="persp-controls"
        makeDefault
        target={[cx, cy, 0]}
        mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN }}
      />
    </>
  )
}
