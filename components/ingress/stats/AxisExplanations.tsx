'use client'

import {Fragment} from 'react'
import Panel from '../Panel'
import {useLang} from '@/context/LanguageContext'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'

type AxisId = 'construcao' | 'destruicao' | 'exploracao' | 'hacking' | 'linksCampos'

/**
 * Posições de tier fictícias (uma por stat do radar) só pra ilustrar a fórmula
 * com números em vez de letras — não vem de nenhum agente real. `exploracao`
 * usa de propósito uma parte > 5 (`uniquePortalsVisited: 6.0`) pra mostrar o
 * caso "estourou Onyx" descrito no parágrafo acima, na mesma seção.
 */
const EXAMPLE_PART_POSITIONS: Record<string, number> = {
  resonatorsDeployed: 4.6,
  modsDeployed: 3.8,
  resonatorsDestroyed: 3.4,
  portalsNeutralized: 2.6,
  uniquePortalsVisited: 6.0,
  distanceWalkedKm: 5.1,
  uniqueMissionsCompleted: 5.1,
  hacks: 3.2,
  glyphHackPoints: 2.6,
  linksCreated: 4.8,
  controlFieldsCreated: 4.5,
  mindUnitsCaptured: 4.2,
}

/** pt-BR usa vírgula decimal; en mantém o ponto. */
const fmt1 = (n: number, lang: 'pt' | 'en') => (lang === 'pt' ? n.toFixed(1).replace('.', ',') : n.toFixed(1))

/** Monta o exemplo (eixo a eixo + resultado final) a partir de `EXAMPLE_PART_POSITIONS`, já com os textos de tooltip prontos no idioma corrente. */
function buildExample(lang: 'pt' | 'en') {
  const axes = RADAR_AXES.map((axis) => {
    const parts = axis.parts.map((p) => ({
      label: lang === 'en' ? p.labelEn : p.label,
      position: EXAMPLE_PART_POSITIONS[p.key],
    }))
    const score = parts.reduce((sum, p) => sum + p.position, 0) / parts.length
    const breakdown = parts.map((p) => `${p.label}: ${fmt1(p.position, lang)}`).join(' + ')
    const tooltip = `${breakdown} ${lang === 'en' ? '→ average' : '→ média'} ${fmt1(score, lang)}`
    return {
      id: axis.id,
      label: lang === 'en' ? axis.labelEn : axis.label,
      score,
      tooltip,
    }
  })
  const avg = axes.reduce((sum, a) => sum + a.score, 0) / axes.length
  const result = Math.round(avg * 20)
  const resultTooltip = `(${axes.map((a) => fmt1(a.score, lang)).join(' + ')}) ÷ 5 × 20 = ${result}`
  return {axes, result, resultTooltip}
}

const translations = {
  pt: {
    panelLabel: 'O que cada eixo mede',
    formulaTitle: 'Como a nota geral é calculada',
    formulaBody: [
      'Cada eixo soma 2 ou 3 stats (os mesmos que dão badge, mais "portais neutralizados", que usa 1/8 dos limiares do Purifier por não ter badge própria). Para cada stat, o valor bruto vira uma "posição de tier" contínua: 0 é o piso, 1 é o limiar de Bronze, 2 de Silver, 3 de Gold, 4 de Platinum e 5 de Onyx, interpolando linearmente entre um limiar e o próximo — por isso a posição quase nunca é um número inteiro. Passar de Onyx não trava em 5: cada vez que o valor dobra o limiar de Onyx, a posição sobe mais 1 (Onyx×2 = posição 6, ×3 = posição 7, e assim por diante).',
      'A nota do eixo é a média simples das posições dos seus stats — por isso também pode passar de 5 se o agente estourar Onyx em alguma parte.',
      'A nota geral é a média das 5 notas de eixo, multiplicada por 20. Com todos os eixos exatamente em Onyx (posição 5), a média dá 5 e a nota fecha em 100; qualquer stat além do Onyx empurra o número acima de 100.',
    ],
    exampleTitle: 'Um exemplo, com números',
    exampleIntro: 'Um agente fictício, só pra ver a fórmula com números em vez de letras:',
    exampleHint: 'Passe o mouse nos números pra ver de onde cada um veio.',
    summary: 'Ver o que cada eixo mede e como a nota é calculada',
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
    formulaTitle: 'How the overall score is calculated',
    formulaBody: [
      "Each axis sums 2 or 3 stats (the same ones behind each badge, plus \"portals neutralized\", which uses 1/8 of the Purifier thresholds since it has no badge of its own). For each stat, the raw value becomes a continuous \"tier position\": 0 is the floor, 1 is the Bronze threshold, 2 is Silver, 3 is Gold, 4 is Platinum, and 5 is Onyx, interpolating linearly between one threshold and the next — which is why the position is almost never a whole number. Going past Onyx doesn't cap at 5: every time the value doubles the Onyx threshold, the position climbs another point (Onyx×2 = position 6, ×3 = position 7, and so on).",
      'The axis score is the plain average of its stats\' positions — which is also why it can exceed 5 if the agent blows past Onyx on any part of it.',
      "The overall score is the average of the 5 axis scores, multiplied by 20. With every axis sitting exactly at Onyx (position 5), the average is 5 and the score lands at 100; any stat beyond Onyx pushes the number past 100.",
    ],
    exampleTitle: 'A worked example, in numbers',
    exampleIntro: "A fictional agent, just to see the formula with numbers instead of letters:",
    exampleHint: 'Hover the numbers to see where each one comes from.',
    summary: 'See what each axis measures and how the score is calculated',
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
 * efeito). Cada eixo mostra os ícones (tier Onyx — não há um agente aqui pra
 * ancorar num tier real, é só a identidade visual da medalha) das partes que
 * o compõem; `portalsNeutralized` não tem badge própria, fica sem ícone.
 */
export default function AxisExplanations() {
  const {lang} = useLang()
  const t = translations[lang]
  const example = buildExample(lang)

  return (
    <Panel label={t.panelLabel}>
      {/*
        Fechado por padrão (sem `open`) — é texto de referência lido uma vez
        (pedido do Luiz: "vai ser usado 1 vez só"), não algo que precise
        ocupar espaço permanente no fim da página do ranking. `<details>`
        nativo em vez de estado em React: não tem nenhuma outra parte da
        página que precise saber se está aberto, então dispensa `useState`.
      */}
      <details className="ing-axis-explanations__details">
        <summary className="ing-axis-explanations__summary">{t.summary}</summary>
        <dl className="ing-axis-explanations">
          {RADAR_AXES.map((axis) => {
            const entry = t.axes[axis.id as AxisId]
            return (
              <div key={axis.id} className="ing-axis-explanations__item">
                <div className="ing-axis-explanations__icons" aria-hidden="true">
                  {axis.parts
                    .filter((part) => part.badge)
                    .map((part) => (
                      <img
                        key={part.key}
                        src={artPath(part.badge as string, 'onyx')}
                        alt=""
                        width={40}
                        height={40}
                        className="ing-axis-explanations__icon"
                      />
                    ))}
                </div>
                <dt>{entry.title}</dt>
                <dd>{entry.body}</dd>
              </div>
            )
          })}
        </dl>
        <div className="ing-axis-explanations__formula">
          <p className="ing-axis-explanations__formula-title">{t.formulaTitle}</p>
          {t.formulaBody.map((paragraph, i) => (
            <p key={i} className="ing-axis-explanations__formula-text">
              {paragraph}
            </p>
          ))}
          <p className="ing-axis-explanations__example-title">{t.exampleTitle}</p>
          <p className="ing-axis-explanations__example-intro">{t.exampleIntro}</p>
          <div className="ing-axis-explanations__example-row">
            {example.axes.map((axis, i) => (
              <Fragment key={axis.id}>
                {i > 0 && (
                  <span className="ing-axis-explanations__example-op" aria-hidden="true">
                    +
                  </span>
                )}
                <span className="ing-axis-explanations__example-axis" title={axis.tooltip}>
                  <span className="ing-axis-explanations__example-axis-label">{axis.label}</span>
                  <span className="ing-axis-explanations__example-axis-value">{fmt1(axis.score, lang)}</span>
                </span>
              </Fragment>
            ))}
            <span className="ing-axis-explanations__example-op" aria-hidden="true">
              ÷ 5 × 20 =
            </span>
            <span className="ing-axis-explanations__example-result" title={example.resultTooltip}>
              {example.result}
            </span>
          </div>
          <p className="ing-axis-explanations__example-hint">{t.exampleHint}</p>
        </div>
      </details>
    </Panel>
  )
}
