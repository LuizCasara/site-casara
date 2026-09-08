import {computeRadarAxes} from '@/lib/ingress-radar.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'

const FMT = new Intl.NumberFormat('pt-BR')

const SIZE = 260
const C = SIZE / 2
const R = 88
const RINGS = [0.25, 0.5, 0.75, 1]

type Axis = {id: string; label: string; raw: number; value: number}

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

/**
 * Radar do padrão de jogo — série única, sem legenda (o título nomeia).
 * Server component: os valores são fixos do snapshot; o tooltip é o `<title>`
 * nativo do SVG, sem JS.
 */
export default function ProfileRadar({stats}: {stats: Profile['stats']}) {
  const axes = computeRadarAxes(stats) as Axis[]
  const n = axes.length

  const shape = axes.map((a, i) => point(i, n, R * Math.max(a.value, 0.02)).join(',')).join(' ')

  return (
    <Panel label="Padrão de jogo" hint="peso relativo por eixo">
      <div className="ing-radar">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Radar do padrão de jogo">
          {/* anéis + eixos, recessivos */}
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={axes.map((_, i) => point(i, n, R * ring).join(',')).join(' ')}
              className="ing-radar__ring"
            />
          ))}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, R)
            return <line key={a.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
          })}

          {/* a forma do perfil */}
          <polygon points={shape} className="ing-radar__shape" />

          {/* vértices + tooltip nativo */}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, R * Math.max(a.value, 0.02))
            return (
              <circle key={a.id} cx={x} cy={y} r={4} className="ing-radar__dot">
                <title>{`${a.label}: ${FMT.format(a.raw)}`}</title>
              </circle>
            )
          })}

          {/* rótulos dos eixos */}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, R + 16)
            const anchor = x < C - 8 ? 'end' : x > C + 8 ? 'start' : 'middle'
            return (
              <text key={a.id} x={x} y={y} textAnchor={anchor} className="ing-radar__label">
                {a.label}
              </text>
            )
          })}
        </svg>
      </div>
    </Panel>
  )
}
