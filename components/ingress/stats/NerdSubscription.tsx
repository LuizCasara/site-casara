import {artPath} from '@/lib/ingress-art.mjs'
import {buildSubscriptionSections} from '@/lib/ingress-nerd-records.mjs'
import NerdRecords from './NerdRecords'
import type {RecordSection} from './NerdRecordParts'
import type {HallOfFameRecord} from './NerdHallOfFame'

/** As 5 medalhas de assinatura C.O.R.E. (ingress.plus, categoria "C.O.R.E. Medals"), da primeira assinatura a 5 anos. Só ilustram a seção — não dependem de nenhum dado. */
const CORE_MEDALS = [
  {slug: 'core', name: 'C.O.R.E.'},
  {slug: 'dual-core', name: 'Dual-Core'},
  {slug: 'core-3', name: 'Core³'},
  {slug: 'quad-core', name: 'Quad-Core'},
  {slug: 'pentacore', name: 'Pentacore'},
]

/**
 * P6 — assinatura paga: % e média entre quem informou `monthsSubscribed`, quantos
 * informaram e quem tem mais meses (NERD-30..32). Os números entram no mesmo
 * layout escolhido para o hall da fama (e, sem dado, o aviso de vazio é de
 * `NerdRecords`); a fileira de medalhas C.O.R.E. fica acima em qualquer estado.
 */
export default function NerdSubscription({
  hasData,
  reportedCount,
  percentSubscribed,
  avgMonthsAmongSubscribed,
  top,
}: {
  hasData: boolean
  reportedCount: number
  percentSubscribed: number | null
  avgMonthsAmongSubscribed: number | null
  top: HallOfFameRecord
}) {
  const sections = buildSubscriptionSections({
    hasData,
    reportedCount,
    percentSubscribed,
    avgMonthsAmongSubscribed,
    top,
  }) as RecordSection[]

  return (
    <>
      <div className="ing-nerd-core-medals">
        {CORE_MEDALS.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.slug} src={artPath(m.slug, null)} alt={m.name} title={m.name} />
        ))}
      </div>
      <NerdRecords sections={sections} />
    </>
  )
}
