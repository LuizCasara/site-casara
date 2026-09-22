'use client'

import {useLang} from '@/components/global/LanguageContext'
import {tierLabel} from '@/lib/ingress-tiers.mjs'
import {fmtStat} from '@/lib/ingress-format.mjs'

const T = {
  pt: {
    maxTier: ' · tier máximo',
    remainingToNext: (pct: number, remaining: string, nextTier: string) =>
      ` · ${pct}% · faltam ${remaining} para ${nextTier}`,
    remainingBeyond: (label: string, pct: number, remaining: string) => ` · ${label} · ${pct}% · faltam ${remaining}`,
    timelineHeading: 'Sua linha do tempo nesta medalha',
    ladderHeading: 'Escada de tiers',
    projectionPace: (tier: string, date: string) => `No ritmo dos últimos exports, ${tier} por volta de ${date}.`,
    projectionNoProgress: 'Sem progresso recente nessa estatística.',
    projectionNeedsSecond: 'A projeção do próximo tier aparece quando houver um segundo export.',
    dateLocale: 'pt-BR' as const,
  },
  en: {
    maxTier: ' · max tier',
    remainingToNext: (pct: number, remaining: string, nextTier: string) =>
      ` · ${pct}% · ${remaining} remaining until ${nextTier}`,
    remainingBeyond: (label: string, pct: number, remaining: string) => ` · ${label} · ${pct}% · ${remaining} remaining`,
    timelineHeading: 'Your timeline for this medal',
    ladderHeading: 'Tier ladder',
    projectionPace: (tier: string, date: string) => `At the pace of the last exports, ${tier} around ${date}.`,
    projectionNoProgress: 'No recent progress on this stat.',
    projectionNeedsSecond: 'The next-tier projection appears once there is a second export.',
    dateLocale: 'en-US' as const,
  },
}

type Badge = {
  tier: string
  atMax: boolean
  pct: number | null
  next: {tier: string; remaining: number} | null
  beyond: {label: string; pct: number; remaining: number} | null
}

/**
 * Linha de tier + linha de valor/progresso do hero de `medalha/[slug]`. Leaf
 * client próprio (ISTATS-19): a página é Server Component (`loadProfile`,
 * `medalArt` dependente de `node:fs`), então o texto bilíngue (incluindo o
 * rótulo de tier de T14) nasce aqui.
 */
export function MedalHeroStatus({badge, value}: {badge: Badge; value: number}) {
  const {lang} = useLang()
  const t = T[lang]
  return (
    <>
      <p className="ing-medal-hero__tier">
        {tierLabel(badge.tier, lang)}
        {badge.atMax ? t.maxTier : null}
      </p>
      <p className="ing-medal-hero__value">
        {fmtStat(value)}
        {badge.next
          ? t.remainingToNext(
              Math.round((badge.pct ?? 0) * 100),
              fmtStat(badge.next.remaining),
              tierLabel(badge.next.tier, lang),
            )
          : badge.beyond
            ? t.remainingBeyond(badge.beyond.label, Math.round(badge.beyond.pct * 100), fmtStat(badge.beyond.remaining))
            : ''}
      </p>
    </>
  )
}

/** "Sua linha do tempo nesta medalha" / "Escada de tiers" — os dois `h2` fixos da página. */
export function SectionHeading({kind}: {kind: 'timeline' | 'ladder'}) {
  const {lang} = useLang()
  const t = T[lang]
  return <>{kind === 'timeline' ? t.timelineHeading : t.ladderHeading}</>
}

type Projection = {tier: string; date: string} | {reason: string} | null

/**
 * As 3 variantes de `projectionText` (mais a variante `atMax`, que não
 * renderiza nada). Recebe a projeção crua do server (`projectNextTier`) — quem
 * formata a data (`toLocaleDateString` por idioma) e escolhe o rótulo de tier
 * (T14) é este leaf, não `page.tsx`.
 */
export function MedalProjectionText({atMax, projection}: {atMax: boolean; projection: Projection}) {
  const {lang} = useLang()
  const t = T[lang]
  if (atMax) return null
  if (projection && 'date' in projection) {
    const date = new Date(projection.date).toLocaleDateString(t.dateLocale, {month: 'long', year: 'numeric'})
    return <p className="ing-projection">{t.projectionPace(tierLabel(projection.tier, lang), date)}</p>
  }
  if (projection && 'reason' in projection) {
    return <p className="ing-projection">{t.projectionNoProgress}</p>
  }
  return <p className="ing-projection">{t.projectionNeedsSecond}</p>
}
