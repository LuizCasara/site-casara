'use client'

import {Component, useState, type ReactNode} from 'react'
import dynamic from 'next/dynamic'
import {useLang} from '@/components/global/LanguageContext'

const T = {
  pt: {
    loading: 'Carregando o mapa…',
    unavailable: 'Mapa indisponível agora. Tente recarregar a página.',
    cta: 'Tocar para explorar as células',
  },
  en: {
    loading: 'Loading the map…',
    unavailable: 'Map unavailable right now. Try reloading the page.',
    cta: 'Tap to explore the cells',
  },
}

/** Texto do fallback de `dynamic()` — função própria porque `loading` é
 * renderizado como componente pelo Next, e aqui dentro `useLang()` funciona
 * normalmente (hook de componente de função, não do arquivo). */
function LoadingText() {
  const {lang} = useLang()
  return <p className="ing-s2__soon">{T[lang].loading}</p>
}

const S2Explorer = dynamic(() => import('./S2Explorer'), {
  ssr: false,
  loading: () => <LoadingText />,
})

/** Texto do fallback de erro — componente de função separado porque
 * `MapErrorBoundary` é uma classe e não pode chamar `useLang()` (hook)
 * direto no `render()`. */
function MapUnavailableText() {
  const {lang} = useLang()
  return <p className="ing-s2__soon">{T[lang].unavailable}</p>
}

/** Se o Leaflet quebrar na montagem, cai numa mensagem em vez de derrubar a página. */
class MapErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false}
  static getDerivedStateFromError() {
    return {failed: true}
  }
  render() {
    if (this.state.failed) {
      return <MapUnavailableText />
    }
    return this.props.children
  }
}

/**
 * O gatilho "tocar para explorar" — único ponto client do par S2Preview/Loader.
 * Fechado: só o botão sobre o preview estático. Aberto: monta o mapa Leaflet
 * (`dynamic`, `ssr:false`), sob um error boundary. Bilíngue (ISTATS-19) via
 * `useLang()` nos 3 textos (CTA, loading, erro).
 */
export default function S2ExplorerLoader({
  center,
  level,
}: {
  center: {lat: number; lng: number}
  level: number
}) {
  const [open, setOpen] = useState(false)
  const {lang} = useLang()

  if (!open) {
    return (
      <button type="button" className="ing-s2__cta" onClick={() => setOpen(true)}>
        {T[lang].cta}
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
