'use client'

import {useState} from 'react'
import Panel from '../Panel'
import {useLang} from '@/components/global/LanguageContext'

const translations = {
  pt: {
    panelLabel: 'Como exportar suas estatísticas',
    panelHint: 'direto do app Ingress Prime',
    summary: 'Ver o passo a passo de como exportar',
    steps: [
      'Abra o app Ingress Prime e toque no seu avatar, no canto superior, para abrir seu perfil de agente.',
      'Copie o texto exportado e cole aqui no site.',
    ],
    imgAlt: 'Print do app Ingress mostrando o ícone de exportar/compartilhar no perfil do agente',
  },
  en: {
    panelLabel: 'How to export your stats',
    panelHint: 'straight from the Ingress Prime app',
    summary: 'See the step-by-step on how to export',
    steps: [
      'Open the Ingress Prime app and tap your avatar, top corner, to open your agent profile.',
      'Copy the exported text and paste it here on the site.',
    ],
    imgAlt: "Ingress app screenshot showing the export/share icon on the agent profile",
  },
} as const

/**
 * Tutorial numerado de exportação (ISTATS-22). O link de sugestão pro Telegram
 * (ISTATS-23) saiu daqui — o convite da comunidade já está no topo da página
 * (`RankingHero`). Client leaf por causa do `useLang()` e do estado de "já
 * abriu o acordeon".
 */
export default function IngressTutorial() {
  const {lang} = useLang()
  const t = translations[lang]
  // O print é o item mais pesado da página (~1170px) e só interessa a quem abre
  // o passo a passo — então o `<img>` nem entra no DOM até a 1ª abertura. Depois
  // disso fica montado: fechar e reabrir não pisca nem refaz o pedido.
  const [imgRequested, setImgRequested] = useState(false)

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      {/*
        Mesmo acordeon (classes e visual) de `AxisExplanations`: `<details>`
        nativo, fechado por padrão. O `onToggle` só liga o estado da imagem —
        quem abre/fecha continua sendo o navegador.
      */}
      <details
        className="ing-axis-explanations__details"
        onToggle={(e) => {
          if (e.currentTarget.open) setImgRequested(true)
        }}
      >
        <summary className="ing-axis-explanations__summary">{t.summary}</summary>
        <ol className="ing-tutorial__steps" style={{listStyle: 'decimal', paddingLeft: '1.4em'}}>
          {t.steps.map((step, i) => (
            <li key={i} style={{marginBottom: '0.4em'}}>
              {step}
            </li>
          ))}
        </ol>

        {imgRequested ? (
          <img
            src="/ingress/export-tutorial.jpg"
            alt={t.imgAlt}
            className="ing-tutorial__img"
            width={1170}
            height={725}
          />
        ) : null}
      </details>
    </Panel>
  )
}
