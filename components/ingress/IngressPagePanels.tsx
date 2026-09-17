'use client'

import {useLang} from '@/context/LanguageContext'
import Panel from './Panel'

const T = {
  pt: {
    signalLostLabel: 'Sinal perdido',
    signalLostMessage: 'O perfil do agente ainda não foi publicado. Volte em breve.',
    portalsLabel: 'Portais',
    portalsHint: (visited: number, submitted: number) => `${visited} visitados · ${submitted} submetidos`,
    heatmapParagraph:
      'O mapa de calor desses portais é o próximo passo — por ora, os números vêm do dump GDPR.',
  },
  en: {
    signalLostLabel: 'Signal lost',
    signalLostMessage: "The agent's profile hasn't been published yet. Check back soon.",
    portalsLabel: 'Portals',
    portalsHint: (visited: number, submitted: number) => `${visited} visited · ${submitted} submitted`,
    heatmapParagraph:
      "The heat map for these portals is next up — for now, the numbers come from the GDPR dump.",
  },
}

/**
 * Estado vazio de `/ingress/fencherlc` quando `loadProfile()` retorna `null`.
 * Componente client próprio (ISTATS-19): `app/ingress/fencherlc/page.tsx` é
 * Server Component (usa `medalArt`/`slugForStatKey`, dependentes de
 * `node:fs`, em outras funções do mesmo arquivo — não pode virar client
 * inteiro), e `Panel.label`/`hint` são `string` simples, então o texto
 * bilíngue precisa nascer aqui, num leaf.
 */
export function EmptySignalPanel() {
  const {lang} = useLang()
  const t = T[lang]
  return (
    <Panel label={t.signalLostLabel}>
      <p style={{color: 'var(--ing-text-dim)'}}>{t.signalLostMessage}</p>
    </Panel>
  )
}

/**
 * Painel "Portais" com o parágrafo de mapa de calor — mesmo motivo de ser um
 * leaf client separado que `EmptySignalPanel` acima. Recebe as contagens já
 * computadas pelo Server Component pai.
 */
export function PortalsPanel({visited, submitted}: {visited: number; submitted: number}) {
  const {lang} = useLang()
  const t = T[lang]
  return (
    <Panel label={t.portalsLabel} hint={t.portalsHint(visited, submitted)}>
      <p className="ing-pending">
        <span className="ing-pending__dot" aria-hidden="true" />
        {t.heatmapParagraph}
      </p>
    </Panel>
  )
}
