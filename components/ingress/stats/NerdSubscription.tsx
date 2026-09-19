'use client'

import {useLang} from '@/context/LanguageContext'
import CountUp from '../CountUp'

const T = {
  pt: {
    percent: '% da comunidade com assinatura',
    avgMonths: 'Média de meses (entre assinantes)',
    empty: 'Sem dados suficientes',
  },
  en: {
    percent: '% of the community with a subscription',
    avgMonths: 'Average months (among subscribers)',
    empty: 'Not enough data',
  },
} as const

const fmtPercent = (n: number) => `${n}%`
const fmtOneDecimal = (n: number) => n.toFixed(1)

/** P6 — assinatura paga: % e média entre quem informou `monthsSubscribed` (NERD-30..32). */
export default function NerdSubscription({
  hasData,
  percentSubscribed,
  avgMonthsAmongSubscribed,
}: {
  hasData: boolean
  percentSubscribed: number | null
  avgMonthsAmongSubscribed: number | null
}) {
  const {lang} = useLang()
  const t = T[lang]

  if (!hasData) {
    return <p className="ing-nerd-empty-note">{t.empty}</p>
  }

  return (
    <div className="ing-grid">
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
  )
}
