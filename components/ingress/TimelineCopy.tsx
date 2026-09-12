'use client'

import {useLang} from '@/context/LanguageContext'
import Panel from './Panel'

const T = {
  pt: {
    heading: 'Linha do tempo',
    withData: (count: number, from: number, to: number) =>
      `${count} conquistas entre ${from} e ${to}. Passe o mouse nos pontos para ver a arte da medalha e o intervalo desde o tier anterior, filtre por categoria ou tier, e arraste na curva para dar zoom num período.`,
    empty: 'A linha do tempo aparece conforme as datas de conquista são registradas.',
    notEnough: 'Ainda não há datas de conquista suficientes.',
  },
  en: {
    heading: 'Timeline',
    withData: (count: number, from: number, to: number) =>
      `${count} achievements between ${from} and ${to}. Hover the dots to see the medal art and the gap since the previous tier, filter by category or tier, and drag on the curve to zoom into a period.`,
    empty: 'The timeline appears as achievement dates get recorded.',
    notEnough: 'Not enough achievement dates yet.',
  },
}

/**
 * h1 + parágrafo-template de `/ingress/linha-do-tempo`. Leaf client próprio
 * (ISTATS-19): a página é Server Component (usa `loadProfile`/`loadCatalog`,
 * dependentes de `node:fs`), então o texto bilíngue nasce aqui.
 */
export function TimelineIntro({count, years}: {count: number; years: [number, number] | null}) {
  const {lang} = useLang()
  const t = T[lang]
  return (
    <header className="ing-tl-hero">
      <h1>{t.heading}</h1>
      <p>{count > 0 && years ? t.withData(count, years[0], years[1]) : t.empty}</p>
    </header>
  )
}

/** Estado vazio quando há menos de 2 conquistas — mesmo `Panel.label` do h1 acima. */
export function TimelinePlaceholder() {
  const {lang} = useLang()
  const t = T[lang]
  return (
    <Panel label={t.heading}>
      <p className="ing-pending">
        <span className="ing-pending__dot" aria-hidden="true" />
        {t.notEnough}
      </p>
    </Panel>
  )
}
