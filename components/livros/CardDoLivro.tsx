'use client';

import {useEffect} from 'react';
import {useSalaMontada} from '@/components/livros/ContextoDaSala';
import {useFecharLivro} from '@/components/livros/use-fechar-livro';
import {trackBookClosed} from '@/utils/analytics';

/**
 * A moldura do livro aberto — a mesma rota interceptada servindo dois cenários.
 *
 * **Sobre a sala 3D**: sem fundo, porque a cena atrás é o fundo, e com a
 * animação `entrada-do-livro`, que segura o card até o livro terminar de sair
 * da prateleira. Aparecer no mesmo instante do clique cobriria justamente o
 * movimento que a pessoa clicou para ver.
 *
 * **Sobre a listagem**: um modal comum. Fundo escurecido, porque atrás está a
 * grade de capas e sem ele o card flutuaria no meio dela; e SEM animação de
 * entrada, porque não há livro nenhum saindo de prateleira alguma — aqui a
 * animação seria enfeite atrasando o conteúdo.
 *
 * O Esc também é daqui quando a sala não está montada: quem trata a tecla é o
 * RoomCanvas, que nesse caso não existe. Sem isto, o modal aberto pela lista
 * não fecharia no teclado.
 */
export default function CardDoLivro({children}: {children: React.ReactNode}) {
    const salaMontada = useSalaMontada();
    const fechar = useFecharLivro();

    // A abertura do livro não tem evento próprio: o `page_view` que o
    // middleware grava para /livros/<slug> já registra exatamente isso, e os
    // dois andavam praticamente em 1:1 (178 contra 162 numa semana).
    useEffect(() => {
        if (salaMontada) return;
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            trackBookClosed(window.location.pathname.replace('/livros/', ''), 'esc');
            fechar();
        };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [salaMontada, fechar]);

    return (
        <div
            className={`fixed inset-0 z-30 flex items-center justify-center p-4 ${
                salaMontada ? '' : 'bg-black/60 backdrop-blur-sm'
            }`}
            // Clicar fora fecha, como todo modal. Só quando a sala não está
            // atrás: lá o "fora" é a cena, e clicar nela é girar a câmera ou
            // abrir outro livro, não fechar este.
            onClick={salaMontada ? undefined : (e) => {
                if (e.target !== e.currentTarget) return;
                trackBookClosed(window.location.pathname.replace('/livros/', ''), 'fora');
                fechar();
            }}
        >
            <div
                className={`relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl
                            bg-black/70 p-8 shadow-2xl backdrop-blur-md
                            ${salaMontada ? 'entrada-do-livro' : ''}`}
            >
                {children}
            </div>
        </div>
    );
}
