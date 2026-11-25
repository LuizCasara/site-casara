import type {Metadata, Viewport} from 'next';
import {Instrument_Sans, Newsreader} from 'next/font/google';
import '@/components/fe/a-ponte/a-ponte.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
});

const TITULO = 'A Ponte';
const DESCRICAO = 'Um versículo, um desenho e algumas perguntas rápidas sobre como ter um relacionamento com Deus.';
// Explícito de propósito: o opengraph-image.tsx mora em app/fe/a-ponte/ (fora
// do route group, para a URL não ganhar sufixo de hash — ver a nota de
// app/(global)/casamento/layout.tsx), então o Next não o associa sozinho.
const IMAGEM = 'https://www.luizcasara.com/fe/a-ponte/opengraph-image';

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://luizcasara.com/fe/a-ponte',
    siteName: 'Luiz Casara',
    title: 'A Ponte · Romanos 6:23',
    description: DESCRICAO,
    images: [{url: IMAGEM, width: 1200, height: 630, alt: 'A ilustração da ponte: uma cruz dourada ligando a pessoa a Deus'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Ponte · Romanos 6:23',
    description: DESCRICAO,
    images: [IMAGEM],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1f22',
  viewportFit: 'cover',
};

export default function APonteLayout({children}: {children: React.ReactNode}) {
  return <div className={`${newsreader.variable} ${instrument.variable}`}>{children}</div>;
}
