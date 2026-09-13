'use client'

import type {PendingSection as PendingKind} from '@/lib/ingress'
import {useLang} from '@/context/LanguageContext'
import Panel from './Panel'

const COPY: Record<'pt' | 'en', Record<PendingKind, {label: string; text: string}>> = {
  pt: {
    apTimeline: {
      label: 'Evolução de AP',
      text: 'A curva de AP ao longo dos anos entra aqui quando o dump GDPR do agente for processado. O export atual do app é um retrato único, sem histórico.',
    },
    portalMap: {
      label: 'Mapa de portais',
      text: 'O mapa dos portais visitados e submetidos aparece aqui com o dump GDPR — são as coordenadas que o export do app não traz.',
    },
  },
  en: {
    apTimeline: {
      label: 'AP evolution',
      text: 'The AP curve over the years lands here once the agent\'s GDPR dump is processed. The current app export is a single snapshot, with no history.',
    },
    portalMap: {
      label: 'Portal map',
      text: 'The map of visited and submitted portals appears here with the GDPR dump — those are the coordinates the app export does not include.',
    },
  },
}

const HINT = {pt: 'aguardando dump GDPR', en: 'awaiting GDPR dump'}

/**
 * Placeholder de uma seção que depende do dump GDPR. A página decide, por
 * `profile.pending`, se renderiza isto ou a seção real. Client component
 * (ISTATS-19: `useLang()` bilingualiza o `COPY`).
 */
export default function PendingSection({kind}: {kind: PendingKind}) {
  const {lang} = useLang()
  const {label, text} = COPY[lang][kind]
  return (
    <Panel label={label} hint={HINT[lang]}>
      <p className="ing-pending">
        <span className="ing-pending__dot" aria-hidden="true" />
        {text}
      </p>
    </Panel>
  )
}
