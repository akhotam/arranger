import * as THREE from 'three'
import { wedgeFootprint } from './shapes'
import type { ArrObject, Shape, Size, Vec3 } from './types'

export interface ConnectionPoint {
  id: string
  pos: Vec3
  normal: Vec3 // unit outward direction in local space, zero when undefined
}

interface Face {
  pos: Vec3
  normal: Vec3
}

interface Skeleton {
  vertices: Vec3[]
  edges: [number, number][]
  faces: Face[]
}

const EDGE_FRACTIONS = [0.25, 0.5, 0.75]

const vec = (v: Vec3) => new THREE.Vector3(...v)

const unit = (v: THREE.Vector3): Vec3 => (v.lengthSq() < 1e-12 ? [0, 0, 0] : v.normalize().toArray())

// ids encode structure not coordinates, a resize keeps every id valid
function fromSkeleton({ vertices, edges, faces }: Skeleton): ConnectionPoint[] {
  const points: ConnectionPoint[] = vertices.map((pos, i) => ({ id: `v${i}`, pos, normal: unit(vec(pos)) }))
  edges.forEach(([a, b], i) => {
    const [ax, ay, az] = vertices[a]
    const [bx, by, bz] = vertices[b]
    // component of the edge line perpendicular to the origin, constant along the edge
    const dir = vec(vertices[b]).sub(vec(vertices[a])).normalize()
    const normal = unit(vec(vertices[a]).addScaledVector(dir, -vec(vertices[a]).dot(dir)))
    for (const t of EDGE_FRACTIONS) {
      points.push({
        id: `e${i}_${t * 100}`,
        pos: [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t],
        normal,
      })
    }
  })
  faces.forEach(({ pos, normal }, i) => points.push({ id: `f${i}`, pos, normal }))
  return points
}

function boxSkeleton({ w, d, h }: Size): Skeleton {
  const x = w / 2, y = d / 2, z = h / 2
  return {
    vertices: [
      [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
      [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ],
    faces: [
      { pos: [0, 0, -z], normal: [0, 0, -1] },
      { pos: [0, 0, z], normal: [0, 0, 1] },
      { pos: [0, -y, 0], normal: [0, -1, 0] },
      { pos: [x, 0, 0], normal: [1, 0, 0] },
      { pos: [0, y, 0], normal: [0, 1, 0] },
      { pos: [-x, 0, 0], normal: [-1, 0, 0] },
    ],
  }
}

function wedgeSkeleton({ w, d, h }: Size): Skeleton {
  const z = h / 2
  const tri = wedgeFootprint(w, d)
  const bottom: Vec3[] = tri.map(([x, y]) => [x, y, -z])
  const top: Vec3[] = tri.map(([x, y]) => [x, y, z])
  const centroid = (pts: Vec3[]): Vec3 => [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
    pts.reduce((s, p) => s + p[2], 0) / pts.length,
  ]
  return {
    vertices: [...bottom, ...top],
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]],
    faces: [
      { pos: centroid(bottom), normal: [0, 0, -1] },
      { pos: centroid(top), normal: [0, 0, 1] },
      { pos: centroid([bottom[0], bottom[1], top[1], top[0]]), normal: [0, -1, 0] },
      { pos: centroid([bottom[1], bottom[2], top[2], top[1]]), normal: unit(new THREE.Vector3(d, w, 0)) },
      { pos: centroid([bottom[2], bottom[0], top[0], top[2]]), normal: [-1, 0, 0] },
    ],
  }
}

const rim = (r: number, z: number): Vec3[] => [[r, 0, z], [0, r, z], [-r, 0, z], [0, -r, z]]

function cylinderSkeleton({ w, h }: Size): Skeleton {
  const r = w / 2, z = h / 2
  return {
    vertices: [[0, 0, -z], [0, 0, z], ...rim(r, -z), ...rim(r, z)],
    edges: [[2, 6], [3, 7], [4, 8], [5, 9]],
    faces: [],
  }
}

function coneSkeleton({ w, h }: Size): Skeleton {
  const r = w / 2, z = h / 2
  return {
    vertices: [[0, 0, -z], [0, 0, z], ...rim(r, -z)],
    edges: [[1, 2], [1, 3], [1, 4], [1, 5]],
    faces: [],
  }
}

function sphereSkeleton({ w }: Size): Skeleton {
  const r = w / 2
  return {
    vertices: [[0, 0, 0], [r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]],
    edges: [],
    faces: [],
  }
}

const SKELETONS: Record<Shape, (size: Size) => Skeleton> = {
  box: boxSkeleton,
  wedge: wedgeSkeleton,
  cylinder: cylinderSkeleton,
  cone: coneSkeleton,
  sphere: sphereSkeleton,
}

export function connectionPoints(shape: Shape, size: Size): ConnectionPoint[] {
  return fromSkeleton(SKELETONS[shape](size))
}

export function findPoint(obj: ArrObject, pointId: string): ConnectionPoint | undefined {
  return connectionPoints(obj.shape, obj.size).find((p) => p.id === pointId)
}

const DEG = Math.PI / 180

const euler = ([rx, ry, rz]: Vec3) => new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'XYZ')

export function worldPoint(obj: ArrObject, local: Vec3): Vec3 {
  return vec(local).applyEuler(euler(obj.rotation)).add(vec(obj.position)).toArray()
}

export function worldDir(obj: ArrObject, local: Vec3): Vec3 {
  return vec(local).applyEuler(euler(obj.rotation)).toArray()
}

const HANDLE = 0.4

// bezier control points leaving each end along its normal, a zero normal heads straight for the other end
export function curveHandles(a: Vec3, na: Vec3, b: Vec3, nb: Vec3): [Vec3, Vec3] {
  const ab = vec(b).sub(vec(a))
  const len = ab.length() * HANDLE
  const da = vec(na).lengthSq() > 0 ? vec(na) : ab.clone().normalize()
  const db = vec(nb).lengthSq() > 0 ? vec(nb) : ab.clone().negate().normalize()
  return [vec(a).addScaledVector(da, len).toArray(), vec(b).addScaledVector(db, len).toArray()]
}
