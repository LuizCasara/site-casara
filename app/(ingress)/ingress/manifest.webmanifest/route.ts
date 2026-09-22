import {NextResponse} from 'next/server'

// `manifest.ts` (a convenção especial do App Router) só é reconhecida na
// raiz de `app/` — testado nesta versão do Next, confirma a doc em
// node_modules/next/dist/docs/.../metadata/manifest.md ("root of app
// directory"). Um manifest isolado por rota, então, precisa ser uma Route
// Handler comum servindo o JSON com o content-type certo.
export function GET() {
  return NextResponse.json(
    {
      name: 'Ingress — Luiz Casara',
      short_name: 'Ingress',
      description: 'Perfil de agente, ranking e estatísticas de Ingress.',
      start_url: '/ingress',
      // Sem barra final: o hub é `/ingress` (o Next redireciona `/ingress/` -> `/ingress`), então um escopo
      // `/ingress/` deixava o próprio `start_url` fora do escopo.
      scope: '/ingress',
      display: 'standalone',
      background_color: '#0b0f14',
      theme_color: '#0b0f14',
      icons: [
        {src: '/ingress/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
        {src: '/ingress/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
        {
          src: '/ingress/pwa/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    {headers: {'Content-Type': 'application/manifest+json'}},
  )
}
