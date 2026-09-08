'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {annotateLaneGaps, formatGap, groupLanes} from '@/lib/ingress-timeline.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import Panel from './Panel'

type Acq = {slug: string; name: string; group: string; tier: string; date: string}
type Row = Acq & {gapDays: number | null; prevTier: string | null}
type TierEntry = {tier: string; date: string; gapDays: number | null; prevTier: string | null}
type Lane = {
  slug: string
  name: string
  group: string
  latestTier: string
  firstDate: string
  tiers: TierEntry[]
}
type MedalStat = {
  value: number
  thresholds: number[]
  pct: number | null
  next: {tier: string; remaining: number} | null
  beyond: {label: string; pct: number; remaining: number} | null
}
type MedalStats = Record<string, MedalStat>
type Variant = 'resumo' | 'completo'

const FMT = new Intl.NumberFormat('pt-BR')
const CORE_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

const RIGHT = 14
const LEFT_PAD = 14
const ROW_H = 26
const AXIS_TOP = 18

const TIER_COLOR: Record<string, string> = {
  bronze: '#d08a4e',
  silver: '#9aa4ac',
  gold: '#ffd24a',
  platinum: '#7fe9ff',
  onyx: '#0c0f14',
  single: '#26b6ff',
}
const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
  onyx: 'Onyx',
  single: 'Evento',
}

const CATEGORIES: {k: string; label: string}[] = [
  {k: 'all', label: 'Todas'},
  {k: 'core', label: 'Estatística'},
  {k: 'anomaly', label: 'Anomalia'},
  {k: 'event', label: 'Evento'},
]
const TIER_CHIPS: {k: string; label: string}[] = [
  {k: 'all', label: 'Todos'},
  {k: 'bronze', label: 'Bronze'},
  {k: 'silver', label: 'Prata'},
  {k: 'gold', label: 'Ouro'},
  {k: 'platinum', label: 'Platina'},
  {k: 'onyx', label: 'Onyx'},
  {k: 'single', label: 'Evento'},
]

const YEAR = 365.25 * 24 * 3600 * 1000

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function laneArt(lane: {slug: string; group: string; latestTier: string}) {
  return artPath(lane.slug, lane.group === 'core' ? lane.latestTier : 'single')
}

function hideBrokenImg(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden'
}

/** Área acumulada do total de conquistas (step-after), da esquerda à direita. */
function cumulativePath(
  rows: {date: string}[],
  xOf: (t: number) => number,
  yOf: (v: number) => number,
  yBase: number,
) {
  if (!rows.length) return ''
  const parts: string[] = []
  let n = 0
  for (const r of rows) {
    const x = xOf(Date.parse(r.date))
    parts.push(`${x},${yOf(n)}`)
    n += 1
    parts.push(`${x},${yOf(n)}`)
  }
  const firstX = xOf(Date.parse(rows[0].date))
  const lastX = xOf(Date.parse(rows[rows.length - 1].date))
  return `M${firstX},${yBase} L${parts.join(' L')} L${lastX},${yBase} Z`
}

function yearList(minTs: number, maxTs: number) {
  const out: number[] = []
  for (let y = new Date(minTs).getUTCFullYear(); y <= new Date(maxTs).getUTCFullYear(); y += 1) out.push(y)
  return out
}

function Placeholder({variant}: {variant: Variant}) {
  return (
    <Panel label="Linha do tempo" hint="quando cada medalha caiu">
      <p className="ing-pending">
        <span className="ing-pending__dot" aria-hidden="true" />
        {variant === 'resumo'
          ? 'A linha do tempo aparece com 2 ou mais datas de conquista.'
          : 'A linha do tempo aparece com 2 ou mais datas de conquista. Ela cresce conforme as datas são transcritas dos prints do scanner (ou quando o dump GDPR chega).'}
      </p>
    </Panel>
  )
}

/** Curva acumulada + tira das medalhas mais recentes, que leva à página completa. */
function Resumo({rows}: {rows: Row[]}) {
  const W = 760
  const H = 96
  const pad = {t: 10, b: 18}
  const ts = rows.map((r) => Date.parse(r.date))
  const min = Math.min(...ts)
  const max = Math.max(...ts)
  const xOf = (t: number) => 8 + ((t - min) / (max - min || 1)) * (W - 16)
  const yOf = (v: number) => H - pad.b - (v / rows.length) * (H - pad.t - pad.b)
  const years = yearList(min, max)
  const step = years.length > 16 ? 3 : years.length > 8 ? 2 : 1

  const recent: Row[] = []
  const seen = new Set<string>()
  for (let i = rows.length - 1; i >= 0 && recent.length < 8; i -= 1) {
    if (seen.has(rows[i].slug)) continue
    seen.add(rows[i].slug)
    recent.push(rows[i])
  }

  return (
    <Panel label="Linha do tempo" hint={`${rows.length} conquistas`}>
      <a className="ing-tl__teaser" href="/ingress/linha-do-tempo">
        <svg className="ing-tl__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Total de conquistas ao longo do tempo">
          <defs>
            <linearGradient id="ing-tl-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e676" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#26b6ff" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <line x1={8} y1={H - pad.b} x2={W - 8} y2={H - pad.b} className="ing-tl__axis" />
          {years.map((y, i) =>
            i % step === 0 ? (
              <text key={y} x={xOf(Date.UTC(y, 0, 1))} y={H - 5} textAnchor="middle" className="ing-tl__year">
                {y}
              </text>
            ) : null,
          )}
          <path d={cumulativePath(rows, xOf, yOf, H - pad.b)} fill="url(#ing-tl-fill)" stroke="#00e676" strokeWidth={1.5} />
        </svg>
        <span className="ing-tl__recent">
          {recent.map((r) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={r.slug}
              src={artPath(r.slug, r.group === 'core' ? r.tier : 'single')}
              alt={r.name}
              width={30}
              height={30}
              onError={hideBrokenImg}
            />
          ))}
        </span>
        <span className="ing-tl__teaser-cta">abrir linha do tempo →</span>
      </a>
    </Panel>
  )
}

/** Mini gráfico: os tiers desta medalha nas datas reais, no vão de tempo dela. */
function MiniSpark({tiers}: {tiers: TierEntry[]}) {
  const W = 210
  const H = 58
  const pad = 12
  const cy = 26
  const ds = tiers.map((t) => Date.parse(t.date))
  const min = Math.min(...ds)
  const max = Math.max(...ds)
  const x = (t: number) => pad + (max === min ? 0.5 : (t - min) / (max - min)) * (W - 2 * pad)
  const yr = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCFullYear()
  return (
    <svg className="ing-tl__detail-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progressão no tempo">
      <line x1={pad} y1={cy} x2={W - pad} y2={cy} className="ing-tl__lane-track" />
      {tiers.length > 1 ? (
        <polyline className="ing-tl__line" points={tiers.map((t) => `${x(Date.parse(t.date))},${cy}`).join(' ')} />
      ) : null}
      {tiers.map((t) => (
        <circle
          key={t.tier}
          cx={x(Date.parse(t.date))}
          cy={cy}
          r={4.5}
          fill={TIER_COLOR[t.tier] ?? '#26b6ff'}
          className={`ing-tl__dot${t.tier === 'onyx' ? ' is-onyx' : ''}`}
        />
      ))}
      <text x={pad} y={H - 5} textAnchor="start" className="ing-tl__year">
        {yr(tiers[0].date)}
      </text>
      {tiers.length > 1 ? (
        <text x={W - pad} y={H - 5} textAnchor="end" className="ing-tl__year">
          {yr(tiers[tiers.length - 1].date)}
        </text>
      ) : null}
    </svg>
  )
}

/** Escada dos 5 tiers de uma medalha de estatística: limiar, data e progresso. */
function CoreLadder({lane, idx, stat}: {lane: Lane; idx: number; stat: MedalStat}) {
  const gotByTier = new Map(lane.tiers.map((t, i) => [t.tier, {entry: t, i}]))
  const firstLocked = stat.thresholds.findIndex((thr) => stat.value < thr)
  return (
    <div className="ing-tl__detail-stat">
      <p className="ing-tl__detail-total">
        Seu total: <b>{FMT.format(stat.value)}</b>
      </p>
      <ol className="ing-tl__detail-ladder">
        {CORE_TIERS.map((tn, i) => {
          const thr = stat.thresholds[i]
          const got = gotByTier.get(tn)
          const reached = stat.value >= thr
          const g = got ? formatGap(got.entry.gapDays) : null
          return (
            <li key={tn} className={got?.i === idx ? 'is-current' : reached ? undefined : 'is-locked'}>
              <span className="ing-tl__detail-dot" style={{background: TIER_COLOR[tn]}} />
              <span className="ing-tl__detail-tier">{TIER_LABEL[tn]}</span>
              <span className="ing-tl__detail-thr">{FMT.format(thr)}</span>
              <time>
                {got
                  ? fmtDate(got.entry.date)
                  : reached
                    ? '✓'
                    : i === firstLocked
                      ? `${Math.round((stat.pct ?? 0) * 100)}%`
                      : '—'}
              </time>
              {g ? <span className="ing-tl__detail-gap">+{g}</span> : null}
            </li>
          )
        })}
      </ol>
      {stat.beyond ? (
        <p className="ing-tl__detail-foot">
          {stat.beyond.label} · {Math.round(stat.beyond.pct * 100)}% · faltam {FMT.format(stat.beyond.remaining)}
        </p>
      ) : stat.next ? (
        <p className="ing-tl__detail-foot">
          faltam {FMT.format(stat.next.remaining)} para {TIER_LABEL[stat.next.tier] ?? stat.next.tier}
        </p>
      ) : null}
    </div>
  )
}

function DetailPanel({
  sel,
  medalStats,
  onClose,
}: {
  sel: {lane: Lane; idx: number}
  medalStats?: MedalStats
  onClose: () => void
}) {
  const {lane, idx} = sel
  const stat = lane.group === 'core' ? medalStats?.[lane.slug] : undefined
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'})
  }, [])

  const entry = lane.tiers[idx]
  const first = lane.tiers[0]
  const last = lane.tiers[lane.tiers.length - 1]
  const totalDays = Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86_400_000)
  const totalSpan = formatGap(totalDays)
  const range =
    lane.tiers.length > 1
      ? `${TIER_LABEL[first.tier] ?? first.tier} → ${TIER_LABEL[last.tier] ?? last.tier}${totalSpan ? ` · ${totalSpan}` : ''}`
      : `${TIER_LABEL[entry.tier] ?? entry.tier} · tier único`

  return (
    <div className="ing-tl__detail" role="dialog" aria-label={`Detalhe de ${lane.name}`} ref={ref}>
      <button type="button" className="ing-tl__detail-close" onClick={onClose} aria-label="Fechar">
        ✕
      </button>
      <div className="ing-tl__detail-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ing-tl__detail-art"
          src={artPath(lane.slug, lane.group === 'core' ? entry.tier : 'single')}
          alt=""
          width={64}
          height={64}
          onError={hideBrokenImg}
        />
        <div>
          <b>{lane.name}</b>
          <span className="ing-tl__detail-sub">{range}</span>
          {lane.group === 'core' ? (
            <a className="ing-tl__detail-link" href={`/ingress/medalha/${lane.slug}`}>
              abrir página da {lane.name} →
            </a>
          ) : null}
        </div>
      </div>

      <div className="ing-tl__detail-grid">
        <MiniSpark tiers={lane.tiers} />
        {stat ? (
          <CoreLadder lane={lane} idx={idx} stat={stat} />
        ) : (
          <ol className="ing-tl__detail-ladder">
            {lane.tiers.map((t, i) => {
              const g = formatGap(t.gapDays)
              return (
                <li key={t.tier} className={i === idx ? 'is-current' : undefined}>
                  <span className="ing-tl__detail-dot" style={{background: TIER_COLOR[t.tier] ?? '#26b6ff'}} />
                  <span className="ing-tl__detail-tier">{TIER_LABEL[t.tier] ?? t.tier}</span>
                  {g ? <span className="ing-tl__detail-gap">+{g}</span> : null}
                  <time>{fmtDate(t.date)}</time>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

function Completo({rows, medalStats}: {rows: Row[]; medalStats?: MedalStats}) {
  const [cat, setCat] = useState('all')
  const [tierF, setTierF] = useState('all')
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [selected, setSelected] = useState<{lane: Lane; idx: number} | null>(null)
  const [hover, setHover] = useState<{x: number; y: number; text: string} | null>(null)
  const overviewRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{mode: 'new' | 'pan'; startT: number; origin: [number, number]} | null>(null)

  const ts = rows.map((r) => Date.parse(r.date))
  const domainMin = Math.min(...ts)
  const domainMax = Math.max(...ts)
  const [t0, t1] = sel ?? [domainMin, domainMax]

  // --- overview (full width, scaled) ---
  const OW = 760
  const OH = 76
  const oPad = {t: 8, b: 18}
  const oxOf = (t: number) => 8 + ((t - domainMin) / (domainMax - domainMin || 1)) * (OW - 16)
  const oyOf = (v: number) => OH - oPad.b - (v / rows.length) * (OH - oPad.t - oPad.b)
  const overviewYears = yearList(domainMin, domainMax)
  const oStep = overviewYears.length > 16 ? 3 : overviewYears.length > 8 ? 2 : 1

  const tAtClientX = (clientX: number) => {
    const svg = overviewRef.current
    if (!svg) return domainMin
    const rect = svg.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const inner = (ratio * OW - 8) / (OW - 16)
    return domainMin + Math.max(0, Math.min(1, inner)) * (domainMax - domainMin)
  }
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = tAtClientX(e.clientX)
    if (sel && t >= sel[0] && t <= sel[1]) dragRef.current = {mode: 'pan', startT: t, origin: [sel[0], sel[1]]}
    else {
      dragRef.current = {mode: 'new', startT: t, origin: [t, t]}
      setSel([t, t])
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    const t = tAtClientX(e.clientX)
    if (d.mode === 'new') setSel([Math.min(d.startT, t), Math.max(d.startT, t)])
    else {
      const shift = t - d.startT
      let a = d.origin[0] + shift
      let b = d.origin[1] + shift
      const span = b - a
      if (a < domainMin) {
        a = domainMin
        b = a + span
      }
      if (b > domainMax) {
        b = domainMax
        a = b - span
      }
      setSel([a, b])
    }
  }
  const onUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (d && sel && sel[1] - sel[0] < (domainMax - domainMin) * 0.02) setSel(null)
  }

  // --- filtered lanes for the swimlane ---
  const lanes = useMemo(() => {
    const visible = rows.filter(
      (r) =>
        (cat === 'all' || r.group === cat) &&
        (tierF === 'all' || r.tier === tierF) &&
        Date.parse(r.date) >= t0 &&
        Date.parse(r.date) <= t1,
    )
    return groupLanes(visible) as Lane[]
  }, [rows, cat, tierF, t0, t1])

  const totalVisible = lanes.reduce((n, l) => n + l.tiers.length, 0)

  // --- swimlane plot (real px width, horizontal scroll) ---
  const spanYears = (t1 - t0) / YEAR
  const plotW = Math.max(680, Math.round(spanYears * 58))
  const SH = AXIS_TOP + Math.max(lanes.length, 1) * ROW_H + 20
  const sxOf = (t: number) => LEFT_PAD + ((t - t0) / (t1 - t0 || 1)) * (plotW - LEFT_PAD - RIGHT)
  const laneYears = yearList(t0, t1)
  const laneStep = spanYears > 16 ? 3 : spanYears > 8 ? 2 : 1

  const yearTicks = laneYears
    .map((y, i) => ({y, x: sxOf(Date.UTC(y, 0, 1)), show: i % laneStep === 0}))
    .filter((t) => t.show && t.x >= LEFT_PAD - 1 && t.x <= plotW - RIGHT + 1)

  return (
    <section className="ing-panel ing-tl">
      <div className="ing-panel__head">
        <h2 className="ing-panel__label">Linha do tempo</h2>
        <span className="ing-panel__hint">
          {totalVisible} de {rows.length}
        </span>
      </div>

      <div className="ing-tl__filters" role="group" aria-label="Filtros da linha do tempo">
        <div className="ing-tl__chipset">
          {CATEGORIES.map((c) => (
            <button key={c.k} type="button" className="ing-tl__chip" aria-pressed={cat === c.k} onClick={() => setCat(c.k)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="ing-tl__chipset">
          {TIER_CHIPS.map((c) => (
            <button
              key={c.k}
              type="button"
              className="ing-tl__chip"
              aria-pressed={tierF === c.k}
              onClick={() => setTierF(c.k)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={overviewRef}
        className="ing-tl__svg ing-tl__overview"
        viewBox={`0 0 ${OW} ${OH}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        role="img"
        aria-label="Total de conquistas — arraste para dar zoom num período"
      >
        <defs>
          <linearGradient id="ing-tl-fill-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e676" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#26b6ff" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <line x1={8} y1={OH - oPad.b} x2={OW - 8} y2={OH - oPad.b} className="ing-tl__axis" />
        {overviewYears.map((y, i) =>
          i % oStep === 0 ? (
            <text key={y} x={oxOf(Date.UTC(y, 0, 1))} y={OH - 5} textAnchor="middle" className="ing-tl__year">
              {y}
            </text>
          ) : null,
        )}
        <path d={cumulativePath(rows, oxOf, oyOf, OH - oPad.b)} fill="url(#ing-tl-fill-c)" stroke="#00e676" strokeWidth={1.5} />
        {sel ? (
          <rect
            className="ing-tl__brush"
            x={oxOf(sel[0])}
            y={2}
            width={Math.max(1, oxOf(sel[1]) - oxOf(sel[0]))}
            height={OH - oPad.b - 2}
          />
        ) : null}
      </svg>
      <p className="ing-tl__hint-line">
        {sel ? (
          <button type="button" className="ing-tl__reset" onClick={() => setSel(null)}>
            ↺ ver período inteiro
          </button>
        ) : (
          'Arraste na curva para dar zoom · toque numa medalha para ver o detalhe'
        )}
      </p>

      {selected ? (
        <DetailPanel sel={selected} medalStats={medalStats} onClose={() => setSelected(null)} />
      ) : null}

      <div className="ing-tl__swim">
        <ul className="ing-tl__swim-labels" style={{paddingTop: AXIS_TOP}}>
          {lanes.map((lane) => (
            <li key={lane.slug} style={{height: ROW_H}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={laneArt(lane)} alt="" width={18} height={18} onError={hideBrokenImg} />
              <span>{lane.name}</span>
            </li>
          ))}
        </ul>
        <div className="ing-tl__swim-plot">
          <svg width={plotW} height={SH} role="img" aria-label={`${lanes.length} medalhas na linha do tempo`}>
            {yearTicks.map((t) => (
              <g key={t.y}>
                <line x1={t.x} y1={AXIS_TOP - 6} x2={t.x} y2={SH - 16} className="ing-tl__grid" />
                <text x={t.x} y={12} textAnchor="middle" className="ing-tl__year">
                  {t.y}
                </text>
                <text x={t.x} y={SH - 4} textAnchor="middle" className="ing-tl__year">
                  {t.y}
                </text>
              </g>
            ))}
            {lanes.map((lane, i) => {
              const cy = AXIS_TOP + i * ROW_H + ROW_H / 2
              const active = selected?.lane.slug === lane.slug
              return (
                <g key={lane.slug}>
                  <line x1={LEFT_PAD} y1={cy} x2={plotW - RIGHT} y2={cy} className="ing-tl__lane-track" />
                  {lane.tiers.length > 1 ? (
                    <polyline
                      className="ing-tl__line"
                      points={lane.tiers.map((t) => `${sxOf(Date.parse(t.date))},${cy}`).join(' ')}
                    />
                  ) : null}
                  {active
                    ? lane.tiers.slice(1).map((t, k) => {
                        const g = formatGap(t.gapDays)
                        if (!g) return null
                        const xa = sxOf(Date.parse(lane.tiers[k].date))
                        const xb = sxOf(Date.parse(t.date))
                        return (
                          <text key={`${t.tier}-seg`} x={(xa + xb) / 2} y={cy - 8} textAnchor="middle" className="ing-tl__seg">
                            {g}
                          </text>
                        )
                      })
                    : null}
                  {lane.tiers.map((t, k) => {
                    const cx = sxOf(Date.parse(t.date))
                    return (
                      <g key={`${t.tier}-${t.date}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={active ? 6 : 5}
                          fill={TIER_COLOR[t.tier] ?? '#26b6ff'}
                          className={`ing-tl__dot${t.tier === 'onyx' ? ' is-onyx' : ''}`}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={13}
                          fill="transparent"
                          className="ing-tl__hit"
                          onClick={() => setSelected({lane, idx: k})}
                          onMouseEnter={(e) =>
                            setHover({
                              x: e.clientX,
                              y: e.clientY,
                              text: `${lane.name} — ${TIER_LABEL[t.tier] ?? t.tier} · ${fmtDate(t.date)}`,
                            })
                          }
                          onMouseMove={(e) => setHover((h) => (h ? {...h, x: e.clientX, y: e.clientY} : h))}
                          onMouseLeave={() => setHover(null)}
                        >
                          <title>{`${lane.name} — ${TIER_LABEL[t.tier] ?? t.tier} · ${fmtDate(t.date)}`}</title>
                        </circle>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {hover ? (
        <div
          className="ing-tl__tip"
          style={{
            left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 400) - 220),
            top: hover.y + 14,
          }}
        >
          {hover.text}
        </div>
      ) : null}
    </section>
  )
}

/**
 * Linha do tempo das conquistas. `variant="resumo"` (no /ingress) mostra a curva
 * acumulada + as medalhas mais recentes e leva à página completa;
 * `variant="completo"` (rota dedicada) tem overview + brush de zoom, filtros,
 * swimlane por medalha com o hexágono da medalha e rótulos fixos, e um painel de
 * detalhe ao tocar num ponto (arte, tiers com datas, intervalo, drill-down).
 */
export default function AchievementTimeline({
  acquisitions,
  variant = 'completo',
  medalStats,
}: {
  acquisitions: Acq[]
  variant?: Variant
  medalStats?: MedalStats
}) {
  const rows = useMemo(() => annotateLaneGaps(acquisitions) as Row[], [acquisitions])
  if (!rows || rows.length < 2) return <Placeholder variant={variant} />
  return variant === 'resumo' ? <Resumo rows={rows} /> : <Completo rows={rows} medalStats={medalStats} />
}
