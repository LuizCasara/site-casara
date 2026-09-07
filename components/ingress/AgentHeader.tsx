import {coverViewport} from '@/lib/ingress-s2.mjs'
import type {Profile} from '@/lib/ingress'
import HeroMesh from './HeroMesh'

const FACTION_LABEL: Record<Profile['agent']['faction'], string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}

/**
 * Hero da direção "Scanner": codinome sobre a malha de células S2 da região do
 * agente (mesma matemática da seção interativa). A malha é calculada aqui, no
 * server, e passada como polígonos normalizados para o `HeroMesh` (client)
 * animar. Server component.
 */
export default function AgentHeader({profile}: {profile: Profile}) {
  const {agent, s2} = profile

  // Um retângulo pequeno em torno do centro, nível baixo -> poucas células.
  const span = 0.06
  const cells = coverViewport(
    {
      north: s2.center.lat + span,
      south: s2.center.lat - span,
      east: s2.center.lng + span,
      west: s2.center.lng - span,
    },
    11,
    {cap: 60},
  ) as {token: string; ring: [number, number][]}[]

  // normaliza lat/lng -> 0..1 no viewBox (lat invertida: norte no topo)
  const latToY = (lat: number) => (s2.center.lat + span - lat) / (2 * span)
  const lngToX = (lng: number) => (lng - (s2.center.lng - span)) / (2 * span)
  const polygons = cells.map((c) =>
    c.ring.map(([lat, lng]) => [lngToX(lng), latToY(lat)] as [number, number]),
  )

  return (
    <header className="ing-hero">
      <HeroMesh polygons={polygons} />
      <div className="ing-hero__body">
        <p className="ing-hero__eyebrow">Agente de campo</p>
        <h1 className="ing-hero__codename">{agent.codename}</h1>
        <div className="ing-hero__meta">
          <span className="ing-hero__faction">{FACTION_LABEL[agent.faction]}</span>
          <span className="ing-hero__level" aria-label={`Nível ${agent.level}`}>
            {agent.level}
          </span>
          <span>
            {agent.recursions} {agent.recursions === 1 ? 'recursão' : 'recursões'}
          </span>
          <span>
            {agent.monthsSubscribed} {agent.monthsSubscribed === 1 ? 'mês' : 'meses'} de assinatura
          </span>
        </div>
      </div>
    </header>
  )
}
