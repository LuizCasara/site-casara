import {buildHallSections} from '@/lib/ingress/stats/ingress-nerd-records.mjs'
import NerdRecords from './NerdRecords'
import type {RecordSection} from './NerdRecordParts'

export type HallOfFameRecord = {
  codenameKey: string
  codename: string
  faction: 'enlightened' | 'resistance'
  countryCode: string | null
  value: number
} | null

export type HallOfFameStatRecord =
  | (NonNullable<HallOfFameRecord> & {badgeSlug: string | null; tier: string | null; onyxMultiple: number | null})
  | null

/**
 * P4 — hall da fama: recorde por cada um dos 12 stats do radar + os stats extras
 * com badge real + AP + recursões (NERD-20..23). Só monta as seções — o desenho
 * (Resumo, Cards ou Agentes) é de `NerdRecords`, e a lista, os grupos e os
 * rótulos vivem em `lib/ingress-nerd-records.mjs`.
 */
export default function NerdHallOfFame({
  perStat,
  lifetimeAp,
  recursions,
}: {
  perStat: Record<string, HallOfFameStatRecord>
  lifetimeAp: HallOfFameRecord
  recursions: HallOfFameRecord
}) {
  const sections = buildHallSections({perStat, lifetimeAp, recursions}) as RecordSection[]
  return <NerdRecords sections={sections} />
}
