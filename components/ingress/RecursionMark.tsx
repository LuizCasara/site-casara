'use client'

import {useLang} from '@/context/LanguageContext'

/**
 * As "asinhas" vermelhas: quando o total de uma medalha de estatística passou de
 * 2× (ou mais) o limiar de Onyx, o scanner marca com chevrons vermelhos e o
 * multiplicador — o registro visual da recursão. `multiple` vem de
 * `computeBadge().beyond.multiple` (= `floor(valor / limiar Onyx)`). Nada abaixo
 * de 2 renderiza. Client component (ISTATS-19: `useLang()` bilingualiza
 * title/aria-label).
 */
const T = {
  pt: {title: (m: number) => `${m}× o limiar de Onyx`, aria: (m: number) => `${m} vezes o limiar de Onyx`},
  en: {title: (m: number) => `${m}× the Onyx threshold`, aria: (m: number) => `${m} times the Onyx threshold`},
}

export default function RecursionMark({
  multiple,
  className,
}: {
  multiple: number | null | undefined
  className?: string
}) {
  const {lang} = useLang()
  const t = T[lang]
  const m = Number(multiple) || 0
  if (m < 2) return null
  const chevrons = Math.min(m - 1, 4)
  const w = 3 + chevrons * 6

  return (
    <span
      className={`ing-recursion${className ? ` ${className}` : ''}`}
      title={t.title(m)}
      aria-label={t.aria(m)}
    >
      <svg viewBox={`0 0 ${w} 10`} className="ing-recursion__wings" aria-hidden="true">
        {Array.from({length: chevrons}).map((_, i) => (
          <path key={i} d={`M${1 + i * 6},1 l4,4 l-4,4`} />
        ))}
      </svg>
      <span className="ing-recursion__x">×{m}</span>
    </span>
  )
}
