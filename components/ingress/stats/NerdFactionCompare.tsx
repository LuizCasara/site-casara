'use client'

import {fmtStat, fmtStatCompact} from '@/lib/ingress/ingress-format.mjs'
import {useLang} from '@/components/global/LanguageContext'
import CountUp from '../hero/CountUp'

export type FactionStats = {agentCount: number; totalAp: number; avgOverallScore: number; onyxBadges: number}

/** Mesmo par de emblemas oficiais já usado em `IngressRankingTable`/`IngressActivityFeed`. */
const FACTION_ICON = {
  enlightened: '/ingress/factions/enlightened.svg',
  resistance: '/ingress/factions/resistance.svg',
} as const

const T = {
  pt: {
    agents: 'Agentes',
    ap: 'AP total',
    score: 'Nota média',
    onyx: 'Medalhas Onyx',
    enlightened: 'Enlightened',
    resistance: 'Resistance',
  },
  en: {
    agents: 'Agents',
    ap: 'Total AP',
    score: 'Average score',
    onyx: 'Onyx medals',
    enlightened: 'Enlightened',
    resistance: 'Resistance',
  },
} as const

/**
 * Uma linha do comparativo divergente: rótulo no centro, Enlightened cresce à
 * esquerda, Resistance à direita. `fmt` é o texto exibido (compacto pra AP,
 * que passa de bilhão e estouraria a coluna em telas estreitas — ver
 * NERD-mobile); `full`, quando dado, vira `title` (valor exato no hover/foco).
 */
function DivergentRow({
  label,
  left,
  right,
  fmt,
  full,
  decimals,
}: {
  label: string
  left: number
  right: number
  fmt: (n: number) => string
  full?: (n: number) => string
  decimals?: number
}) {
  const max = Math.max(left, right, 1)
  const leftPct = (left / max) * 100
  const rightPct = (right / max) * 100
  return (
    <div className="ing-nerd-divergent-row">
      <span className="ing-nerd-divergent-value ing-nerd-divergent-value--left" title={full?.(left)}>
        <CountUp value={left} format={fmt} decimals={decimals} />
      </span>
      <div className="ing-nerd-divergent-bars">
        <div className="ing-nerd-divergent-bar ing-nerd-divergent-bar--enlightened" style={{width: `${leftPct}%`}} />
        <span className="ing-nerd-divergent-label">{label}</span>
        <div className="ing-nerd-divergent-bar ing-nerd-divergent-bar--resistance" style={{width: `${rightPct}%`}} />
      </div>
      <span className="ing-nerd-divergent-value ing-nerd-divergent-value--right" title={full?.(right)}>
        <CountUp value={right} format={fmt} decimals={decimals} />
      </span>
    </div>
  )
}

/** P2 — comparativo Enlightened x Resistance, barras divergentes (NERD-08..13). */
export default function NerdFactionCompare({
  enlightened,
  resistance,
}: {
  enlightened: FactionStats
  resistance: FactionStats
}) {
  const {lang} = useLang()
  const t = T[lang]
  const fmtScore = (n: number) => n.toFixed(1)

  return (
    <div className="ing-nerd-divergent">
      <div className="ing-nerd-divergent-head">
        <span className="ing-nerd-divergent-head-side">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FACTION_ICON.enlightened} alt="" />
          {t.enlightened}
        </span>
        <span className="ing-nerd-divergent-head-side ing-nerd-divergent-head-side--right">
          {t.resistance}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FACTION_ICON.resistance} alt="" />
        </span>
      </div>
      <DivergentRow label={t.agents} left={enlightened.agentCount} right={resistance.agentCount} fmt={fmtStat} />
      <DivergentRow label={t.ap} left={enlightened.totalAp} right={resistance.totalAp} fmt={fmtStatCompact} full={fmtStat} />
      <DivergentRow label={t.score} left={enlightened.avgOverallScore} right={resistance.avgOverallScore} fmt={fmtScore} decimals={1} />
      <DivergentRow label={t.onyx} left={enlightened.onyxBadges} right={resistance.onyxBadges} fmt={fmtStat} />
    </div>
  )
}
