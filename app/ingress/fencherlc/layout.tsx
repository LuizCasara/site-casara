import type {Metadata} from 'next'

const TITLE = 'FencherLC — Agente Ingress'
const DESCRIPTION =
  'O perfil de campo do agente FencherLC (Enlightened): estatísticas, medalhas e o padrão de jogo, direto do scanner.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: 'https://luizcasara.com/ingress/fencherlc',
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

export default function FencherlcLayout({children}: {children: React.ReactNode}) {
  return children
}
