import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {loadProfile} from '@/lib/ingress'
import BackLink from '@/components/ingress/BackLink'
import {BADGES, computeBadge, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {projectNextTier} from '@/lib/ingress-history.mjs'
import {catalogEntry, coreBadges} from '@/lib/ingress-catalog.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import TierLadder from '@/components/ingress/TierLadder'
import MedalSpark from '@/components/ingress/MedalSpark'
import MedalLore from '@/components/ingress/MedalLore'

const FMT = new Intl.NumberFormat('pt-BR')
const CORE_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

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
  const dates: Record<string, string> = profile?.medalDates?.[slug] ?? {}
  const art = medalArt(slug, badge.tier) as string | null

  const allTs = Object.values(profile?.medalDates ?? {})
    .flatMap((t) => Object.values(t ?? {}))
    .map((d) => Date.parse(d as string))
    .filter(Number.isFinite)
  const since = allTs.length ? Math.min(...allTs) : Date.parse('2014-01-01')
  const capturedTs = profile?.capturedAt ? Date.parse(profile.capturedAt) : since
  const daysPlaying = Math.max(1, Math.round((capturedTs - since) / 86_400_000))
  const sparkTiers = CORE_TIERS.filter((t) => dates[t]).map((t) => ({tier: t, date: dates[t]}))
  const projection = projectNextTier(profile?.history ?? [], def, value) as
    | {tier: string; date: string}
    | {reason: string}
    | null

  const projectionText = badge.atMax
    ? null
    : projection && 'date' in projection
      ? `No ritmo dos últimos exports, ${TIER_LABELS[projection.tier] ?? projection.tier} por volta de ${new Date(projection.date).toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'})}.`
      : projection && 'reason' in projection
        ? 'Sem progresso recente nessa estatística.'
        : 'A projeção do próximo tier aparece quando houver um segundo export.'

  return (
    <main className="ing-shell">
      <BackLink fallback="/ingress">← Perfil de FencherLC</BackLink>

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
            {badge.next
              ? ` · ${Math.round((badge.pct ?? 0) * 100)}% · faltam ${FMT.format(badge.next.remaining)} para ${TIER_LABELS[badge.next.tier] ?? badge.next.tier}`
              : badge.beyond
                ? ` · ${badge.beyond.label} · ${Math.round(badge.beyond.pct * 100)}% · faltam ${FMT.format(badge.beyond.remaining)}`
                : ''}
          </p>
        </div>
      </header>

      <MedalLore slug={slug} value={value} daysPlaying={daysPlaying} />

      {entry.requirement ? (
        <p className="ing-medal-req">
          {entry.requirement.replace(
            '{0}',
            FMT.format(badge.next ? def.tiers[badge.next.tier] : def.tiers.onyx),
          )}
        </p>
      ) : null}

      {sparkTiers.length > 1 ? (
        <section>
          <h2 className="ing-panel__label" style={{marginBottom: '0.5rem'}}>
            Sua linha do tempo nesta medalha
          </h2>
          <MedalSpark tiers={sparkTiers} />
        </section>
      ) : null}

      <section>
        <h2 className="ing-panel__label" style={{marginBottom: '0.75rem'}}>
          Escada de tiers
        </h2>
        <TierLadder
          slug={slug}
          currentTier={badge.tier}
          tiers={entry.tiers}
          dates={dates}
          value={value}
        />
      </section>

      {projectionText ? <p className="ing-projection">{projectionText}</p> : null}
    </main>
  )
}
