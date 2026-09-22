import {flagSrc} from '@/lib/ingress/catalog/ingress-countries.mjs'

const FACTION_ICON = {
  enlightened: '/ingress/factions/enlightened.svg',
  resistance: '/ingress/factions/resistance.svg',
} as const

/** Mesma convenção de cor por facção do resto do site (`AgentHistoryChart`, `theme.css`): Enlightened é sempre verde, Resistance é sempre ciano. */
const FACTION_COLOR = {
  enlightened: 'var(--ing-green-soft)',
  resistance: 'var(--ing-cyan-soft)',
} as const

/**
 * Identidade de um agente em qualquer lista de recordes (hall da fama,
 * "top 1" de um evento sazonal, maior recursão): nick colorido pela facção +
 * emblema da facção + bandeira do país (quando informado). Reaproveitado por
 * `NerdHallOfFame`, `NerdSeasonalEngagement` e `NerdAverages`.
 */
export default function NerdAgentTag({
  codename,
  faction,
  countryCode,
}: {
  codename: string
  faction: 'enlightened' | 'resistance'
  countryCode: string | null
}) {
  return (
    <span className="ing-nerd-agent" style={{color: FACTION_COLOR[faction]}} title={codename}>
      {countryCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flagSrc(countryCode)} alt="" className="ing-nerd-agent-flag" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FACTION_ICON[faction]} alt="" className="ing-nerd-agent-faction" />
      <span className="ing-nerd-agent-name">{codename}</span>
    </span>
  )
}
