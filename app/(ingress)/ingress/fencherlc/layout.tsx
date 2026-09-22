import type {Metadata} from 'next'

// Metadata em EN de propósito — ver o comentário em `app/(ingress)/ingress/layout.tsx`.
const TITLE = 'FencherLC — Ingress Agent'
const DESCRIPTION =
  "Field profile of agent FencherLC (Enlightened): stats, medals and play style, straight from the scanner."

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
