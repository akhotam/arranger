import * as THREE from 'three'
import type { Shape, Size } from './types'

type SizeKey = keyof Size

export interface ShapeDef {
  label: string
  sizeFields: { key: SizeKey; label: string }[]
  defaultSize: Size
}

export const SHAPES: Record<Shape, ShapeDef> = {
  box: {
    label: 'Box',
    sizeFields: [
      { key: 'w', label: 'Width' },
      { key: 'd', label: 'Depth' },
      { key: 'h', label: 'Height' },
    ],
    defaultSize: { w: 100, d: 60, h: 40 },
  },
  wedge: {
    label: 'Wedge',
    sizeFields: [
      { key: 'w', label: 'Width' },
      { key: 'd', label: 'Depth' },
      { key: 'h', label: 'Height' },
    ],
    defaultSize: { w: 80, d: 80, h: 40 },
  },
  cylinder: {
    label: 'Cylinder',
    sizeFields: [
      { key: 'w', label: 'Diameter' },
      { key: 'h', label: 'Height' },
    ],
    defaultSize: { w: 50, d: 50, h: 60 },
  },
  cone: {
    label: 'Cone',
    sizeFields: [
      { key: 'w', label: 'Diameter' },
      { key: 'h', label: 'Height' },
    ],
    defaultSize: { w: 50, d: 50, h: 60 },
  },
  sphere: {
    label: 'Sphere',
    sizeFields: [{ key: 'w', label: 'Diameter' }],
    defaultSize: { w: 50, d: 50, h: 50 },
  },
}

export const SHAPE_LIST = Object.keys(SHAPES) as Shape[]

// round shapes keep their hidden dimensions tied to width
export function normalizeSize(shape: Shape, size: Size): Size {
  switch (shape) {
    case 'cylinder':
    case 'cone':
      return { ...size, d: size.w }
    case 'sphere':
      return { w: size.w, d: size.w, h: size.w }
    default:
      return size
  }
}

// right triangle footprint, right angle at the -x/-y corner
export function wedgeFootprint(w: number, d: number): [number, number][] {
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
  ]
}

// geometries built with Z up to match the floor plane
export function buildGeometry(shape: Shape, size: Size): THREE.BufferGeometry {
  const { w, d, h } = size
  const r = w / 2
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(w, d, h)
    case 'cylinder':
      return new THREE.CylinderGeometry(r, r, h, 32).rotateX(Math.PI / 2)
    case 'cone':
      return new THREE.ConeGeometry(r, h, 32).rotateX(Math.PI / 2)
    case 'sphere':
      return new THREE.SphereGeometry(r, 32, 16)
    case 'wedge': {
      const tri = new THREE.Shape(wedgeFootprint(w, d).map(([x, y]) => new THREE.Vector2(x, y)))
      return new THREE.ExtrudeGeometry(tri, { depth: h, bevelEnabled: false }).translate(0, 0, -h / 2)
    }
  }
}
