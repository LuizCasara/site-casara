'use client'

import Panel from '../Panel'
import {useLang} from '@/context/LanguageContext'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'

type AxisId = 'construcao' | 'destruicao' | 'exploracao' | 'hacking' | 'linksCampos'

const translations = {
  pt: {
    panelLabel: 'O que cada eixo mede',
    panelHint: 'a explicação fica sempre visível — sem depender de hover',
    axes: {
      construcao: {
        title: 'Construção',
        body: 'Ressonadores implantados e mods instalados: o quanto você levanta e fortalece portais do zero.',
      },
      destruicao: {
        title: 'Destruição',
        body: 'Ressonadores destruídos e portais neutralizados: o quanto você derruba a infraestrutura do lado adversário.',
      },
      exploracao: {
        title: 'Exploração',
        body: 'Portais únicos visitados, distância a pé e missões concluídas: o quanto você se move pelo mundo real.',
      },
      hacking: {
        title: 'Hacking',
        body: 'Hacks e pontos de glifo: o quanto você interage diretamente com os portais para puxar itens e girar glifos.',
      },
      linksCampos: {
        title: 'Links e campos',
        body: 'Links criados, campos de controle e Mind Units capturadas: o quanto você conecta portais numa área sob controle.',
      },
    },
  },
  en: {
    panelLabel: 'What each axis measures',
    panelHint: 'the explanation stays visible — no hover required',
    axes: {
      construcao: {
        title: 'Construction',
        body: 'Resonators deployed and mods installed: how much you build up and reinforce portals from scratch.',
      },
      destruicao: {
        title: 'Destruction',
        body: "Resonators destroyed and portals neutralized: how much you tear down the opposing side's infrastructure.",
      },
      exploracao: {
        title: 'Exploration',
        body: 'Unique portals visited, distance walked, and missions completed: how much you physically move through the real world.',
      },
      hacking: {
        title: 'Hacking',
        body: 'Hacks and glyph points: how much you interact directly with portals to pull items and run glyph sequences.',
      },
      linksCampos: {
        title: 'Links and fields',
        body: 'Links created, control fields, and Mind Units captured: how much you tie portals together into controlled area.',
      },
    },
  },
} as const

/**
 * Texto fixo abaixo do radar explicando cada um dos 5 eixos (ISTATS-02) — não
 * depende de nenhum estado de comparação, é sempre o mesmo texto para todo
 * visitante. Client leaf só por causa do `useLang()` (nenhum evento, nenhum
 * efeito).
 */
export default function AxisExplanations() {
  const {lang} = useLang()
  const t = translations[lang]

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      <dl className="ing-axis-explanations">
        {RADAR_AXES.map((axis) => {
          const entry = t.axes[axis.id as AxisId]
          return (
            <div key={axis.id} className="ing-axis-explanations__item">
              <dt>{entry.title}</dt>
              <dd>{entry.body}</dd>
            </div>
          )
        })}
      </dl>
    </Panel>
  )
}
