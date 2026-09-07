import {loadProfile} from '@/lib/ingress'
import {computeAllBadges} from '@/lib/ingress-badges.mjs'
import {computeRadarAxes} from '@/lib/ingress-radar.mjs'
import Panel from '@/components/ingress/Panel'
import AgentHeader from '@/components/ingress/AgentHeader'

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
  const radar = computeRadarAxes(profile.stats)
  const pending = new Set(profile.pending)

  return (
    <main className="ing-shell">
      <AgentHeader profile={profile} />

      {/* T11: StatGroups */}
      <Panel label="Estatísticas">
        <p style={{color: 'var(--ing-text-faint)'}}>{Object.keys(profile.stats).length} métricas</p>
      </Panel>

      {/* T12: BadgeShelf */}
      <Panel label="Medalhas">
        <p style={{color: 'var(--ing-text-faint)'}}>{badges.length} medalhas</p>
      </Panel>

      {/* T14: ProfileRadar */}
      <Panel label="Perfil de jogo">
        <p style={{color: 'var(--ing-text-faint)'}}>{radar.length} eixos</p>
      </Panel>

      {/* T15: ActionsBreakdown */}
      <Panel label="Distribuição de ações">
        <p style={{color: 'var(--ing-text-faint)'}}>—</p>
      </Panel>

      {/* T18 / T13: evolução de AP */}
      <Panel label="Evolução de AP">
        <p style={{color: 'var(--ing-text-faint)'}}>
          {pending.has('apTimeline') ? 'aguardando dump GDPR' : 'série temporal'}
        </p>
      </Panel>

      {/* T13: mapa de portais */}
      <Panel label="Mapa de portais">
        <p style={{color: 'var(--ing-text-faint)'}}>
          {pending.has('portalMap') ? 'aguardando dump GDPR' : 'portais'}
        </p>
      </Panel>

      {/* T16 / T17: explorador S2 */}
      <Panel label="Células S2">
        <p style={{color: 'var(--ing-text-faint)'}}>
          centro {profile.s2.center.lat.toFixed(3)}, {profile.s2.center.lng.toFixed(3)}
        </p>
      </Panel>
    </main>
  )
}
