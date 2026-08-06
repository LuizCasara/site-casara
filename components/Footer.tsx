"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CreditosModelos from '@/components/livros/CreditosModelos';

const Footer = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/casamento') || pathname.startsWith('/w/') || pathname.startsWith('/q/')) return null;

  // Os modelos 3D da sala são CC BY: a licença exige crédito onde a obra é
  // exibida, então ele acompanha a rota que os exibe, não o site inteiro.
  const emLivros = pathname.startsWith('/livros');

  return (
    // `relative z-10`: em /livros a sala 3D é um canvas `fixed inset-0 z-0`,
    // que fica acima de todo elemento estático in-flow. Sem posicionamento
    // explícito aqui, o rodapé sumiria atrás da cena nessas rotas.
    <footer className="relative z-10 border-t border-gray-100 dark:border-gray-800/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-0.5">Luiz Casara</p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Tech Lead · Senior Full-Stack Engineer
            </p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center max-w-sm">
            &quot;Yesterday I was clever, so I wanted to change the world.
            Today I am wise, so I am changing myself.&quot;
          </p>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            <Link href="/stats" className="hover:text-green-500 transition-colors duration-300" tabIndex={-1}>©</Link>
            {" "}{new Date().getFullYear()} Luiz Casara
          </p>

        </div>

        {emLivros && <CreditosModelos/>}
      </div>
    </footer>
  );
};

export default Footer;
