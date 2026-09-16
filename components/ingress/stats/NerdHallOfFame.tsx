'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {useLang} from '@/context/LanguageContext'

export type HallOfFameRecord = {codenameKey: string; codename: string; value: number} | null

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

function RecordRow({label, record, empty}: {label: string; record: HallOfFameRecord; empty: string}) {
  return (
    <div className="ing-nerd-record-row">
      <span className="ing-nerd-record-label">{label}</span>
      {record ? (
        <span className="ing-nerd-record-value">
          {fmtStat(record.value)} — <strong>{record.codename}</strong>
        </span>
      ) : (
        <span className="ing-nerd-record-value ing-nerd-record-value--empty">{empty}</span>
      )}
    </div>
  )
}

/** P4 — hall da fama: recorde por cada um dos 12 stats do radar + AP + recursões (NERD-20..23). */
export default function NerdHallOfFame({
  perStat,
  lifetimeAp,
  recursions,
}: {
  perStat: Record<string, HallOfFameRecord>
  lifetimeAp: HallOfFameRecord
  recursions: HallOfFameRecord
}) {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <div className="ing-nerd-hall">
      <RecordRow label={t.ap} record={lifetimeAp} empty={t.empty} />
      <RecordRow label={t.recursions} record={recursions} empty={t.empty} />
      {RADAR_AXES.flatMap((axis) =>
        axis.parts.map((part) => (
          <RecordRow
            key={part.key}
            label={lang === 'en' ? part.labelEn : part.label}
            record={perStat[part.key] ?? null}
            empty={t.empty}
          />
        ))
      )}
    </div>
  )
}
