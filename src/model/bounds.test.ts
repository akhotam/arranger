import { describe, expect, it } from 'vitest'
import { clampToSpace, worldBounds } from './bounds'
import type { ArrObject, Space } from './types'

const near = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6))

const box: ArrObject = {
  id: 'a', name: 'a', shape: 'box', color: '#fff', showLabel: false,
  size: { w: 10, d: 20, h: 30 },
  position: [50, 50, 15],
  rotation: [0, 0, 0],
}

describe('worldBounds', () => {
  it('unrotated box spans half extents around position', () => {
    const { min, max } = worldBounds(box)
    near(min.toArray(), [45, 40, 0])
    near(max.toArray(), [55, 60, 30])
  })

  it('yaw of 90 swaps width and depth', () => {
    const { min, max } = worldBounds({ ...box, rotation: [0, 0, 90] })
    near(min.toArray(), [40, 45, 0])
    near(max.toArray(), [60, 55, 30])
  })

  it('cylinder pitched onto its side puts height along y and radius along z', () => {
    const cyl: ArrObject = { ...box, shape: 'cylinder', size: { w: 10, d: 10, h: 30 }, position: [0, 0, 0], rotation: [90, 0, 0] }
    const { min, max } = worldBounds(cyl)
    near(min.toArray(), [-5, -15, -5])
    near(max.toArray(), [5, 15, 5])
  })
})

describe('clampToSpace', () => {
  const space: Space = { kind: 'bounded', w: 100, d: 100, h: 50 }

  it('leaves an object inside untouched', () => {
    expect(clampToSpace(space, box)).toEqual([50, 50, 15])
  })

  it('pushes back from a far wall', () => {
    near(clampToSpace(space, { ...box, position: [120, 50, 15] }), [95, 50, 15])
  })

  it('lifts off the floor and drops from the ceiling', () => {
    near(clampToSpace(space, { ...box, position: [50, 50, -10] }), [50, 50, 15])
    near(clampToSpace(space, { ...box, position: [50, 50, 60] }), [50, 50, 35])
  })

  it('pins an oversized object to the origin side', () => {
    near(clampToSpace(space, { ...box, size: { w: 200, d: 20, h: 30 }, position: [50, 50, 15] }), [100, 50, 15])
  })

  it('accounts for rotation', () => {
    near(clampToSpace(space, { ...box, rotation: [0, 0, 90], position: [95, 50, 15] }), [90, 50, 15])
  })

  it('ignores unbounded spaces', () => {
    expect(clampToSpace({ kind: 'unbounded' }, { ...box, position: [-500, 0, 0] })).toEqual([-500, 0, 0])
  })
})
