import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Luiz & Kátia — 17.10.2026',
  description: 'Luiz Cláudio e Kátia da Costa estão se casando. Sábado, 17 de outubro de 2026.',
  openGraph: {
    type: 'website',
    url: 'https://luizcasara.com/casamento',
    title: 'Luiz & Kátia — 17.10.2026',
    description: 'Você foi convidado para algo muito especial. Sábado, 17 de outubro de 2026.',
    siteName: 'Luiz Casara',
    // Explícito de propósito: o opengraph-image.tsx mora em app/casamento/ (fora do
    // route group, para manter a URL sem sufixo de hash), então o Next não o associa
    // sozinho a esta rota e deixa de emitir a tag.
    images: [{ url: 'https://www.luizcasara.com/casamento/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luiz & Kátia — 17.10.2026',
    description: 'Você foi convidado para algo muito especial. Sábado, 17 de outubro de 2026.',
    images: ['https://www.luizcasara.com/casamento/opengraph-image'],
  },
  robots: { index: false, follow: false },
}

export default function CasamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} ${montserrat.variable}`}>
      {children}
    </div>
  )
}
