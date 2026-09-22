'use client'

import {useEffect} from 'react'
import {LanguageProvider, useLang} from '@/components/global/LanguageContext'
import {resolveIngressLang} from '@/lib/ingress/ingress-lang.mjs'
import {getSitePrefs} from '@/lib/global/use-site-preferences'

/**
 * Filho de render nulo que roda UMA vez após a hidratação e troca o idioma se a
 * regra de `lib/ingress/ingress-lang.mjs` disser que não é EN. Precisa ser efeito, e não
 * `useState(() => ...)`: o servidor renderiza sem `localStorage`/`navigator`, e
 * um estado inicial diferente entre servidor e cliente quebraria a hidratação.
 * Trade-off deliberado frente a detectar no servidor (`cookies()`/`headers()`):
 * quem tem PT vê um flash EN→PT na primeira carga completa; em troca o HTML
 * estático do `/ingress` sai em EN (o que bots de preview veem) e o ISR de
 * `fencherlc` (`revalidate = 300`) continua valendo — ler cookie/header no
 * layout tornaria a subárvore inteira dinâmica.
 */
function IngressLangDetector() {
  const {setLang} = useLang()

  useEffect(() => {
    // `null` = o visitante nunca escolheu (ou o storage está bloqueado): vale o idioma do navegador.
    const stored = getSitePrefs().ingress.lang as string | null
    const resolved = resolveIngressLang(stored, navigator.languages?.length ? navigator.languages : [navigator.language])
    if (resolved !== 'en') setLang(resolved)
  }, [setLang])

  return null
}

/**
 * Sobrescreve o `LanguageProvider` da raiz só na subárvore `/ingress` (o
 * contexto mais próximo vence), abrindo em EN. O resto do site continua em PT.
 * Casca fina: o conteúdo entra por `children` e segue Server Component.
 */
export default function IngressLanguageProvider({children}: {children: React.ReactNode}) {
  return (
    <LanguageProvider initialLang="en">
      <IngressLangDetector />
      {children}
    </LanguageProvider>
  )
}
