import { Line } from '@react-three/drei'
import { findPoint, worldPoint } from '../model/points'
import { useStore } from '../store'

export function ConnectionLines() {
  const project = useStore((s) => s.project)
  if (!project) return null
  const byId = new Map(project.objects.map((o) => [o.id, o]))

  return (
    <>
      {project.connections.map((c) => {
        const a = byId.get(c.a.objectId)
        const b = byId.get(c.b.objectId)
        const pa = a && findPoint(a, c.a.pointId)
        const pb = b && findPoint(b, c.b.pointId)
        if (!a || !b || !pa || !pb) return null
        return (
          <Line key={c.id} points={[worldPoint(a, pa.pos), worldPoint(b, pb.pos)]} color="#ffd166" lineWidth={2} depthTest={false} renderOrder={10} />
        )
      })}
    </>
  )
}
