'use client'

import {Fragment, useState} from 'react'
import {computeRadarAxes, compareRadar, RADAR_DRAW_MAX} from '@/lib/ingress-radar.mjs'
import {parseAppExport} from '@/lib/ingress-stats.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'

const FMT = new Intl.NumberFormat('pt-BR')
const SIZE = 260
const C = SIZE / 2
const R = 90
const PAD_X = 48 // folga lateral no viewBox para os rótulos dos eixos não cortarem

type Scale = number | 'fit'
const SCALES: {v: Scale; label: string}[] = [
  {v: 0.5, label: '½×'},
  {v: 1, label: 'Onyx'},
  {v: RADAR_DRAW_MAX, label: `${RADAR_DRAW_MAX}×`},
  {v: 'fit', label: 'Forma'},
]

type Part = {key: string; label: string; value: number; ref: number; ratio: number; note: string | null}
type Axis = {id: string; label: string; onyxRatio: number; value: number; parts: Part[]}
type Agent = {codename: string; stats: Record<string, number>}

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

const pct = (r: number) => `${Math.round(r * 100)}%`

function toAgent(text: string): Agent {
  const p = parseAppExport(text)
  if (!p.agent?.codename) throw new Error('Export sem "Agent Name".')
  return {codename: p.agent.codename, stats: p.stats}
}

/** Anéis em múltiplos do Onyx que cabem dentro da escala escolhida. */
function ringStops(drawMax: number) {
  const cands = drawMax <= 0.5 ? [0.25, 0.5] : drawMax <= 1 ? [0.5, 1] : [0.5, 1, 2]
  return cands.filter((o) => o <= drawMax + 1e-9)
}

/**
 * Radar do padrão de jogo. Cada eixo é a média das razões das suas estatísticas
 * contra o limiar de Onyx da medalha correspondente. Escala do desenho ajustável
 * (½× / Onyx / 2× / Forma). "Comparar" sobrepõe outro agente: contra o dono do
 * perfil, ou dois exports colados um contra o outro. Leaf client component.
 */
export default function ProfileRadar({
  stats,
  agentName = 'Você',
}: {
  stats: Profile['stats']
  agentName?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const [scale, setScale] = useState<Scale>(RADAR_DRAW_MAX)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'vs-me' | 'two'>('vs-me')
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [cmp, setCmp] = useState<{a: Agent; b: Agent} | null>(null)
  const [error, setError] = useState<string | null>(null)

  const me: Agent = {codename: agentName, stats: stats as Record<string, number>}
  const agentA = cmp ? cmp.a : me
  const agentB = cmp ? cmp.b : null

  const aAxes = computeRadarAxes(agentA.stats) as Axis[]
  const bAxes = agentB ? (computeRadarAxes(agentB.stats) as Axis[]) : null
  const n = aAxes.length
  const rows = agentB ? compareRadar(agentA.stats, agentB.stats) : null

  const sel = active != null ? aAxes[active] : null
  const selB = active != null && bAxes ? bAxes[active] : null

  const fit = scale === 'fit'
  const maxOf = (as: Axis[]) => (fit ? Math.max(...as.map((a) => a.onyxRatio), 0.01) : (scale as number))
  const radiusIn = (onyxRatio: number, as: Axis[]) => R * Math.max(Math.min(onyxRatio / maxOf(as), 1), 0.02)
  const shape = (as: Axis[]) => as.map((a, i) => point(i, n, radiusIn(a.onyxRatio, as)).join(',')).join(' ')
  const stops = fit ? [] : ringStops(scale as number)
  const edge = stops[stops.length - 1]

  const runCompare = () => {
    try {
      if (mode === 'two') setCmp({a: toAgent(textA), b: toAgent(textB)})
      else setCmp({a: me, b: toAgent(textA)})
      setError(null)
      setActive(null)
    } catch (e) {
      setCmp(null)
      setError(e instanceof Error ? e.message : 'Não deu pra ler esse texto.')
    }
  }
  const clear = () => {
    setCmp(null)
    setTextA('')
    setTextB('')
    setError(null)
    setOpen(false)
  }
  const canCompare = mode === 'two' ? textA.trim() !== '' && textB.trim() !== '' : textA.trim() !== ''

  const svg = (
    <div className="ing-radar">
      <svg viewBox={`${-PAD_X} 0 ${SIZE + PAD_X * 2} ${SIZE + 6}`} role="img" aria-label="Radar do padrão de jogo">
        {fit
          ? [0.34, 0.67, 1].map((f) => (
              <polygon
                key={f}
                points={aAxes.map((_, i) => point(i, n, R * f).join(',')).join(' ')}
                className={`ing-radar__ring${f === 1 ? ' ing-radar__ring--edge' : ''}`}
              />
            ))
          : stops.map((o) => {
              const rr = R * Math.min(o / (scale as number), 1)
              const isOnyx = Math.abs(o - 1) < 1e-9
              return (
                <g key={o}>
                  <polygon
                    points={aAxes.map((_, i) => point(i, n, rr).join(',')).join(' ')}
                    className={`ing-radar__ring${isOnyx ? ' ing-radar__ring--onyx' : ''}${o === edge ? ' ing-radar__ring--edge' : ''}`}
                  />
                  <text x={C + 3} y={C - rr - 3} className="ing-radar__ring-label">
                    {isOnyx ? 'Onyx' : o === 0.5 ? '½×' : `${o}×`}
                  </text>
                </g>
              )
            })}
        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, R)
          return <line key={a.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
        })}

        <polygon points={shape(aAxes)} className={`ing-radar__shape${bAxes ? ' ing-radar__shape--muted' : ''}`} />
        {bAxes ? <polygon points={shape(bAxes)} className="ing-radar__shape ing-radar__shape--them" /> : null}

        {bAxes
          ? bAxes.map((a, i) => {
              const [x, y] = point(i, n, radiusIn(a.onyxRatio, bAxes))
              return <circle key={a.id} cx={x} cy={y} r={4.5} className="ing-radar__dot ing-radar__dot--them" />
            })
          : null}

        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, radiusIn(a.onyxRatio, aAxes))
          const [lx, ly] = point(i, n, R + 14)
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
                {bAxes ? <tspan className="ing-radar__pct-them"> · {pct(bAxes[i].onyxRatio)}</tspan> : null}
              </text>
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          )
        })}
      </svg>
    </div>
  )

  return (
    <Panel label="Padrão de jogo" hint="cada eixo = média das stats vs. o Onyx da medalha">
      <div className="ing-radar__topbar">
        {agentB ? (
          <p className="ing-radar__legend">
            <span className="ing-radar__legend-me">● {agentA.codename}</span>
            <span className="ing-radar__legend-them">● {agentB.codename}</span>
          </p>
        ) : (
          <span />
        )}
        <div className="ing-radar__scale" role="group" aria-label="Escala do radar">
          {SCALES.map((s) => (
            <button key={String(s.v)} type="button" aria-pressed={scale === s.v} onClick={() => setScale(s.v)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {fit ? (
        <p className="ing-radar__scale-note">
          Cada ficha normalizada pelo próprio eixo mais forte — compara o formato do jogo, não o tamanho.
        </p>
      ) : null}

      <div className={agentB ? 'ing-radar__cmp-layout' : undefined}>
        {svg}
        {agentB && bAxes && rows ? (
          <div className="ing-radar__cmp-table-wrap">
            <table className="ing-radar__cmp-table">
              <thead>
                <tr>
                  <th />
                  <th className="ing-radar__cmp-me">{agentA.codename}</th>
                  <th className="ing-radar__cmp-them">{agentB.codename}</th>
                </tr>
              </thead>
              <tbody>
                {aAxes.map((a, i) => (
                  <Fragment key={a.id}>
                    <tr className="is-axis">
                      <th>{a.label}</th>
                      <td className={rows[i].leader === 'mine' ? 'is-lead' : undefined}>{pct(a.onyxRatio)}</td>
                      <td className={rows[i].leader === 'theirs' ? 'is-lead-them' : undefined}>
                        {pct(bAxes[i].onyxRatio)}
                      </td>
                    </tr>
                    {a.parts.map((p, pi) => (
                      <tr key={p.key} className="is-part">
                        <td>{p.label}</td>
                        <td>
                          {FMT.format(p.value)} <small>{pct(p.ratio)}</small>
                        </td>
                        <td>
                          {FMT.format(bAxes[i].parts[pi].value)} <small>{pct(bAxes[i].parts[pi].ratio)}</small>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {sel ? (
        <div className="ing-radar__breakdown">
          <p className="ing-radar__bd-head">
            <b>{sel.label}</b> — {pct(sel.onyxRatio)} do nível Onyx
            {selB ? (
              <span className="ing-radar__bd-vs">
                {' '}
                · {agentB?.codename}: {pct(selB.onyxRatio)}
              </span>
            ) : null}
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
                  {selB ? <span className="ing-radar__bd-ratio-them"> · {pct(selB.parts[pi].ratio)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? `média das ${sel.parts.length} razões` : 'razão contra o limiar de Onyx'}
            {sel.parts.some((p) => p.ratio > RADAR_DRAW_MAX) ? ` · o que passa de ${RADAR_DRAW_MAX * 100}% entra travado` : ''}
          </p>
        </div>
      ) : !agentB ? (
        <p className="ing-radar__hint">Passe o mouse ou toque num eixo para ver o cálculo.</p>
      ) : null}

      {open ? (
        <div className="ing-radar__compare-box">
          <div className="ing-radar__cmp-mode" role="group" aria-label="O que comparar">
            <button type="button" aria-pressed={mode === 'vs-me'} onClick={() => setMode('vs-me')}>
              Contra {agentName}
            </button>
            <button type="button" aria-pressed={mode === 'two'} onClick={() => setMode('two')}>
              Dois agentes
            </button>
          </div>

          <label htmlFor="ing-radar-a" className="ing-radar__compare-label">
            {mode === 'two' ? 'Export do agente A (verde):' : 'Cole o export de estatísticas do app do outro agente:'}
          </label>
          <textarea
            id="ing-radar-a"
            className="ing-radar__textarea"
            rows={3}
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Time Span	Agent Name	Agent Faction	Date…	…"
          />
          {mode === 'two' ? (
            <>
              <label htmlFor="ing-radar-b" className="ing-radar__compare-label">
                Export do agente B (roxo):
              </label>
              <textarea
                id="ing-radar-b"
                className="ing-radar__textarea"
                rows={3}
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Time Span	Agent Name	Agent Faction	Date…	…"
              />
            </>
          ) : null}

          {error ? <p className="ing-radar__compare-error">{error}</p> : null}
          <div className="ing-radar__compare-actions">
            <button
              type="button"
              className="ing-radar__btn ing-radar__btn--primary"
              onClick={runCompare}
              disabled={!canCompare}
            >
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
