import { parse, serialize } from '../model/project'
import { SHAPE_LIST, SHAPES } from '../model/shapes'
import { UNITS, type Shape, type Unit } from '../model/types'
import { useStore, type Tool } from '../store'
import { downloadText, openProjectFile } from './files'

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'move', label: 'Move', key: 'G' },
  { id: 'rotate', label: 'Rotate', key: 'R' },
  { id: 'connect', label: 'Connect', key: 'C' },
]

export function Toolbar() {
  const project = useStore((s) => s.project)
  const mode = useStore((s) => s.mode)
  const tool = useStore((s) => s.tool)
  const { setMode, setTool, setUnit, addObject, closeProject, loadProject } = useStore()
  if (!project) return null

  const open = async () => {
    try {
      const text = await openProjectFile()
      if (text !== null) loadProject(parse(text))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open file')
    }
  }

  return (
    <div className="toolbar">
      <div className="group">
        <button onClick={() => { if (confirm('Discard current project?')) closeProject() }}>New</button>
        <button onClick={open}>Open</button>
        <button onClick={() => downloadText('arranger-project.json', serialize(project))}>Save</button>
      </div>
      <div className="group">
        <button className={mode === '2d' ? 'active' : ''} onClick={() => setMode('2d')}>2D</button>
        <button className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')}>3D</button>
      </div>
      <div className="group">
        <select value="" onChange={(e) => { if (e.target.value) addObject(e.target.value as Shape) }}>
          <option value="">+ Add shape…</option>
          {SHAPE_LIST.map((s) => <option key={s} value={s}>{SHAPES[s].label}</option>)}
        </select>
      </div>
      <div className="group">
        {TOOLS.map((t) => (
          <button key={t.id} className={tool === t.id ? 'active' : ''} title={`${t.label} (${t.key})`} onClick={() => setTool(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="group right">
        <label>
          Unit{' '}
          <select value={project.unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}
