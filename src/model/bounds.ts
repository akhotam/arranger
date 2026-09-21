import * as THREE from 'three'
import { buildGeometry } from './shapes'
import type { ArrObject, Space, Vec3 } from './types'

const DEG = Math.PI / 180

export function worldGeometry(obj: ArrObject): THREE.BufferGeometry {
  const [rx, ry, rz] = obj.rotation
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'XYZ'))
  m.setPosition(...obj.position)
  return buildGeometry(obj.shape, obj.size).applyMatrix4(m)
}

// mesh vertices bound exactly what renders, rotated round shapes need no analytic extents
export function worldBounds(obj: ArrObject): THREE.Box3 {
  const g = worldGeometry(obj)
  g.computeBoundingBox()
  return g.boundingBox!
}

// shifts position to keep every part inside a bounded space, an oversized object pins to the origin side
export function clampToSpace(space: Space, obj: ArrObject): Vec3 {
  if (space.kind !== 'bounded') return obj.position
  const { min, max } = worldBounds(obj)
  const limit = [space.w, space.d, space.h]
  return obj.position.map((p, i) => {
    const over = Math.max(0, max.getComponent(i) - limit[i])
    const under = Math.min(0, min.getComponent(i) - over)
    return p - over - under
  }) as Vec3
}
