import { useEffect } from 'react'
import { useStore } from '../store'

const isEditing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditing(e.target)) return
      const s = useStore.getState()
      if (!s.project) return
      const key = e.key.toLowerCase()
      if (key === 'g') s.setTool('move')
      else if (key === 'r') s.setTool('rotate')
      else if (key === 'c') s.setTool('connect')
      else if (key === 'tab') { e.preventDefault(); s.setMode(s.mode === '2d' ? '3d' : '2d') }
      else if (key === 'escape') { if (s.pendingPoint) s.setTool(s.tool); else s.select(null) }
      else if ((key === 'delete' || key === 'backspace') && s.selectedId) s.removeObject(s.selectedId)
      else if (key === 'd' && (e.metaKey || e.ctrlKey) && s.selectedId) { e.preventDefault(); s.duplicateObject(s.selectedId) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
