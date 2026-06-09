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
  title: 'Luiz & Kátia — 11.07.2026',
  description: 'Você foi convidado para algo muito especial.',
  robots: { index: false, follow: false },
}

export default function CasamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} ${montserrat.variable}`}>
      {children}
    </div>
  )
}
