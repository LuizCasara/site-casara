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
      'Entre em "Agent Stats" (Estatísticas do agente).',
      'Toque no ícone de exportar/compartilhar no topo da tela e escolha "All Time" como recorte.',
      'Copie o texto exportado (a primeira linha é o cabeçalho, a linha "ALL TIME" tem os números) e cole na caixa de comparação, no topo desta página.',
    ],
    imgAlt: 'Print do passo a passo de exportação (em breve)',
    imgPlaceholder: 'Print em breve',
    suggestionLabel: 'Tem uma ideia pra melhorar isso?',
    suggestionCta: 'Manda no Telegram',
  },
  en: {
    panelLabel: 'How to export your stats',
    panelHint: 'straight from the Ingress Prime app',
    steps: [
      'Open the Ingress Prime app and tap your avatar, top corner, to open your agent profile.',
      'Go to "Agent Stats".',
      'Tap the export/share icon at the top of the screen and pick "All Time" as the time span.',
      'Copy the exported text (the first line is the header, the "ALL TIME" line has the numbers) and paste it into the compare box at the top of this page.',
    ],
    imgAlt: 'Export walkthrough screenshot (coming soon)',
    imgPlaceholder: 'Screenshot coming soon',
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
      <ol className="ing-tutorial__steps">
        {t.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <div className="ing-tutorial__img-placeholder" role="img" aria-label={t.imgAlt}>
        <span>{t.imgPlaceholder}</span>
      </div>

      <p className="ing-tutorial__suggestion">
        {t.suggestionLabel}{' '}
        <a
          className="ing-radar__btn"
          href="https://t.me/FencherLC"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaTelegramPlane aria-hidden="true" /> {t.suggestionCta}
        </a>
      </p>
    </Panel>
  )
}
