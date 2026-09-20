import { Scene } from './scene/Scene'
import { useStore } from './store'
import { StartDialog } from './ui/StartDialog'
import { Toolbar } from './ui/Toolbar'

export default function App() {
  const hasProject = useStore((s) => s.project !== null)
  if (!hasProject) return <StartDialog />
  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <div className="viewport">
          <Scene />
        </div>
      </div>
    </div>
  )
}
