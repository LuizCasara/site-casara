'use client'

import {useState} from 'react'
import {toast} from 'sonner'
import ProfileRadar, {type Agent} from '../ProfileRadar'
import OverallScorePanel, {type AgentScore} from './OverallScorePanel'
import {normalizeCodenameKey} from '@/lib/ingress-rankings.mjs'
import {RADAR_STAT_KEYS} from '@/lib/ingress-compare-message.mjs'
import {trackIngressRankingJoin} from '@/utils/analytics'
import {saveMyAgent} from '@/lib/ingress-my-agent'
import {useLang} from '@/context/LanguageContext'

/** Textos bilíngues dos toasts (ISTATS-19 fix) — `pt` reproduz o texto anterior. */
const T = {
  pt: {
    rankToast: (rank: number) => `Você está em ${rank}º lugar no ranking!`,
    errorToast: 'Não foi possível atualizar seu registro agora.',
    compareMyStatusBtn: 'Comparar meu status',
  },
  en: {
    rankToast: (rank: number) => `You're in ${rank}${rankSuffixEn(rank)} place in the ranking!`,
    errorToast: 'Could not update your record right now.',
    compareMyStatusBtn: 'Compare my status',
  },
} as const

/** Sufixo ordinal em inglês (1st/2nd/3rd/4th...), com a exceção 11-13 -> "th". */
function rankSuffixEn(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (n % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export type FencherlcInfo = {
  stats: Record<string, number>
  agentName: string
  capturedAt?: string
  axisScores: Record<string, number>
  overallScore: number
  tier: string
}

type RankingResponse = {
  written: boolean
  rank: number
  totalAgents: number
  overallScore: number
  axisScores: Record<string, number>
  tier: string
}

/** Só as 11/12 stats que o radar usa — o mesmo recorte que vai pro `stat_values` armazenado (ver AC-1). */
function radarStats(stats: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of RADAR_STAT_KEYS as string[]) out[k] = Number(stats[k]) || 0
  return out
}

/**
 * Tudo do export que HOJE não vira coluna/eixo/chip nenhum (o resto das ~54
 * stats — Current AP, drones, Machina, scanner/OPR/Scout, research days,
 * etc.) — guardado em `extra_stats` (JSONB) só pra não perder o dado, sem
 * exibir nada com ele ainda. Dinâmico em vez de uma lista de chaves na mão:
 * assim, se `RADAR_STAT_KEYS` ganhar um eixo novo no futuro, a chave sai
 * daqui automaticamente sem precisar lembrar de tocar neste arquivo.
 */
const RADAR_KEY_SET = new Set(RADAR_STAT_KEYS as string[])
function extraStats(stats: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(stats)) {
    if (k === 'lifetimeAp' || RADAR_KEY_SET.has(k)) continue
    out[k] = v
  }
  return out
}

async function postAgent(agent: Agent): Promise<RankingResponse | null> {
  try {
    const res = await fetch('/api/ingress-rankings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        codename: agent.codename,
        faction: agent.faction ?? '',
        lifetimeAp: Number(agent.stats.lifetimeAp) || 0,
        stats: radarStats(agent.stats),
        countryCode: agent.countryCode ?? '',
        recursions: agent.recursions,
        // Top-level, como `recursions`: é onde a rota lê (`body.monthsSubscribed`) pra preencher a coluna
        // `months_subscribed`. Dentro de `extra` ele só vira JSON solto e a coluna ficava sempre NULL.
        monthsSubscribed: agent.monthsSubscribed,
        extra: {
          level: agent.level,
          monthsSubscribed: agent.monthsSubscribed,
          ...extraStats(agent.stats),
        },
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as RankingResponse
  } catch {
    return null
  }
}

/**
 * Orquestra o `ProfileRadar` em modo `ranking`: posta o export colado (único
 * fluxo possível nesta variant, desde que os modos `vs-me`/`two` saíram
 * daqui — T9), atualiza o painel de notas, mostra o toast de posição (ou de
 * falha suave), salva o `codename_key` como "meu agente" e libera a CTA
 * "Comparar meu status" pra ir direto pra aba Comparação (T14 lê o
 * `?tab=compare&a=` que essa navegação escreve). Único lugar que fala com
 * `/api/ingress-rankings` no caminho de escrita.
 */
export default function StatsRadarSection({
  fencherlc,
  onWritten,
}: {
  fencherlc: FencherlcInfo
  /** Chamado sempre que o POST desta submissão gravou (`written:true`) — sinal pra quem mostra a tabela completa refazer o GET. */
  onWritten?: () => void
}) {
  const {lang} = useLang()
  const t = T[lang]
  // Começa vazio — a nota geral só aparece depois da 1ª submissão (não
  // pré-carrega o FencherLC aqui, mesmo motivo do radar nascer em branco).
  const [panelAgents, setPanelAgents] = useState<AgentScore[]>([])
  const [myAgentKey, setMyAgentKey] = useState<string | null>(null)

  const handleCompare = async (agent: Agent) => {
    const response = await postAgent(agent)
    if (response) {
      setPanelAgents([
        {label: agent.codename, overallScore: response.overallScore, axisScores: response.axisScores, tier: response.tier},
      ])
      // "Sucesso" = o POST respondeu (agente aceito) — independente do
      // debounce de 5min (`written:false`) ter bloqueado a gravação desta
      // vez. O agente já mandou dados válidos; a identidade é legítima.
      const codenameKey = normalizeCodenameKey(agent.codename)
      saveMyAgent(codenameKey)
      setMyAgentKey(codenameKey)
      trackIngressRankingJoin(response.written)
      toast.success(t.rankToast(response.rank))
      if (response.written) onWritten?.()
    } else {
      trackIngressRankingJoin(false)
      toast.error(t.errorToast)
    }
  }

  return (
    <div className="ing-stats-radar-section">
      <ProfileRadar
        variant="ranking"
        stats={fencherlc.stats}
        agentName={fencherlc.agentName}
        capturedAt={fencherlc.capturedAt}
        onCompare={handleCompare}
      />
      {panelAgents.length > 0 ? <OverallScorePanel agents={panelAgents} /> : null}
      {myAgentKey ? (
        <a
          className="ing-radar__btn ing-radar__btn--primary ing-stats-radar-section__compare-cta"
          href={`/ingress/ranking?tab=compare&a=${encodeURIComponent(myAgentKey)}`}
        >
          {t.compareMyStatusBtn}
        </a>
      ) : null}
    </div>
  )
}
