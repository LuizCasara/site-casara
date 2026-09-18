import type {Metadata, Viewport} from 'next'
import {Sora, Barlow} from 'next/font/google'
import {Toaster} from 'sonner'
import IngressTopBar from '@/components/ingress/stats/IngressTopBar'
import IngressFooter from '@/components/ingress/IngressFooter'
import InstallPwaRegister from '@/components/ingress/InstallPwaRegister'
import './theme.css'

// Display / números / codinome — geométrica moderna, o registro do Ingress Prime.
const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ingress-display',
  display: 'swap',
})

// Corpo — grotesca humanista, contraste claro com a Sora.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ingress-body',
  display: 'swap',
})

// Metadata genérica do hub `/ingress` — cada sub-rota (`fencherlc/`, `ranking/`)
// já define a própria (ver `fencherlc/layout.tsx` e `ranking/page.tsx`); este
// bloco só vale pra própria página do hub, que não tem layout próprio.
const TITLE = 'Ingress — Luiz Casara'
const DESCRIPTION = 'Hub de Ingress: perfil de agente, ranking de agentes e links úteis do jogo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // `icons` não herda por merge no Next (o ancestral mais próximo que declarar
  // vence pra toda a subárvore) — declarado aqui, uma vez, cobre o hub e todas
  // as sub-rotas (`fencherlc`, `ranking`, `medalha`, `linha-do-tempo`), que não
  // redeclaram o próprio. Explícito em vez de só a convenção de arquivo
  // (`icon.png` neste mesmo diretório) porque, testado nesta versão do Next,
  // a convenção de arquivo não vence sozinha quando a raiz já declara `icons`
  // como campo — os dois lados como campo explícito é o caminho que funciona.
  icons: {
    icon: [
      {url: '/ingress/icon.png', type: 'image/png', sizes: '256x256'},
      {url: '/ingress/pwa/icon.svg', type: 'image/svg+xml'},
    ],
    apple: [{url: '/ingress/pwa/apple-touch-icon.png', type: 'image/png', sizes: '180x180'}],
  },
  // PWA isolado (ver app/ingress/manifest.webmanifest/route.ts — `manifest.ts`,
  // a convenção de arquivo do Next, só é reconhecida na raiz de `app/`, então
  // esta é uma Route Handler manual): scope/start_url ali cobrem Android;
  // `appleWebApp` é o que faz o iOS abrir em modo standalone (o Safari não usa
  // o manifest pra decidir isso).
  manifest: '/ingress/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ingress',
  },
  openGraph: {
    type: 'website',
    url: 'https://luizcasara.com/ingress',
    siteName: 'Luiz Casara',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0f14',
}

export default function IngressLayout({children}: {children: React.ReactNode}) {
  return (
    <div className={`${sora.variable} ${barlow.variable} ingress-prime`}>
      <InstallPwaRegister />
      <IngressTopBar />
      {children}
      <IngressFooter />
      <Toaster />
    </div>
  )
}
