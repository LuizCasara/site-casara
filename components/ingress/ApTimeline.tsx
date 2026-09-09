import type {TimePoint} from '@/lib/ingress'
import Panel from './Panel'
import {fmtStat} from '@/lib/ingress-format.mjs'

const W = 320
const H = 150
const PAD = {top: 10, right: 8, bottom: 20, left: 8}

/**
 * Evolução do AP acumulado — mudança ao longo do tempo, linha de série única.
 * Server component (dados fixos do dump). Só é renderizado quando
 * `timeSeries.lifetimeAp` existe; senão a página usa `PendingSection`.
 */
export default function ApTimeline({points}: {points: TimePoint[]}) {
  if (!points || points.length < 2) return null

  const sorted = [...points].sort((a, b) => a.t.localeCompare(b.t))
  const ts = sorted.map((p) => new Date(p.t).getTime())
  const vs = sorted.map((p) => p.v)
  const tMin = Math.min(...ts)
  const tMax = Math.max(...ts)
  const vMax = Math.max(...vs)

  const x = (t: number) =>
    PAD.left + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / (vMax || 1)) * (H - PAD.top - PAD.bottom)

  const line = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(ts[i])} ${y(p.v)}`).join(' ')
  const area = `${line} L ${x(tMax)} ${H - PAD.bottom} L ${x(tMin)} ${H - PAD.bottom} Z`

  const years = Array.from(new Set(sorted.map((p) => new Date(p.t).getUTCFullYear())))

  return (
    <Panel label="Evolução de AP" hint={`${fmtStat(vs[vs.length - 1])} AP acumulado`}>
      <svg
        className="ing-timeline"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Evolução do AP acumulado ao longo do tempo"
      >
        <defs>
          <linearGradient id="ing-ap-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e676" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ing-ap-area)" />
        <path d={line} className="ing-timeline__line" />
        {sorted.map((p, i) => (
          <circle key={p.t} cx={x(ts[i])} cy={y(p.v)} r={2.5} className="ing-timeline__dot">
            <title>{`${p.t}: ${fmtStat(p.v)} AP`}</title>
          </circle>
        ))}
        {years.map((yr) => {
          const t = new Date(Date.UTC(yr, 0, 1)).getTime()
          if (t < tMin || t > tMax) return null
          return (
            <text key={yr} x={x(t)} y={H - 6} textAnchor="middle" className="ing-timeline__label">
              {yr}
            </text>
          )
        })}
      </svg>
    </Panel>
  )
}
