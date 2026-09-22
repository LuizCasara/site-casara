'use client'

import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react'
import {fmtScoreDecimal, fmtStat} from '@/lib/ingress/ingress-format.mjs'
import {HISTORY_BUCKETS} from '@/lib/ingress/ranking/ingress-rankings.mjs'
import {useLang, type Lang} from '@/components/global/LanguageContext'
import AgentHistoryChanges, {type HistoryChanges} from './AgentHistoryChanges'

type HistoryBucket = 'day' | 'month' | 'year'
type Point = {period: string; lifetimeAp: number; overallScore: number}
type HoverInfo = {x: number; y: number; text: string}

const PAD_L = 52
const PAD_R = 12
const PAD_T = 16
const PAD_B = 24
const W = 560
const H = 190

const T = {
  pt: {
    title: 'Evolução — AP total',
    bucketLabel: {day: 'Dia', month: 'Mês', year: 'Ano'} as Record<HistoryBucket, string>,
    scaleAria: 'Granularidade da evolução',
    records: (n: number) => `${n} registro${n === 1 ? '' : 's'}`,
    delta: 'Nesse período',
    avg: 'Média por registro',
    last: 'Último valor',
    score: 'Nota geral',
    hint: 'Clique num ponto para ver o que mudou nele.',
    pointAria: (label: string) => `Ver o que mudou em ${label}`,
    scoreWord: 'nota',
    loading: 'Carregando…',
    error: 'Não foi possível carregar o histórico agora.',
    empty: 'A evolução aparece com 2 ou mais envios deste agente — volte a colar o export depois de jogar mais um pouco.',
    ariaChart: (name: string) => `AP total de ${name} ao longo do tempo`,
  },
  en: {
    title: 'Evolution — Total AP',
    bucketLabel: {day: 'Day', month: 'Month', year: 'Year'} as Record<HistoryBucket, string>,
    scaleAria: 'Evolution granularity',
    records: (n: number) => `${n} record${n === 1 ? '' : 's'}`,
    delta: 'Over this period',
    avg: 'Average per record',
    last: 'Latest value',
    score: 'Overall score',
    hint: 'Click a point to see what changed in it.',
    pointAria: (label: string) => `See what changed on ${label}`,
    scoreWord: 'score',
    loading: 'Loading…',
    error: 'Could not load the history right now.',
    empty: 'The evolution chart appears once this agent has 2 or more submissions — paste your export again after playing a bit more.',
    ariaChart: (name: string) => `${name}'s total AP over time`,
  },
} as const

function fmtPeriod(iso: string, bucket: HistoryBucket, lang: Lang): string {
  const date = new Date(iso)
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  if (bucket === 'year') return date.toLocaleDateString(locale, {year: 'numeric', timeZone: 'UTC'})
  if (bucket === 'month') return date.toLocaleDateString(locale, {month: 'short', year: '2-digit', timeZone: 'UTC'})
  return date.toLocaleDateString(locale, {day: '2-digit', month: '2-digit', timeZone: 'UTC'})
}

/** Rótulo por extenso do período de um ponto — o do eixo (`fmtPeriod`) é curto demais pra título ("09/21"). */
function fmtPeriodLong(iso: string, bucket: HistoryBucket, lang: Lang): string {
  const date = new Date(iso)
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  if (bucket === 'year') return date.toLocaleDateString(locale, {year: 'numeric', timeZone: 'UTC'})
  if (bucket === 'month') return date.toLocaleDateString(locale, {month: 'long', year: 'numeric', timeZone: 'UTC'})
  return date.toLocaleDateString(locale, {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'})
}

async function fetchChanges(codenameKey: string, bucket: HistoryBucket, period: string): Promise<HistoryChanges | null> {
  try {
    const params = new URLSearchParams({bucket, period})
    const res = await fetch(`/api/ingress-rankings/${encodeURIComponent(codenameKey)}/history/changes?${params}`)
    if (!res.ok) return null
    return (await res.json()) as HistoryChanges
  } catch {
    return null
  }
}

async function fetchHistory(codenameKey: string, bucket: HistoryBucket): Promise<Point[] | null> {
  try {
    const res = await fetch(`/api/ingress-rankings/${encodeURIComponent(codenameKey)}/history?bucket=${bucket}`)
    if (!res.ok) return null
    const {points} = (await res.json()) as {points: Point[]}
    return points
  } catch {
    return null
  }
}

/**
 * Gráfico de evolução de AP total de um agente (ISTATS-history) — lazy: só
 * busca dado quando montado, ou seja, só quando o acordeão "Ver evolução" da
 * linha expandida em `IngressRankingTable` é aberto. Cada ponto é clicável e
 * abre embaixo o "o que mudou" daquele período (`AgentHistoryChanges`); o
 * último ponto já vem selecionado. Sem lib de gráfico (mesma decisão de
 * `AchievementTimeline`/`.ing-spark`): SVG à mão, reaproveitando o padrão de
 * tooltip fixo por coordenada do ponteiro já usado ali.
 */
export default function AgentHistoryChart({
  codenameKey,
  agentName,
  faction,
}: {
  codenameKey: string
  agentName: string
  faction: 'enlightened' | 'resistance'
}) {
  const {lang} = useLang()
  const t = T[lang]
  const [bucket, setBucket] = useState<HistoryBucket>('day')
  const [hover, setHover] = useState<HoverInfo | null>(null)
  // O ponto escolhido pelo usuário, amarrado ao bucket em que foi escolhido —
  // trocar Dia/Mês/Ano volta ao último ponto em vez de apontar pra um período
  // que a nova escala nem tem.
  const [picked, setPicked] = useState<{bucket: HistoryBucket; period: string} | null>(null)
  // Cada ponto clicado é buscado uma vez só e guardado: voltar a um ponto já
  // visto não faz requisição. `inflight` evita disparar a mesma busca duas vezes.
  const [details, setDetails] = useState<Record<string, HistoryChanges | 'error'>>({})
  const inflight = useRef(new Set<string>())
  const gradientId = useId()
  // A marca do site é sempre verde; só a cor do agente exibido (facção dele)
  // vira azul — nunca o inverso (ver theme.css: .ing-evo--resistance).
  const accentColor = faction === 'resistance' ? 'var(--ing-cyan)' : 'var(--ing-green)'

  // `key` amarra o resultado à requisição que o produziu — troca de
  // agente/bucket vira "carregando" por comparação de chave, sem precisar de
  // um setState síncrono de reset no começo do efeito (o único setState
  // aqui é a resposta em si, dentro do `.then`).
  const requestKey = `${codenameKey}:${bucket}`
  const [result, setResult] = useState<{key: string; points: Point[] | null; failed: boolean}>({
    key: '',
    points: null,
    failed: false,
  })

  useEffect(() => {
    let alive = true
    fetchHistory(codenameKey, bucket).then((points) => {
      if (!alive) return
      setResult({key: requestKey, points, failed: points === null})
    })
    return () => {
      alive = false
    }
  }, [codenameKey, bucket, requestKey])

  const isLoading = result.key !== requestKey
  const points = isLoading ? null : result.points
  const failed = !isLoading && result.failed

  const lastPeriod = points && points.length >= 2 ? points[points.length - 1].period : null
  const activePeriod =
    picked && picked.bucket === bucket && points?.some((p) => p.period === picked.period) ? picked.period : lastPeriod
  const detailKey = activePeriod ? `${codenameKey}:${bucket}:${activePeriod}` : null

  useEffect(() => {
    if (!detailKey || !activePeriod || detailKey in details || inflight.current.has(detailKey)) return
    inflight.current.add(detailKey)
    fetchChanges(codenameKey, bucket, activePeriod).then((changes) => {
      inflight.current.delete(detailKey)
      setDetails((prev) => ({...prev, [detailKey]: changes ?? 'error'}))
    })
  }, [codenameKey, bucket, activePeriod, detailKey, details])

  const geometry = useMemo(() => {
    if (!points || points.length < 2) return null
    const values = points.map((p) => p.lifetimeAp)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const plotW = W - PAD_L - PAD_R
    const plotH = H - PAD_T - PAD_B
    const x = (i: number) => PAD_L + (i / (points.length - 1)) * plotW
    const y = (v: number) => PAD_T + plotH - ((v - min) / span) * plotH
    const linePts = points.map((p, i) => `${x(i)},${y(p.lifetimeAp)}`).join(' L ')
    const areaPts = `M ${x(0)},${y(points[0].lifetimeAp)} L ${linePts} L ${x(points.length - 1)},${PAD_T + plotH} L ${x(0)},${PAD_T + plotH} Z`
    const gridSteps = 3
    const gridLines = Array.from({length: gridSteps + 1}, (_, s) => {
      const val = min + (span * s) / gridSteps
      return {y: y(val), label: fmtStat(Math.round(val))}
    })
    const maxLabels = 6
    const step = Math.max(1, Math.ceil(points.length / maxLabels))
    const xLabels = points
      .map((p, i) => ({i, x: x(i), text: fmtPeriod(p.period, bucket, lang)}))
      .filter(({i}) => i % step === 0 || i === points.length - 1)
    return {x, y, linePts, areaPts, gridLines, xLabels}
  }, [points, bucket, lang])

  const stats = useMemo(() => {
    if (!points || points.length < 2) return null
    const first = points[0].lifetimeAp
    const last = points[points.length - 1].lifetimeAp
    const delta = last - first
    const avg = Math.round(delta / (points.length - 1))
    return {delta, avg, last, scoreFirst: points[0].overallScore, scoreLast: points[points.length - 1].overallScore}
  }, [points])

  return (
    <div className={`ing-evo${faction === 'resistance' ? ' ing-evo--resistance' : ''}`}>
      <div className="ing-evo__head">
        <div className="ing-evo__title">
          <strong>{t.title}</strong>
          {points ? <span>{t.records(points.length)}</span> : null}
        </div>
        <div className="ing-radar__scale" role="group" aria-label={t.scaleAria}>
          {(HISTORY_BUCKETS as HistoryBucket[]).map((b) => (
            <button key={b} type="button" aria-pressed={bucket === b} onClick={() => setBucket(b)}>
              {t.bucketLabel[b]}
            </button>
          ))}
        </div>
      </div>

      <div className="ing-evo__body">
        {failed ? (
          <p className="ing-evo__empty">{t.error}</p>
        ) : !points ? (
          <p className="ing-evo__empty">{t.loading}</p>
        ) : !geometry || !stats ? (
          <p className="ing-evo__empty">{t.empty}</p>
        ) : (
          <>
            <div className="ing-evo__stats">
              <div className="ing-evo__stat">
                <span className="ing-evo__stat-label">{t.delta}</span>
                <span className="ing-evo__stat-value is-up">+{fmtStat(stats.delta)}</span>
              </div>
              <div className="ing-evo__stat">
                <span className="ing-evo__stat-label">{t.avg}</span>
                <span className="ing-evo__stat-value">+{fmtStat(stats.avg)}</span>
              </div>
              <div className="ing-evo__stat">
                <span className="ing-evo__stat-label">{t.last}</span>
                <span className="ing-evo__stat-value">{fmtStat(stats.last)}</span>
              </div>
              <div className="ing-evo__stat">
                <span className="ing-evo__stat-label">{t.score}</span>
                <span className="ing-evo__stat-value">
                  {fmtScoreDecimal(stats.scoreFirst)} → {fmtScoreDecimal(stats.scoreLast)}
                </span>
              </div>
            </div>

            <svg className="ing-evo__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t.ariaChart(agentName)}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              {geometry.gridLines.map((g, i) => (
                <g key={i}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={g.y} y2={g.y} className="ing-evo__grid" strokeDasharray={i === 0 ? undefined : '2 4'} />
                  <text x={PAD_L - 8} y={g.y + 3} textAnchor="end" className="ing-evo__axis-label">
                    {g.label}
                  </text>
                </g>
              ))}
              <path d={geometry.areaPts} fill={`url(#${gradientId})`} />
              <path d={`M ${geometry.linePts}`} className="ing-evo__line" />
              {points.map((p, i) => {
                const isLast = i === points.length - 1
                const cx = geometry.x(i)
                const cy = geometry.y(p.lifetimeAp)
                const isActive = p.period === activePeriod
                const label = fmtPeriodLong(p.period, bucket, lang)
                const tip = `${fmtStat(p.lifetimeAp)} AP · ${t.scoreWord} ${fmtScoreDecimal(p.overallScore)} — ${fmtPeriod(p.period, bucket, lang)}`
                const pointKey = `${codenameKey}:${bucket}:${p.period}`
                const select = () => {
                  setPicked({bucket, period: p.period})
                  // Falha guardada não é definitiva: clicar de novo no ponto tenta outra vez.
                  if (details[pointKey] === 'error') {
                    setDetails((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== pointKey)))
                  }
                }
                const onKey = (e: KeyboardEvent<SVGCircleElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    select()
                  }
                }
                return (
                  <g key={p.period}>
                    {isActive ? <circle cx={cx} cy={cy} r={9} className="ing-evo__ring" pointerEvents="none" /> : null}
                    <circle cx={cx} cy={cy} r={isLast ? 5 : 3.5} className={`ing-evo__dot${isLast ? ' is-last' : ''}`} />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="transparent"
                      className="ing-tl__hit ing-evo__hit"
                      role="button"
                      tabIndex={0}
                      aria-label={t.pointAria(label)}
                      aria-pressed={isActive}
                      onClick={select}
                      onKeyDown={onKey}
                      onMouseEnter={(e) => setHover({x: e.clientX, y: e.clientY, text: tip})}
                      onMouseMove={(e) => setHover((h) => (h ? {...h, x: e.clientX, y: e.clientY} : h))}
                      onMouseLeave={() => setHover(null)}
                    >
                      <title>{tip}</title>
                    </circle>
                  </g>
                )
              })}
              {geometry.xLabels.map(({i, x, text}) => (
                <text key={i} x={x} y={H - 6} textAnchor="middle" className="ing-evo__axis-label">
                  {text}
                </text>
              ))}
            </svg>

            <p className="ing-evo__hint">{t.hint}</p>
            {activePeriod ? (
              <AgentHistoryChanges
                data={detailKey ? details[detailKey] : undefined}
                periodLabel={fmtPeriodLong(activePeriod, bucket, lang)}
                lang={lang}
              />
            ) : null}
          </>
        )}
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
    </div>
  )
}
