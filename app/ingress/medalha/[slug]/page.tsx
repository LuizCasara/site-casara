import Link from 'next/link'
import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {loadProfile} from '@/lib/ingress'
import {BADGES, computeBadge, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {catalogEntry, coreBadges} from '@/lib/ingress-catalog.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import TierLadder from '@/components/ingress/TierLadder'

const FMT = new Intl.NumberFormat('pt-BR')

type BadgeDef = {key: string; name: string; statKey: string; tiers: Record<string, number>}
type CatalogEntry = {name: string; requirement?: string; tiers: number[]}

export function generateStaticParams() {
  return (coreBadges() as {slug: string}[]).map((b) => ({slug: b.slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const entry = catalogEntry(slug) as CatalogEntry | null
  if (!entry) return {}
  return {
    title: `${entry.name} — Medalha de FencherLC`,
    description: entry.requirement || `A medalha ${entry.name} no perfil do agente FencherLC.`,
  }
}

export default async function MedalPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const entry = catalogEntry(slug) as CatalogEntry | null
  const def = (BADGES as BadgeDef[]).find((b) => b.key === slug)
  if (!entry || !def) notFound()

  const profile = loadProfile()
  const value = profile?.stats?.[def.statKey] ?? 0
  const badge = computeBadge(def, value)
  const dates = profile?.medalDates?.[slug] ?? {}
  const art = medalArt(slug, badge.tier) as string | null

  return (
    <main className="ing-shell">
      <Link href="/ingress" className="ing-back">
        ← Perfil de FencherLC
      </Link>

      <header className="ing-medal-hero">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" width={96} height={96} className="ing-medal-hero__art" />
        ) : (
          <div className="ing-medal-hero__art ing-medal-hero__art--placeholder" aria-hidden="true">
            {def.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="ing-medal-hero__name">{def.name}</h1>
          <p className="ing-medal-hero__tier">
            {TIER_LABELS[badge.tier]}
            {badge.atMax ? ' · tier máximo' : null}
          </p>
          <p className="ing-medal-hero__value">
            {FMT.format(value)}
            {badge.next ? ` · faltam ${FMT.format(badge.next.remaining)} para ${TIER_LABELS[badge.next.tier] ?? badge.next.tier}` : ''}
          </p>
        </div>
      </header>

      {entry.requirement ? (
        <p className="ing-medal-req">
          {entry.requirement.replace(
            '{0}',
            FMT.format(badge.next ? def.tiers[badge.next.tier] : def.tiers.onyx),
          )}
        </p>
      ) : null}

      <section>
        <h2 className="ing-panel__label" style={{marginBottom: '0.75rem'}}>
          Escada de tiers
        </h2>
        <TierLadder slug={slug} currentTier={badge.tier} tiers={entry.tiers} dates={dates} />
      </section>
    </main>
  )
}
