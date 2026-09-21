import {buildSeasonalSections} from '@/lib/ingress-nerd-records.mjs'
import NerdRecords from './NerdRecords'
import type {RecordSection} from './NerdRecordParts'
import type {HallOfFameRecord} from './NerdHallOfFame'

export type SeasonalMetric = {sum: number; reportedCount: number; badgeSlug: string | null; top: HallOfFameRecord}

/**
 * P5 — engajamento em eventos sazonais (NERD-24..27): a soma da comunidade e
 * quem lidera cada métrica, no mesmo layout escolhido para o hall da fama.
 */
export default function NerdSeasonalEngagement({metrics}: {metrics: Record<string, SeasonalMetric>}) {
  const sections = buildSeasonalSections(metrics) as RecordSection[]
  return <NerdRecords sections={sections} />
}
