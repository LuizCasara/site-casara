import Panel from '../Panel'
import {TIER_COLOR} from '@/lib/ingress-tiers.mjs'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'

/** Mesma escada de `lib/ingress-tier-score.mjs`, reconstruída aqui só pra escolher a cor do selo a partir da nota geral (já na escala 0-100). */
const RANK_TO_TIER_KEY = ['none', 'bronze', 'silver', 'gold', 'platinum', 'onyx'] as const

function tierColorFromScore(overallScore: number): string | undefined {
  const floor = Math.floor(overallScore / 20)
  const key = RANK_TO_TIER_KEY[Math.max(0, Math.min(5, floor))]
  return (TIER_COLOR as Record<string, string>)[key]
}

const fmtScore = (n: number) => Math.round(n).toString()

export type AgentScore = {
  label: string
  overallScore: number
  axisScores: Record<string, number>
  tier: string
}

/**
 * Nota geral + selo de tier + a nota individual de cada um dos 5 eixos, pra 1
 * ou 2 agentes (lado a lado quando há comparação) — é o que permite ler o
 * "formato" do jogo de um agente, não só um número único. Server component
 * (sem hooks/eventos) — só é bundlado como client porque quem o usa (T8) é
 * client, não porque ele próprio precise ser.
 */
export default function OverallScorePanel({agents}: {agents: AgentScore[]}) {
  return (
    <Panel label="Nota geral" hint="média dos 5 eixos × 20 — 100 = Onyx em tudo">
      <table className="ing-score-panel">
        <thead>
          <tr>
            <th scope="col" />
            {agents.map((agent) => (
              <th key={agent.label} scope="col" className="ing-score-panel__agent">
                {agent.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="ing-score-panel__overall-row">
            <th scope="row">Nota geral</th>
            {agents.map((agent) => (
              <td key={agent.label} className="ing-score-panel__overall">
                {fmtScore(agent.overallScore)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Tier</th>
            {agents.map((agent) => (
              <td key={agent.label} style={{color: tierColorFromScore(agent.overallScore)}}>
                {agent.tier}
              </td>
            ))}
          </tr>
          {RADAR_AXES.map((axis) => (
            <tr key={axis.id}>
              <th scope="row">{axis.label}</th>
              {agents.map((agent) => (
                <td key={agent.label}>{fmtScore((agent.axisScores[axis.id] ?? 0) * 20)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
