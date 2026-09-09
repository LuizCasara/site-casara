'use client'

import {useState} from 'react'
import {computeRadarAxes, compareRadar, RADAR_DRAW_MAX} from '@/lib/ingress-radar.mjs'
import {parseAppExport} from '@/lib/ingress-stats.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'

const FMT = new Intl.NumberFormat('pt-BR')
const SIZE = 260
const C = SIZE / 2
const R = 80
const RING_ONYX = 1 / RADAR_DRAW_MAX
const RINGS = [RING_ONYX / 2, RING_ONYX, 1]

type Part = {key: string; label: string; value: number; ref: number; ratio: number; note: string | null}
type Axis = {id: string; label: string; onyxRatio: number; value: number; parts: Part[]}
type Other = {codename: string; stats: Record<string, number>}

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

const pct = (r: number) => `${Math.round(r * 100)}%`

/**
 * Radar do padrão de jogo. Cada eixo é a média das razões das suas estatísticas
 * contra o limiar de Onyx da medalha correspondente. Toque/hover num eixo mostra
 * o cálculo. "Comparar" cola o export do app de outro agente e sobrepõe a ficha
 * dele. Leaf client component.
 */
export default function ProfileRadar({
  stats,
  agentName = 'Você',
}: {
  stats: Profile['stats']
  agentName?: string
}) {
  const axes = computeRadarAxes(stats) as Axis[]
  const n = axes.length
  const [active, setActive] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [other, setOther] = useState<Other | null>(null)
  const [error, setError] = useState<string | null>(null)

  const otherAxes = other ? (computeRadarAxes(other.stats) as Axis[]) : null
  const rows = other ? compareRadar(stats, other.stats) : null
  const sel = active != null ? axes[active] : null
  const selOther = active != null && otherAxes ? otherAxes[active] : null

  const shape = (as: Axis[]) => as.map((a, i) => point(i, n, R * Math.max(a.value, 0.02)).join(',')).join(' ')

  const doCompare = () => {
    try {
      const parsed = parseAppExport(paste)
      if (!parsed.agent?.codename) throw new Error('Export sem "Agent Name".')
      setOther({codename: parsed.agent.codename, stats: parsed.stats})
      setError(null)
      setActive(null)
    } catch (e) {
      setOther(null)
      setError(e instanceof Error ? e.message : 'Não deu pra ler esse texto.')
    }
  }
  const clear = () => {
    setOther(null)
    setPaste('')
    setError(null)
    setOpen(false)
  }

  return (
    <Panel label="Padrão de jogo" hint="cada eixo = média das stats vs. o Onyx da medalha">
      {other ? (
        <p className="ing-radar__legend">
          <span className="ing-radar__legend-me">● {agentName}</span>
          <span className="ing-radar__legend-them">● {other.codename}</span>
        </p>
      ) : null}

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

          {otherAxes ? <polygon points={shape(otherAxes)} className="ing-radar__shape ing-radar__shape--them" /> : null}
          <polygon points={shape(axes)} className="ing-radar__shape" />

          <text x={C + 3} y={C - R * RING_ONYX - 3} className="ing-radar__ring-label">
            Onyx
          </text>

          {otherAxes
            ? otherAxes.map((a, i) => {
                const [x, y] = point(i, n, R * Math.max(a.value, 0.02))
                return <circle key={a.id} cx={x} cy={y} r={3.5} className="ing-radar__dot ing-radar__dot--them" />
              })
            : null}

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
                <circle cx={x} cy={y} r={active === i ? 6 : 4} className={`ing-radar__dot${active === i ? ' is-active' : ''}`}>
                  <title>{`${a.label}: ${pct(a.onyxRatio)} do nível Onyx`}</title>
                </circle>
                <text x={lx} y={ly - 5} textAnchor={anchor} className="ing-radar__label">
                  {a.label}
                </text>
                <text x={lx} y={ly + 6} textAnchor={anchor} className="ing-radar__pct">
                  {pct(a.onyxRatio)}
                  {otherAxes ? <tspan className="ing-radar__pct-them"> · {pct(otherAxes[i].onyxRatio)}</tspan> : null}
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
            <b>{sel.label}</b> — {pct(sel.onyxRatio)} do nível Onyx
            {selOther ? <span className="ing-radar__bd-vs"> · {other?.codename}: {pct(selOther.onyxRatio)}</span> : null}
          </p>
          <ul>
            {sel.parts.map((p, pi) => (
              <li key={p.key} className={p.ratio > RADAR_DRAW_MAX ? 'is-capped' : undefined}>
                <span className="ing-radar__bd-label">
                  {p.label}
                  {p.note ? <em className="ing-radar__bd-note"> · {p.note}</em> : null}
                </span>
                <span className="ing-radar__bd-calc">
                  {FMT.format(p.value)} / {FMT.format(p.ref)}
                </span>
                <span className="ing-radar__bd-ratio">
                  {pct(p.ratio)}
                  {selOther ? (
                    <span className="ing-radar__bd-ratio-them"> · {pct(selOther.parts[pi].ratio)}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? `média das ${sel.parts.length} razões` : 'razão contra o limiar de Onyx'}
            {sel.parts.some((p) => p.ratio > RADAR_DRAW_MAX) ? ` · o que passa de ${RADAR_DRAW_MAX * 100}% entra travado` : ''}
          </p>
        </div>
      ) : rows ? (
        <ul className="ing-radar__compare">
          {rows.map((row) => (
            <li key={row.id}>
              <span className="ing-radar__cmp-axis">{row.label}</span>
              <span className={`ing-radar__cmp-me${row.leader === 'mine' ? ' is-lead' : ''}`}>{pct(row.mine)}</span>
              <span className="ing-radar__cmp-sep">vs</span>
              <span className={`ing-radar__cmp-them${row.leader === 'theirs' ? ' is-lead' : ''}`}>{pct(row.theirs)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ing-radar__hint">Passe o mouse ou toque num eixo para ver o cálculo.</p>
      )}

      {open ? (
        <div className="ing-radar__compare-box">
          <label htmlFor="ing-radar-paste" className="ing-radar__compare-label">
            Cole aqui o export de estatísticas do app de outro agente:
          </label>
          <textarea
            id="ing-radar-paste"
            className="ing-radar__textarea"
            rows={3}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Time Span	Date…	Agent Name	Agent Faction	…"
          />
          {error ? <p className="ing-radar__compare-error">{error}</p> : null}
          <div className="ing-radar__compare-actions">
            <button type="button" className="ing-radar__btn ing-radar__btn--primary" onClick={doCompare} disabled={!paste.trim()}>
              Comparar
            </button>
            <button type="button" className="ing-radar__btn" onClick={clear}>
              Limpar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ing-radar__btn ing-radar__compare-open" onClick={() => setOpen(true)}>
          Comparar com outro agente
        </button>
      )}
    </Panel>
  )
}
