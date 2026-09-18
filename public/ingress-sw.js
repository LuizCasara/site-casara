// Service worker mínimo, só para satisfazer o critério de instalabilidade do
// Chrome/Android (exige um SW com fetch handler registrado) — não implementa
// cache offline de verdade. Escopo fica restrito a /ingress/ no register().
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
