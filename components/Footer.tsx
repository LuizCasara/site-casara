"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CreditosModelos from '@/components/livros/CreditosModelos';
import { deriveLivrosMode } from '@/lib/livros-routing.mjs';

const Footer = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/casamento') || pathname.startsWith('/w/') || pathname.startsWith('/q/')) return null;

  // Mesmo predicado que decide montar a sala 3D (RoomCanvasLoader usa esta
  // função): vale em /livros e /livros/<slug>, nunca em /livros/lista, que é
  // página comum. Duas coisas dependem dele, pelo mesmo motivo — a sala está
  // atrás. O rodapé encolhe para não comer a cena, e é aqui que os créditos dos
  // modelos CC BY precisam aparecer, porque a licença pede atribuição no lugar
  // onde a obra é exibida.
  const comSala = deriveLivrosMode(pathname) !== null;

  // `relative z-10`: a sala é um canvas `fixed inset-0 z-0`, que fica acima de
  // todo elemento estático in-flow. Sem posicionamento explícito, o rodapé
  // sumiria atrás da cena.
  const moldura = "relative z-10 border-t border-gray-100 dark:border-gray-800/60";

  if (comSala) {
    return (
      // Rodapé de uma linha, ~40px contra os ~123 do normal. O rodapé é `fixed`
      // por cima do canvas e come a base do quadro: com o tamanho cheio ele
      // tapava perto de um quinto da cena, e o que está embaixo (a mesa de
      // centro, o tapete, o nicho mais baixo da estante) desaparecia atrás dele.
      //
      // Some a frase e o cargo, que não fazem falta aqui e são o que ocupa duas
      // linhas. Fica o essencial: a assinatura, o link do /stats e o crédito dos
      // modelos, este último por exigência de licença, não por escolha.
      //
      // Encolher basta — não dá para tirar o rodapé daqui como se faz em
      // /casamento e nas dinâmicas, porque `/livros/<slug>` também é uma página
      // de conteúdo, indexável, que merece o rodapé do site.
      <footer className={moldura}>
        <div className="container mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1
                          text-center text-[10px] leading-tight text-gray-400 dark:text-gray-500">
            <span>
              <Link href="/stats" className="hover:text-green-500 transition-colors duration-300" tabIndex={-1}>©</Link>
              {" "}{new Date().getFullYear()} Luiz Casara
            </span>
            <CreditosModelos compacto/>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={moldura}>
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
      </div>
    </footer>
  );
};

export default Footer;
