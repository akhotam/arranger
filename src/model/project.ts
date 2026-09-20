import { normalizeSize, SHAPES } from './shapes'
import { findPoint } from './points'
import { UNITS, type ArrObject, type Connection, type Project, type Space, type Unit, type Vec3 } from './types'

export function newProject(space: Space, unit: Unit): Project {
  return { version: 1, unit, space, objects: [], connections: [] }
}

export function serialize(project: Project): string {
  return JSON.stringify(project, null, 2)
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(isNum)
const isStr = (v: unknown): v is string => typeof v === 'string'

function parseSpace(raw: unknown): Space {
  const s = raw as Record<string, unknown>
  if (s?.kind === 'unbounded') return { kind: 'unbounded' }
  if (s?.kind === 'bounded' && isNum(s.w) && isNum(s.d) && isNum(s.h)) {
    return { kind: 'bounded', w: s.w, d: s.d, h: s.h }
  }
  throw new Error('Invalid space')
}

function parseObject(raw: unknown): ArrObject {
  const o = raw as Record<string, unknown>
  const size = o?.size as Record<string, unknown>
  if (
    !isStr(o?.id) || !isStr(o.name) || !isStr(o.shape) || !(o.shape in SHAPES) ||
    !isNum(size?.w) || !isNum(size.d) || !isNum(size.h) ||
    !isVec3(o.position) || !isVec3(o.rotation) || !isStr(o.color)
  ) {
    throw new Error('Invalid object')
  }
  const shape = o.shape as ArrObject['shape']
  return {
    id: o.id,
    name: o.name,
    shape,
    size: normalizeSize(shape, { w: size.w, d: size.d, h: size.h }),
    position: o.position,
    rotation: o.rotation,
    color: o.color,
  }
}

function parseConnection(raw: unknown, objects: ArrObject[]): Connection | null {
  const c = raw as Record<string, unknown>
  const refs = [c?.a, c?.b] as Record<string, unknown>[]
  if (!isStr(c?.id) || refs.some((r) => !isStr(r?.objectId) || !isStr(r.pointId))) {
    throw new Error('Invalid connection')
  }
  // dangling references get dropped rather than failing the whole file
  for (const r of refs) {
    const obj = objects.find((o) => o.id === r.objectId)
    if (!obj || !findPoint(obj, r.pointId as string)) return null
  }
  return {
    id: c.id,
    a: { objectId: refs[0].objectId as string, pointId: refs[0].pointId as string },
    b: { objectId: refs[1].objectId as string, pointId: refs[1].pointId as string },
  }
}

export function parse(text: string): Project {
  const raw = JSON.parse(text) as Record<string, unknown>
  if (raw?.version !== 1) throw new Error('Unsupported project version')
  if (!UNITS.includes(raw.unit as Unit)) throw new Error('Invalid unit')
  if (!Array.isArray(raw.objects) || !Array.isArray(raw.connections)) throw new Error('Invalid project')
  const objects = raw.objects.map(parseObject)
  const connections = raw.connections
    .map((c) => parseConnection(c, objects))
    .filter((c): c is Connection => c !== null)
  return { version: 1, unit: raw.unit as Unit, space: parseSpace(raw.space), objects, connections }
}
