import {loadProfile} from '@/lib/ingress'
import type {Profile} from '@/lib/ingress'
import {loadFencherLcRadarOverride} from '@/lib/ingress-live-override'
import {BADGES, computeAllBadges, computeBadge, nextMedal, TIERS, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {loadCatalog, slugForStatKey} from '@/lib/ingress-catalog.mjs'
import {annotateLaneGaps, collectAcquisitions, groupLanes} from '@/lib/ingress-timeline.mjs'
import {projectNextTier} from '@/lib/ingress-history.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import {EmptySignalPanel, PortalsPanel} from '@/components/ingress/IngressPagePanels'
import AgentHeader from '@/components/ingress/AgentHeader'
import StatGroups from '@/components/ingress/StatGroups'
import type {StatBadge} from '@/components/ingress/StatGroups'
import MedalGrid from '@/components/ingress/MedalGrid'
import type {GridMedal} from '@/components/ingress/MedalGrid'
import AchievementTimeline from '@/components/ingress/AchievementTimeline'
import PendingSection from '@/components/ingress/PendingSection'
import ProfileRadar from '@/components/ingress/ProfileRadar'
import ActionsBreakdown from '@/components/ingress/ActionsBreakdown'
import S2Preview from '@/components/ingress/S2Preview'
import ApTimeline from '@/components/ingress/ApTimeline'

const CATEGORY: Record<string, string> = {core: 'estatistica', anomaly: 'anomalias', event: 'eventos'}

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
    const thresholds = TIERS.map((t) => def.tiers[t])
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

const BADGE_BY_KEY = new Map((BADGES as BadgeDef[]).map((b) => [b.key, b]))

/**
 * A badge que cada estatística numérica presente alimenta, já computada —
 * `slugForStatKey`/`medalArt` dependem de `node:fs`, então este cálculo tem
 * que ficar aqui (Server Component), não em `StatGroups` (client, per
 * ISTATS-19). Mesmo padrão já usado por `buildMedals` acima.
 */
function buildStatBadges(stats: Profile['stats']): Record<string, StatBadge | null> {
  const out: Record<string, StatBadge | null> = {}
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'number') continue
    const slug = slugForStatKey(key) as string | null
    const def = slug ? BADGE_BY_KEY.get(slug) : null
    if (!slug || !def) {
      out[key] = null
      continue
    }
    const b = computeBadge(def, value)
    out[key] = {
      slug,
      name: def.name,
      tier: b.tier as string,
      tierLabel: (TIER_LABELS as Record<string, string>)[b.tier] ?? b.tier,
      art: medalArt(slug, b.tier) as string | null,
    }
  }
  return out
}

/**
 * `hint` sai como `{pt, en}` (não uma `string` já formatada): `page.tsx` é
 * Server Component e não sabe qual idioma está ativo no toggle client — quem
 * escolhe é `MedalGrid` (client, já com `useLang()`) na hora de renderizar.
 * Mesmo motivo de `toLocaleDateString` virar dois formatadores em vez de um.
 */
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
      ? {
          pt: `~${new Date(proj.date).toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})}`,
          en: `~${new Date(proj.date).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}`,
        }
      : {pt: 'mande um 2º export para a projeção', en: 'send a 2nd export for the projection'}
  return {
    slug: nm.key,
    name: nm.name,
    nextTier: (TIER_LABELS as Record<string, string>)[nm.next.tier] ?? nm.next.tier,
    pct: nm.pct ?? 0,
    hint,
  }
}

// Regenera no máximo a cada 5 min (mesma janela do debounce de
// `casara.ingress_rankings`) em vez de consultar o banco a cada visita —
// `/ingress` continua leve, só troca "estático pra sempre" por "estático por
// até 5 min", que é o quanto uma submissão real leva pra valer de qualquer jeito.
export const revalidate = 300

export default async function IngressPage() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <main className="ing-shell">
        <EmptySignalPanel />
      </main>
    )
  }

  // Só o radar reflete a submissão mais recente do próprio FencherLC no
  // ranking — o resto da página (medalhas, linha do tempo, portais) usa o
  // `profile.stats` estático, que é dado que a tabela de ranking nem guarda.
  const radarOverride = await loadFencherLcRadarOverride(profile.agent.codename)
  const radarStats = radarOverride ? {...profile.stats, ...radarOverride} : profile.stats

  const acquisitions = collectAcquisitions(profile, loadCatalog())
  const medals = buildMedals(profile)
  const next = buildNext(profile)
  const pending = new Set(profile.pending)
  // Lembrete só pra mim (Luiz) — placeholder "aguardando dump GDPR" nunca
  // aparece pra quem visita em produção, só rodando localhost.
  const IS_DEV = process.env.NODE_ENV !== 'production'

  return (
    <main className="ing-shell">
      <AgentHeader profile={profile} />

      <MedalGrid medals={medals} next={next} />

      <AchievementTimeline acquisitions={acquisitions} variant="resumo" />

      <ProfileRadar
        stats={radarStats}
        agentName={profile.agent.codename}
        capturedAt={profile.capturedAt}
      />

      <StatGroups stats={profile.stats} badges={buildStatBadges(profile.stats)} />

      <ActionsBreakdown stats={profile.stats} />

      {pending.has('apTimeline') || !profile.timeSeries?.lifetimeAp ? (
        // Placeholder "aguardando dump GDPR" só em dev — em produção some, pra
        // não mostrar seção vazia pro visitante; aqui é lembrete pro Luiz.
        IS_DEV ? <PendingSection kind="apTimeline" /> : null
      ) : (
        <ApTimeline points={profile.timeSeries.lifetimeAp} />
      )}

      {pending.has('portalMap') || !profile.portals ? (
        IS_DEV ? <PendingSection kind="portalMap" /> : null
      ) : (
        <PortalsPanel visited={profile.portals.visited.length} submitted={profile.portals.submitted.length} />
      )}

      <S2Preview s2={profile.s2} />
    </main>
  )
}
