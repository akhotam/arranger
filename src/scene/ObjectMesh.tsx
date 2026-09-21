import { TransformControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildGeometry } from '../model/shapes'
import { connectionPoints } from '../model/points'
import type { ArrObject, Vec3 } from '../model/types'
import { useStore } from '../store'

const DEG = Math.PI / 180

// a click on the gizmo without a drag still counts as a pointer miss, this flag suppresses the deselect
export const gizmo = { active: false }

// three-stdlib bakes each 'bwd' translate arrow pointing inward
// when an axis faces away from the camera the gizmo mirrors that arrow to the near end, leaving it pointing at the object
// sharing the 'fwd' geometry makes the mirrored arrow point outward along its line
function fixArrowDirections(controls: THREE.Object3D | null) {
  controls?.traverse((o) => {
    const handle = o as THREE.Mesh & { tag?: string }
    if (handle.tag !== 'bwd') return
    const fwd = handle.parent?.children.find((c) => c.name === handle.name && (c as { tag?: string }).tag === 'fwd') as THREE.Mesh | undefined
    if (!fwd || handle.geometry === fwd.geometry) return
    handle.geometry.dispose()
    handle.geometry = fwd.geometry
  })
}

export function ObjectMesh({ obj }: { obj: ArrObject }) {
  const ref = useRef<THREE.Group>(null!)
  const selected = useStore((s) => s.selectedId === obj.id)
  const tool = useStore((s) => s.tool)
  const mode = useStore((s) => s.mode)
  const select = useStore((s) => s.select)
  const updateObject = useStore((s) => s.updateObject)

  const geometry = useMemo(() => buildGeometry(obj.shape, obj.size), [obj.shape, obj.size.w, obj.size.d, obj.size.h])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 30), [geometry])
  useEffect(() => () => { geometry.dispose(); edges.dispose() }, [geometry, edges])

  const rotation = useMemo<Vec3>(() => [obj.rotation[0] * DEG, obj.rotation[1] * DEG, obj.rotation[2] * DEG], [obj.rotation])

  const syncFromGizmo = () => {
    const g = ref.current
    if (!g) return
    updateObject(obj.id, { position: [g.position.x, g.position.y, g.position.z], rotation: [g.rotation.x / DEG, g.rotation.y / DEG, g.rotation.z / DEG] })
    // R3F skips an unchanged prop, a group pulled past a wall or a neighbour needs the resolved pose written back by hand
    const resolved = useStore.getState().project?.objects.find((o) => o.id === obj.id)
    if (!resolved) return
    g.position.set(...resolved.position)
    g.rotation.set(resolved.rotation[0] * DEG, resolved.rotation[1] * DEG, resolved.rotation[2] * DEG)
  }

  // body drag slides the object on a floor-parallel plane through its centre
  const drag = useRef<{ plane: THREE.Plane; offset: THREE.Vector3 } | null>(null)
  const hitPoint = (e: ThreeEvent<PointerEvent>, plane: THREE.Plane) => e.ray.intersectPlane(plane, new THREE.Vector3())

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (tool === 'connect' || e.button !== 0 || gizmo.active) return
    e.stopPropagation()
    select(obj.id)
    if (tool !== 'move') return
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -obj.position[2])
    const hit = hitPoint(e, plane)
    if (!hit) return
    drag.current = { plane, offset: new THREE.Vector3(...obj.position).sub(hit) }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const hit = hitPoint(e, drag.current.plane)
    if (!hit) return
    const p = hit.add(drag.current.offset)
    updateObject(obj.id, { position: [p.x, p.y, p.z] })
  }
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as Element).releasePointerCapture(e.pointerId)
  }

  const showGizmo = selected && tool !== 'connect'
  const is2d = mode === '2d'

  return (
    <>
      <group ref={ref} position={obj.position} rotation={rotation}>
        <mesh geometry={geometry} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <meshLambertMaterial color={obj.color} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={selected ? '#ffffff' : '#141414'} />
        </lineSegments>
        {tool === 'connect' && <PointDots obj={obj} />}
      </group>
      {showGizmo && (
        <TransformControls
          ref={fixArrowDirections}
          object={ref}
          mode={tool === 'rotate' ? 'rotate' : 'translate'}
          showX={tool === 'move' || !is2d}
          showY={tool === 'move' || !is2d}
          showZ={tool === 'rotate' || !is2d}
          onObjectChange={syncFromGizmo}
          // R3F raycasts straight through the gizmo pickers, a press on an arrow also starts a body drag on the mesh beneath
          onMouseDown={() => { gizmo.active = true; drag.current = null }}
          onMouseUp={() => { setTimeout(() => { gizmo.active = false }) }}
        />
      )}
    </>
  )
}

function PointDots({ obj }: { obj: ArrObject }) {
  const pending = useStore((s) => s.pendingPoint)
  const pickPoint = useStore((s) => s.pickPoint)
  const points = useMemo(() => connectionPoints(obj.shape, obj.size), [obj.shape, obj.size.w, obj.size.d, obj.size.h])
  const radius = Math.max(obj.size.w, obj.size.d, obj.size.h) * 0.025
  const sphere = useMemo(() => new THREE.SphereGeometry(radius, 8, 8), [radius])
  useEffect(() => () => sphere.dispose(), [sphere])

  return (
    <>
      {points.map((p) => {
        const isPending = pending?.objectId === obj.id && pending.pointId === p.id
        return (
          <mesh
            key={p.id}
            geometry={sphere}
            position={p.pos}
            onClick={(e) => {
              e.stopPropagation()
              pickPoint({ objectId: obj.id, pointId: p.id })
            }}
            onPointerOver={(e) => { e.stopPropagation(); (e.object as THREE.Mesh).scale.setScalar(1.6) }}
            onPointerOut={(e) => { (e.object as THREE.Mesh).scale.setScalar(1) }}
          >
            <meshBasicMaterial color={isPending ? '#ffd166' : '#ffffff'} depthTest={false} transparent opacity={0.9} />
          </mesh>
        )
      })}
    </>
  )
}
