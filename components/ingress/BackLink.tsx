'use client'

import {useRouter} from 'next/navigation'
import type {ReactNode} from 'react'

/**
 * "Voltar" que preserva a posição de rolagem: usa `router.back()` quando há
 * histórico (o App Router restaura o scroll no back), e só cai no `fallback`
 * quando a página de detalhe foi aberta direto por link. Leaf client.
 */
export default function BackLink({fallback, children}: {fallback: string; children: ReactNode}) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="ing-back"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else router.push(fallback)
      }}
    >
      {children}
    </button>
  )
}
