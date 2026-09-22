'use client'

import {Fragment, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {computeRadarAxes, compareRadar, scoreAtOnyxMultiple} from '@/lib/ingress-radar.mjs'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/components/global/LanguageContext'
import type {Agent} from './ProfileRadar'

const SIZE = 260
const C = SIZE / 2
const R = 90
const PAD_X = 48 // folga lateral no viewBox para os rótulos dos eixos não cortarem

/**
 * Escala do radar. `number` = a borda do radar é "Onyx ×N" (N = 1, 4, 16): como
 * cada dobra além do Onyx soma 20 pontos (log₂, ADR-0005), a borda vale
 * `scoreAtOnyxMultiple(N)` = 100, 140, 180. `'fit'` (Estilo) normaliza cada
 * ficha pelo próprio eixo mais forte. Em todas o raio é LINEAR na nota do eixo —
 * a curva logarítmica já está dentro da nota, não no desenho.
 */
type Scale = number | 'fit'
const SCALES: {v: Scale; label: string}[] = [
  {v: 1, label: 'Onyx'},
  {v: 4, label: '×4'},
  {v: 16, label: '×16'},
  {v: 'fit', label: 'Estilo'},
]
const DEFAULT_SCALE: Scale = 'fit'

/** Anéis desenhados em cada escala fixa: `multiple` = Onyx ×N (`null` = o anel de meia-nota, 50). */
const RING_MULTIPLES: Record<number, (number | null)[]> = {1: [null, 1], 4: [1, 2, 4], 16: [1, 4, 16]}

type Part = {
  key: string
  label: string
  labelEn: string
  value: number
  ref: number
  ratio: number
  position: number
  score: number
  note: string | null
  noteEn: string | null
}
type Axis = {id: string; label: string; labelEn: string; position: number; score: number; parts: Part[]}

const T = {
  pt: {
    radarAria: 'Radar do padrão de jogo',
    scaleAria: 'Escala do radar',
    scaleStyle: 'Estilo',
    fitNote: 'Cada ficha normalizada pelo próprio eixo mais forte — compara o estilo de jogo, não o tamanho.',
    logNote:
      'Escala logarítmica além do Onyx: cada dobra soma 20 pontos (×2 = 120, ×4 = 140, ×16 = 180). O anel “×N” é o eixo com todas as partes em N vezes o Onyx.',
    pointsUnit: 'pontos (100 = Onyx)',
    onyxOf: 'do Onyx',
    breakdownFootMulti: (n: number) => `média das ${n} posições de tier × 20`,
    breakdownFootSingle: 'posição de tier × 20',
    breakdownFootBeyond: ' · além do Onyx a posição sobe +1 a cada dobra (log₂), sem teto',
    hoverHint: 'Passe o mouse ou toque num eixo para ver o cálculo.',
    overallScore: 'Nota geral',
    rankOf: (rank: number, total: number) => `${rank}º de ${total}`,
  },
  en: {
    radarAria: 'Play-pattern radar',
    scaleAria: 'Radar scale',
    scaleStyle: 'Style',
    fitNote: 'Each card normalized by its own strongest axis — compares play style, not size.',
    logNote:
      'Logarithmic scale beyond Onyx: every doubling adds 20 points (×2 = 120, ×4 = 140, ×16 = 180). The “×N” ring is an axis with every part at N times Onyx.',
    pointsUnit: 'points (100 = Onyx)',
    onyxOf: 'of Onyx',
    breakdownFootMulti: (n: number) => `average of the ${n} tier positions × 20`,
    breakdownFootSingle: 'tier position × 20',
    breakdownFootBeyond: ' · past Onyx the position climbs +1 per doubling (log₂), no cap',
    hoverHint: 'Hover or tap an axis to see the math.',
    overallScore: 'Overall score',
    rankOf: (rank: number, total: number) => `#${rank} of ${total}`,
  },
} as const

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

const pct = (r: number) => `${Math.round(r * 100)}%`
/** Nota (100 = Onyx) sem casas decimais. */
const pts = (score: number) => Math.round(score).toString()

/** Anéis da escala fixa `multiple`: nota de cada anel + rótulo ("50", "Onyx", "×4"). */
function ringStops(multiple: number) {
  return (RING_MULTIPLES[multiple] ?? [1]).map((m) =>
    m === null ? {score: 50, label: '50'} : {score: scoreAtOnyxMultiple(m), label: m === 1 ? 'Onyx' : `×${m}`},
  )
}

/**
 * Desenho do radar (1 ou 2 polígonos) + tabela de comparação por eixo/parte +
 * painel de breakdown por hover/tap — extraído de `ProfileRadar` (T8,
 * ingress-ranking-comparison) pra ser reaproveitado pela aba "Comparação"
 * sem duplicar a matemática do polígono. Puramente apresentacional a partir
 * de `Agent`s já prontos: não parseia texto, não fala com API nenhuma.
 */
export default function RadarOverlay({agentA, agentB}: {agentA: Agent; agentB?: Agent}) {
  const {lang} = useLang()
  const t = T[lang]
  const axisLabel = (a: Axis) => (lang === 'en' ? a.labelEn : a.label)
  const partLabel = (p: Part) => (lang === 'en' ? p.labelEn : p.label)
  const partNote = (p: Part) => (lang === 'en' ? p.noteEn : p.note)

  const [active, setActive] = useState<number | null>(null)
  const [scale, setScale] = useState<Scale>(DEFAULT_SCALE)

  const aAxes = computeRadarAxes(agentA.stats) as Axis[]
  const bAxes = agentB ? (computeRadarAxes(agentB.stats) as Axis[]) : null
  const n = aAxes.length
  const rows = agentB ? compareRadar(agentA.stats, agentB.stats) : null

  const sel = active != null ? aAxes[active] : null
  const selB = active != null && bAxes ? bAxes[active] : null

  // quando os dois lados são o mesmo agente (você agora vs. um export antigo),
  // desambigua os rótulos pela data do snapshot
  const selfCmp = !!agentB && agentA.codename === agentB.codename
  const dmy = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
  const labelA = selfCmp && agentA.capturedAt ? `${agentA.codename} · ${dmy(agentA.capturedAt)}` : agentA.codename
  const labelB = selfCmp && agentB?.capturedAt ? `${agentB.codename} · ${dmy(agentB.capturedAt)}` : (agentB?.codename ?? '')

  // sub-linha da legenda — só existe pra agente que está no ranking (aba Comparação)
  const legendMeta = (a?: Agent) =>
    a?.overallScore != null && a.rank != null && a.totalAgents != null ? (
      <small className="ing-radar__legend-meta">
        {t.overallScore} <b>{Math.round(a.overallScore)}</b> · {t.rankOf(a.rank, a.totalAgents)}
      </small>
    ) : null

  const fit = scale === 'fit'
  // Borda do radar, em nota do eixo: a da escala fixa (Onyx ×N), ou — no Estilo — o eixo mais forte da própria ficha.
  const maxOf = (as: Axis[]) => (fit ? Math.max(...as.map((a) => a.score), 1) : scoreAtOnyxMultiple(scale as number))
  const radiusIn = (score: number, as: Axis[]) => R * Math.max(Math.min(score / maxOf(as), 1), 0.02)
  const shape = (as: Axis[]) => as.map((a, i) => point(i, n, radiusIn(a.score, as)).join(',')).join(' ')
  const stops = fit ? [] : ringStops(scale as number)
  const edgeScore = stops.length ? stops[stops.length - 1].score : 0

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
          : stops.map((ring) => {
              const rr = R * Math.min(ring.score / maxOf(aAxes), 1)
              const isOnyx = ring.label === 'Onyx'
              return (
                <g key={ring.label}>
                  <polygon
                    points={aAxes.map((_, i) => point(i, n, rr).join(',')).join(' ')}
                    className={`ing-radar__ring${isOnyx ? ' ing-radar__ring--onyx' : ''}${ring.score === edgeScore ? ' ing-radar__ring--edge' : ''}`}
                  />
                  <text x={C + 3} y={C - rr - 3} className="ing-radar__ring-label">
                    {ring.label}
                  </text>
                </g>
              )
            })}
        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, R)
          return <line key={a.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
        })}

        <polygon points={shape(aAxes)} className={`ing-radar__shape${bAxes ? ' ing-radar__shape--muted' : ''}`} />
        {/* `initial={false}`: quando a página já abre com A e B (link compartilhado) não há o que "aparecer". */}
        <AnimatePresence initial={false}>
          {bAxes ? (
            <motion.g
              key="agent-b"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.25}}
            >
              <polygon points={shape(bAxes)} className="ing-radar__shape ing-radar__shape--them" />
              {bAxes.map((a, i) => {
                const [x, y] = point(i, n, radiusIn(a.score, bAxes))
                return <circle key={a.id} cx={x} cy={y} r={4.5} className="ing-radar__dot ing-radar__dot--them" />
              })}
            </motion.g>
          ) : null}
        </AnimatePresence>

        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, radiusIn(a.score, aAxes))
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
                <title>{`${axisLabel(a)}: ${pts(a.score)} ${t.pointsUnit}`}</title>
              </circle>
              <text x={lx} y={ly - 5} textAnchor={anchor} className="ing-radar__label">
                {axisLabel(a)}
              </text>
              <text x={lx} y={ly + 6} textAnchor={anchor} className="ing-radar__pct">
                {pts(a.score)}
                {bAxes ? <tspan className="ing-radar__pct-them"> · {pts(bAxes[i].score)}</tspan> : null}
              </text>
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
        <AnimatePresence initial={false}>
          {agentB ? (
            <motion.p
              key="legend"
              className="ing-radar__legend"
              initial={{opacity: 0, y: -4}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -4}}
              transition={{duration: 0.2}}
            >
              <span className="ing-radar__legend-item ing-radar__legend-me">
                <span>● {labelA}</span>
                {legendMeta(agentA)}
              </span>
              <span className="ing-radar__legend-item ing-radar__legend-them">
                <span>● {labelB}</span>
                {legendMeta(agentB)}
              </span>
            </motion.p>
          ) : null}
        </AnimatePresence>
        {/* Mantém o toggle de escala colado à direita (`justify-content: space-between`) quando não há legenda. */}
        {agentB ? null : <span />}
        <div className="ing-radar__scale" role="group" aria-label={t.scaleAria}>
          {SCALES.map((s) => (
            <button key={String(s.v)} type="button" aria-pressed={scale === s.v} onClick={() => setScale(s.v)}>
              {s.v === 'fit' ? t.scaleStyle : s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="ing-radar__scale-note">{fit ? t.fitNote : t.logNote}</p>

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
                      <td className={rows[i].leader === 'mine' ? 'is-lead' : undefined}>{pts(a.score)}</td>
                      <td className={rows[i].leader === 'theirs' ? 'is-lead-them' : undefined}>
                        {pts(bAxes[i].score)}
                      </td>
                    </tr>
                    {a.parts.map((p, pi) => (
                      <tr key={p.key} className="is-part">
                        <td>{partLabel(p)}</td>
                        <td>
                          <span className="ing-radar__cmp-value">{fmtStat(p.value)}</span>{' '}
                          <small title={`${pct(p.ratio)} ${t.onyxOf}`}>{pts(p.score)}</small>
                        </td>
                        <td>
                          <span className="ing-radar__cmp-value">{fmtStat(bAxes[i].parts[pi].value)}</span>{' '}
                          <small title={`${pct(bAxes[i].parts[pi].ratio)} ${t.onyxOf}`}>{pts(bAxes[i].parts[pi].score)}</small>
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
            <b>{axisLabel(sel)}</b> — {pts(sel.score)} {t.pointsUnit}
            {selB ? (
              <span className="ing-radar__bd-vs">
                {' '}
                · {agentB?.codename}: {pts(selB.score)}
              </span>
            ) : null}
          </p>
          <ul>
            {sel.parts.map((p, pi) => (
              <li key={p.key} className={p.ratio > 1 ? 'is-beyond' : undefined}>
                <span className="ing-radar__bd-label">
                  {partLabel(p)}
                  {partNote(p) ? <em className="ing-radar__bd-note"> · {partNote(p)}</em> : null}
                </span>
                <span className="ing-radar__bd-calc">
                  {fmtStat(p.value)} / {fmtStat(p.ref)} · {pct(p.ratio)}
                </span>
                <span className="ing-radar__bd-ratio">
                  {pts(p.score)}
                  {selB ? <span className="ing-radar__bd-ratio-them"> · {pts(selB.parts[pi].score)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? t.breakdownFootMulti(sel.parts.length) : t.breakdownFootSingle}
            {sel.parts.some((p) => p.ratio > 1) ? t.breakdownFootBeyond : ''}
          </p>
        </div>
      ) : !agentB ? (
        <p className="ing-radar__hint">{t.hoverHint}</p>
      ) : null}
    </>
  )
}
