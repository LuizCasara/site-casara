import {loadProfile} from '@/lib/ingress'
import {computeAllBadges} from '@/lib/ingress-badges.mjs'
import {loadCatalog} from '@/lib/ingress-catalog.mjs'
import {collectAcquisitions} from '@/lib/ingress-timeline.mjs'
import Panel from '@/components/ingress/Panel'
import AgentHeader from '@/components/ingress/AgentHeader'
import StatGroups from '@/components/ingress/StatGroups'
import BadgeShelf from '@/components/ingress/BadgeShelf'
import AchievementsShelf from '@/components/ingress/AchievementsShelf'
import AchievementTimeline from '@/components/ingress/AchievementTimeline'
import PendingSection from '@/components/ingress/PendingSection'
import ProfileRadar from '@/components/ingress/ProfileRadar'
import ActionsBreakdown from '@/components/ingress/ActionsBreakdown'
import S2Preview from '@/components/ingress/S2Preview'
import ApTimeline from '@/components/ingress/ApTimeline'

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

  const badges = computeAllBadges(profile.stats)
  const acquisitions = collectAcquisitions(profile, loadCatalog())
  const pending = new Set(profile.pending)

  return (
    <main className="ing-shell">
      <AgentHeader profile={profile} />

      <BadgeShelf badges={badges} />

      <AchievementsShelf eventBadges={profile.eventBadges} />

      <AchievementTimeline acquisitions={acquisitions} />

      <StatGroups stats={profile.stats} />

      <ProfileRadar stats={profile.stats} />

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
            <span className="ing-pending__dot" aria-hidden="true" />O mapa de calor desses portais é
            o próximo passo — por ora, os números vêm do dump GDPR.
          </p>
        </Panel>
      )}

      <S2Preview s2={profile.s2} />
    </main>
  )
}
