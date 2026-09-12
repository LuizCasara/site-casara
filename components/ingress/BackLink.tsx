'use client'

import {useRouter} from 'next/navigation'
import type {ReactNode} from 'react'
import {useLang} from '@/context/LanguageContext'

const T = {
  pt: {label: '← Perfil de FencherLC'},
  en: {label: '← FencherLC profile'},
}

/**
 * "Voltar" que preserva a posição de rolagem: usa `router.back()` quando há
 * histórico (o App Router restaura o scroll no back), e só cai no `fallback`
 * quando a página de detalhe foi aberta direto por link. Leaf client.
 *
 * `children` é opcional (ISTATS-19): as duas páginas Server que usam este
 * componente (`linha-do-tempo`, `medalha/[slug]`) não sabem o idioma ativo no
 * toggle client, então quando `children` é omitido o próprio `BackLink`
 * escolhe o rótulo bilíngue via `useLang()`. Continua aceitando `children`
 * explícito por compatibilidade, caso um futuro call site precise de outro
 * texto.
 */
export default function BackLink({fallback, children}: {fallback: string; children?: ReactNode}) {
  const router = useRouter()
  const {lang} = useLang()
  return (
    <button
      type="button"
      className="ing-back"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else router.push(fallback)
      }}
    >
      {children ?? T[lang].label}
    </button>
  )
}
