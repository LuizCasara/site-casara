import {
  FaBookOpen,
  FaGlobe,
  FaMapMarkedAlt,
  FaQuestion,
  FaTelegramPlane,
  FaYoutube,
} from 'react-icons/fa'
import {coverViewport} from '@/lib/ingress-s2.mjs'
import type {Profile} from '@/lib/ingress'
import HeroMesh from './HeroMesh'
import HeroGlobe from './HeroGlobe'

const FACTION_LABEL: Record<Profile['agent']['faction'], string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}

const LINKS = [
  {href: 'https://ingress.com', label: 'Ingress', Icon: FaGlobe},
  {href: 'https://intel.ingress.com', label: 'Intel Map', Icon: FaMapMarkedAlt},
  {href: 'https://www.youtube.com/@Ingress', label: 'YouTube', Icon: FaYoutube},
  {href: 'https://ingress.fandom.com', label: 'Como funciona', Icon: FaBookOpen},
  {href: 'https://t.me/FencherLC', label: '@FencherLC', Icon: FaTelegramPlane},
] as const

/**
 * Hero da direção "Scanner": codinome sobre a malha de células S2 da região do
 * agente (mesma matemática da seção interativa). A malha é calculada aqui, no
 * server, e passada como polígonos normalizados para o `HeroMesh` (client)
 * animar. No desktop, `HeroGlobe` (client) desenha o globo decorativo sangrando
 * pela direita. Server component.
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
      <HeroGlobe center={s2.center} />
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
        </div>
        <nav className="ing-hero__links" aria-label="Links do Ingress">
          {LINKS.map(({href, label, Icon}) => (
            <a
              key={href}
              className="ing-hero__link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon aria-hidden="true" />
              {label}
            </a>
          ))}
          <button type="button" className="ing-hero__hint" aria-label="O que é Ingress?">
            <FaQuestion aria-hidden="true" />
          </button>
          <span className="ing-hero__tip" role="tooltip">
            <strong>Ingress</strong> transforma o mundo real num tabuleiro: monumentos e pontos de
            referência viram portais que você captura indo até eles a pé e conecta em campos que
            cobrem bairros inteiros. É de graça, joga em qualquer lugar, e é a melhor desculpa pra
            andar 10 km sem perceber.
          </span>
        </nav>
      </div>
    </header>
  )
}
