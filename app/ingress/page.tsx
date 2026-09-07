import {loadProfile} from '@/lib/ingress'
import {computeAllBadges} from '@/lib/ingress-badges.mjs'
import Panel from '@/components/ingress/Panel'
import AgentHeader from '@/components/ingress/AgentHeader'
import StatGroups from '@/components/ingress/StatGroups'
import BadgeShelf from '@/components/ingress/BadgeShelf'
import PendingSection from '@/components/ingress/PendingSection'
import ProfileRadar from '@/components/ingress/ProfileRadar'
import ActionsBreakdown from '@/components/ingress/ActionsBreakdown'
import S2Preview from '@/components/ingress/S2Preview'

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
  const pending = new Set(profile.pending)

  return (
    <main className="ing-shell">
      <AgentHeader profile={profile} />

      <StatGroups stats={profile.stats} />

      <BadgeShelf badges={badges} />

      <ProfileRadar stats={profile.stats} />

      <ActionsBreakdown stats={profile.stats} />

      {/* T18 troca este slot pelo ApTimeline quando timeSeries.lifetimeAp existir */}
      {pending.has('apTimeline') ? (
        <PendingSection kind="apTimeline" />
      ) : (
        <Panel label="Evolução de AP">
          <p style={{color: 'var(--ing-text-faint)'}}>série temporal</p>
        </Panel>
      )}

      {pending.has('portalMap') ? (
        <PendingSection kind="portalMap" />
      ) : (
        <Panel label="Mapa de portais">
          <p style={{color: 'var(--ing-text-faint)'}}>portais</p>
        </Panel>
      )}

      <S2Preview s2={profile.s2} />
    </main>
  )
}
