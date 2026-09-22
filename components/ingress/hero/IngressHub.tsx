'use client'

import Link from 'next/link'
import {FaUserAstronaut, FaTrophy} from 'react-icons/fa'
import {INGRESS_LINK_GROUPS} from '@/lib/ingress/profile/ingress-links'
import {useLang} from '@/components/global/LanguageContext'
import InstallPwaCard from '@/components/ingress/shell/InstallPwaCard'

const T = {
  pt: {
    eyebrow: 'Ingress',
    heading: 'Hub do agente',
    body: 'Ponto de entrada pra tudo que existe aqui sobre Ingress — meu perfil de campo e o ranking público de agentes.',
    profileTitle: 'Meu perfil',
    profileBody: 'Estatísticas, medalhas e a linha do tempo do agente FencherLC.',
    rankingTitle: 'Ranking de agentes',
    rankingBody: 'Cole seu export de estatísticas e compare com o FencherLC ou outros agentes, ao vivo.',
    linksHeading: 'Links do Ingress',
  },
  en: {
    eyebrow: 'Ingress',
    heading: 'Agent hub',
    body: "Entry point to everything Ingress-related here — my field profile and the public agent ranking.",
    profileTitle: 'My profile',
    profileBody: "Stats, medals and the timeline of agent FencherLC.",
    rankingTitle: 'Agent ranking',
    rankingBody: 'Paste your stats export and compare with FencherLC or other agents, live.',
    linksHeading: 'Ingress links',
  },
} as const

/**
 * Placeholder deliberadamente simples: o hub "de verdade" (mini-cards de
 * ferramentas/links/canais do Telegram) ainda vai ser desenhado — isto só
 * existe pra `/ingress` não ficar quebrado depois da migração do perfil pra
 * `/ingress/fencherlc`. Client leaf só por causa do `useLang()`.
 */
export default function IngressHub() {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <main className="ing-shell">
      <header className="ing-hub__intro">
        <span className="ing-hub__eyebrow">{t.eyebrow}</span>
        <h1 className="ing-hub__heading">{t.heading}</h1>
        <p className="ing-hub__body">{t.body}</p>
      </header>

      <div className="ing-hub__cards">
        <Link href="/ingress/fencherlc" className="ing-hub__card">
          <FaUserAstronaut aria-hidden="true" />
          <strong>{t.profileTitle}</strong>
          <span>{t.profileBody}</span>
        </Link>
        <Link href="/ingress/ranking" className="ing-hub__card">
          <FaTrophy aria-hidden="true" />
          <strong>{t.rankingTitle}</strong>
          <span>{t.rankingBody}</span>
        </Link>
      </div>

      <InstallPwaCard />

      <section className="ing-hub__links" aria-label={t.linksHeading}>
        {INGRESS_LINK_GROUPS.map((group, i) => (
          <div key={group.category.pt} className="ing-hub__linkgroup">
            {i > 0 ? <hr className="ing-hub__divider" /> : null}
            <h2 className="ing-hub__linkgroup-label">{group.category[lang]}</h2>
            <div className="ing-hub__linkgrid">
              {group.links.map(({href, label, Icon}) => (
                <a key={href} className="ing-hub__linkcard" href={href} target="_blank" rel="noopener noreferrer">
                  <Icon aria-hidden="true" />
                  <span>{typeof label === 'string' ? label : label[lang]}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
