'use client'

import {artPath} from '@/lib/ingress-art.mjs'
import {useLang} from '@/context/LanguageContext'
import CountUp from '../CountUp'
import NerdAgentTag from './NerdAgentTag'
import type {HallOfFameRecord} from './NerdHallOfFame'

const T = {
  pt: {
    percent: '% da comunidade com assinatura',
    avgMonths: 'Média de meses (entre assinantes)',
    reported: 'Agentes com esse dado',
    topMonths: 'Mais meses de assinatura',
    months: (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`,
    empty: 'Sem dados suficientes',
  },
  en: {
    percent: '% of the community with a subscription',
    avgMonths: 'Average months (among subscribers)',
    reported: 'Agents with this data',
    topMonths: 'Most months subscribed',
    months: (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`,
    empty: 'Not enough data',
  },
} as const

/** As 5 medalhas de assinatura C.O.R.E. (ingress.plus, categoria "C.O.R.E. Medals"), da primeira assinatura a 5 anos. Só ilustram a seção — não dependem de nenhum dado. */
const CORE_MEDALS = [
  {slug: 'core', name: 'C.O.R.E.'},
  {slug: 'dual-core', name: 'Dual-Core'},
  {slug: 'core-3', name: 'Core³'},
  {slug: 'quad-core', name: 'Quad-Core'},
  {slug: 'pentacore', name: 'Pentacore'},
]

const fmtPercent = (n: number) => `${n}%`
const fmtOneDecimal = (n: number) => n.toFixed(1)

/** P6 — assinatura paga: % e média entre quem informou `monthsSubscribed`, quantos informaram e quem tem mais meses (NERD-30..32). */
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
  const {lang} = useLang()
  const t = T[lang]

  const medals = (
    <div className="ing-nerd-core-medals">
      {CORE_MEDALS.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.slug} src={artPath(m.slug, null)} alt={m.name} title={m.name} />
      ))}
    </div>
  )

  if (!hasData) {
    return (
      <>
        {medals}
        <p className="ing-nerd-empty-note">{t.empty}</p>
      </>
    )
  }

  return (
    <>
      {medals}
      <div className="ing-grid">
        <div className="ing-stat">
          <div className="ing-stat__value"><CountUp value={reportedCount} /></div>
          <div className="ing-stat__label">{t.reported}</div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__value"><CountUp value={Math.round(percentSubscribed ?? 0)} format={fmtPercent} /></div>
          <div className="ing-stat__label">{t.percent}</div>
        </div>
        <div className="ing-stat">
          <div className="ing-stat__value">
            {avgMonthsAmongSubscribed === null ? (
              '—'
            ) : (
              <CountUp value={avgMonthsAmongSubscribed} format={fmtOneDecimal} decimals={1} />
            )}
          </div>
          <div className="ing-stat__label">{t.avgMonths}</div>
        </div>
      </div>
      {top ? (
        <div className="ing-nerd-hof">
          <div className="ing-nerd-hof-row">
            <span className="ing-nerd-hof-label">{t.topMonths}</span>
            <span className="ing-nerd-hof-value"><CountUp value={top.value} format={(n) => t.months(Math.round(n))} /></span>
            <NerdAgentTag codename={top.codename} faction={top.faction} countryCode={top.countryCode} />
          </div>
        </div>
      ) : null}
    </>
  )
}
