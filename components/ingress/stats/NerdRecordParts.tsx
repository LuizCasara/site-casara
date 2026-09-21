import {artPath} from '@/lib/ingress-art.mjs'
import {fmtStat} from '@/lib/ingress-format.mjs'
import CountUp from '../CountUp'

/**
 * Peças compartilhadas pelas três visões dos recordes (Resumo, Cards, Agentes).
 * Os tipos espelham o que `lib/ingress-nerd-records.mjs` devolve.
 */

export type RecordLang = 'pt' | 'en'
export type RecordUnit = 'count' | 'percent' | 'decimal' | 'months'

export type RecordHolder = {
  codenameKey: string
  codename: string
  faction: 'enlightened' | 'resistance'
  countryCode: string | null
}

export type RecordItem = {
  key: string
  label: {pt: string; en: string}
  unit: RecordUnit
  /** O número de destaque — no sazonal, a soma da comunidade. */
  value: number
  /** `null` nos indicadores da comunidade, que não têm recordista. */
  holder: RecordHolder | null
  /** O valor do recordista; no sazonal difere de `value`. */
  holderValue: number | null
  badge: {slug: string; tier: string | null} | null
  onyxMultiple: number | null
  reportedCount: number | null
}

export type RecordSection = {
  id: string
  title: {pt: string; en: string} | null
  hero: boolean
  items: RecordItem[]
}

export const RECORD_T = {
  pt: {
    onyxMultiple: (m: number) => `${m}× o limiar de Onyx`,
    total: 'Total somado',
    reported: (n: number) => `${fmtStat(n)} agentes contabilizados`,
    community: 'Comunidade',
    records: (n: number) => (n === 1 ? 'recorde' : 'recordes'),
    months: (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`,
  },
  en: {
    onyxMultiple: (m: number) => `${m}× the Onyx threshold`,
    total: 'Total sum',
    reported: (n: number) => `${fmtStat(n)} agents counted`,
    community: 'Community',
    records: (n: number) => (n === 1 ? 'record' : 'records'),
    months: (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`,
  },
} as const

/** Como cada unidade vira texto, e quantas casas o contador animado preserva. */
function formatterFor(unit: RecordUnit, lang: RecordLang): {format: (n: number) => string; decimals: number} {
  switch (unit) {
    case 'percent':
      return {format: (n) => `${n}%`, decimals: 0}
    case 'decimal':
      return {format: (n) => n.toFixed(1), decimals: 1}
    case 'months':
      return {format: (n) => RECORD_T[lang].months(Math.round(n)), decimals: 0}
    default:
      return {format: fmtStat, decimals: 0}
  }
}

/** O valor já formatado, sem animação — pros chips da visão Agentes, onde dezenas de contadores animados só pesariam. */
export function formatRecordValue(unit: RecordUnit, value: number, lang: RecordLang): string {
  return formatterFor(unit, lang).format(value)
}

/** O número animado (mesmo `CountUp` do resto das nerd stats). */
export function RecordValue({unit, value, lang}: {unit: RecordUnit; value: number; lang: RecordLang}) {
  const {format, decimals} = formatterFor(unit, lang)
  return <CountUp value={value} format={format} decimals={decimals} />
}

/** "×5": quantas vezes o recordista bateu o limiar de Onyx da medalha. Some quando não há múltiplo. */
export function OnyxMultiple({multiple, lang}: {multiple: number | null; lang: RecordLang}) {
  if (!multiple) return null
  return (
    <span className="ing-nerd-mult" title={RECORD_T[lang].onyxMultiple(multiple)}>
      ×{multiple}
    </span>
  )
}

/** A arte da medalha; sem medalha, um glifo neutro segura o lugar pra a coluna não desalinhar. */
export function RecordIcon({badge}: {badge: RecordItem['badge']}) {
  if (badge) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={artPath(badge.slug, badge.tier)} alt="" />
  }
  return (
    <svg className="ing-nerd-rec-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z" />
      <path d="M12 8v8M8 10l4-2 4 2" opacity=".55" />
    </svg>
  )
}
