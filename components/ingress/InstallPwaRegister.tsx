'use client'

import {useEffect} from 'react'

// Componente-folha só pra registrar o service worker do PWA isolado de
// /ingress — navigator.serviceWorker é API de browser, por isso precisa de
// client, mas fica restrito a este arquivo em vez de subir pro layout.
export default function InstallPwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/ingress-sw.js', {scope: '/ingress/'}).catch(() => {})
  }, [])

  return null
}
