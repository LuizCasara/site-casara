'use client'

import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {STAT_COLUMNS} from '@/lib/ingress-stats.mjs'
import {useLang} from '@/context/LanguageContext'
import CountUp from '../CountUp'
import NerdAgentTag from './NerdAgentTag'

/**
 * Mesma lista de `HALL_OF_FAME_EXTRA_KEYS` em `lib/ingress-nerd-stats.mjs` —
 * copiada, não importada: aquele módulo arrasta `computeStatTiers` ->
 * `ingress-badges.mjs` -> `ingress-catalog.mjs`, que lê o catálogo do disco
 * (`node:fs`) e quebra o bundle de um Client Component. Mudar uma lista exige
 * mudar a outra.
 */
const HALL_OF_FAME_EXTRA_KEYS = [
  'portalsCaptured',
  'uniquePortalsCaptured',
  'longestSojournerStreak',
  'oprAgreements',
  'portalScansUploaded',
  'uniquesScoutControlled',
  'maxTimePortalHeldDays',
  'missionDaysAttended',
  'droneHacks',
  'machinaPortalsReclaimed',
  'completedHackstreaks',
]

/** Rótulo pt/en de cada `HALL_OF_FAME_EXTRA_KEYS` — mesma fonte única de `STAT_COLUMNS` usada pelo perfil e pelo CLI, não um texto duplicado aqui. */
const EXTRA_LABEL = Object.fromEntries(STAT_COLUMNS.map((c) => [c.key, {label: c.label, labelEn: c.labelEn ?? c.label}]))

export type HallOfFameRecord = {
  codenameKey: string
  codename: string
  faction: 'enlightened' | 'resistance'
  countryCode: string | null
  value: number
} | null

export type HallOfFameStatRecord =
  | (NonNullable<HallOfFameRecord> & {badgeSlug: string | null; tier: string | null})
  | null

const T = {
  pt: {
    ap: 'Maior AP (lifetime)',
    recursions: 'Mais recursões',
    empty: '—',
  },
  en: {
    ap: 'Highest AP (lifetime)',
    recursions: 'Most recursions',
    empty: '—',
  },
} as const

function RecordRow({
  label,
  record,
  empty,
  badgeSlug,
  tier,
}: {
  label: string
  record: HallOfFameRecord | HallOfFameStatRecord
  empty: string
  badgeSlug?: string | null
  tier?: string | null
}) {
  return (
    <div className="ing-nerd-hof-row">
      <span className="ing-nerd-hof-icon">
        {badgeSlug && tier ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artPath(badgeSlug, tier)} alt="" />
        ) : null}
      </span>
      <span className="ing-nerd-hof-label">{label}</span>
      {record ? (
        <>
          <span className="ing-nerd-hof-value"><CountUp value={record.value} /></span>
          <NerdAgentTag codename={record.codename} faction={record.faction} countryCode={record.countryCode} />
        </>
      ) : (
        <span className="ing-nerd-hof-value ing-nerd-hof-value--empty">{empty}</span>
      )}
    </div>
  )
}

/** P4 — hall da fama: recorde por cada um dos 12 stats do radar + `HALL_OF_FAME_EXTRA_KEYS` (stats fora do radar com badge real) + AP + recursões (NERD-20..23). */
export default function NerdHallOfFame({
  perStat,
  lifetimeAp,
  recursions,
}: {
  perStat: Record<string, HallOfFameStatRecord>
  lifetimeAp: HallOfFameRecord
  recursions: HallOfFameRecord
}) {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <div className="ing-nerd-hof">
      <RecordRow label={t.ap} record={lifetimeAp} empty={t.empty} />
      <RecordRow label={t.recursions} record={recursions} empty={t.empty} />
      {RADAR_AXES.flatMap((axis) =>
        axis.parts.map((part) => {
          const stat = perStat[part.key] ?? null
          return (
            <RecordRow
              key={part.key}
              label={lang === 'en' ? part.labelEn : part.label}
              record={stat}
              empty={t.empty}
              badgeSlug={stat?.badgeSlug}
              tier={stat?.tier}
            />
          )
        })
      )}
      {HALL_OF_FAME_EXTRA_KEYS.map((key: string) => {
        const stat = perStat[key] ?? null
        const labels = EXTRA_LABEL[key]
        return (
          <RecordRow
            key={key}
            label={lang === 'en' ? labels?.labelEn : labels?.label}
            record={stat}
            empty={t.empty}
            badgeSlug={stat?.badgeSlug}
            tier={stat?.tier}
          />
        )
      })}
    </div>
  )
}
