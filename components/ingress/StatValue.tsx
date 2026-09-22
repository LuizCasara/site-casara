'use client'

import Link from 'next/link'
import {useLang} from '@/components/global/LanguageContext'
import CountUp from './CountUp'

type StatBadge = {
  slug: string
  name: string
  tier: string
  tierLabel: string
  art: string | null
}

const T = {
  pt: {medal: (name: string, tier: string) => `Medalha ${name}: ${tier}`},
  en: {medal: (name: string, tier: string) => `Medal ${name}: ${tier}`},
}

/**
 * Uma métrica: número (pt-BR, com count-up) + rótulo. Quando a estatística
 * alimenta uma badge, um ícone pequeno no canto (sempre visível, para touch) que
 * no hover/focus mostra a medalha e o tier. Tudo por CSS — client component
 * (ISTATS-19: `useLang()` bilingualiza o aria-label "Medalha").
 */
export default function StatValue({
  label,
  value,
  badge,
}: {
  label: string
  value: number
  badge?: StatBadge | null
}) {
  const {lang} = useLang()
  return (
    <div className="ing-stat">
      <div className="ing-stat__value">
        <CountUp value={value} />
      </div>
      <div className="ing-stat__label">{label}</div>
      {badge ? (
        <Link
          href={`/ingress/fencherlc/medalha/${badge.slug}`}
          className={`ing-stat__badge ing-stat__badge--${badge.tier}`}
          aria-label={T[lang].medal(badge.name, badge.tierLabel)}
        >
          {badge.art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badge.art} alt="" width={20} height={20} className="ing-stat__badge-art" />
          ) : (
            <span className="ing-stat__badge-dot" aria-hidden="true" />
          )}
          <span className="ing-stat__badge-tip" role="tooltip">
            {badge.name} · {badge.tierLabel}
          </span>
        </Link>
      ) : null}
    </div>
  )
}
