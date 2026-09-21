import { create } from 'zustand'
import { clampToSpace } from './model/bounds'
import { resolveCollisions } from './model/collision'
import { newProject } from './model/project'
import { normalizeSize, SHAPES } from './model/shapes'
import { newId, type ArrObject, type Connection, type PointRef, type Project, type Shape, type Space, type Unit, type Vec3 } from './model/types'

export type Mode = '2d' | '3d'
export type Tool = 'move' | 'rotate' | 'connect'

const COLORS = ['#e07a5f', '#81b29a', '#f2cc8f', '#3d405b', '#6d8fc7', '#b56576', '#8ac926', '#ffb703']

interface State {
  project: Project | null
  mode: Mode
  tool: Tool
  selectedId: string | null
  pendingPoint: PointRef | null
  preventOverlap: boolean

  newProject: (space: Space, unit: Unit) => void
  loadProject: (project: Project) => void
  closeProject: () => void
  setSpace: (space: Space) => void
  setUnit: (unit: Unit) => void
  setMode: (mode: Mode) => void
  setTool: (tool: Tool) => void
  select: (id: string | null) => void
  setPreventOverlap: (on: boolean) => void

  addObject: (shape: Shape) => void
  updateObject: (id: string, patch: Partial<Omit<ArrObject, 'id' | 'shape'>>) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void

  pickPoint: (ref: PointRef) => void
  removeConnection: (id: string) => void
}

function spaceCentre(space: Space): [number, number] {
  return space.kind === 'bounded' ? [space.w / 2, space.d / 2] : [0, 0]
}

export const useStore = create<State>((set, get) => {
  // every mutation goes through here to keep the null check in one place
  const patchProject = (fn: (p: Project) => Partial<Project>) =>
    set((s) => (s.project ? { project: { ...s.project, ...fn(s.project) } } : {}))

  return {
    project: null,
    mode: '2d',
    tool: 'move',
    selectedId: null,
    pendingPoint: null,
    preventOverlap: false,

    newProject: (space, unit) => set({ project: newProject(space, unit), selectedId: null, pendingPoint: null, mode: '2d' }),
    loadProject: (project) => set({ project, selectedId: null, pendingPoint: null, mode: '2d' }),
    closeProject: () => set({ project: null, selectedId: null, pendingPoint: null }),
    setSpace: (space) => patchProject(() => ({ space })),
    setUnit: (unit) => patchProject(() => ({ unit })),
    setMode: (mode) => set({ mode, pendingPoint: null }),
    setTool: (tool) => set({ tool, pendingPoint: null }),
    select: (id) => set({ selectedId: id }),
    setPreventOverlap: (on) => set({ preventOverlap: on }),

    addObject: (shape) =>
      patchProject((p) => {
        const size = SHAPES[shape].defaultSize
        const [cx, cy] = spaceCentre(p.space)
        const count = p.objects.filter((o) => o.shape === shape).length + 1
        const obj: ArrObject = {
          id: newId(),
          name: `${SHAPES[shape].label} ${count}`,
          shape,
          size,
          position: [cx, cy, size.h / 2],
          rotation: [0, 0, 0],
          color: COLORS[p.objects.length % COLORS.length],
        }
        obj.position = clampToSpace(p.space, obj)
        set({ selectedId: obj.id })
        return { objects: [...p.objects, obj] }
      }),

    updateObject: (id, patch) =>
      patchProject((p) => ({
        objects: p.objects.map((o) => {
          if (o.id !== id) return o
          const next = { ...o, ...patch }
          const sized = { ...next, size: normalizeSize(o.shape, next.size) }
          const clamped = { ...sized, position: clampToSpace(p.space, sized) }
          const posed = patch.position || patch.rotation || patch.size
          if (!posed || !get().preventOverlap) return clamped
          return { ...clamped, ...resolveCollisions(p.objects.filter((x) => x.id !== id), o, clamped) }
        }),
      })),

    removeObject: (id) => {
      patchProject((p) => ({
        objects: p.objects.filter((o) => o.id !== id),
        connections: p.connections.filter((c) => c.a.objectId !== id && c.b.objectId !== id),
      }))
      const s = get()
      if (s.selectedId === id) set({ selectedId: null })
      if (s.pendingPoint?.objectId === id) set({ pendingPoint: null })
    },

    duplicateObject: (id) =>
      patchProject((p) => {
        const src = p.objects.find((o) => o.id === id)
        if (!src) return {}
        const copy: ArrObject = {
          ...src,
          id: newId(),
          name: `${src.name} copy`,
          position: [src.position[0] + src.size.w / 2, src.position[1], src.position[2]] as Vec3,
        }
        copy.position = clampToSpace(p.space, copy)
        set({ selectedId: copy.id })
        return { objects: [...p.objects, copy] }
      }),

    pickPoint: (ref) => {
      const { pendingPoint } = get()
      if (!pendingPoint) {
        set({ pendingPoint: ref })
        return
      }
      if (pendingPoint.objectId === ref.objectId) return
      patchProject((p) => {
        const exists = p.connections.some(
          (c) =>
            (samePoint(c.a, pendingPoint) && samePoint(c.b, ref)) ||
            (samePoint(c.a, ref) && samePoint(c.b, pendingPoint)),
        )
        if (exists) return {}
        const conn: Connection = { id: newId(), a: pendingPoint, b: ref }
        return { connections: [...p.connections, conn] }
      })
      set({ pendingPoint: null })
    },

    removeConnection: (id) => patchProject((p) => ({ connections: p.connections.filter((c) => c.id !== id) })),
  }
})

const samePoint = (a: PointRef, b: PointRef) => a.objectId === b.objectId && a.pointId === b.pointId
