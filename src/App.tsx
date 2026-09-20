import { Scene } from './scene/Scene'
import { useStore } from './store'
import { ObjectList } from './ui/ObjectList'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { StartDialog } from './ui/StartDialog'
import { Toolbar } from './ui/Toolbar'
import { useShortcuts } from './ui/useShortcuts'

export default function App() {
  const hasProject = useStore((s) => s.project !== null)
  const mode = useStore((s) => s.mode)
  useShortcuts()
  if (!hasProject) return <StartDialog />
  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <ObjectList />
        <div className="viewport">
          <Scene />
          <div className="hint">
            {mode === '2d' ? 'Middle drag: pan · Wheel: zoom' : 'Middle drag: orbit · Shift+middle: pan · Wheel: zoom'} · G move · R rotate · C connect · Tab 2D/3D
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  )
}
