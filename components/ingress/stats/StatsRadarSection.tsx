'use client'

import {useState} from 'react'
import {toast} from 'sonner'
import ProfileRadar, {type Agent} from '../ProfileRadar'
import OverallScorePanel, {type AgentScore} from './OverallScorePanel'
import {normalizeCodenameKey} from '@/lib/ingress-rankings.mjs'
import {RADAR_STAT_KEYS} from '@/lib/ingress-compare-message.mjs'

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
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as RankingResponse
  } catch {
    return null
  }
}

/**
 * Orquestra o `ProfileRadar` em modo `ranking`: decide quais agentes colados
 * de fato precisam ser gravados (nunca o FencherLC vindo de prop), dispara os
 * POSTs em paralelo, atualiza o painel de notas e mostra o toast de posição
 * (ou de falha suave). Único lugar que fala com `/api/ingress-rankings` no
 * caminho de escrita.
 */
export default function StatsRadarSection({
  fencherlc,
  onWritten,
}: {
  fencherlc: FencherlcInfo
  /** Chamado sempre que algum POST desta submissão gravou (`written:true`) — sinal pra quem mostra a tabela completa refazer o GET. */
  onWritten?: () => void
}) {
  const [panelAgents, setPanelAgents] = useState<AgentScore[]>([
    {label: fencherlc.agentName, overallScore: fencherlc.overallScore, axisScores: fencherlc.axisScores, tier: fencherlc.tier},
  ])

  const isFencherlcAgent = (agent: Agent) =>
    normalizeCodenameKey(agent.codename) === normalizeCodenameKey(fencherlc.agentName)

  const handleCompare = async ({a, b}: {a: Agent; b?: Agent}) => {
    // vs-me manda só quem foi colado (b); dois-agentes manda os dois; solo
    // manda só o único colado (a) — o FencherLC vindo de prop nunca é postado.
    const toPost = [a, b].filter((agent): agent is Agent => !!agent && !isFencherlcAgent(agent))
    const settled = await Promise.allSettled(toPost.map((agent) => postAgent(agent)))
    const responses = settled.map((s) => (s.status === 'fulfilled' ? s.value : null))

    const responseByCodename = new Map<string, RankingResponse | null>()
    toPost.forEach((agent, i) => responseByCodename.set(normalizeCodenameKey(agent.codename), responses[i]))

    const agentScoreFor = (agent: Agent): AgentScore | null => {
      if (isFencherlcAgent(agent)) {
        return {label: fencherlc.agentName, overallScore: fencherlc.overallScore, axisScores: fencherlc.axisScores, tier: fencherlc.tier}
      }
      const response = responseByCodename.get(normalizeCodenameKey(agent.codename))
      return response
        ? {label: agent.codename, overallScore: response.overallScore, axisScores: response.axisScores, tier: response.tier}
        : null
    }

    const nextPanelAgents = [a, b]
      .filter((agent): agent is Agent => !!agent)
      .map(agentScoreFor)
      .filter((score): score is AgentScore => !!score)
    if (nextPanelAgents.length > 0) setPanelAgents(nextPanelAgents)

    // "primeiro colado" = o primeiro item de toPost em qualquer modo (o único
    // pasted em vs-me/solo, o agente A em dois-agentes) — é ele quem recebe o toast.
    const primaryResponse = toPost.length > 0 ? responses[0] : null
    if (primaryResponse) {
      toast.success(`Você está em ${primaryResponse.rank}º lugar no ranking!`)
    } else if (toPost.length > 0) {
      toast.error('Não foi possível atualizar seu registro agora.')
    }

    if (responses.some((r) => r?.written)) {
      onWritten?.()
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
      <OverallScorePanel agents={panelAgents} />
    </div>
  )
}
