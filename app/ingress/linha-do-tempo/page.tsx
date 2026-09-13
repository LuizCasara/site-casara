import type {ComponentProps} from 'react'
import type {Metadata} from 'next'
import {loadProfile} from '@/lib/ingress'
import {loadCatalog} from '@/lib/ingress-catalog.mjs'
import {collectAcquisitions} from '@/lib/ingress-timeline.mjs'
import {BADGES, computeBadge, TIERS} from '@/lib/ingress-badges.mjs'
import BackLink from '@/components/ingress/BackLink'
import AchievementTimeline from '@/components/ingress/AchievementTimeline'
import {TimelineIntro, TimelinePlaceholder} from '@/components/ingress/TimelineCopy'

type BadgeDef = {key: string; name: string; statKey: string; tiers: Record<string, number>}

function buildMedalStats(stats: Record<string, number>) {
  const out: Record<string, unknown> = {}
  for (const def of BADGES as BadgeDef[]) {
    const b = computeBadge(def, stats[def.statKey] ?? 0)
    out[def.key] = {
      value: b.value,
      thresholds: TIERS.map((t) => def.tiers[t]),
      pct: b.pct,
      next: b.next,
      beyond: b.beyond,
    }
  }
  return out
}

export const metadata: Metadata = {
  title: 'Linha do tempo — FencherLC',
  description:
    'Todas as conquistas do agente FencherLC no tempo: medalhas de estatística, anomalias e eventos, com filtros, zoom e navegação.',
}

export default function TimelinePage() {
  const profile = loadProfile()
  const acquisitions = profile ? collectAcquisitions(profile, loadCatalog()) : []
  const medalStats = buildMedalStats(profile?.stats ?? {})
  const anos = acquisitions.length
    ? [
        new Date(`${acquisitions[0].date}T00:00:00Z`).getUTCFullYear(),
        new Date(`${acquisitions[acquisitions.length - 1].date}T00:00:00Z`).getUTCFullYear(),
      ]
    : null

  return (
    <main className="ing-shell">
      <BackLink fallback="/ingress" />

      <TimelineIntro count={acquisitions.length} years={anos as [number, number] | null} />

      {acquisitions.length >= 2 ? (
        <AchievementTimeline
          acquisitions={acquisitions}
          variant="completo"
          medalStats={medalStats as ComponentProps<typeof AchievementTimeline>['medalStats']}
        />
      ) : (
        <TimelinePlaceholder />
      )}
    </main>
  )
}
