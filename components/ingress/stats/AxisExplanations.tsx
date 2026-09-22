'use client'

import {Fragment} from 'react'
import Panel from '../shell/Panel'
import {useLang} from '@/components/global/LanguageContext'
import {RADAR_AXES, computeRadarAxes} from '@/lib/ingress/stats/ingress-radar.mjs'
import {ONYX_POSITION, POINTS_PER_POSITION} from '@/lib/ingress/stats/ingress-tier-position.mjs'
import {TIERS, tierLabel} from '@/lib/ingress/catalog/ingress-tiers.mjs'
import {fmtStat} from '@/lib/ingress/ingress-format.mjs'
import {artPath} from '@/lib/ingress/catalog/ingress-art.mjs'

type AxisId = 'construcao' | 'destruicao' | 'exploracao' | 'hacking' | 'linksCampos'
type Lang = 'pt' | 'en'

/**
 * Agente FICTÍCIO do exemplo — valores brutos (não posições), pra que cada
 * número da explicação saia da mesma função que calcula o ranking
 * (`computeRadarAxes`, espelho client-safe de `computeAxisScores`). Nada aqui é
 * digitado à mão: se a fórmula ou um limiar mudar, o exemplo muda junto.
 * Propositalmente tem um stat abaixo do Onyx (`linksCreated`) e um MUITO além
 * dele (`mindUnitsCaptured`, 150× Onyx) — o caso que motivou o log₂.
 */
const EXAMPLE_STATS: Record<string, number> = {
  resonatorsDeployed: 240000,
  modsDeployed: 30000,
  resonatorsDestroyed: 120000,
  portalsNeutralized: 9000,
  uniquePortalsVisited: 45000,
  distanceWalkedKm: 1800,
  uniqueMissionsCompleted: 620,
  hacks: 260000,
  glyphHackPoints: 21000,
  linksCreated: 23500,
  controlFieldsCreated: 24275,
  mindUnitsCaptured: 600000000,
}
const EXAMPLE_BELOW_KEY = 'linksCreated' // ilustra o trecho linear (abaixo do Onyx)
const EXAMPLE_BEYOND_KEY = 'mindUnitsCaptured' // ilustra o trecho log₂ (além do Onyx)

/** Múltiplos do Onyx da tabelinha "cada dobra = +1". */
const DOUBLINGS = [1, 2, 4, 8, 16, 64, 256]

/** Número com casas fixas no idioma corrente (pt-BR usa vírgula decimal). */
const num = (n: number, lang: Lang, digits = 2) =>
  n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits})
/** Inteiro com separador de milhar (o `fmtStat` do projeto é pt-BR; em `en` usa vírgula). */
const int = (n: number, lang: Lang) => (lang === 'pt' ? fmtStat(n) : n.toLocaleString('en-US'))

type ExampleAxis = {id: string; label: string; position: number; tooltip: string}

/**
 * Monta o exemplo inteiro a partir de `EXAMPLE_STATS`: os 5 eixos (posição +
 * tooltip com a soma), o resultado final, e os dois "passo a passo" de um stat
 * abaixo e de um stat além do Onyx, com a aritmética escrita por extenso.
 */
function buildExample(lang: Lang) {
  const computed = computeRadarAxes(EXAMPLE_STATS)
  const partOf = (key: string) => {
    for (const axis of computed) {
      const part = axis.parts.find((p) => p.key === key)
      if (part) return part
    }
    throw new Error(`AxisExplanations: stat "${key}" fora do radar`)
  }
  const defOf = (key: string) => {
    for (const axis of RADAR_AXES) {
      const part = axis.parts.find((p) => p.key === key)
      if (part) return part
    }
    throw new Error(`AxisExplanations: stat "${key}" fora do radar`)
  }

  const axes: ExampleAxis[] = computed.map((axis) => {
    const breakdown = axis.parts.map((p) => num(p.position, lang)).join(' + ')
    return {
      id: axis.id,
      label: lang === 'en' ? axis.labelEn : axis.label,
      position: axis.position,
      tooltip: `(${breakdown}) ÷ ${axis.parts.length} = ${num(axis.position, lang)}`,
    }
  })
  const avg = axes.reduce((sum, a) => sum + a.position, 0) / axes.length
  const result = Math.round(avg * POINTS_PER_POSITION)
  const resultTooltip = `(${axes.map((a) => num(a.position, lang)).join(' + ')}) ÷ ${axes.length} × ${POINTS_PER_POSITION} = ${result}`

  // --- passo a passo: um stat abaixo do Onyx (linear) ---
  const below = partOf(EXAMPLE_BELOW_KEY)
  const belowTiers = defOf(EXAMPLE_BELOW_KEY).tiers as number[]
  let reached = 0
  belowTiers.forEach((limit, i) => {
    if (below.value >= limit) reached = i + 1
  })
  const prev = reached === 0 ? 0 : belowTiers[reached - 1]
  const next = belowTiers[reached]
  const prevName = reached === 0 ? '0' : tierLabel(TIERS[reached - 1], lang)
  const nextName = tierLabel(TIERS[reached], lang)
  const belowLabel = lang === 'en' ? below.labelEn : below.label
  const belowStep = {
    intro:
      lang === 'pt'
        ? `${belowLabel}: ${int(below.value, lang)} fica entre ${prevName} (${int(prev, lang)}) e ${nextName} (${int(next, lang)}) — trecho linear:`
        : `${belowLabel}: ${int(below.value, lang)} sits between ${prevName} (${int(prev, lang)}) and ${nextName} (${int(next, lang)}) — the linear stretch:`,
    formula: `${lang === 'pt' ? 'posição' : 'position'} = ${reached} + (${int(below.value, lang)} − ${int(prev, lang)}) ÷ (${int(next, lang)} − ${int(prev, lang)}) = ${num(below.position, lang)}`,
  }

  // --- passo a passo: um stat além do Onyx (log₂) ---
  const beyond = partOf(EXAMPLE_BEYOND_KEY)
  const beyondLabel = lang === 'en' ? beyond.labelEn : beyond.label
  const log2 = Math.log2(beyond.ratio)
  const linearOld = ONYX_POSITION - 1 + beyond.ratio // a escala linear antiga: ×N = 5 + (N − 1)
  const beyondStep = {
    intro:
      lang === 'pt'
        ? `${beyondLabel}: ${int(beyond.value, lang)} ÷ ${int(beyond.ref, lang)} (Onyx) = ${num(beyond.ratio, lang, 0)}× o Onyx — trecho logarítmico:`
        : `${beyondLabel}: ${int(beyond.value, lang)} ÷ ${int(beyond.ref, lang)} (Onyx) = ${num(beyond.ratio, lang, 0)}× Onyx — the logarithmic stretch:`,
    formula: `${lang === 'pt' ? 'posição' : 'position'} = ${ONYX_POSITION} + log₂(${num(beyond.ratio, lang, 0)}) = ${ONYX_POSITION} + ${num(log2, lang)} = ${num(beyond.position, lang)}`,
    old:
      lang === 'pt'
        ? `Na escala linear antiga esse mesmo stat valeria ${num(linearOld, lang, 0)} posições — mais que todo o resto do jogo somado.`
        : `On the old linear scale this same stat would be worth ${num(linearOld, lang, 0)} positions — more than the rest of the game combined.`,
  }

  // --- o eixo que contém os dois, com as contas ---
  const axisOfBeyond = computed.find((a) => a.parts.some((p) => p.key === EXAMPLE_BEYOND_KEY))!
  const axisStep = {
    label: lang === 'en' ? axisOfBeyond.labelEn : axisOfBeyond.label,
    formula: `(${axisOfBeyond.parts.map((p) => num(p.position, lang)).join(' + ')}) ÷ ${axisOfBeyond.parts.length} = ${num(axisOfBeyond.position, lang)}  →  × ${POINTS_PER_POSITION} = ${num(axisOfBeyond.score, lang, 1)}`,
  }

  return {axes, result, resultTooltip, belowStep, beyondStep, axisStep}
}

const translations = {
  pt: {
    panelLabel: 'O que cada eixo mede',
    formulaTitle: 'Como a nota geral é calculada',
    formulaIntro:
      'Cada eixo reúne 2 ou 3 stats (os mesmos que dão medalha, mais "portais neutralizados", que usa 1/8 dos limiares do Purifier por não ter medalha própria). Cada stat vira uma "posição de tier" contínua: 0 é o piso, 1 é Bronze, 2 Silver, 3 Gold, 4 Platinum e 5 Onyx.',
    ruleBelow: 'Até o Onyx: linear entre um limiar e o próximo — na metade do caminho entre Gold e Platinum a posição é 3,5.',
    ruleBeyond: 'A partir do Onyx: posição = 5 + log₂(valor ÷ Onyx). Cada vez que o valor DOBRA em relação ao Onyx, a posição sobe exatamente 1.',
    formulaAxis: 'A nota do eixo é a média simples das posições dos seus stats.',
    formulaOverall:
      'A nota geral é a média das 5 notas de eixo multiplicada por 20: com todos os eixos exatamente em Onyx (posição 5) a nota fecha em 100, e ela passa de 100 quando algum stat vai além.',
    doublingsLabel: 'Onyx ×N → posição',
    decisionTitle: 'Por que logarítmica depois do Onyx?',
    decisionBody: [
      'Antes, além do Onyx a posição crescia em linha reta: ×2 = 6, ×3 = 7, ×148 = 152. Um único stat com centenas de vezes o Onyx — na prática Mind Units, cujo Onyx é de apenas 4 milhões — valia mais que todo o resto do jogo somado e decidia sozinho o ranking: o agente com mais MU ficava na frente mesmo perdendo nos outros eixos.',
      'Agora cada dobra vale o mesmo. Dobrar de 4 M para 8 M de MU rende o mesmo +1 que dobrar de 300 M para 600 M. O stat continua sempre somando (mais nunca é pior), só que nenhuma medalha isolada consegue mais definir a nota. Em ×1 e ×2 o resultado é idêntico ao da escala antiga; a diferença aparece de ×3 em diante.',
    ],
    exampleTitle: 'Um exemplo, com a fórmula real',
    exampleIntro:
      'Um agente fictício. Cada número abaixo sai da mesma função que calcula o ranking — não é digitado à mão:',
    stepBelowTitle: '1. Um stat abaixo do Onyx',
    stepBeyondTitle: '2. Um stat muito além do Onyx',
    stepAxisTitle: '3. A nota do eixo',
    stepOverallTitle: '4. A nota geral',
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
    formulaIntro:
      'Each axis groups 2 or 3 stats (the same ones behind each badge, plus "portals neutralized", which uses 1/8 of the Purifier thresholds since it has no badge of its own). Each stat becomes a continuous "tier position": 0 is the floor, 1 is Bronze, 2 Silver, 3 Gold, 4 Platinum and 5 Onyx.',
    ruleBelow: 'Up to Onyx: linear between one threshold and the next — halfway between Gold and Platinum the position is 3.5.',
    ruleBeyond: 'From Onyx on: position = 5 + log₂(value ÷ Onyx). Every time the value DOUBLES relative to Onyx, the position climbs exactly 1.',
    formulaAxis: "The axis score is the plain average of its stats' positions.",
    formulaOverall:
      'The overall score is the average of the 5 axis scores multiplied by 20: with every axis exactly at Onyx (position 5) it lands at 100, and it goes past 100 when any stat goes beyond.',
    doublingsLabel: 'Onyx ×N → position',
    decisionTitle: 'Why logarithmic past Onyx?',
    decisionBody: [
      'Before, past Onyx the position grew in a straight line: ×2 = 6, ×3 = 7, ×148 = 152. A single stat at hundreds of times Onyx — in practice Mind Units, whose Onyx is only 4 million — was worth more than the rest of the game combined and decided the ranking on its own: the agent with the most MU came out ahead even while losing on every other axis.',
      'Now every doubling is worth the same. Going from 4 M to 8 M MU earns the same +1 as going from 300 M to 600 M. The stat still always counts (more is never worse), but no single badge can decide the score anymore. At ×1 and ×2 the result is identical to the old scale; the difference shows from ×3 onward.',
    ],
    exampleTitle: 'A worked example, with the real formula',
    exampleIntro:
      'A fictional agent. Every number below comes out of the same function that computes the ranking — none of it is typed by hand:',
    stepBelowTitle: '1. A stat below Onyx',
    stepBeyondTitle: '2. A stat far beyond Onyx',
    stepAxisTitle: '3. The axis score',
    stepOverallTitle: '4. The overall score',
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
          <p className="ing-axis-explanations__formula-text">{t.formulaIntro}</p>
          <ul className="ing-axis-explanations__rules">
            <li>{t.ruleBelow}</li>
            <li>{t.ruleBeyond}</li>
          </ul>
          <div className="ing-axis-explanations__doublings" aria-label={t.doublingsLabel}>
            <span className="ing-axis-explanations__doublings-label">{t.doublingsLabel}</span>
            {DOUBLINGS.map((m) => (
              <span key={m} className="ing-axis-explanations__doubling">
                <b>×{m}</b> = {num(ONYX_POSITION + Math.log2(m), lang, 0)}
              </span>
            ))}
          </div>
          <p className="ing-axis-explanations__formula-text">{t.formulaAxis}</p>
          <p className="ing-axis-explanations__formula-text">{t.formulaOverall}</p>

          <p className="ing-axis-explanations__example-title">{t.decisionTitle}</p>
          {t.decisionBody.map((paragraph, i) => (
            <p key={i} className="ing-axis-explanations__formula-text">
              {paragraph}
            </p>
          ))}

          <p className="ing-axis-explanations__example-title">{t.exampleTitle}</p>
          <p className="ing-axis-explanations__example-intro">{t.exampleIntro}</p>
          <ol className="ing-axis-explanations__steps">
            <li>
              <span className="ing-axis-explanations__step-title">{t.stepBelowTitle}</span>
              <span className="ing-axis-explanations__step-text">{example.belowStep.intro}</span>
              <code className="ing-axis-explanations__step-formula">{example.belowStep.formula}</code>
            </li>
            <li>
              <span className="ing-axis-explanations__step-title">{t.stepBeyondTitle}</span>
              <span className="ing-axis-explanations__step-text">{example.beyondStep.intro}</span>
              <code className="ing-axis-explanations__step-formula">{example.beyondStep.formula}</code>
              <span className="ing-axis-explanations__step-note">{example.beyondStep.old}</span>
            </li>
            <li>
              <span className="ing-axis-explanations__step-title">{t.stepAxisTitle}</span>
              <span className="ing-axis-explanations__step-text">{example.axisStep.label}:</span>
              <code className="ing-axis-explanations__step-formula">{example.axisStep.formula}</code>
            </li>
            <li>
              <span className="ing-axis-explanations__step-title">{t.stepOverallTitle}</span>
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
                      <span className="ing-axis-explanations__example-axis-value">{num(axis.position, lang)}</span>
                    </span>
                  </Fragment>
                ))}
                <span className="ing-axis-explanations__example-op" aria-hidden="true">
                  ÷ 5 × {POINTS_PER_POSITION} =
                </span>
                <span className="ing-axis-explanations__example-result" title={example.resultTooltip}>
                  {example.result}
                </span>
              </div>
            </li>
          </ol>
          <p className="ing-axis-explanations__example-hint">{t.exampleHint}</p>
        </div>
      </details>
    </Panel>
  )
}
