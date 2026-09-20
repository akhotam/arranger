import { describe, expect, it } from 'vitest'
import { newProject, parse, serialize } from './project'
import type { Project } from './types'

const sample = (): Project => ({
  ...newProject({ kind: 'bounded', w: 400, d: 300, h: 250 }, 'cm'),
  objects: [
    { id: 'a', name: 'A', shape: 'box', size: { w: 10, d: 20, h: 30 }, position: [1, 2, 3], rotation: [0, 0, 45], color: '#f00' },
    { id: 'b', name: 'B', shape: 'sphere', size: { w: 10, d: 10, h: 10 }, position: [5, 5, 5], rotation: [0, 0, 0], color: '#0f0' },
  ],
  connections: [{ id: 'c1', a: { objectId: 'a', pointId: 'v0' }, b: { objectId: 'b', pointId: 'v5' } }],
})

describe('project serialization', () => {
  it('round trips', () => {
    const p = sample()
    expect(parse(serialize(p))).toEqual(p)
  })

  it('rejects unknown version', () => {
    expect(() => parse(JSON.stringify({ ...sample(), version: 2 }))).toThrow(/version/)
  })

  it('rejects unknown shape', () => {
    const p = sample()
    ;(p.objects[0] as { shape: string }).shape = 'torus'
    expect(() => parse(serialize(p))).toThrow(/object/i)
  })

  it('drops connections with dangling references', () => {
    const p = sample()
    p.connections.push({ id: 'c2', a: { objectId: 'a', pointId: 'v0' }, b: { objectId: 'zzz', pointId: 'v0' } })
    p.connections.push({ id: 'c3', a: { objectId: 'a', pointId: 'nope' }, b: { objectId: 'b', pointId: 'v0' } })
    expect(parse(serialize(p)).connections.map((c) => c.id)).toEqual(['c1'])
  })

  it('normalizes round shape sizes', () => {
    const p = sample()
    p.objects[1].size = { w: 10, d: 99, h: 99 }
    expect(parse(serialize(p)).objects[1].size).toEqual({ w: 10, d: 10, h: 10 })
  })
})
