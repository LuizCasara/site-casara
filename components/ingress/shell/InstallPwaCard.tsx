'use client'

import {useEffect, useState} from 'react'
import {FaMobileScreenButton} from 'react-icons/fa6'
import {useLang} from '@/components/global/LanguageContext'

// Evento não padronizado no lib.dom.d.ts do TS (só Chromium o dispara).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>
}

const T = {
  pt: {
    title: 'Instale como app',
    body: 'Atalho na tela inicial do celular, com ícone próprio e sem a barra do navegador.',
    button: 'Instalar',
    iosBody: 'No Safari: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
  },
  en: {
    title: 'Install as an app',
    body: "Home screen shortcut with its own icon, no browser bar.",
    button: 'Install',
    iosBody: 'In Safari: tap Share, then "Add to Home Screen".',
  },
} as const

function isIos() {
  return typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & {standalone?: boolean}
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/**
 * Card só do hub `/ingress` (não das sub-rotas) que simplifica instalar o PWA
 * isolado desta seção (ver app/(ingress)/ingress/manifest.webmanifest/route.ts). No
 * Android/Chrome intercepta o `beforeinstallprompt` e dispara o prompt nativo
 * num clique; no iOS Safari não existe esse evento, então só mostra o passo a
 * passo manual (Compartilhar → Adicionar à Tela de Início). Se já estiver
 * instalado (`display-mode: standalone`) ou o browser não suportar nenhum dos
 * dois caminhos, o card não renderiza nada.
 */
export default function InstallPwaCard() {
  const {lang} = useLang()
  const t = T[lang]
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Começam `false` (= o que o servidor renderiza: card ausente) e são lidos no mount. Ler `window`/`navigator`
  // num inicializador de `useState` fazia a 1ª renderização do cliente diferir do HTML do servidor no iOS/standalone
  // (hydration mismatch). Se o app já roda em standalone ou o device é iOS não muda no meio da sessão.
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(isStandalone())
    setIos(isIos())

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (installed || (!deferredPrompt && !ios)) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="ing-hub__install">
      <FaMobileScreenButton aria-hidden="true" />
      <div className="ing-hub__install-text">
        <strong>{t.title}</strong>
        <span>{ios ? t.iosBody : t.body}</span>
      </div>
      {!ios && (
        <button type="button" className="ing-hub__install-btn" onClick={handleInstall}>
          {t.button}
        </button>
      )}
    </div>
  )
}
