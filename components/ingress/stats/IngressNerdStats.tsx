'use client'

import Panel from '../Panel'
import {useLang} from '@/context/LanguageContext'
import NerdStatTiles, {type TierCounts} from './NerdStatTiles'
import NerdFactionCompare, {type FactionStats} from './NerdFactionCompare'
import NerdAverages, {type OverallScoreBand, type RecursionsSummary} from './NerdAverages'
import NerdHallOfFame, {type HallOfFameRecord} from './NerdHallOfFame'
import NerdSeasonalEngagement, {type SeasonalMetric} from './NerdSeasonalEngagement'
import NerdSubscription from './NerdSubscription'

export type NerdStats = {
  totals: {
    totalAgents: number
    totalLifetimeAp: number
    totalSubmissions: number
    badgeTiersGranted: TierCounts
    onyxBadgesGranted: number
    onyxClubCount: number
  }
  byFaction: {enlightened: FactionStats; resistance: FactionStats}
  averages: {
    avgApPerAgent: number
    overallScoreHistogram: OverallScoreBand[]
    communityAxisAverage: Record<string, number>
    recursions: RecursionsSummary
  }
  hallOfFame: {
    perStat: Record<string, HallOfFameRecord>
    lifetimeAp: HallOfFameRecord
    recursions: HallOfFameRecord
  }
  seasonalEngagement: Record<string, SeasonalMetric>
  subscription: {hasData: boolean; percentSubscribed: number | null; avgMonthsAmongSubscribed: number | null}
}

const T = {
  pt: {
    lostSignal: 'Sinal perdido',
    empty: 'Ainda não há agentes cadastrados no ranking. Volte em breve.',
    totals: 'Totais da comunidade',
    faction: 'Enlightened x Resistance',
    averages: 'Médias e distribuição',
    hallOfFame: 'Hall da fama',
    seasonal: 'Engajamento em eventos sazonais',
    subscription: 'Assinatura paga',
  },
  en: {
    lostSignal: 'Signal lost',
    empty: 'No agents registered in the ranking yet. Check back soon.',
    totals: 'Community totals',
    faction: 'Enlightened vs Resistance',
    averages: 'Averages and distribution',
    hallOfFame: 'Hall of fame',
    seasonal: 'Seasonal event engagement',
    subscription: 'Paid subscription',
  },
} as const

/**
 * Orquestrador da aba "Estatísticas para Nerds" — recebe o `NerdStats` já
 * calculado no SSR (`computeNerdStats`), sem fetch/poll próprio. `stats ===
 * null` (erro de conexão) e `totals.totalAgents === 0` (ranking vazio) caem
 * no mesmo estado vazio (P1 AC7) — não são dois tratamentos diferentes.
 */
export default function IngressNerdStats({stats}: {stats: NerdStats | null}) {
  const {lang} = useLang()
  const t = T[lang]

  if (!stats || stats.totals.totalAgents === 0) {
    return (
      <Panel label={t.lostSignal}>
        <p style={{color: 'var(--ing-text-dim)'}}>{t.empty}</p>
      </Panel>
    )
  }

  return (
    <div className="ing-nerd-stats">
      <Panel label={t.totals}>
        <NerdStatTiles
          totalAgents={stats.totals.totalAgents}
          totalLifetimeAp={stats.totals.totalLifetimeAp}
          totalSubmissions={stats.totals.totalSubmissions}
          badgeTiersGranted={stats.totals.badgeTiersGranted}
          onyxClubCount={stats.totals.onyxClubCount}
        />
      </Panel>

      <Panel label={t.faction}>
        <NerdFactionCompare enlightened={stats.byFaction.enlightened} resistance={stats.byFaction.resistance} />
      </Panel>

      <Panel label={t.averages}>
        <NerdAverages
          avgApPerAgent={stats.averages.avgApPerAgent}
          overallScoreHistogram={stats.averages.overallScoreHistogram}
          communityAxisAverage={stats.averages.communityAxisAverage}
          recursions={stats.averages.recursions}
        />
      </Panel>

      <Panel label={t.hallOfFame}>
        <NerdHallOfFame
          perStat={stats.hallOfFame.perStat}
          lifetimeAp={stats.hallOfFame.lifetimeAp}
          recursions={stats.hallOfFame.recursions}
        />
      </Panel>

      <Panel label={t.seasonal}>
        <NerdSeasonalEngagement metrics={stats.seasonalEngagement} />
      </Panel>

      <Panel label={t.subscription}>
        <NerdSubscription
          hasData={stats.subscription.hasData}
          percentSubscribed={stats.subscription.percentSubscribed}
          avgMonthsAmongSubscribed={stats.subscription.avgMonthsAmongSubscribed}
        />
      </Panel>
    </div>
  )
}
