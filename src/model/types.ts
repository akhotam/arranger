export type Shape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'wedge'

export const UNITS = ['mm', 'cm', 'm', 'in', 'ft'] as const
export type Unit = (typeof UNITS)[number]

export type Vec3 = [number, number, number]

export interface Size {
  w: number
  d: number
  h: number
}

export interface ArrObject {
  id: string
  name: string
  shape: Shape
  size: Size
  position: Vec3
  rotation: Vec3 // degrees, XYZ order
  color: string
  showLabel: boolean
}

export interface PointRef {
  objectId: string
  pointId: string
}

export interface Connection {
  id: string
  a: PointRef
  b: PointRef
}

export type Space = { kind: 'bounded'; w: number; d: number; h: number } | { kind: 'unbounded' }

export interface Project {
  version: 1
  unit: Unit
  space: Space
  objects: ArrObject[]
  connections: Connection[]
}

export const newId = (): string => crypto.randomUUID().slice(0, 8)
