import { describe, expect, it } from 'vitest'
import { connectionPoints, findPoint, worldPoint } from './points'
import type { ArrObject, Shape } from './types'

const near = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6))

describe('connectionPoints', () => {
  it.each<[Shape, number]>([
    ['box', 8 + 12 * 3 + 6],
    ['wedge', 6 + 9 * 3 + 5],
    ['cylinder', 10 + 4 * 3],
    ['cone', 6 + 4 * 3],
    ['sphere', 7],
  ])('%s has expected point count', (shape, count) => {
    expect(connectionPoints(shape, { w: 10, d: 20, h: 30 })).toHaveLength(count)
  })

  it('ids are unique per shape', () => {
    for (const shape of ['box', 'wedge', 'cylinder', 'cone', 'sphere'] as Shape[]) {
      const ids = connectionPoints(shape, { w: 1, d: 1, h: 1 }).map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('box vertices sit on the half extents', () => {
    const pts = connectionPoints('box', { w: 10, d: 20, h: 30 })
    near(pts.find((p) => p.id === 'v0')!.pos, [-5, -10, -15])
    near(pts.find((p) => p.id === 'v6')!.pos, [5, 10, 15])
  })

  it('box edge points lie at 25% steps', () => {
    const pts = connectionPoints('box', { w: 10, d: 20, h: 30 })
    near(pts.find((p) => p.id === 'e0_25')!.pos, [-2.5, -10, -15])
    near(pts.find((p) => p.id === 'e0_50')!.pos, [0, -10, -15])
    near(pts.find((p) => p.id === 'e0_75')!.pos, [2.5, -10, -15])
  })

  it('ids survive a resize', () => {
    const before = connectionPoints('wedge', { w: 1, d: 1, h: 1 }).map((p) => p.id)
    const after = connectionPoints('wedge', { w: 9, d: 3, h: 2 }).map((p) => p.id)
    expect(after).toEqual(before)
  })

  it('cone apex sits at top centre', () => {
    near(findPoint({ shape: 'cone', size: { w: 4, d: 4, h: 10 } } as ArrObject, 'v1')!.pos, [0, 0, 5])
  })
})

describe('worldPoint', () => {
  const obj: ArrObject = {
    id: 'a', name: 'a', shape: 'box', color: '#fff',
    size: { w: 2, d: 2, h: 2 },
    position: [10, 20, 30],
    rotation: [0, 0, 90],
  }

  it('applies yaw then translation', () => {
    near(worldPoint(obj, [1, 0, 0]), [10, 21, 30])
  })

  it('applies pitch about x', () => {
    near(worldPoint({ ...obj, rotation: [90, 0, 0] }, [0, 1, 0]), [10, 20, 31])
  })
})
