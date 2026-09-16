'use client'

import {useState} from 'react'
import IngressRankingTable, {type RankingRow} from './IngressRankingTable'
import IngressActivityFeed, {type ActivityRow} from './IngressActivityFeed'
import {useLang} from '@/context/LanguageContext'

type Tab = 'ranking' | 'activity'

const LABEL = {
  pt: {ranking: 'Ranking', activity: 'Radar de atividade'},
  en: {ranking: 'Ranking', activity: 'Activity radar'},
} as const

/**
 * Alterna entre a tabela de ranking e o feed de atividade — só a aba ativa
 * fica montada (evita dois pollers de 20s rodando ao mesmo tempo). Client
 * component só por causa do estado da aba; os dois filhos já eram 'use
 * client' por conta própria (poll, filtros).
 */
export default function IngressRankingTabs({
  initialRows,
  initialEvents,
}: {
  initialRows: RankingRow[]
  initialEvents: ActivityRow[]
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
      </div>
      {tab === 'ranking' ? (
        <IngressRankingTable initialRows={initialRows} />
      ) : (
        <IngressActivityFeed initialEvents={initialEvents} />
      )}
    </div>
  )
}
