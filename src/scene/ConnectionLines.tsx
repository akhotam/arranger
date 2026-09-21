import { CubicBezierLine } from '@react-three/drei'
import { curveHandles, findPoint, worldDir, worldPoint } from '../model/points'
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
        const wa = worldPoint(a, pa.pos)
        const wb = worldPoint(b, pb.pos)
        const [ma, mb] = curveHandles(wa, worldDir(a, pa.normal), wb, worldDir(b, pb.normal))
        return (
          <CubicBezierLine key={c.id} start={wa} end={wb} midA={ma} midB={mb} color="#ffd166" lineWidth={2} depthTest={false} renderOrder={10} />
        )
      })}
    </>
  )
}
