'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'

export type FactionStats = {agentCount: number; totalAp: number; avgOverallScore: number; onyxBadges: number}

const T = {
  pt: {
    agents: 'Agentes',
    ap: 'AP total',
    score: 'Nota média',
    onyx: 'Medalhas Onyx',
  },
  en: {
    agents: 'Agents',
    ap: 'Total AP',
    score: 'Average score',
    onyx: 'Onyx medals',
  },
} as const

/** Uma linha do comparativo divergente: rótulo no centro, Enlightened cresce à esquerda, Resistance à direita. */
function DivergentRow({label, left, right, fmt}: {label: string; left: number; right: number; fmt: (n: number) => string}) {
  const max = Math.max(left, right, 1)
  const leftPct = (left / max) * 100
  const rightPct = (right / max) * 100
  return (
    <div className="ing-nerd-divergent-row">
      <span className="ing-nerd-divergent-value ing-nerd-divergent-value--left">{fmt(left)}</span>
      <div className="ing-nerd-divergent-bars">
        <div className="ing-nerd-divergent-bar ing-nerd-divergent-bar--enlightened" style={{width: `${leftPct}%`}} />
        <span className="ing-nerd-divergent-label">{label}</span>
        <div className="ing-nerd-divergent-bar ing-nerd-divergent-bar--resistance" style={{width: `${rightPct}%`}} />
      </div>
      <span className="ing-nerd-divergent-value ing-nerd-divergent-value--right">{fmt(right)}</span>
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
      <DivergentRow label={t.agents} left={enlightened.agentCount} right={resistance.agentCount} fmt={fmtStat} />
      <DivergentRow label={t.ap} left={enlightened.totalAp} right={resistance.totalAp} fmt={fmtStat} />
      <DivergentRow label={t.score} left={enlightened.avgOverallScore} right={resistance.avgOverallScore} fmt={fmtScore} />
      <DivergentRow label={t.onyx} left={enlightened.onyxBadges} right={resistance.onyxBadges} fmt={fmtStat} />
    </div>
  )
}
