import type {ReactNode} from 'react'

/**
 * Moldura de seção da direção "Scanner": painel de carvão com um fio que brilha
 * e cantos recortados em triângulo (o motivo do campo de controle). Server
 * component. Estilos em `app/ingress/theme.css` (`.ing-panel*`).
 */
export default function Panel({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="ing-panel">
      <header className="ing-panel__head">
        <h2 className="ing-panel__label">{label}</h2>
        {hint ? <span className="ing-panel__hint">{hint}</span> : null}
      </header>
      <div>{children}</div>
    </section>
  )
}
