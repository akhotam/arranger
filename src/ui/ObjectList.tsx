import { useStore } from '../store'

export function ObjectList() {
  const objects = useStore((s) => s.project?.objects ?? [])
  const selectedId = useStore((s) => s.selectedId)
  const { select, removeObject, duplicateObject } = useStore()

  return (
    <div className="panel left">
      <section>
        <h2>Objects</h2>
        {objects.length === 0 ? (
          <p className="muted">Add a shape from the toolbar</p>
        ) : (
          <ul className="list">
            {objects.map((o) => (
              <li key={o.id} className={o.id === selectedId ? 'selected' : ''} onClick={() => select(o.id)}>
                <span className="swatch" style={{ background: o.color }} />
                <span className="name">{o.name}</span>
                <button title="Duplicate (⌘D)" onClick={(e) => { e.stopPropagation(); duplicateObject(o.id) }}>⧉</button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); removeObject(o.id) }}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
