import { useState } from 'react'
import { parse } from '../model/project'
import { UNITS, type Unit } from '../model/types'
import { useStore } from '../store'
import { openProjectFile } from './files'

export function StartDialog() {
  const newProject = useStore((s) => s.newProject)
  const loadProject = useStore((s) => s.loadProject)
  const [kind, setKind] = useState<'bounded' | 'unbounded'>('bounded')
  const [unit, setUnit] = useState<Unit>('cm')
  const [w, setW] = useState(400)
  const [d, setD] = useState(300)
  const [h, setH] = useState(250)
  const [error, setError] = useState<string | null>(null)

  const create = () => {
    newProject(kind === 'bounded' ? { kind, w, d, h } : { kind }, unit)
  }

  const open = async () => {
    try {
      const text = await openProjectFile()
      if (text !== null) loadProject(parse(text))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open file')
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h1>Arranger</h1>
        <fieldset>
          <legend>Space</legend>
          <label>
            <input type="radio" checked={kind === 'bounded'} onChange={() => setKind('bounded')} /> Bounded floor
          </label>
          <label>
            <input type="radio" checked={kind === 'unbounded'} onChange={() => setKind('unbounded')} /> Unbounded
          </label>
          {kind === 'bounded' && (
            <div className="row">
              <label>Width <input type="number" min={1} value={w} onChange={(e) => setW(+e.target.value)} /></label>
              <label>Depth <input type="number" min={1} value={d} onChange={(e) => setD(+e.target.value)} /></label>
              <label>Height <input type="number" min={1} value={h} onChange={(e) => setH(+e.target.value)} /></label>
            </div>
          )}
          <label>
            Unit{' '}
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </fieldset>
        <div className="row">
          <button className="primary" onClick={create}>New project</button>
          <button onClick={open}>Open .json</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
