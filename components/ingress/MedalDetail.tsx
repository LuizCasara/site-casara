'use client'

import {useEffect, useRef} from 'react'
import {formatGap} from '@/lib/ingress-timeline.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import MedalSpark from './MedalSpark'
import RecursionMark from './RecursionMark'

const FMT = new Intl.NumberFormat('pt-BR')
const CORE_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']
const TIER_COLOR: Record<string, string> = {
  bronze: '#d08a4e',
  silver: '#9aa4ac',
  gold: '#ffd24a',
  platinum: '#8d949d',
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

export type DetailTier = {tier: string; date: string; gapDays: number | null; prevTier: string | null}
export type DetailStat = {
  value: number
  thresholds: number[]
  pct: number | null
  next: {tier: string; remaining: number} | null
  beyond: {label: string; pct: number; remaining: number; multiple: number} | null
}
export type DetailMedal = {
  slug: string
  name: string
  group: string
  count?: number
  tiers: DetailTier[]
  stat?: DetailStat
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function StatLadder({medal, focusIdx}: {medal: DetailMedal; focusIdx: number}) {
  const stat = medal.stat as DetailStat
  const gotByTier = new Map(medal.tiers.map((t, i) => [t.tier, {entry: t, i}]))
  const firstLocked = stat.thresholds.findIndex((thr) => stat.value < thr)
  return (
    <div className="ing-tl__detail-stat">
      <p className="ing-tl__detail-total">
        Seu total: <b>{FMT.format(stat.value)}</b>
      </p>
      <ol className="ing-tl__detail-ladder ing-tl__detail-ladder--stat">
        {CORE_TIERS.map((tn, i) => {
          const thr = stat.thresholds[i]
          const got = gotByTier.get(tn)
          const reached = stat.value >= thr
          const g = got ? formatGap(got.entry.gapDays) : null
          return (
            <li key={tn} className={got && got.i === focusIdx ? 'is-current' : reached ? undefined : 'is-locked'}>
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
              <span className="ing-tl__detail-gap">{g ? `+${g}` : ''}</span>
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

/**
 * Painel de detalhe de uma medalha: arte, faixa de progresso, mini gráfico dos
 * tiers no tempo e a escada (limiar/data/intervalo para as de estatística, só
 * data para eventos). Compartilhado pela linha do tempo e pela grade da home.
 */
export default function MedalDetail({
  medal,
  focusTier,
  onClose,
}: {
  medal: DetailMedal
  focusTier?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'})
  }, [medal.slug, focusTier])

  const tiers = medal.tiers
  const isCore = medal.group === 'core'
  const focusFromTier = focusTier ? tiers.findIndex((t) => t.tier === focusTier) : -1
  const idx = focusFromTier >= 0 ? focusFromTier : tiers.length - 1

  const first = tiers[0]
  const last = tiers[tiers.length - 1]
  const artTier = isCore ? (tiers[idx]?.tier ?? 'bronze') : 'single'

  let range = ''
  if (!tiers.length) {
    range = isCore ? 'ainda sem medalha' : ''
  } else if (tiers.length > 1) {
    const span = formatGap(Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86_400_000))
    range = `${TIER_LABEL[first.tier] ?? first.tier} → ${TIER_LABEL[last.tier] ?? last.tier}${span ? ` · ${span}` : ''}`
  } else {
    range = `${TIER_LABEL[first.tier] ?? first.tier}${medal.count && medal.count > 1 ? ` · ${medal.count}×` : ''}`
  }

  return (
    <div className="ing-tl__detail" role="dialog" aria-label={`Detalhe de ${medal.name}`} ref={ref}>
      <button type="button" className="ing-tl__detail-close" onClick={onClose} aria-label="Fechar">
        ✕
      </button>
      <div className="ing-tl__detail-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ing-tl__detail-art"
          src={artPath(medal.slug, artTier)}
          alt=""
          width={64}
          height={64}
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
        <div>
          <b>
            {medal.name}
            <RecursionMark multiple={medal.stat?.beyond?.multiple} />
          </b>
          {range ? <span className="ing-tl__detail-sub">{range}</span> : null}
          {isCore ? (
            <a className="ing-tl__detail-link" href={`/ingress/medalha/${medal.slug}`}>
              abrir página da {medal.name} →
            </a>
          ) : null}
        </div>
      </div>

      {tiers.length || medal.stat ? (
        <div className="ing-tl__detail-grid">
          {tiers.length > 1 ? <MedalSpark tiers={tiers} /> : null}
          {medal.stat ? (
            <StatLadder medal={medal} focusIdx={idx} />
          ) : tiers.length ? (
            <ol className="ing-tl__detail-ladder ing-tl__detail-ladder--event">
              {tiers.map((t, i) => {
                const g = formatGap(t.gapDays)
                return (
                  <li key={t.tier} className={i === idx ? 'is-current' : undefined}>
                    <span className="ing-tl__detail-dot" style={{background: TIER_COLOR[t.tier] ?? '#26b6ff'}} />
                    <span className="ing-tl__detail-tier">{TIER_LABEL[t.tier] ?? t.tier}</span>
                    <time>{fmtDate(t.date)}</time>
                    <span className="ing-tl__detail-gap">{g ? `+${g}` : ''}</span>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
