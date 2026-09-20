import * as THREE from 'three'
import { wedgeFootprint } from './shapes'
import type { ArrObject, Shape, Size, Vec3 } from './types'

export interface ConnectionPoint {
  id: string
  pos: Vec3
}

interface Skeleton {
  vertices: Vec3[]
  edges: [number, number][]
  faces: Vec3[]
}

const EDGE_FRACTIONS = [0.25, 0.5, 0.75]

// ids encode structure not coordinates, a resize keeps every id valid
function fromSkeleton({ vertices, edges, faces }: Skeleton): ConnectionPoint[] {
  const points: ConnectionPoint[] = vertices.map((pos, i) => ({ id: `v${i}`, pos }))
  edges.forEach(([a, b], i) => {
    const [ax, ay, az] = vertices[a]
    const [bx, by, bz] = vertices[b]
    for (const t of EDGE_FRACTIONS) {
      points.push({
        id: `e${i}_${t * 100}`,
        pos: [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t],
      })
    }
  })
  faces.forEach((pos, i) => points.push({ id: `f${i}`, pos }))
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
    faces: [[0, 0, -z], [0, 0, z], [0, -y, 0], [x, 0, 0], [0, y, 0], [-x, 0, 0]],
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
      centroid(bottom),
      centroid(top),
      centroid([bottom[0], bottom[1], top[1], top[0]]),
      centroid([bottom[1], bottom[2], top[2], top[1]]),
      centroid([bottom[2], bottom[0], top[0], top[2]]),
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

export function worldPoint(obj: ArrObject, local: Vec3): Vec3 {
  const [rx, ry, rz] = obj.rotation
  const v = new THREE.Vector3(...local)
    .applyEuler(new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'XYZ'))
    .add(new THREE.Vector3(...obj.position))
  return [v.x, v.y, v.z]
}
