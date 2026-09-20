import { TransformControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildGeometry } from '../model/shapes'
import { connectionPoints } from '../model/points'
import type { ArrObject, Vec3 } from '../model/types'
import { useStore } from '../store'

const DEG = Math.PI / 180

// a click on the gizmo without a drag still counts as a pointer miss, this flag suppresses the deselect
export const gizmo = { active: false }

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
    updateObject(obj.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x / DEG, g.rotation.y / DEG, g.rotation.z / DEG],
    })
  }

  const showGizmo = selected && tool !== 'connect'
  const is2d = mode === '2d'

  return (
    <>
      <group ref={ref} position={obj.position} rotation={rotation}>
        <mesh
          geometry={geometry}
          onClick={(e) => {
            if (tool === 'connect') return
            e.stopPropagation()
            select(obj.id)
          }}
        >
          <meshLambertMaterial color={obj.color} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={selected ? '#ffffff' : '#141414'} />
        </lineSegments>
        {tool === 'connect' && <PointDots obj={obj} />}
      </group>
      {showGizmo && (
        <TransformControls
          object={ref}
          mode={tool === 'rotate' ? 'rotate' : 'translate'}
          showX={tool === 'move' || !is2d}
          showY={tool === 'move' || !is2d}
          showZ={tool === 'rotate' || !is2d}
          onObjectChange={syncFromGizmo}
          onMouseDown={() => { gizmo.active = true }}
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
