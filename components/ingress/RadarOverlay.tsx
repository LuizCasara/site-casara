'use client'

import {Fragment, useState} from 'react'
import {computeRadarAxes, compareRadar, RADAR_DRAW_MAX} from '@/lib/ingress-radar.mjs'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'
import type {Agent} from './ProfileRadar'

const SIZE = 260
const C = SIZE / 2
const R = 90
const PAD_X = 48 // folga lateral no viewBox para os rótulos dos eixos não cortarem

type Scale = number | 'fit'
const SCALES: {v: Scale; label: string}[] = [
  {v: 0.5, label: '½×'},
  {v: 1, label: 'Onyx'},
  {v: RADAR_DRAW_MAX, label: `${RADAR_DRAW_MAX}×`},
  {v: 'fit', label: 'Estilo'},
]

type Part = {
  key: string
  label: string
  labelEn: string
  value: number
  ref: number
  ratio: number
  note: string | null
  noteEn: string | null
}
type Axis = {id: string; label: string; labelEn: string; onyxRatio: number; value: number; parts: Part[]}

const T = {
  pt: {
    radarAria: 'Radar do padrão de jogo',
    scaleAria: 'Escala do radar',
    scaleStyle: 'Estilo',
    fitNote: 'Cada ficha normalizada pelo próprio eixo mais forte — compara o estilo de jogo, não o tamanho.',
    ofOnyxLevel: 'do nível Onyx',
    breakdownFootMulti: (n: number) => `média das ${n} razões`,
    breakdownFootSingle: 'razão contra o limiar de Onyx',
    breakdownFootCapped: (pct: number) => ` · o que passa de ${pct}% entra travado`,
    hoverHint: 'Passe o mouse ou toque num eixo para ver o cálculo.',
    blankHint: 'Cole seu export de estatísticas abaixo para ver o seu padrão de jogo.',
  },
  en: {
    radarAria: 'Play-pattern radar',
    scaleAria: 'Radar scale',
    scaleStyle: 'Style',
    fitNote: 'Each card normalized by its own strongest axis — compares play style, not size.',
    ofOnyxLevel: 'of Onyx level',
    breakdownFootMulti: (n: number) => `average of ${n} ratios`,
    breakdownFootSingle: 'ratio against the Onyx threshold',
    breakdownFootCapped: (pct: number) => ` · anything past ${pct}% is capped`,
    hoverHint: 'Hover or tap an axis to see the math.',
    blankHint: "Paste your stats export below to see your play pattern.",
  },
} as const

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

const pct = (r: number) => `${Math.round(r * 100)}%`

/** Anéis em múltiplos do Onyx que cabem dentro da escala escolhida. */
function ringStops(drawMax: number) {
  const cands = drawMax <= 0.5 ? [0.25, 0.5] : drawMax <= 1 ? [0.5, 1] : [0.5, 1, 2]
  return cands.filter((o) => o <= drawMax + 1e-9)
}

/**
 * Desenho do radar (1 ou 2 polígonos) + tabela de comparação por eixo/parte +
 * painel de breakdown por hover/tap — extraído de `ProfileRadar` (T8,
 * ingress-ranking-comparison) pra ser reaproveitado pela aba "Comparação"
 * sem duplicar a matemática do polígono. Puramente apresentacional a partir
 * de `Agent`s já prontos: não parseia texto, não fala com API nenhuma.
 */
export default function RadarOverlay({agentA, agentB, blank = false}: {agentA: Agent; agentB?: Agent; blank?: boolean}) {
  const {lang} = useLang()
  const t = T[lang]
  const axisLabel = (a: Axis) => (lang === 'en' ? a.labelEn : a.label)
  const partLabel = (p: Part) => (lang === 'en' ? p.labelEn : p.label)
  const partNote = (p: Part) => (lang === 'en' ? p.noteEn : p.note)

  const [active, setActive] = useState<number | null>(null)
  const [scale, setScale] = useState<Scale>(RADAR_DRAW_MAX)

  const aAxes = computeRadarAxes(agentA.stats) as Axis[]
  const bAxes = agentB ? (computeRadarAxes(agentB.stats) as Axis[]) : null
  const n = aAxes.length
  const rows = agentB ? compareRadar(agentA.stats, agentB.stats) : null

  const sel = active != null && !blank ? aAxes[active] : null
  const selB = active != null && bAxes ? bAxes[active] : null

  // quando os dois lados são o mesmo agente (você agora vs. um export antigo),
  // desambigua os rótulos pela data do snapshot
  const selfCmp = !!agentB && agentA.codename === agentB.codename
  const dmy = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
  const labelA = selfCmp && agentA.capturedAt ? `${agentA.codename} · ${dmy(agentA.capturedAt)}` : agentA.codename
  const labelB = selfCmp && agentB?.capturedAt ? `${agentB.codename} · ${dmy(agentB.capturedAt)}` : (agentB?.codename ?? '')

  const fit = scale === 'fit'
  const maxOf = (as: Axis[]) => (fit ? Math.max(...as.map((a) => a.onyxRatio), 0.01) : (scale as number))
  const radiusIn = (onyxRatio: number, as: Axis[]) => R * Math.max(Math.min(onyxRatio / maxOf(as), 1), 0.02)
  const shape = (as: Axis[]) => as.map((a, i) => point(i, n, radiusIn(a.onyxRatio, as)).join(',')).join(' ')
  const stops = fit ? [] : ringStops(scale as number)
  const edge = stops[stops.length - 1]

  const svg = (
    <div className="ing-radar">
      <svg viewBox={`${-PAD_X} 0 ${SIZE + PAD_X * 2} ${SIZE + 6}`} role="img" aria-label={t.radarAria}>
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
                <title>{`${axisLabel(a)}: ${pct(a.onyxRatio)} ${t.ofOnyxLevel}`}</title>
              </circle>
              <text x={lx} y={ly - 5} textAnchor={anchor} className="ing-radar__label">
                {axisLabel(a)}
              </text>
              {blank ? null : (
                <text x={lx} y={ly + 6} textAnchor={anchor} className="ing-radar__pct">
                  {pct(a.onyxRatio)}
                  {bAxes ? <tspan className="ing-radar__pct-them"> · {pct(bAxes[i].onyxRatio)}</tspan> : null}
                </text>
              )}
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          )
        })}
      </svg>
    </div>
  )

  return (
    <>
      <div className="ing-radar__topbar">
        {agentB ? (
          <p className="ing-radar__legend">
            <span className="ing-radar__legend-me">● {labelA}</span>
            <span className="ing-radar__legend-them">● {labelB}</span>
          </p>
        ) : (
          <span />
        )}
        <div className="ing-radar__scale" role="group" aria-label={t.scaleAria}>
          {SCALES.map((s) => (
            <button key={String(s.v)} type="button" aria-pressed={scale === s.v} onClick={() => setScale(s.v)}>
              {s.v === 'fit' ? t.scaleStyle : s.label}
            </button>
          ))}
        </div>
      </div>

      {fit ? <p className="ing-radar__scale-note">{t.fitNote}</p> : null}

      <div className={agentB ? 'ing-radar__cmp-layout' : undefined}>
        {svg}
        {agentB && bAxes && rows ? (
          <div className="ing-radar__cmp-table-wrap">
            <table className="ing-radar__cmp-table">
              <thead>
                <tr>
                  <th />
                  <th className="ing-radar__cmp-me">{labelA}</th>
                  <th className="ing-radar__cmp-them">{labelB}</th>
                </tr>
              </thead>
              <tbody>
                {aAxes.map((a, i) => (
                  <Fragment key={a.id}>
                    <tr className="is-axis">
                      <th>{axisLabel(a)}</th>
                      <td className={rows[i].leader === 'mine' ? 'is-lead' : undefined}>{pct(a.onyxRatio)}</td>
                      <td className={rows[i].leader === 'theirs' ? 'is-lead-them' : undefined}>
                        {pct(bAxes[i].onyxRatio)}
                      </td>
                    </tr>
                    {a.parts.map((p, pi) => (
                      <tr key={p.key} className="is-part">
                        <td>{partLabel(p)}</td>
                        <td>
                          {fmtStat(p.value)} <small>{pct(p.ratio)}</small>
                        </td>
                        <td>
                          {fmtStat(bAxes[i].parts[pi].value)} <small>{pct(bAxes[i].parts[pi].ratio)}</small>
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
            <b>{axisLabel(sel)}</b> — {pct(sel.onyxRatio)} {t.ofOnyxLevel}
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
                  {partLabel(p)}
                  {partNote(p) ? <em className="ing-radar__bd-note"> · {partNote(p)}</em> : null}
                </span>
                <span className="ing-radar__bd-calc">
                  {fmtStat(p.value)} / {fmtStat(p.ref)}
                </span>
                <span className="ing-radar__bd-ratio">
                  {pct(p.ratio)}
                  {selB ? <span className="ing-radar__bd-ratio-them"> · {pct(selB.parts[pi].ratio)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? t.breakdownFootMulti(sel.parts.length) : t.breakdownFootSingle}
            {sel.parts.some((p) => p.ratio > RADAR_DRAW_MAX) ? t.breakdownFootCapped(RADAR_DRAW_MAX * 100) : ''}
          </p>
        </div>
      ) : !agentB ? (
        <p className="ing-radar__hint">{blank ? t.blankHint : t.hoverHint}</p>
      ) : null}
    </>
  )
}
