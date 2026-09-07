import type {Metadata} from 'next'
import {Sora, Barlow} from 'next/font/google'
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

const TITLE = 'FencherLC — Agente Ingress'
const DESCRIPTION =
  'O perfil de campo do agente FencherLC (Enlightened): estatísticas, medalhas e o padrão de jogo, direto do scanner.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

export default function IngressLayout({children}: {children: React.ReactNode}) {
  return (
    <div className={`${sora.variable} ${barlow.variable} ingress-prime`}>{children}</div>
  )
}
