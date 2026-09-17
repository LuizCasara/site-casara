import type {IconType} from 'react-icons'
import {
  FaBookOpen,
  FaCrop,
  FaGlobe,
  FaLandmark,
  FaMapMarkedAlt,
  FaMedal,
  FaNewspaper,
  FaPuzzlePiece,
  FaRoute,
  FaSearchLocation,
  FaTelegramPlane,
  FaYoutube,
} from 'react-icons/fa'

export type IngressLink = {
  href: string
  label: string | {pt: string; en: string}
  Icon: IconType
}

export type IngressLinkGroup = {
  category: {pt: string; en: string}
  links: readonly IngressLink[]
}

/**
 * Set enxuto pro hero de `/ingress/fencherlc` (`AgentHeader.tsx`) — só o
 * essencial, sem categorias (o diretório completo é o do hub, ver
 * `INGRESS_LINK_GROUPS` abaixo).
 */
export const INGRESS_LINKS: readonly IngressLink[] = [
  {href: 'https://ingress.com', label: 'Ingress', Icon: FaGlobe},
  {href: 'https://intel.ingress.com', label: 'Intel Map', Icon: FaMapMarkedAlt},
  {href: 'https://www.youtube.com/@Ingress', label: 'YouTube', Icon: FaYoutube},
  {
    href: 'https://ingress.fandom.com',
    label: {pt: 'Como funciona (Wiki)', en: 'How it works (Wiki)'},
    Icon: FaBookOpen,
  },
  {href: 'https://t.me/FencherLC', label: '@FencherLC', Icon: FaTelegramPlane},
] as const

/**
 * Diretório completo, categorizado, do banner-grid do hub `/ingress`
 * (`IngressHub.tsx`). Todo canal do Telegram usa `FaTelegramPlane`, mesmo
 * ícone já usado pro contato pessoal — é o sinal visual de "isso abre o
 * Telegram" repetido, não uma coincidência.
 */
export const INGRESS_LINK_GROUPS: readonly IngressLinkGroup[] = [
  {
    category: {pt: 'Oficial', en: 'Official'},
    links: [
      {href: 'https://ingress.com', label: 'Ingress', Icon: FaGlobe},
      {href: 'https://intel.ingress.com', label: 'Intel Map', Icon: FaMapMarkedAlt},
      {href: 'https://www.youtube.com/@Ingress', label: 'YouTube', Icon: FaYoutube},
      {href: 'https://ingress.com/news', label: {pt: 'Notícias oficiais', en: 'Official news'}, Icon: FaNewspaper},
      {href: 'https://missions.ingress.com/', label: {pt: 'Enviar missões', en: 'Submit missions'}, Icon: FaRoute},
      {
        href: 'https://wayfarer.scopely.com/',
        label: {pt: 'Wayfarer (validação de portais)', en: 'Wayfarer (portal review)'},
        Icon: FaLandmark,
      },
    ],
  },
  {
    category: {pt: 'Ferramentas', en: 'Tools'},
    links: [
      {href: 'https://iitc.app/', label: {pt: 'IITC (plugins pro Intel)', en: 'IITC (Intel plugins)'}, Icon: FaPuzzlePiece},
      {href: 'https://ingress.plus/badges', label: {pt: 'Todos os badges', en: 'All badges'}, Icon: FaMedal},
      {href: 'https://bannergress.com/', label: {pt: 'Encontrar banners', en: 'Find banners'}, Icon: FaSearchLocation},
      {
        href: 'https://softspot.nl/ingress/bannercropper/',
        label: {pt: 'Crop de banners', en: 'Banner cropper'},
        Icon: FaCrop,
      },
      {
        href: 'https://ingress.fandom.com',
        label: {pt: 'Como funciona (Wiki)', en: 'How it works (Wiki)'},
        Icon: FaBookOpen,
      },
    ],
  },
  {
    category: {pt: 'Telegram', en: 'Telegram'},
    links: [
      {href: 'https://t.me/FencherLC', label: '@FencherLC', Icon: FaTelegramPlane},
      {
        href: 'https://t.me/NianticOfficial',
        label: {pt: '@NianticOfficial (oficial)', en: '@NianticOfficial (official)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/vida_enl',
        label: {pt: '@vida_enl (notícias BR)', en: '@vida_enl (BR news)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/InformesPrime',
        label: {pt: '@InformesPrime (notícias BR)', en: '@InformesPrime (BR news)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/IUENG',
        label: {pt: '@IUENG (notícias ENG)', en: '@IUENG (EN news)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/+QED-TBCaLHB16PgY',
        label: {pt: 'Mission Project (ENG)', en: 'Mission Project (EN)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/IngressFSNews',
        label: {pt: '@IngressFSNews (First Saturday)', en: '@IngressFSNews (First Saturday)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/PasscodesIngress',
        label: {pt: '@PasscodesIngress (passcodes)', en: '@PasscodesIngress (passcodes)'},
        Icon: FaTelegramPlane,
      },
      {
        href: 'https://t.me/IngressFanArt',
        label: {pt: '@IngressFanArt (fan art)', en: '@IngressFanArt (fan art)'},
        Icon: FaTelegramPlane,
      },
    ],
  },
] as const
