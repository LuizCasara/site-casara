'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import IngressRankingTable, {type RankingRow} from './IngressRankingTable'
import IngressActivityFeed, {type ActivityRow} from './IngressActivityFeed'
import IngressNerdStats, {type NerdStats} from './IngressNerdStats'
import IngressComparisonTab from './IngressComparisonTab'
import {loadMyAgent} from '@/lib/ingress/ranking/ingress-my-agent'
import {useLang} from '@/components/global/LanguageContext'

type Tab = 'ranking' | 'activity' | 'nerd' | 'compare'

const LABEL = {
  pt: {ranking: 'Ranking', activity: 'Radar de atividade', nerd: 'Estatísticas para Nerds', compare: 'Comparação'},
  en: {ranking: 'Ranking', activity: 'Activity radar', nerd: 'Stats for Nerds', compare: 'Comparison'},
} as const

/**
 * Alterna entre a tabela de ranking, o feed de atividade, a aba de
 * estatísticas e a aba de comparação — só a aba ativa fica montada (evita
 * pollers rodando à toa). `nerdStats` é calculado uma vez no SSR
 * (`computeNerdStats`) e só passado como prop.
 *
 * Dona do estado compartilhado entre a tabela (atalho "Comparar" por linha)
 * e a aba Comparação (seleção de Agente A/B) — os dois são filhos diretos
 * deste componente, então uma prop/callback comum resolve sem o problema de
 * fronteira Server/Client que `IngressRankingTable` documenta pro seu poll
 * (aqui não há Server Component no meio).
 *
 * Precedência de pré-preenchimento no mount (IRCMP-24 a 27): 1) parâmetros
 * de URL válidos (`?tab=compare&a=&b=`) > 2) atalho de linha (evento
 * posterior, não faz parte desta resolução inicial) > 3) `localStorage`
 * ("meu agente", só Agente A, só se vazio) > 4) vazio. Lido via
 * `window.location.search` num `useEffect` (não `useSearchParams()`) —
 * mesmo idiom já usado em `IngressRankingTable` pro `?destaque=`, evita
 * exigir um `<Suspense>` só por causa de parâmetros opcionais.
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
  const [agentAKey, setAgentAKey] = useState<string | null>(null)
  const [agentBKey, setAgentBKey] = useState<string | null>(null)
  const [aFromUrl, setAFromUrl] = useState(false)
  const [bFromUrl, setBFromUrl] = useState(false)
  // Primeiro agente marcado pelo atalho "Comparar" das linhas, esperando o
  // segundo — vive aqui (não na tabela) porque a tabela desmonta ao trocar de
  // aba, e a marcação tem que sobreviver a um passeio por outra aba.
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const urlReadRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlTab = params.get('tab')
    const urlA = params.get('a')
    const urlB = params.get('b')

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlTab === 'compare') setTab('compare')
    if (urlA) {
      setAgentAKey(urlA)
      setAFromUrl(true)
    } else {
      const saved = loadMyAgent()
      if (saved) setAgentAKey(saved)
    }
    if (urlB) {
      setAgentBKey(urlB)
      setBFromUrl(true)
    }
    urlReadRef.current = true
  }, [])

  // Reflete tab/Agente A/Agente B como query params (só quando a aba
  // Comparação está ativa; limpa fora dela), sem navegação/reload — o que
  // torna a comparação compartilhável por link (IRCMP-34/35).
  useEffect(() => {
    if (!urlReadRef.current) return
    const params = new URLSearchParams(window.location.search)
    if (tab === 'compare') {
      params.set('tab', 'compare')
      if (agentAKey) params.set('a', agentAKey)
      else params.delete('a')
      if (agentBKey) params.set('b', agentBKey)
      else params.delete('b')
    } else {
      params.delete('tab')
      params.delete('a')
      params.delete('b')
    }
    const qs = params.toString()
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', newUrl)
  }, [tab, agentAKey, agentBKey])

  // `useCallback` de propósito: `IngressComparisonTab` tem esses dois no array de dependências do efeito que busca
  // `/compare`. Com identidade nova a cada render, qualquer re-render aqui (ex.: trocar PT/EN) refazia o fetch,
  // desmontava o radar e perdia a escala escolhida. Só usam setters de estado, então `[]` é seguro.
  const handleChangeA = useCallback((key: string | null) => {
    setAgentAKey(key)
    setAFromUrl(false)
  }, [])
  const handleChangeB = useCallback((key: string | null) => {
    setAgentBKey(key)
    setBFromUrl(false)
  }, [])

  /**
   * Atalho "Comparar" de uma linha (P2, IRCMP-31/32) — em dois cliques (pedido
   * do Luiz): o 1º só marca o agente (a linha fica destacada, segue no
   * ranking); o 2º, em outro agente, fecha o par — o 1º vira Agente A, o 2º
   * Agente B — e aí sim pula pra aba Comparação. Clicar de novo no agente
   * marcado desfaz a marcação. O par sempre sobrescreve A/B (inclusive o "meu
   * agente" pré-preenchido do `localStorage`): quem clicou em duas linhas
   * escolheu esses dois.
   */
  const handleCompareRow = (codenameKey: string) => {
    if (pendingKey === codenameKey) {
      setPendingKey(null)
    } else if (pendingKey === null) {
      setPendingKey(codenameKey)
    } else {
      handleChangeA(pendingKey)
      handleChangeB(codenameKey)
      setPendingKey(null)
      setTab('compare')
    }
  }

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
        <button type="button" role="tab" aria-selected={tab === 'compare'} onClick={() => setTab('compare')}>
          {label.compare}
        </button>
      </div>
      {tab === 'ranking' ? (
        <IngressRankingTable initialRows={initialRows} onCompareRow={handleCompareRow} pendingCompareKey={pendingKey} />
      ) : tab === 'activity' ? (
        <IngressActivityFeed initialEvents={initialEvents} />
      ) : tab === 'nerd' ? (
        <IngressNerdStats stats={nerdStats} />
      ) : (
        <IngressComparisonTab
          agentAKey={agentAKey}
          agentBKey={agentBKey}
          onChangeA={handleChangeA}
          onChangeB={handleChangeB}
          aFromUrl={aFromUrl}
          bFromUrl={bFromUrl}
        />
      )}
    </div>
  )
}
