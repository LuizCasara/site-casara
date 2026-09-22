'use client'

import Panel from '../Panel'
import {useLang} from '@/components/global/LanguageContext'
import NerdStatTiles, {type TierCounts} from './NerdStatTiles'
import NerdFactionCompare, {type FactionStats} from './NerdFactionCompare'
import NerdAverages, {type OverallScoreBand, type RecursionsSummary} from './NerdAverages'
import NerdHallOfFame, {type HallOfFameRecord, type HallOfFameStatRecord} from './NerdHallOfFame'
import NerdRecordsLayoutToggle from './NerdRecordsLayoutToggle'
import NerdSeasonalEngagement, {type SeasonalMetric} from './NerdSeasonalEngagement'
import NerdSubscription from './NerdSubscription'
import NerdCountryCharts, {type CountryBreakdown} from './NerdCountryCharts'

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
    perStat: Record<string, HallOfFameStatRecord>
    lifetimeAp: HallOfFameRecord
    recursions: HallOfFameRecord
  }
  seasonalEngagement: Record<string, SeasonalMetric>
  subscription: {
    hasData: boolean
    reportedCount: number
    percentSubscribed: number | null
    avgMonthsAmongSubscribed: number | null
    top: HallOfFameRecord
  }
  byCountry: CountryBreakdown
}

const T = {
  pt: {
    lostSignal: 'Sinal perdido',
    empty: 'Ainda não há agentes cadastrados no ranking. Volte em breve.',
    totals: 'Totais da comunidade',
    faction: 'Enlightened x Resistance',
    countries: 'Países',
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
    countries: 'Countries',
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
 *
 * As 7 seções vivem dentro de UM único painel (`ing-nerd-shell`), separadas
 * por `<section>` com divisor interno — não são 7 cartões soltos, é uma aba
 * só (pedido explícito do Luiz depois de ver a primeira versão).
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
    <div className="ing-panel ing-nerd-shell">
      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.totals}</h3>
        <NerdStatTiles
          totalAgents={stats.totals.totalAgents}
          totalLifetimeAp={stats.totals.totalLifetimeAp}
          totalSubmissions={stats.totals.totalSubmissions}
          badgeTiersGranted={stats.totals.badgeTiersGranted}
          onyxClubCount={stats.totals.onyxClubCount}
        />
      </section>

      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.faction}</h3>
        <NerdFactionCompare enlightened={stats.byFaction.enlightened} resistance={stats.byFaction.resistance} />
      </section>

      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.countries}</h3>
        <NerdCountryCharts data={stats.byCountry} />
      </section>

      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.averages}</h3>
        <NerdAverages
          avgApPerAgent={stats.averages.avgApPerAgent}
          overallScoreHistogram={stats.averages.overallScoreHistogram}
          communityAxisAverage={stats.averages.communityAxisAverage}
          recursions={stats.averages.recursions}
          recursionsHolder={stats.hallOfFame.recursions}
        />
      </section>

      <section className="ing-nerd-section">
        <div className="ing-nerd-section-head">
          <h3 className="ing-nerd-section-title">{t.hallOfFame}</h3>
          <NerdRecordsLayoutToggle />
        </div>
        <NerdHallOfFame
          perStat={stats.hallOfFame.perStat}
          lifetimeAp={stats.hallOfFame.lifetimeAp}
          recursions={stats.hallOfFame.recursions}
        />
      </section>

      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.seasonal}</h3>
        <NerdSeasonalEngagement metrics={stats.seasonalEngagement} />
      </section>

      <section className="ing-nerd-section">
        <h3 className="ing-nerd-section-title">{t.subscription}</h3>
        <NerdSubscription
          hasData={stats.subscription.hasData}
          reportedCount={stats.subscription.reportedCount}
          percentSubscribed={stats.subscription.percentSubscribed}
          avgMonthsAmongSubscribed={stats.subscription.avgMonthsAmongSubscribed}
          top={stats.subscription.top}
        />
      </section>
    </div>
  )
}
