'use client'

import {useEffect, useRef, useState} from 'react'
import Panel from '../shell/Panel'
import AgentSelect, {type AgentOption} from '../profile/AgentSelect'
import RadarOverlay from '../profile/RadarOverlay'
import OverallScorePanel, {type AgentScore} from './OverallScorePanel'
import type {Agent} from '../profile/ProfileRadar'
import {trackIngressComparisonViewed} from '@/lib/global/analytics'
import {useLang} from '@/components/global/LanguageContext'

type CompareRow = {
  codename_key: string
  codename: string
  faction: 'enlightened' | 'resistance'
  lifetime_ap: number
  overall_score: number
  axis_scores: Record<string, number>
  stat_values: Record<string, number>
  country_code: string | null
  rank: number
  total_agents: number
}

type FetchResult =
  | {status: 'idle'}
  | {status: 'blocked'}
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'ready'; a: CompareRow | null; b: CompareRow | null}

const T = {
  pt: {
    labelA: 'Agente A',
    labelB: 'Agente B',
    waitingHint: 'Escolha os dois agentes para ver a comparação.',
    waitingHintOne: 'Escolha o segundo agente.',
    sameAgentError: 'Os dois campos precisam de agentes diferentes.',
    notFoundA: 'Agente não encontrado.',
    notFoundB: 'Agente não encontrado.',
    errorHint: 'Não foi possível carregar a comparação.',
    retry: 'Tentar de novo',
  },
  en: {
    labelA: 'Agent A',
    labelB: 'Agent B',
    waitingHint: 'Choose both agents to see the comparison.',
    waitingHintOne: 'Choose the second agent.',
    sameAgentError: 'The two fields need different agents.',
    notFoundA: 'Agent not found.',
    notFoundB: 'Agent not found.',
    errorHint: 'Could not load the comparison.',
    retry: 'Try again',
  },
} as const

function toAgent(row: CompareRow): Agent {
  return {
    codename: row.codename,
    faction: row.faction,
    stats: row.stat_values,
    countryCode: row.country_code ?? undefined,
    overallScore: row.overall_score,
    rank: row.rank,
    totalAgents: row.total_agents,
  }
}

/**
 * O `tier` de `AgentScore` não é usado pelo render de `OverallScorePanel`
 * (que recalcula o selo a partir de `overallScore`) — placeholder inofensivo
 * em vez de duplicar a matemática do tier client-side uma 3ª vez.
 */
function toAgentScore(row: CompareRow): AgentScore {
  return {
    label: row.codename,
    overallScore: row.overall_score,
    axisScores: row.axis_scores,
    tier: '',
    lifetimeAp: row.lifetime_ap,
    countryCode: row.country_code,
    faction: row.faction,
  }
}

function toOption(row: CompareRow): AgentOption {
  return {
    codename_key: row.codename_key,
    codename: row.codename,
    faction: row.faction,
    country_code: row.country_code,
    lifetime_ap: row.lifetime_ap,
  }
}

/**
 * Orquestra a aba "Comparação": dois `AgentSelect`, resolve os dados via
 * `/api/ingress-rankings/compare` sempre que `agentAKey`/`agentBKey` mudam,
 * decide entre estado de espera / bloqueio (mesmo agente) / erro /
 * comparação renderizada (`RadarOverlay` + `OverallScorePanel`), dispara
 * `trackIngressComparisonViewed` uma vez por par completo.
 */
export default function IngressComparisonTab({
  agentAKey,
  agentBKey,
  onChangeA,
  onChangeB,
  aFromUrl,
  bFromUrl,
}: {
  agentAKey: string | null
  agentBKey: string | null
  onChangeA: (codenameKey: string | null) => void
  onChangeB: (codenameKey: string | null) => void
  aFromUrl: boolean
  bFromUrl: boolean
}) {
  const {lang} = useLang()
  const t = T[lang]
  const [result, setResult] = useState<FetchResult>({status: 'idle'})
  // Incrementado pelo botão "Tentar de novo" — muda a dependência do efeito
  // abaixo sem mudar `agentAKey`/`agentBKey`, forçando o mesmo fetch de novo.
  const [retryTick, setRetryTick] = useState(0)
  const trackedPairRef = useRef<string | null>(null)

  const sameAgent = !!agentAKey && !!agentBKey && agentAKey === agentBKey

  useEffect(() => {
    // As 3 transições síncronas abaixo (idle/blocked/loading) sincronizam
    // `result` com props que já chegaram (não pedem espera por nada
    // assíncrono) — mesmo padrão já aceito no projeto pro highlight de
    // `?destaque=` em IngressRankingTable.tsx.
    if (!agentAKey && !agentBKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult({status: 'idle'})
      return
    }
    if (sameAgent) {
      setResult({status: 'blocked'})
      return
    }
    let cancelled = false
    setResult({status: 'loading'})
    const qs = new URLSearchParams()
    if (agentAKey) qs.set('a', agentAKey)
    if (agentBKey) qs.set('b', agentBKey)
    fetch(`/api/ingress-rankings/compare?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('not ok'))))
      .then((data: {a: CompareRow | null; b: CompareRow | null}) => {
        if (cancelled) return
        setResult({status: 'ready', a: data.a, b: data.b})
        // Chave inválida vinda do localStorage/atalho de linha (não da URL)
        // limpa em silêncio — a que veio da URL fica como aviso inline
        // (IRCMP-27/35). Feito aqui dentro do `.then()`, não num efeito
        // separado observando `result`: `agentAKey`/`agentBKey` nesta
        // closure são garantidamente os MESMOS que geraram este fetch — um
        // efeito à parte lendo `result` via `useEffect([result, ...])`
        // rodava com um `result` de um fetch anterior (ainda não atualizado
        // nesse ciclo de render) sempre que A/B mudava, e acabava limpando o
        // campo recém-preenchido por engano (bug relatado: B "pisca e é
        // limpo" ao ser escolhido).
        if (agentAKey && !data.a && !aFromUrl) onChangeA(null)
        if (agentBKey && !data.b && !bFromUrl) onChangeB(null)
      })
      .catch(() => {
        if (!cancelled) setResult({status: 'error'})
      })
    return () => {
      cancelled = true
    }
  }, [agentAKey, agentBKey, sameAgent, retryTick, aFromUrl, bFromUrl, onChangeA, onChangeB])

  useEffect(() => {
    if (result.status !== 'ready' || !result.a || !result.b) return
    const pairKey = `${result.a.codename_key}|${result.b.codename_key}`
    if (trackedPairRef.current === pairKey) return
    trackedPairRef.current = pairKey
    trackIngressComparisonViewed(result.a.codename_key, result.b.codename_key)
  }, [result])

  const selectedA = result.status === 'ready' && result.a ? toOption(result.a) : null
  const selectedB = result.status === 'ready' && result.b ? toOption(result.b) : null

  const retry = () => setRetryTick((n) => n + 1)

  return (
    <Panel label={t.labelA + ' / ' + t.labelB}>
      <div className="ing-comparison-tab__selects">
        <div className="ing-comparison-tab__select-col">
          <label htmlFor="ing-cmp-agent-a">{t.labelA}</label>
          <AgentSelect id="ing-cmp-agent-a" value={agentAKey} onChange={onChangeA} selected={selectedA} invalid={sameAgent} />
          {aFromUrl && result.status === 'ready' && agentAKey && !result.a ? (
            <p className="ing-comparison-tab__error">{t.notFoundA}</p>
          ) : null}
        </div>
        <div className="ing-comparison-tab__select-col">
          <label htmlFor="ing-cmp-agent-b">{t.labelB}</label>
          <AgentSelect id="ing-cmp-agent-b" value={agentBKey} onChange={onChangeB} selected={selectedB} invalid={sameAgent} />
          {bFromUrl && result.status === 'ready' && agentBKey && !result.b ? (
            <p className="ing-comparison-tab__error">{t.notFoundB}</p>
          ) : null}
        </div>
      </div>

      {sameAgent ? (
        <p className="ing-comparison-tab__error">{t.sameAgentError}</p>
      ) : result.status === 'error' ? (
        <p className="ing-comparison-tab__error">
          {t.errorHint}{' '}
          <button type="button" className="ing-radar__btn" onClick={retry}>
            {t.retry}
          </button>
        </p>
      ) : result.status === 'ready' && result.a && result.b ? (
        <>
          <RadarOverlay agentA={toAgent(result.a)} agentB={toAgent(result.b)} />
          <OverallScorePanel agents={[toAgentScore(result.a), toAgentScore(result.b)]} />
        </>
      ) : (
        <p className="ing-comparison-tab__hint">{agentAKey || agentBKey ? t.waitingHintOne : t.waitingHint}</p>
      )}
    </Panel>
  )
}
