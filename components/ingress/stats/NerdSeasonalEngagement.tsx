'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {useLang} from '@/context/LanguageContext'
import NerdAgentTag from './NerdAgentTag'
import type {HallOfFameRecord} from './NerdHallOfFame'

export type SeasonalMetric = {sum: number; reportedCount: number; badgeSlug: string | null; top: HallOfFameRecord}

const LABELS = {
  pt: {
    firstSaturdayEvents: 'First Saturdays',
    secondSundayEvents: 'Second Sundays',
    clearFieldsEvents: 'Clear Fields',
    battleBeaconCombatant: 'Battle Beacon (combatente)',
    nl1331MeetupsAttended: 'Meetups NL-1331',
    seerPoints: 'Pontos Seer',
    xmRecharged: 'XM recarregado',
    agentsRecruited: 'Agentes recrutados',
  },
  en: {
    firstSaturdayEvents: 'First Saturday events',
    secondSundayEvents: 'Second Sunday events',
    clearFieldsEvents: 'Clear Fields events',
    battleBeaconCombatant: 'Battle Beacon combatant',
    nl1331MeetupsAttended: 'NL-1331 meetups attended',
    seerPoints: 'Seer points',
    xmRecharged: 'XM recharged',
    agentsRecruited: 'Agents recruited',
  },
} as const

type SeasonalKey = keyof typeof LABELS.pt

const T = {
  pt: {
    total: 'Total somado',
    reportedBy: 'Agentes contabilizados',
    partialNote:
      'Números parciais — dependem do que cada agente colou no export, não é um censo completo da comunidade.',
  },
  en: {
    total: 'Total sum',
    reportedBy: 'Agents counted',
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
      <div className="ing-nerd-hof">
        {(Object.keys(labels) as SeasonalKey[]).map((key) => {
          const metric = metrics[key] ?? {sum: 0, reportedCount: 0, badgeSlug: null, top: null}
          return (
            <div className="ing-nerd-hof-row ing-nerd-seasonal-row" key={key}>
              <span className="ing-nerd-hof-icon">
                {metric.badgeSlug ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artPath(metric.badgeSlug, 'onyx')} alt="" />
                ) : null}
              </span>
              <span className="ing-nerd-hof-label">{labels[key]}</span>
              <span className="ing-nerd-seasonal-figures">
                <span className="ing-nerd-hof-value" title={t.total}>
                  {fmtStat(metric.sum)}
                </span>
                <span className="ing-nerd-seasonal-reported" title={t.reportedBy}>
                  {fmtStat(metric.reportedCount)} {t.reportedBy.toLowerCase()}
                </span>
              </span>
              {metric.top ? (
                <NerdAgentTag codename={metric.top.codename} faction={metric.top.faction} countryCode={metric.top.countryCode} />
              ) : (
                <span />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
