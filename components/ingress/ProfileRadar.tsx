'use client'

import {useState} from 'react'
import {computeRadarAxes, RADAR_DRAW_MAX} from '@/lib/ingress-radar.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'

const FMT = new Intl.NumberFormat('pt-BR')
const SIZE = 260
const C = SIZE / 2
const R = 80
const RING_ONYX = 1 / RADAR_DRAW_MAX // fração do raio onde fica o anel "Onyx" (1,0×)
const RINGS = [RING_ONYX / 2, RING_ONYX, 1] // 0,5× · 1× (Onyx) · 2× (borda)

type Part = {key: string; label: string; value: number; ref: number; ratio: number}
type Axis = {id: string; label: string; onyxRatio: number; value: number; parts: Part[]}

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

/**
 * Radar do padrão de jogo. Cada eixo é a média das razões das suas estatísticas
 * contra o limiar de Onyx da medalha correspondente (anel do meio = Onyx, borda
 * = 2× Onyx). Toque/hover num eixo mostra o cálculo. Leaf client component.
 */
export default function ProfileRadar({stats}: {stats: Profile['stats']}) {
  const axes = computeRadarAxes(stats) as Axis[]
  const n = axes.length
  const [active, setActive] = useState<number | null>(null)
  const sel = active != null ? axes[active] : null

  const shape = axes.map((a, i) => point(i, n, R * Math.max(a.value, 0.02)).join(',')).join(' ')

  return (
    <Panel label="Padrão de jogo" hint="cada eixo = média das stats vs. o Onyx da medalha">
      <div className="ing-radar">
        <svg viewBox={`0 0 ${SIZE} ${SIZE + 12}`} role="img" aria-label="Radar do padrão de jogo">
          {RINGS.map((ring, ri) => (
            <polygon
              key={ring}
              points={axes.map((_, i) => point(i, n, R * ring).join(',')).join(' ')}
              className={`ing-radar__ring${ring === RING_ONYX ? ' ing-radar__ring--onyx' : ''}${
                ri === RINGS.length - 1 ? ' ing-radar__ring--edge' : ''
              }`}
            />
          ))}
          {axes.map((a, i) => {
            const [x, y] = point(i, n, R)
            return <line key={a.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
          })}

          <polygon points={shape} className="ing-radar__shape" />

          <text x={C + 3} y={C - R * RING_ONYX - 3} className="ing-radar__ring-label">
            Onyx
          </text>

          {axes.map((a, i) => {
            const [x, y] = point(i, n, R * Math.max(a.value, 0.02))
            const [lx, ly] = point(i, n, R + 16)
            const anchor = lx < C - 8 ? 'end' : lx > C + 8 ? 'start' : 'middle'
            return (
              <g
                key={a.id}
                className="ing-radar__axis"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive((cur) => (cur === i ? null : i))}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={active === i ? 6 : 4}
                  className={`ing-radar__dot${active === i ? ' is-active' : ''}`}
                >
                  <title>{`${a.label}: ${Math.round(a.onyxRatio * 100)}% do nível Onyx`}</title>
                </circle>
                <text x={lx} y={ly - 5} textAnchor={anchor} className="ing-radar__label">
                  {a.label}
                </text>
                <text x={lx} y={ly + 6} textAnchor={anchor} className="ing-radar__pct">
                  {Math.round(a.onyxRatio * 100)}%
                </text>
                <circle cx={x} cy={y} r={18} fill="transparent" />
              </g>
            )
          })}
        </svg>
      </div>

      {sel ? (
        <div className="ing-radar__breakdown">
          <p className="ing-radar__bd-head">
            <b>{sel.label}</b> — {Math.round(sel.onyxRatio * 100)}% do nível Onyx
          </p>
          <ul>
            {sel.parts.map((p) => (
              <li key={p.key} className={p.ratio > RADAR_DRAW_MAX ? 'is-capped' : undefined}>
                <span className="ing-radar__bd-label">{p.label}</span>
                <span className="ing-radar__bd-calc">
                  {FMT.format(p.value)} / {FMT.format(p.ref)}
                </span>
                <span className="ing-radar__bd-ratio">{Math.round(p.ratio * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? `média das ${sel.parts.length} razões` : 'razão contra o limiar de Onyx'}
            {sel.parts.some((p) => p.ratio > RADAR_DRAW_MAX)
              ? ` · o que passa de ${RADAR_DRAW_MAX * 100}% entra travado`
              : ''}
          </p>
        </div>
      ) : (
        <p className="ing-radar__hint">Passe o mouse ou toque num eixo para ver o cálculo.</p>
      )}
    </Panel>
  )
}
