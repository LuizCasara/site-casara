'use client'

import Panel from '../Panel'
import {TIER_COLOR, tierLabel} from '@/lib/ingress-tiers.mjs'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {useLang} from '@/context/LanguageContext'

/** Mesma escada de `lib/ingress-tier-score.mjs`, reconstruída aqui só pra escolher a cor do selo a partir da nota geral (já na escala 0-100). */
const RANK_TO_TIER_KEY = ['none', 'bronze', 'silver', 'gold', 'platinum', 'onyx'] as const

function tierColorFromScore(overallScore: number): string | undefined {
  const floor = Math.floor(overallScore / 20)
  const key = RANK_TO_TIER_KEY[Math.max(0, Math.min(5, floor))]
  return (TIER_COLOR as Record<string, string>)[key]
}

/**
 * Rótulo bilíngue do selo de tier (ISTATS-19 fix), a partir da nota 0-100+ —
 * mesma matemática de `overallTierLabel()` (`lib/ingress-tier-score.mjs`),
 * reimplementada aqui em vez de importada: esse módulo arrasta `computeBadge`
 * (`lib/ingress-badges.mjs` -> `lib/ingress-catalog.mjs`, que lê
 * `badge-catalog.json` via `node:fs` no topo do arquivo) e quebraria o bundle
 * do navegador se importado por este componente client — mesmo motivo pelo
 * qual `tierColorFromScore` acima já duplicava `RANK_TO_TIER` localmente em
 * vez de importar de lá.
 */
function tierLabelFromScore(overallScore: number, lang: 'pt' | 'en'): string {
  const floor = Math.floor(overallScore / 20)
  const key = RANK_TO_TIER_KEY[Math.max(0, Math.min(5, floor))]
  const label = tierLabel(key, lang)
  const beyond = floor - 5
  return beyond > 0 ? `${label} +${beyond}` : label
}

const fmtScore = (n: number) => Math.round(n).toString()

export type AgentScore = {
  label: string
  overallScore: number
  axisScores: Record<string, number>
  tier: string
}

const T = {
  pt: {
    panelLabel: 'Nota geral',
    panelHint: 'média dos 5 eixos × 20 — 100 = Onyx em tudo',
    overallRow: 'Nota geral',
    tierRow: 'Tier',
  },
  en: {
    panelLabel: 'Overall score',
    panelHint: 'average of the 5 axes × 20 — 100 = Onyx across the board',
    overallRow: 'Overall score',
    tierRow: 'Tier',
  },
} as const

/**
 * Nota geral + selo de tier + a nota individual de cada um dos 5 eixos, pra 1
 * ou 2 agentes (lado a lado quando há comparação) — é o que permite ler o
 * "formato" do jogo de um agente, não só um número único. Client component
 * (`useLang()`, ISTATS-19 fix) — antes disso já era bundlado como client
 * porque quem o usa (T8, `StatsRadarSection`) é client.
 */
export default function OverallScorePanel({agents}: {agents: AgentScore[]}) {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
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
            <th scope="row">{t.overallRow}</th>
            {agents.map((agent) => (
              <td key={agent.label} className="ing-score-panel__overall">
                {fmtScore(agent.overallScore)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t.tierRow}</th>
            {agents.map((agent) => (
              <td key={agent.label} style={{color: tierColorFromScore(agent.overallScore)}}>
                {tierLabelFromScore(agent.overallScore, lang)}
              </td>
            ))}
          </tr>
          {RADAR_AXES.map((axis) => (
            <tr key={axis.id}>
              <th scope="row">{lang === 'en' ? axis.labelEn : axis.label}</th>
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
