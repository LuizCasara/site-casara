'use client'

import {useState} from 'react'
import IngressRankingTable, {type RankingRow} from './IngressRankingTable'
import IngressActivityFeed, {type ActivityRow} from './IngressActivityFeed'
import IngressNerdStats, {type NerdStats} from './IngressNerdStats'
import {useLang} from '@/context/LanguageContext'

type Tab = 'ranking' | 'activity' | 'nerd'

const LABEL = {
  pt: {ranking: 'Ranking', activity: 'Radar de atividade', nerd: 'Estatísticas para Nerds'},
  en: {ranking: 'Ranking', activity: 'Activity radar', nerd: 'Stats for Nerds'},
} as const

/**
 * Alterna entre a tabela de ranking, o feed de atividade e a aba de
 * estatísticas — só a aba ativa fica montada (evita pollers rodando à toa).
 * `nerdStats` é calculado uma vez no SSR (`computeNerdStats`) e só passado
 * como prop — ao contrário das outras duas abas, não faz poll nem fetch
 * próprio. Client component só por causa do estado da aba; os filhos já eram
 * 'use client' por conta própria (poll, filtros).
 */
export default function IngressRankingTabs({
  initialRows,
  initialEvents,
  nerdStats,
}: {
  initialRows: RankingRow[]
  initialEvents: ActivityRow[]
  nerdStats: NerdStats | null
}) {
  const {lang} = useLang()
  const label = LABEL[lang]
  const [tab, setTab] = useState<Tab>('ranking')

  return (
    <div>
      <div className="ing-ranking-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'ranking'} onClick={() => setTab('ranking')}>
          {label.ranking}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>
          {label.activity}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'nerd'} onClick={() => setTab('nerd')}>
          {label.nerd}
        </button>
      </div>
      {tab === 'ranking' ? (
        <IngressRankingTable initialRows={initialRows} />
      ) : tab === 'activity' ? (
        <IngressActivityFeed initialEvents={initialEvents} />
      ) : (
        <IngressNerdStats stats={nerdStats} />
      )}
    </div>
  )
}
