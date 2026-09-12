'use client'

import {FaTelegramPlane} from 'react-icons/fa'
import Panel from '../Panel'
import {useLang} from '@/context/LanguageContext'

const translations = {
  pt: {
    panelLabel: 'Como exportar suas estatísticas',
    panelHint: 'direto do app Ingress Prime',
    steps: [
      'Abra o app Ingress Prime e toque no seu avatar, no canto superior, para abrir seu perfil de agente.',
      'Copie o texto exportado e cole aqui no site.',
    ],
    imgAlt: 'Print do app Ingress mostrando o ícone de exportar/compartilhar no perfil do agente',
    suggestionLabel: 'Tem uma ideia pra melhorar isso?',
    suggestionCta: 'Manda no Telegram',
  },
  en: {
    panelLabel: 'How to export your stats',
    panelHint: 'straight from the Ingress Prime app',
    steps: [
      'Open the Ingress Prime app and tap your avatar, top corner, to open your agent profile.',
      'Copy the exported text and paste it here on the site.',
    ],
    imgAlt: "Ingress app screenshot showing the export/share icon on the agent profile",
    suggestionLabel: 'Got an idea to make this better?',
    suggestionCta: 'Send it on Telegram',
  },
} as const

/**
 * Tutorial numerado de exportação (ISTATS-22) + link de sugestão pro Telegram
 * do Luiz (ISTATS-23, só um link — sem formulário, sem coleta de texto).
 * Client leaf só por causa do `useLang()`.
 */
export default function IngressTutorial() {
  const {lang} = useLang()
  const t = translations[lang]

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      <ol className="ing-tutorial__steps" style={{listStyle: 'decimal', paddingLeft: '1.4em'}}>
        {t.steps.map((step, i) => (
          <li key={i} style={{marginBottom: '0.4em'}}>
            {step}
          </li>
        ))}
      </ol>

      <img
        src="/ingress/export-tutorial.jpg"
        alt={t.imgAlt}
        className="ing-tutorial__img"
        width={1170}
        height={725}
      />

      <div className="ing-tutorial__suggestion">
        <p>{t.suggestionLabel}</p>
        <a
          className="ing-radar__btn"
          href="https://t.me/FencherLC"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaTelegramPlane aria-hidden="true" /> {t.suggestionCta}
        </a>
      </div>
    </Panel>
  )
}
