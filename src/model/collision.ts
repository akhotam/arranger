import * as THREE from 'three'
import { worldBounds, worldGeometry } from './bounds'
import type { ArrObject, Vec3 } from './types'

type Support = (dir: THREE.Vector3) => THREE.Vector3

// every shape in the registry renders convex, its mesh vertices form its hull
export function worldVertices(obj: ArrObject): THREE.Vector3[] {
  const pos = worldGeometry(obj).getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i))
  return out
}

function farthest(verts: THREE.Vector3[], dir: THREE.Vector3): THREE.Vector3 {
  let best = verts[0]
  let bestDot = -Infinity
  for (const v of verts) {
    const d = v.dot(dir)
    if (d > bestDot) { bestDot = d; best = v }
  }
  return best.clone()
}

const vertexSupport = (verts: THREE.Vector3[]): Support => (dir) => farthest(verts, dir)

// hull of a shape translated along from→to, the end scoring higher along dir carries the farthest vertex
const sweptSupport = (verts: THREE.Vector3[], from: THREE.Vector3, to: THREE.Vector3): Support => {
  const delta = to.clone().sub(from)
  return (dir) => farthest(verts, dir).add(delta.dot(dir) > 0 ? to : from)
}

// penetration shallower than this counts as touching, keeps a resolved contact pose reading as free
const CONTACT_EPS = 1e-6
const same = (a: THREE.Vector3, b: THREE.Vector3) => a.dot(b) > 0
const tripleCross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => a.clone().cross(b).cross(c)

// standard 3D GJK on the Minkowski difference, newest simplex point kept at index 0
function gjkIntersects(a: Support, b: Support): boolean {
  const minkowski = (d: THREE.Vector3) => a(d).sub(b(d.clone().negate()))
  const dir = new THREE.Vector3(1, 0, 0)
  const s: THREE.Vector3[] = [minkowski(dir)]
  dir.copy(s[0]).negate()
  for (let i = 0; i < 64; i++) {
    // origin sits on the simplex itself, the simplex lies inside the difference
    if (dir.lengthSq() < 1e-18) return true
    dir.normalize()
    const p = minkowski(dir)
    if (p.dot(dir) <= CONTACT_EPS) return false
    s.unshift(p)
    if (nextSimplex(s, dir)) return true
  }
  return true
}

function nextSimplex(s: THREE.Vector3[], dir: THREE.Vector3): boolean {
  if (s.length === 2) return lineCase(s, dir)
  if (s.length === 3) return triangleCase(s, dir)
  return tetrahedronCase(s, dir)
}

function lineCase(s: THREE.Vector3[], dir: THREE.Vector3): boolean {
  const [a, b] = s
  const ab = b.clone().sub(a)
  const ao = a.clone().negate()
  if (same(ab, ao)) dir.copy(tripleCross(ab, ao, ab))
  else { s.length = 1; dir.copy(ao) }
  return false
}

function triangleCase(s: THREE.Vector3[], dir: THREE.Vector3): boolean {
  const [a, b, c] = s
  const ab = b.clone().sub(a)
  const ac = c.clone().sub(a)
  const ao = a.clone().negate()
  const abc = ab.clone().cross(ac)
  if (same(abc.clone().cross(ac), ao)) {
    if (same(ac, ao)) { s.splice(1, 1); dir.copy(tripleCross(ac, ao, ac)); return false }
    s.length = 2
    return lineCase(s, dir)
  }
  if (same(ab.clone().cross(abc), ao)) { s.length = 2; return lineCase(s, dir) }
  if (same(abc, ao)) dir.copy(abc)
  else { s[1] = c; s[2] = b; dir.copy(abc).negate() }
  return false
}

function tetrahedronCase(s: THREE.Vector3[], dir: THREE.Vector3): boolean {
  const [a, b, c, d] = s
  const ab = b.clone().sub(a)
  const ac = c.clone().sub(a)
  const ad = d.clone().sub(a)
  const ao = a.clone().negate()
  if (same(ab.clone().cross(ac), ao)) { s.length = 3; return triangleCase(s, dir) }
  if (same(ac.clone().cross(ad), ao)) { s.splice(1, 1); return triangleCase(s, dir) }
  if (same(ad.clone().cross(ab), ao)) { s.splice(2, 1); s[1] = d; s[2] = b; return triangleCase(s, dir) }
  return true
}

// largest fraction of from→to whose swept hull misses every obstacle, bisection stays monotone on a convex sweep
function freeFraction(verts: THREE.Vector3[], from: THREE.Vector3, to: THREE.Vector3, obstacles: Support[]): number {
  const hits = (t: number) => {
    const swept = sweptSupport(verts, from, from.clone().lerp(to, t))
    return obstacles.some((o) => gjkIntersects(swept, o))
  }
  if (!hits(1)) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (hits(mid)) hi = mid
    else lo = mid
  }
  return lo
}

type Pose = Pick<ArrObject, 'position' | 'rotation' | 'size'>

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// shortest angular path, gizmo readouts wrap at ±180
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a + 180) % 360) + 360) % 360 - 180) * t

function lerpPose(prev: ArrObject, next: ArrObject, t: number): Pose {
  return {
    position: prev.position.map((p, i) => lerp(p, next.position[i], t)) as Vec3,
    rotation: prev.rotation.map((r, i) => lerpAngle(r, next.rotation[i], t)) as Vec3,
    size: { w: lerp(prev.size.w, next.size.w, t), d: lerp(prev.size.d, next.size.d, t), h: lerp(prev.size.h, next.size.h, t) },
  }
}

// no convex sweep exists for a turning or growing shape, a coarse scan then bisection finds the last free pose
function freePose(prev: ArrObject, next: ArrObject, obstacles: Support[]): Pose {
  const free = (t: number) => {
    const sup = vertexSupport(worldVertices({ ...next, ...lerpPose(prev, next, t) }))
    return !obstacles.some((o) => gjkIntersects(sup, o))
  }
  if (free(1)) return { position: next.position, rotation: next.rotation, size: next.size }
  let lo = 0
  let hi = 1
  for (let i = 1; i < 8; i++) {
    const t = i / 8
    if (!free(t)) { hi = t; break }
    lo = t
  }
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    if (free(mid)) lo = mid
    else hi = mid
  }
  return lerpPose(prev, next, lo)
}

const vecEq = (a: Vec3, b: Vec3) => a.every((v, i) => v === b[i])
const reach = (o: ArrObject) => Math.hypot(o.size.w, o.size.d, o.size.h) / 2

// stops prev→next at contact with any other object, pairs already overlapping at prev never block
export function resolveCollisions(others: ArrObject[], prev: ArrObject, next: ArrObject): Pose {
  const target: Pose = { position: next.position, rotation: next.rotation, size: next.size }
  // every pose on the path stays within reach of the segment between the two centres
  const zone = new THREE.Box3()
    .setFromPoints([new THREE.Vector3(...prev.position), new THREE.Vector3(...next.position)])
    .expandByScalar(Math.max(reach(prev), reach(next)))
  const nearby = others.filter((o) => worldBounds(o).intersectsBox(zone)).map((o) => vertexSupport(worldVertices(o)))
  const prevSupport = vertexSupport(worldVertices(prev))
  const obstacles = nearby.filter((o) => !gjkIntersects(prevSupport, o))
  if (obstacles.length === 0) return target

  if (!vecEq(prev.rotation, next.rotation) || prev.size.w !== next.size.w || prev.size.d !== next.size.d || prev.size.h !== next.size.h) {
    return freePose(prev, next, obstacles)
  }

  const verts = worldVertices({ ...next, position: [0, 0, 0] })
  const pos = new THREE.Vector3(...prev.position)
  for (let axis = 0; axis < 3; axis++) {
    if (next.position[axis] === prev.position[axis]) continue
    const to = pos.clone().setComponent(axis, next.position[axis])
    pos.lerp(to, freeFraction(verts, pos, to, obstacles))
  }
  return { ...target, position: [pos.x, pos.y, pos.z] }
}
