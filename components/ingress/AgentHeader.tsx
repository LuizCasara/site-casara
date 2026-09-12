'use client'

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
import {useLang} from '@/context/LanguageContext'
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
  {
    href: 'https://ingress.fandom.com',
    label: {pt: 'Como funciona', en: 'How it works'},
    Icon: FaBookOpen,
  },
  {href: 'https://t.me/FencherLC', label: '@FencherLC', Icon: FaTelegramPlane},
] as const

const T = {
  pt: {
    eyebrow: 'Agente de campo',
    level: (n: number) => `Nível ${n}`,
    recursion: (n: number) => `${n} ${n === 1 ? 'recursão' : 'recursões'}`,
    linksAria: 'Links do Ingress',
    whatIsIngress: 'O que é Ingress?',
    tooltip:
      'transforma o mundo real num tabuleiro: monumentos e pontos de referência viram portais que você captura indo até eles a pé e conecta em campos que cobrem bairros inteiros. É de graça, joga em qualquer lugar, e é a melhor desculpa pra andar 10 km sem perceber.',
  },
  en: {
    eyebrow: 'Field agent',
    level: (n: number) => `Level ${n}`,
    recursion: (n: number) => `${n} ${n === 1 ? 'recursion' : 'recursions'}`,
    linksAria: 'Ingress links',
    whatIsIngress: 'What is Ingress?',
    tooltip:
      'turns the real world into a game board: monuments and landmarks become portals you capture by walking up to them, then link into fields that cover entire neighborhoods. It is free, playable anywhere, and the best excuse to walk 10 km without noticing.',
  },
}

/**
 * Hero da direção "Scanner": codinome sobre a malha de células S2 da região do
 * agente (mesma matemática da seção interativa). A malha é calculada aqui e
 * passada como polígonos normalizados para o `HeroMesh` (client) animar. No
 * desktop, `HeroGlobe` (client) desenha o globo decorativo sangrando pela
 * direita. Client component (ISTATS-19: `useLang()` bilingualiza o texto).
 */
export default function AgentHeader({profile}: {profile: Profile}) {
  const {agent, s2} = profile
  const {lang} = useLang()
  const t = T[lang]

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
        <p className="ing-hero__eyebrow">{t.eyebrow}</p>
        <h1 className="ing-hero__codename">{agent.codename}</h1>
        <div className="ing-hero__meta">
          <span className="ing-hero__faction">{FACTION_LABEL[agent.faction]}</span>
          <span className="ing-hero__level" aria-label={t.level(agent.level)}>
            {agent.level}
          </span>
          <span>{t.recursion(agent.recursions)}</span>
        </div>
        <nav className="ing-hero__links" aria-label={t.linksAria}>
          {LINKS.map(({href, label, Icon}) => (
            <a
              key={href}
              className="ing-hero__link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon aria-hidden="true" />
              {typeof label === 'string' ? label : label[lang]}
            </a>
          ))}
          <button type="button" className="ing-hero__hint" aria-label={t.whatIsIngress}>
            <FaQuestion aria-hidden="true" />
          </button>
          <span className="ing-hero__tip" role="tooltip">
            <strong>Ingress</strong> {t.tooltip}
          </span>
        </nav>
      </div>
    </header>
  )
}
