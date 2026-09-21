import { SHAPES } from '../model/shapes'
import type { ArrObject, Vec3 } from '../model/types'
import { useStore } from '../store'
import { NumberField } from './NumberField'

export function PropertiesPanel() {
  const project = useStore((s) => s.project)
  const mode = useStore((s) => s.mode)
  const selectedId = useStore((s) => s.selectedId)
  const setSpace = useStore((s) => s.setSpace)
  if (!project) return null
  const obj = project.objects.find((o) => o.id === selectedId)
  const unit = project.unit
  const space = project.space

  return (
    <div className="panel">
      <section>
        <h2>Space</h2>
        {space.kind === 'unbounded' ? (
          <p className="muted">Unbounded</p>
        ) : (
          <>
            <Field label={`Width (${unit})`}><NumberField value={space.w} min={1} onChange={(w) => setSpace({ ...space, w })} /></Field>
            <Field label={`Depth (${unit})`}><NumberField value={space.d} min={1} onChange={(d) => setSpace({ ...space, d })} /></Field>
            <Field label={`Height (${unit})`}><NumberField value={space.h} min={1} onChange={(h) => setSpace({ ...space, h })} /></Field>
          </>
        )}
      </section>
      <section>
        <h2>Object</h2>
        {obj ? <ObjectFields obj={obj} unit={unit} is2d={mode === '2d'} /> : <p className="muted">Nothing selected</p>}
      </section>
      <ConnectionsSection />
    </div>
  )
}

function ObjectFields({ obj, unit, is2d }: { obj: ArrObject; unit: string; is2d: boolean }) {
  const updateObject = useStore((s) => s.updateObject)
  const def = SHAPES[obj.shape]

  const setSize = (key: 'w' | 'd' | 'h', v: number) => {
    const size = { ...obj.size, [key]: v }
    // in 2D objects stay grounded, resizing keeps the base on the floor
    const grounded = is2d && obj.rotation[0] === 0 && obj.rotation[1] === 0
    const h = obj.shape === 'sphere' ? size.w : size.h
    updateObject(obj.id, { size, ...(grounded ? { position: [obj.position[0], obj.position[1], h / 2] as Vec3 } : {}) })
  }
  const setPos = (i: number, v: number) => {
    const position = [...obj.position] as Vec3
    position[i] = v
    updateObject(obj.id, { position })
  }
  const setRot = (i: number, v: number) => {
    const rotation = [...obj.rotation] as Vec3
    rotation[i] = v
    updateObject(obj.id, { rotation })
  }

  return (
    <>
      <Field label="Name"><input type="text" value={obj.name} onChange={(e) => updateObject(obj.id, { name: e.target.value })} /></Field>
      <Field label="Label"><input type="checkbox" checked={obj.showLabel} onChange={(e) => updateObject(obj.id, { showLabel: e.target.checked })} /></Field>
      <Field label="Shape"><span>{def.label}</span></Field>
      <Field label="Colour"><input type="color" value={obj.color} onChange={(e) => updateObject(obj.id, { color: e.target.value })} /></Field>
      {def.sizeFields.map((f) => (
        <Field key={f.key} label={`${f.label} (${unit})`}>
          <NumberField value={obj.size[f.key]} min={0.01} onChange={(v) => setSize(f.key, v)} />
        </Field>
      ))}
      <Field label={`Position (${unit})`}>
        <div className="vec">
          <NumberField title="Position X" value={obj.position[0]} onChange={(v) => setPos(0, v)} />
          <NumberField title="Position Y" value={obj.position[1]} onChange={(v) => setPos(1, v)} />
          {!is2d && <NumberField title="Position Z" value={obj.position[2]} onChange={(v) => setPos(2, v)} />}
        </div>
      </Field>
      <Field label="Rotation (°)">
        <div className="vec">
          {!is2d && <NumberField title="Rotation X" value={obj.rotation[0]} onChange={(v) => setRot(0, v)} />}
          {!is2d && <NumberField title="Rotation Y" value={obj.rotation[1]} onChange={(v) => setRot(1, v)} />}
          <NumberField title="Rotation Z" value={obj.rotation[2]} onChange={(v) => setRot(2, v)} />
        </div>
      </Field>
    </>
  )
}

function ConnectionsSection() {
  const project = useStore((s) => s.project)
  const tool = useStore((s) => s.tool)
  const pending = useStore((s) => s.pendingPoint)
  const removeConnection = useStore((s) => s.removeConnection)
  if (!project) return null
  const name = (id: string) => project.objects.find((o) => o.id === id)?.name ?? '?'

  return (
    <section>
      <h2>Connections</h2>
      {tool === 'connect' && (
        <p className="muted">{pending ? `From ${name(pending.objectId)} · ${pending.pointId}, pick a point on another object` : 'Pick a point on an object'}</p>
      )}
      {project.connections.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul className="list">
          {project.connections.map((c) => (
            <li key={c.id}>
              <span className="name">{name(c.a.objectId)} · {c.a.pointId} ↔ {name(c.b.objectId)} · {c.b.pointId}</span>
              <button title="Remove" onClick={() => removeConnection(c.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
