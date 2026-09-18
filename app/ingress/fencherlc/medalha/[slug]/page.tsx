import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {loadProfile} from '@/lib/ingress'
import BackLink from '@/components/ingress/BackLink'
import {BADGES, computeBadge, TIERS} from '@/lib/ingress-badges.mjs'
import {projectNextTier} from '@/lib/ingress-history.mjs'
import {catalogEntry, coreBadges} from '@/lib/ingress-catalog.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import {fmtStat} from '@/lib/ingress-format.mjs'
import TierLadder from '@/components/ingress/TierLadder'
import MedalSpark from '@/components/ingress/MedalSpark'
import MedalLore from '@/components/ingress/MedalLore'
import RecursionMark from '@/components/ingress/RecursionMark'
import {MedalHeroStatus, SectionHeading, MedalProjectionText} from '@/components/ingress/MedalPageCopy'


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
    // EN de propósito — ver o comentário em `app/ingress/layout.tsx`.
    title: `${entry.name} — FencherLC's medal`,
    description: entry.requirement || `The ${entry.name} medal on agent FencherLC's profile.`,
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
  const dates: Record<string, string> = profile?.medalDates?.[slug] ?? {}
  const art = medalArt(slug, badge.tier) as string | null

  const allTs = Object.values(profile?.medalDates ?? {})
    .flatMap((t) => Object.values(t ?? {}))
    .map((d) => Date.parse(d as string))
    .filter(Number.isFinite)
  const since = allTs.length ? Math.min(...allTs) : Date.parse('2014-01-01')
  const capturedTs = profile?.capturedAt ? Date.parse(profile.capturedAt) : since
  const daysPlaying = Math.max(1, Math.round((capturedTs - since) / 86_400_000))
  const sparkTiers = TIERS.filter((t) => dates[t]).map((t) => ({tier: t, date: dates[t]}))
  const projection = projectNextTier(profile?.history ?? [], def, value) as
    | {tier: string; date: string}
    | {reason: string}
    | null

  return (
    <main className="ing-shell">
      <BackLink fallback="/ingress" />

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
          <h1 className="ing-medal-hero__name">
            {def.name}
            <RecursionMark multiple={badge.beyond?.multiple} />
          </h1>
          <MedalHeroStatus badge={badge} value={value} />
        </div>
      </header>

      <MedalLore slug={slug} value={value} daysPlaying={daysPlaying} />

      {entry.requirement ? (
        <p className="ing-medal-req">
          {entry.requirement.replace(
            '{0}',
            fmtStat(badge.next ? def.tiers[badge.next.tier] : def.tiers.onyx),
          )}
        </p>
      ) : null}

      {sparkTiers.length > 1 ? (
        <section>
          <h2 className="ing-panel__label" style={{marginBottom: '0.5rem'}}>
            <SectionHeading kind="timeline" />
          </h2>
          <MedalSpark tiers={sparkTiers} />
        </section>
      ) : null}

      <section>
        <h2 className="ing-panel__label" style={{marginBottom: '0.75rem'}}>
          <SectionHeading kind="ladder" />
        </h2>
        <TierLadder
          currentTier={badge.tier}
          tiers={entry.tiers}
          dates={dates}
          value={value}
          arts={Object.fromEntries(TIERS.map((t) => [t, medalArt(slug, t) as string | null]))}
        />
      </section>

      <MedalProjectionText atMax={badge.atMax} projection={projection} />
    </main>
  )
}
