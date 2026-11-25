import type {Metadata} from 'next';
import Link from 'next/link';
import MiniPonte from '@/components/fe/MiniPonte';

// Porta de entrada da área "Fé". Hoje tem uma dinâmica só; a página existe
// para as próximas entrarem aqui sem mudar link nenhum.

const DESCRICAO = 'Dinâmicas curtas e interativas sobre Deus e a Palavra, para fazer no seu ritmo ou mandar para alguém.';
// Explícito: o opengraph-image.tsx mora em app/fe/, fora do route group.
const IMAGEM = 'https://www.luizcasara.com/fe/opengraph-image';

export const metadata: Metadata = {
  title: 'Fé',
  description: DESCRICAO,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://luizcasara.com/fe',
    siteName: 'Luiz Casara',
    title: 'Fé · Luiz Casara',
    description: DESCRICAO,
    images: [{url: IMAGEM, width: 1200, height: 630}],
  },
  twitter: {card: 'summary_large_image', title: 'Fé · Luiz Casara', description: DESCRICAO, images: [IMAGEM]},
};

export default function FePage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">Fé</h1>
        <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{DESCRICAO}</p>

        <Link
          href="/fe/a-ponte"
          className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2427] via-[#14302f] to-[#1f3d41] text-[#ecebe0] transition-transform duration-300 hover:scale-[1.01] sm:flex-row sm:items-center"
        >
          <div className="flex-1 p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6ab66]">Romanos 6:23</p>
            <h2 className="mt-2 font-serif text-3xl italic text-[#f1d9a4]">A Ponte</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#a8b4ac]">
              Um versículo, um desenho e algumas perguntas rápidas sobre como ter um relacionamento com Deus.
            </p>
            <p className="mt-4 text-xs text-[#6e8079]">8 passos · uns 5 minutos · com som ambiente</p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d6ab66] px-5 py-2.5 text-sm font-semibold text-[#0d1f22]">
              Começar
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </div>
          <div className="flex items-center justify-center px-6 pb-6 sm:w-[46%] sm:p-8">
            <MiniPonte className="w-full max-w-[320px]" />
          </div>
        </Link>

        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">Mais dinâmicas em breve.</p>
      </div>
    </div>
  );
}
