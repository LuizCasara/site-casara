'use client'

import {FaTrophy, FaKeyboard, FaTelegramPlane} from 'react-icons/fa'
import {heroMeshPolygons} from '@/lib/ingress/map/ingress-s2.mjs'
import {useLang} from '@/components/global/LanguageContext'
import HeroMesh from '../hero/HeroMesh'
import HeroGlobe from '../hero/HeroGlobe'

const T = {
  pt: {
    eyebrow: 'Ranking de agentes',
    heading: 'Onde você fica?',
    body: 'Cole o export de estatísticas do app, compare com o FencherLC ou com outro agente, e veja sua posição — o ranking é público, atualiza na hora e cresce a cada agente que entra.',
    countLabel: (n: number) => `${n} agente${n === 1 ? '' : 's'} medido${n === 1 ? '' : 's'}`,
    participateCta: 'Participar',
    telegram: 'Comunidade no Telegram',
  },
  en: {
    eyebrow: 'Agent ranking',
    heading: 'Where do you stand?',
    body: "Paste your app's stats export, compare with FencherLC or another agent, and see your position — the ranking is public, updates instantly, and grows with every new agent.",
    countLabel: (n: number) => `${n} agent${n === 1 ? '' : 's'} measured`,
    participateCta: 'Join in',
    telegram: 'Telegram community',
  },
} as const

/** Grupo do Telegram da comunidade do ranking — diferente do contato pessoal `@FencherLC` já usado no rodapé. */
const TELEGRAM_URL = 'https://t.me/ingressAgentRanking'

/** Id da textarea principal do `ProfileRadar` (variant `ranking`) — mesmo elemento em qualquer modo (solo/vs-me/two-A). */
const PASTE_FIELD_ID = 'ing-radar-a'

/**
 * Hero de `/ingress/ranking` — mesmo tratamento visual do hero de `/ingress/fencherlc`
 * (`AgentHeader`: malha S2 + globo decorativo), mas sem identidade de um
 * agente específico (não há "o agente" nesta página, é o ranking de todos).
 * A âncora geográfica da malha/globo é `s2.center` do FencherLC (mesma fonte
 * de sempre) só por não termos outro centro — decoração, não afirma nada
 * sobre os agentes listados. Client component: `useLang()` + `HeroGlobe`.
 */
export default function RankingHero({
  center,
  totalAgents,
}: {
  center: {lat: number; lng: number}
  totalAgents: number
}) {
  const {lang} = useLang()
  const t = T[lang]
  const polygons = heroMeshPolygons(center) as [number, number][][]

  const handleParticipate = () => {
    const field = document.getElementById(PASTE_FIELD_ID)
    field?.scrollIntoView({behavior: 'smooth', block: 'center'})
    field?.focus({preventScroll: true})
  }

  return (
    <header className="ing-hero ing-hero--ranking">
      <HeroMesh polygons={polygons} />
      <HeroGlobe center={center} />
      <div className="ing-hero__body">
        <p className="ing-hero__eyebrow">{t.eyebrow}</p>
        <h1 className="ing-hero__codename ing-hero__codename--ranking">
          <FaTrophy aria-hidden="true" className="ing-hero__ranking-icon" />
          {t.heading}
        </h1>
        <p className="ing-hero__ranking-body">{t.body}</p>
        <div className="ing-hero__meta">
          <span className="ing-hero__faction">{t.countLabel(totalAgents)}</span>
        </div>
        <button type="button" className="ing-hero__cta" onClick={handleParticipate}>
          <FaKeyboard aria-hidden="true" />
          {t.participateCta}
        </button>
        <div className="ing-hero__links">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="ing-hero__link">
            <FaTelegramPlane aria-hidden="true" />
            {t.telegram}
          </a>
        </div>
      </div>
    </header>
  )
}
