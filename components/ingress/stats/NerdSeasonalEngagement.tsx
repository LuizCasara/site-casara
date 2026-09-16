'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'

export type SeasonalMetric = {sum: number; reportedCount: number}

const LABELS = {
  pt: {
    firstSaturdayEvents: 'First Saturdays',
    secondSundayEvents: 'Second Sundays',
    clearFieldsEvents: 'Clear Fields',
    battleBeaconCombatant: 'Battle Beacon (combatente)',
    apolloTokens: 'Apollo Tokens',
    apolloModBattlePoints: 'Apollo Mod Battle Points',
    seerPoints: 'Pontos Seer',
    xmRecharged: 'XM recarregado',
    agentsRecruited: 'Agentes recrutados',
  },
  en: {
    firstSaturdayEvents: 'First Saturday events',
    secondSundayEvents: 'Second Sunday events',
    clearFieldsEvents: 'Clear Fields events',
    battleBeaconCombatant: 'Battle Beacon combatant',
    apolloTokens: 'Apollo Tokens',
    apolloModBattlePoints: 'Apollo Mod Battle Points',
    seerPoints: 'Seer points',
    xmRecharged: 'XM recharged',
    agentsRecruited: 'Agents recruited',
  },
} as const

type SeasonalKey = keyof typeof LABELS.pt

const T = {
  pt: {
    reportedBy: (n: number) => `${n} agente${n === 1 ? '' : 's'} informou${n === 1 ? '' : 'ram'}`,
    partialNote:
      'Números parciais — dependem do que cada agente colou no export, não é um censo completo da comunidade.',
  },
  en: {
    reportedBy: (n: number) => `${n} agent${n === 1 ? '' : 's'} reported`,
    partialNote: "Partial numbers — depend on what each agent pasted in their export, not a full community census.",
  },
} as const

/** P5 — engajamento em eventos sazonais, com aviso de dado parcial sempre visível (NERD-24..27). */
export default function NerdSeasonalEngagement({metrics}: {metrics: Record<string, SeasonalMetric>}) {
  const {lang} = useLang()
  const t = T[lang]
  const labels = LABELS[lang]

  return (
    <div className="ing-nerd-seasonal">
      <p className="ing-nerd-empty-note">{t.partialNote}</p>
      <div className="ing-nerd-hall">
        {(Object.keys(labels) as SeasonalKey[]).map((key) => {
          const metric = metrics[key] ?? {sum: 0, reportedCount: 0}
          return (
            <div className="ing-nerd-record-row" key={key}>
              <span className="ing-nerd-record-label">{labels[key]}</span>
              <span className="ing-nerd-record-value">
                {fmtStat(metric.sum)}
                <span className="ing-nerd-record-value--empty"> · {t.reportedBy(metric.reportedCount)}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
