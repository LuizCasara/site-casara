import type {PendingSection as PendingKind} from '@/lib/ingress'
import Panel from './Panel'

const COPY: Record<PendingKind, {label: string; text: string}> = {
  apTimeline: {
    label: 'Evolução de AP',
    text: 'A curva de AP ao longo dos anos entra aqui quando o dump GDPR do agente for processado. O export atual do app é um retrato único, sem histórico.',
  },
  portalMap: {
    label: 'Mapa de portais',
    text: 'O mapa dos portais visitados e submetidos aparece aqui com o dump GDPR — são as coordenadas que o export do app não traz.',
  },
}

/**
 * Placeholder de uma seção que depende do dump GDPR. A página decide, por
 * `profile.pending`, se renderiza isto ou a seção real. Server component.
 */
export default function PendingSection({kind}: {kind: PendingKind}) {
  const {label, text} = COPY[kind]
  return (
    <Panel label={label} hint="aguardando dump GDPR">
      <p className="ing-pending">
        <span className="ing-pending__dot" aria-hidden="true" />
        {text}
      </p>
    </Panel>
  )
}
