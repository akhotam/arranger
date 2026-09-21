import { describe, expect, it } from 'vitest'
import { resolveCollisions } from './collision'
import type { ArrObject } from './types'

const box = (id: string, position: [number, number, number], extra: Partial<ArrObject> = {}): ArrObject => ({
  id, name: id, shape: 'box', color: '#fff', showLabel: false,
  size: { w: 10, d: 10, h: 10 },
  position,
  rotation: [0, 0, 0],
  ...extra,
})

const moved = (o: ArrObject, position: [number, number, number]): ArrObject => ({ ...o, position })

describe('resolveCollisions', () => {
  const a = box('a', [0, 0, 5])
  const b = box('b', [30, 0, 5])

  it('returns the target when nothing is nearby', () => {
    const r = resolveCollisions([], a, moved(a, [15, 0, 5]))
    expect(r.position).toEqual([15, 0, 5])
    expect(resolveCollisions([box('far', [500, 500, 5])], a, moved(a, [15, 0, 5])).position).toEqual([15, 0, 5])
  })

  it('stops with faces touching', () => {
    const r = resolveCollisions([b], a, moved(a, [25, 0, 5]))
    expect(r.position[0]).toBeGreaterThan(19.9)
    expect(r.position[0]).toBeLessThanOrEqual(20)
    expect(r.position[1]).toBe(0)
  })

  it('slides on the free axis while the other stays blocked', () => {
    const r = resolveCollisions([b], a, moved(a, [25, 8, 5]))
    expect(r.position[0]).toBeGreaterThan(19.9)
    expect(r.position[0]).toBeLessThanOrEqual(20)
    expect(r.position[1]).toBe(8)
  })

  it('reaches the visible edge of a rotated neighbour rather than its bounding box', () => {
    const diamond = box('d', [30, 0, 5], { rotation: [0, 0, 45] })
    const above = moved(a, [0, 10, 5])
    // lower corner of the mover meets the diagonal edge at x = 30 - 5√2 + 5, its AABB would stop 5 units earlier
    const r = resolveCollisions([diamond], above, moved(above, [25, 10, 5]))
    expect(r.position[0]).toBeGreaterThan(30 - 5 * Math.SQRT2 - 0.1)
    expect(r.position[0]).toBeLessThanOrEqual(30 - 5 * Math.SQRT2)
  })

  it('spheres touch at one diameter apart', () => {
    const s1 = box('s1', [0, 0, 5], { shape: 'sphere' })
    const s2 = box('s2', [30, 0, 5], { shape: 'sphere' })
    const r = resolveCollisions([s2], s1, moved(s1, [25, 0, 5]))
    expect(r.position[0]).toBeGreaterThan(19.9)
    expect(r.position[0]).toBeLessThanOrEqual(20)
  })

  it('never tunnels through a thin obstacle', () => {
    const wall = box('wall', [30, 0, 5], { size: { w: 1, d: 10, h: 10 } })
    const r = resolveCollisions([wall], a, moved(a, [80, 0, 5]))
    expect(r.position[0]).toBeLessThanOrEqual(24.5)
    expect(r.position[0]).toBeGreaterThan(24.4)
  })

  it('ignores a neighbour already overlapping at the start', () => {
    const inside = box('in', [5, 0, 5])
    const r = resolveCollisions([inside], a, moved(a, [40, 0, 5]))
    expect(r.position).toEqual([40, 0, 5])
  })

  it('stops a yaw at the angle where the corner touches', () => {
    const long = box('l', [0, 0, 5], { size: { w: 40, d: 10, h: 10 } })
    const wall = box('w', [0, 25, 5], { size: { w: 100, d: 10, h: 10 } })
    // corner reaches y = 20 when 20 sin θ + 5 cos θ = 20
    const contact = (Math.asin(20 / Math.hypot(20, 5)) - Math.atan2(5, 20)) / Math.PI * 180
    const r = resolveCollisions([wall], long, { ...long, rotation: [0, 0, 90] })
    expect(r.rotation[2]).toBeLessThanOrEqual(contact)
    expect(r.rotation[2]).toBeGreaterThan(contact - 0.5)
    expect(r.position).toEqual([0, 0, 5])
  })

  it('stops growth at contact and never blocks a shrink', () => {
    const grown = resolveCollisions([b], a, { ...a, size: { w: 60, d: 10, h: 10 } })
    expect(grown.size.w).toBeLessThanOrEqual(50)
    expect(grown.size.w).toBeGreaterThan(49.5)
    const shrunk = resolveCollisions([b], a, { ...a, size: { w: 4, d: 10, h: 10 } })
    expect(shrunk.size).toEqual({ w: 4, d: 10, h: 10 })
  })

  it('resolves a resize with a grounded shift along the combined path', () => {
    const lid = box('lid', [0, 0, 25], { size: { w: 50, d: 50, h: 10 } })
    const r = resolveCollisions([lid], a, { ...a, size: { w: 10, d: 10, h: 40 }, position: [0, 0, 20] })
    // top face may reach the lid underside at z = 20, height h puts the top at h
    expect(r.size.h).toBeLessThanOrEqual(20)
    expect(r.size.h).toBeGreaterThan(19.5)
    expect(r.position[2]).toBeCloseTo(r.size.h / 2, 6)
  })
})
