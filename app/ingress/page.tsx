import {loadProfile} from '@/lib/ingress'
import type {Profile} from '@/lib/ingress'
import {BADGES, computeAllBadges, nextMedal, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {loadCatalog} from '@/lib/ingress-catalog.mjs'
import {annotateLaneGaps, collectAcquisitions, groupLanes} from '@/lib/ingress-timeline.mjs'
import {projectNextTier} from '@/lib/ingress-history.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import Panel from '@/components/ingress/Panel'
import AgentHeader from '@/components/ingress/AgentHeader'
import StatGroups from '@/components/ingress/StatGroups'
import MedalGrid from '@/components/ingress/MedalGrid'
import type {GridMedal} from '@/components/ingress/MedalGrid'
import AchievementTimeline from '@/components/ingress/AchievementTimeline'
import PendingSection from '@/components/ingress/PendingSection'
import ProfileRadar from '@/components/ingress/ProfileRadar'
import ActionsBreakdown from '@/components/ingress/ActionsBreakdown'
import S2Preview from '@/components/ingress/S2Preview'
import ApTimeline from '@/components/ingress/ApTimeline'

const CATEGORY: Record<string, string> = {core: 'estatistica', anomaly: 'anomalias', event: 'eventos'}
const CORE_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

type Lane = {
  slug: string
  name: string
  group: string
  latestTier: string
  firstDate: string
  tiers: {tier: string; date: string; gapDays: number | null; prevTier: string | null}[]
}
type BadgeDef = {key: string; name: string; statKey: string; tiers: Record<string, number>}

function buildMedals(profile: Profile): GridMedal[] {
  const catalog = loadCatalog()
  const lanes = groupLanes(annotateLaneGaps(collectAcquisitions(profile, catalog))) as Lane[]
  const laneBySlug = new Map(lanes.map((l) => [l.slug, l]))

  const stat: GridMedal[] = computeAllBadges(profile.stats).map((b) => {
    const def = (BADGES as BadgeDef[]).find((d) => d.key === b.key) as BadgeDef
    const lane = laneBySlug.get(b.key)
    const thresholds = CORE_TIERS.map((t) => def.tiers[t])
    return {
      slug: b.key,
      name: b.name,
      category: 'estatistica',
      tier: b.tier,
      art: (medalArt(b.key, b.tier === 'none' ? 'bronze' : b.tier) as string | null) ?? '',
      firstDate: lane?.firstDate ?? null,
      detail: {
        slug: b.key,
        name: b.name,
        group: 'core',
        tiers: lane?.tiers ?? [],
        stat: {value: b.value, thresholds, pct: b.pct, next: b.next, beyond: b.beyond},
      },
    }
  })

  const event: GridMedal[] = lanes
    .filter((l) => l.group !== 'core')
    .map((l) => {
      const eb = (profile.eventBadges ?? []).find((e) => e.slug === l.slug)
      return {
        slug: l.slug,
        name: l.name,
        category: CATEGORY[l.group] ?? 'eventos',
        tier: l.latestTier,
        art: (medalArt(l.slug, 'single') as string | null) ?? '',
        firstDate: l.firstDate,
        detail: {slug: l.slug, name: l.name, group: l.group, count: eb?.count, tiers: l.tiers},
      }
    })

  return [...stat, ...event]
}

function buildNext(profile: Profile) {
  const badges = computeAllBadges(profile.stats)
  const nm = nextMedal(badges)
  if (!nm || !nm.next) return null
  const def = (BADGES as BadgeDef[]).find((d) => d.key === nm.key)
  const proj = def
    ? (projectNextTier(profile.history ?? [], def, nm.value) as
        | {tier: string; date: string}
        | {reason: string}
        | null)
    : null
  const hint =
    proj && 'date' in proj
      ? `~${new Date(proj.date).toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})}`
      : 'mande um 2º export para a projeção'
  return {
    slug: nm.key,
    name: nm.name,
    nextTier: (TIER_LABELS as Record<string, string>)[nm.next.tier] ?? nm.next.tier,
    pct: nm.pct ?? 0,
    hint,
  }
}

export default function IngressPage() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <main className="ing-shell">
        <Panel label="Sinal perdido">
          <p style={{color: 'var(--ing-text-dim)'}}>
            O perfil do agente ainda não foi publicado. Volte em breve.
          </p>
        </Panel>
      </main>
    )
  }

  const acquisitions = collectAcquisitions(profile, loadCatalog())
  const medals = buildMedals(profile)
  const next = buildNext(profile)
  const pending = new Set(profile.pending)

  return (
    <main className="ing-shell">
      <AgentHeader profile={profile} />

      <MedalGrid medals={medals} next={next} />

      <AchievementTimeline acquisitions={acquisitions} variant="resumo" />

      <StatGroups stats={profile.stats} />

      <ProfileRadar stats={profile.stats} agentName={profile.agent.codename} />

      <ActionsBreakdown stats={profile.stats} />

      {pending.has('apTimeline') || !profile.timeSeries?.lifetimeAp ? (
        <PendingSection kind="apTimeline" />
      ) : (
        <ApTimeline points={profile.timeSeries.lifetimeAp} />
      )}

      {pending.has('portalMap') || !profile.portals ? (
        <PendingSection kind="portalMap" />
      ) : (
        <Panel
          label="Portais"
          hint={`${profile.portals.visited.length} visitados · ${profile.portals.submitted.length} submetidos`}
        >
          <p className="ing-pending">
            <span className="ing-pending__dot" aria-hidden="true" />O mapa de calor desses portais é o
            próximo passo — por ora, os números vêm do dump GDPR.
          </p>
        </Panel>
      )}

      <S2Preview s2={profile.s2} />
    </main>
  )
}
