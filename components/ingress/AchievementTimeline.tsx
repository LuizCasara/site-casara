'use client'

import {useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {annotateLaneGaps, formatGap} from '@/lib/ingress-timeline.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import Panel from './Panel'

type Acq = {slug: string; name: string; group: string; tier: string; date: string}
type Row = Acq & {gapDays: number | null; prevTier: string | null}
type Variant = 'resumo' | 'completo'

const W = 760
const LEFT = 116
const RIGHT = 12
const ROW_H = 18

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

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
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

/** Curva acumulada pequena no /ingress, que leva para a página completa. */
function Resumo({rows}: {rows: Row[]}) {
  const H = 96
  const pad = {t: 10, b: 20}
  const ts = rows.map((r) => Date.parse(r.date))
  const min = Math.min(...ts)
  const max = Math.max(...ts)
  const xOf = (t: number) => 8 + ((t - min) / (max - min || 1)) * (W - 16)
  const yOf = (v: number) => H - pad.b - (v / rows.length) * (H - pad.t - pad.b)
  const years: number[] = []
  for (let y = new Date(min).getUTCFullYear(); y <= new Date(max).getUTCFullYear(); y += 1) years.push(y)
  const step = years.length > 16 ? 3 : years.length > 8 ? 2 : 1

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
              <text key={y} x={xOf(Date.UTC(y, 0, 1))} y={H - 6} textAnchor="middle" className="ing-tl__year">
                {y}
              </text>
            ) : null,
          )}
          <path d={cumulativePath(rows, xOf, yOf, H - pad.b)} fill="url(#ing-tl-fill)" stroke="#00e676" strokeWidth={1.5} />
        </svg>
        <span className="ing-tl__teaser-cta">abrir linha do tempo navegável →</span>
      </a>
    </Panel>
  )
}

function Completo({rows}: {rows: Row[]}) {
  const router = useRouter()
  const [cat, setCat] = useState('all')
  const [tierF, setTierF] = useState('all')
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [hoverLane, setHoverLane] = useState<string | null>(null)
  const [tip, setTip] = useState<{x: number; y: number; row: Row} | null>(null)
  const overviewRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{mode: 'new' | 'pan'; startT: number; origin: [number, number]} | null>(null)

  const ts = rows.map((r) => Date.parse(r.date))
  const domainMin = Math.min(...ts)
  const domainMax = Math.max(...ts)
  const [t0, t1] = sel ?? [domainMin, domainMax]

  const tAtClientX = (clientX: number) => {
    const svg = overviewRef.current
    if (!svg) return domainMin
    const rect = svg.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const px = ratio * W
    const inner = (px - 8) / (W - 16)
    return domainMin + Math.max(0, Math.min(1, inner)) * (domainMax - domainMin)
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = tAtClientX(e.clientX)
    if (sel && t >= sel[0] && t <= sel[1]) {
      dragRef.current = {mode: 'pan', startT: t, origin: [sel[0], sel[1]]}
    } else {
      dragRef.current = {mode: 'new', startT: t, origin: [t, t]}
      setSel([t, t])
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    const t = tAtClientX(e.clientX)
    if (d.mode === 'new') {
      setSel([Math.min(d.startT, t), Math.max(d.startT, t)])
    } else {
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

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (cat === 'all' || r.group === cat) &&
          (tierF === 'all' || r.tier === tierF) &&
          Date.parse(r.date) >= t0 &&
          Date.parse(r.date) <= t1,
      ),
    [rows, cat, tierF, t0, t1],
  )

  const lanes = useMemo(() => {
    const map = new Map<string, {name: string; group: string; pts: Row[]}>()
    for (const r of visible) {
      const l = map.get(r.slug) ?? {name: r.name, group: r.group, pts: []}
      l.pts.push(r)
      map.set(r.slug, l)
    }
    return [...map.entries()]
      .map(([slug, l]) => ({slug, ...l}))
      .sort((a, b) => Date.parse(a.pts[0].date) - Date.parse(b.pts[0].date))
  }, [visible])

  // --- overview ---
  const OH = 76
  const oPad = {t: 8, b: 18}
  const oxOf = (t: number) => 8 + ((t - domainMin) / (domainMax - domainMin || 1)) * (W - 16)
  const oyOf = (v: number) => OH - oPad.b - (v / rows.length) * (OH - oPad.t - oPad.b)
  const overviewYears: number[] = []
  for (let y = new Date(domainMin).getUTCFullYear(); y <= new Date(domainMax).getUTCFullYear(); y += 1) overviewYears.push(y)
  const oStep = overviewYears.length > 16 ? 3 : overviewYears.length > 8 ? 2 : 1

  // --- swimlane ---
  const SH = ROW_H * Math.max(lanes.length, 1) + 24
  const sxOf = (t: number) => LEFT + ((t - t0) / (t1 - t0 || 1)) * (W - LEFT - RIGHT)
  const laneYears: number[] = []
  for (let y = new Date(t0).getUTCFullYear(); y <= new Date(t1).getUTCFullYear(); y += 1) laneYears.push(y)
  const laneSpanYears = (t1 - t0) / YEAR
  const laneStep = laneSpanYears > 16 ? 3 : laneSpanYears > 8 ? 2 : 1

  const showTip = (e: React.MouseEvent, row: Row) => setTip({x: e.clientX, y: e.clientY, row})

  return (
    <section className="ing-panel ing-tl">
      <div className="ing-panel__head">
        <h2 className="ing-panel__label">Linha do tempo</h2>
        <span className="ing-panel__hint">
          {visible.length} de {rows.length}
        </span>
      </div>

      <div className="ing-tl__filters" role="group" aria-label="Filtros da linha do tempo">
        <div className="ing-tl__chipset">
          {CATEGORIES.map((c) => (
            <button
              key={c.k}
              type="button"
              className="ing-tl__chip"
              aria-pressed={cat === c.k}
              onClick={() => setCat(c.k)}
            >
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
        viewBox={`0 0 ${W} ${OH}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        role="img"
        aria-label="Total de conquistas ao longo do tempo — arraste para dar zoom"
      >
        <defs>
          <linearGradient id="ing-tl-fill-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e676" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#26b6ff" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <line x1={8} y1={OH - oPad.b} x2={W - 8} y2={OH - oPad.b} className="ing-tl__axis" />
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
          'Arraste na curva acima para dar zoom · passe o mouse nos pontos'
        )}
      </p>

      <div className="ing-tl__lanes">
        <svg className="ing-tl__svg" viewBox={`0 0 ${W} ${SH}`} role="img" aria-label={`${lanes.length} medalhas na linha do tempo`}>
          {laneYears.map((y, i) => {
            const x = sxOf(Date.UTC(y, 0, 1))
            if (i % laneStep !== 0 || x < LEFT || x > W - RIGHT) return null
            return (
              <g key={y}>
                <line x1={x} y1={4} x2={x} y2={SH - 16} className="ing-tl__grid" />
                <text x={x} y={SH - 4} textAnchor="middle" className="ing-tl__year">
                  {y}
                </text>
              </g>
            )
          })}
          {lanes.map((lane, i) => {
            const cy = 10 + i * ROW_H + ROW_H / 2
            const pts = lane.pts
            return (
              <g
                key={lane.slug}
                onMouseEnter={() => setHoverLane(lane.slug)}
                onMouseLeave={() => setHoverLane((s) => (s === lane.slug ? null : s))}
              >
                <line x1={LEFT} y1={cy} x2={W - RIGHT} y2={cy} className="ing-tl__lane-track" />
                <text
                  x={LEFT - 8}
                  y={cy + 3}
                  textAnchor="end"
                  className={`ing-tl__lane-label${hoverLane === lane.slug ? ' is-hover' : ''}`}
                >
                  {truncate(lane.name, 18)}
                </text>
                {pts.length > 1 ? (
                  <polyline
                    className="ing-tl__line"
                    points={pts.map((p) => `${sxOf(Date.parse(p.date))},${cy}`).join(' ')}
                  />
                ) : null}
                {hoverLane === lane.slug
                  ? pts.slice(1).map((p, k) => {
                      const gap = formatGap(p.gapDays)
                      if (!gap) return null
                      const xa = sxOf(Date.parse(pts[k].date))
                      const xb = sxOf(Date.parse(p.date))
                      return (
                        <text key={`${p.tier}-seg`} x={(xa + xb) / 2} y={cy - 6} textAnchor="middle" className="ing-tl__seg">
                          {gap}
                        </text>
                      )
                    })
                  : null}
                {pts.map((p) => {
                  const cx = sxOf(Date.parse(p.date))
                  const drill = p.group === 'core'
                  return (
                    <circle
                      key={`${p.tier}-${p.date}`}
                      cx={cx}
                      cy={cy}
                      r={hoverLane === lane.slug ? 4 : 3.4}
                      fill={TIER_COLOR[p.tier] ?? '#26b6ff'}
                      className={`ing-tl__dot${drill ? ' is-drill' : ''}${p.tier === 'onyx' ? ' is-onyx' : ''}`}
                      onMouseEnter={(e) => showTip(e, p)}
                      onMouseMove={(e) => showTip(e, p)}
                      onMouseLeave={() => setTip(null)}
                      onClick={() => drill && router.push(`/ingress/medalha/${p.slug}`)}
                    >
                      <title>
                        {p.name} — {TIER_LABEL[p.tier] ?? p.tier} · {fmtDate(p.date)}
                      </title>
                    </circle>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      {tip ? (
        <div
          className="ing-tl__tip"
          style={{
            left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 400) - 220),
            top: tip.y + 14,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artPath(tip.row.slug, tip.row.group === 'core' ? tip.row.tier : 'single')}
            alt=""
            width={44}
            height={44}
            className="ing-tl__tip-art"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden'
            }}
          />
          <div className="ing-tl__tip-body">
            <b>{tip.row.name}</b>
            <span>
              {TIER_LABEL[tip.row.tier] ?? tip.row.tier} · {fmtDate(tip.row.date)}
            </span>
            {tip.row.gapDays && tip.row.prevTier ? (
              <span className="ing-tl__tip-gap">
                +{formatGap(tip.row.gapDays)} depois de {TIER_LABEL[tip.row.prevTier] ?? tip.row.prevTier}
              </span>
            ) : null}
            {tip.row.group === 'core' ? <span className="ing-tl__tip-drill">clique para abrir a medalha →</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/**
 * Linha do tempo das conquistas. `variant="resumo"` (no /ingress) mostra só a
 * curva acumulada e leva para a página completa; `variant="completo"` (rota
 * dedicada) tem overview + brush de zoom, filtros, swimlane por medalha, hover
 * com a arte da medalha e o intervalo desde o tier anterior, e drill-down.
 */
export default function AchievementTimeline({
  acquisitions,
  variant = 'completo',
}: {
  acquisitions: Acq[]
  variant?: Variant
}) {
  const rows = useMemo(() => annotateLaneGaps(acquisitions) as Row[], [acquisitions])
  if (!rows || rows.length < 2) return <Placeholder variant={variant} />
  return variant === 'resumo' ? <Resumo rows={rows} /> : <Completo rows={rows} />
}
