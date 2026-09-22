'use client'

import {useRouter} from 'next/navigation'
import type {ReactNode} from 'react'
import {useLang} from '@/components/global/LanguageContext'

const T = {
  pt: {label: '← Ingress Hub'},
  en: {label: '← Ingress Hub'},
}

/**
 * "Voltar" que preserva a posição de rolagem: usa `router.back()` quando há
 * histórico (o App Router restaura o scroll no back), e só cai no `fallback`
 * quando a página foi aberta direto por link. Leaf client.
 *
 * `children` é opcional (ISTATS-19): as páginas Server que usam este
 * componente (`fencherlc`, `linha-do-tempo`, `medalha/[slug]`, `ranking`) não
 * sabem o idioma ativo no toggle client, então quando `children` é omitido o
 * próprio `BackLink` escolhe o rótulo bilíngue via `useLang()`. `fallback` é
 * sempre `/ingress` (o hub) nos quatro call sites — o rótulo já anuncia isso.
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
