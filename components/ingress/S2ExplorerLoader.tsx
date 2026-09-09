'use client'

import {Component, useState, type ReactNode} from 'react'
import dynamic from 'next/dynamic'

const S2Explorer = dynamic(() => import('./S2Explorer'), {
  ssr: false,
  loading: () => <p className="ing-s2__soon">Carregando o mapa…</p>,
})

/** Se o Leaflet quebrar na montagem, cai numa mensagem em vez de derrubar a página. */
class MapErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false}
  static getDerivedStateFromError() {
    return {failed: true}
  }
  render() {
    if (this.state.failed) {
      return <p className="ing-s2__soon">Mapa indisponível agora. Tente recarregar a página.</p>
    }
    return this.props.children
  }
}

/**
 * O gatilho "tocar para explorar" — único ponto client do par S2Preview/Loader.
 * Fechado: só o botão sobre o preview estático. Aberto: monta o mapa Leaflet
 * (`dynamic`, `ssr:false`), sob um error boundary.
 */
export default function S2ExplorerLoader({
  center,
  level,
}: {
  center: {lat: number; lng: number}
  level: number
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className="ing-s2__cta" onClick={() => setOpen(true)}>
        Tocar para explorar as células
      </button>
    )
  }

  return (
    <div className="ing-s2__mount">
      <MapErrorBoundary>
        <S2Explorer center={center} level={level} />
      </MapErrorBoundary>
    </div>
  )
}
