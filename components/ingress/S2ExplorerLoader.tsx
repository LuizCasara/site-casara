'use client'

import {useState} from 'react'

/**
 * O gatilho "tocar para explorar" — único ponto client do par S2Preview/Loader.
 * Enquanto fechado, mostra só o botão sobre o preview estático. Ao abrir, cede
 * espaço para o mapa interativo (ligado em T17). `center`/`level` passam adiante.
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
      <p className="ing-s2__soon">
        Mapa interativo em breve — centro {center.lat.toFixed(4)}, {center.lng.toFixed(4)} · nível{' '}
        {level}
      </p>
    </div>
  )
}
