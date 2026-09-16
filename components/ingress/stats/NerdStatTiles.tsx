'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'

export type TierCounts = {bronze: number; silver: number; gold: number; platinum: number; onyx: number}

const T = {
  pt: {
    agents: 'Agentes cadastrados',
    ap: 'AP total (lifetime)',
    submissions: 'Total de envios',
    tiers: (tier: string) => `Medalhas ${tier}`,
    onyx: 'Medalhas Onyx',
    onyxClub: 'Clube Onyx (12/12)',
    tierLabel: {bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', onyx: 'Onyx'} as Record<
      keyof TierCounts,
      string
    >,
  },
  en: {
    agents: 'Agents registered',
    ap: 'Total AP (lifetime)',
    submissions: 'Total submissions',
    tiers: (tier: string) => `${tier} medals`,
    onyx: 'Onyx medals',
    onyxClub: 'Onyx club (12/12)',
    tierLabel: {bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', onyx: 'Onyx'} as Record<
      keyof TierCounts,
      string
    >,
  },
} as const

const TIER_ORDER: (keyof TierCounts)[] = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

/** P1 — os 6 tiles de totais da comunidade (NERD-01..06). */
export default function NerdStatTiles({
  totalAgents,
  totalLifetimeAp,
  totalSubmissions,
  badgeTiersGranted,
  onyxClubCount,
}: {
  totalAgents: number
  totalLifetimeAp: number
  totalSubmissions: number
  badgeTiersGranted: TierCounts
  onyxClubCount: number
}) {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <div className="ing-grid">
      <div className="ing-stat">
        <div className="ing-stat__value">{fmtStat(totalAgents)}</div>
        <div className="ing-stat__label">{t.agents}</div>
      </div>
      <div className="ing-stat">
        <div className="ing-stat__value">{fmtStat(totalLifetimeAp)}</div>
        <div className="ing-stat__label">{t.ap}</div>
      </div>
      <div className="ing-stat">
        <div className="ing-stat__value">{fmtStat(totalSubmissions)}</div>
        <div className="ing-stat__label">{t.submissions}</div>
      </div>
      {TIER_ORDER.map((tier) => (
        <div className="ing-stat" key={tier}>
          <div className="ing-stat__value">{fmtStat(badgeTiersGranted[tier])}</div>
          <div className="ing-stat__label">{t.tiers(t.tierLabel[tier])}</div>
        </div>
      ))}
      <div className="ing-stat">
        <div className="ing-stat__value">{fmtStat(onyxClubCount)}</div>
        <div className="ing-stat__label">{t.onyxClub}</div>
      </div>
    </div>
  )
}
