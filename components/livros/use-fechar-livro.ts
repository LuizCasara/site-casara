'use client';

import {useCallback} from 'react';
import {useRouter} from 'next/navigation';

/**
 * Fecha o livro aberto voltando pra sala.
 *
 * Volta no histórico (`router.back()`) em vez de navegar pra frente com um
 * `<Link href="/livros">`: rotas paralelas/interceptadas do Next só resetam o
 * slot `@livro` de forma confiável em navegação "pra trás" — um `<Link>` "pra
 * frente" pro mesmo pai deixa o conteúdo antigo do slot preso na tela mesmo com
 * a URL já em `/livros`.
 *
 * Sem histórico dentro da aba (chegou direto em /livros/<slug> por um link
 * externo), `router.back()` ou não faz nada ou joga a pessoa pra fora do site
 * — daí o fallback explícito.
 *
 * Vive num hook porque tem dois gatilhos: o botão "✕ fechar" dentro do
 * overlay (CloseBookButton) e a tecla Esc (RoomCanvas). Duplicar essa regra
 * nos dois lugares é como eles começariam a divergir.
 */
export function useFecharLivro() {
    const router = useRouter();

    return useCallback(() => {
        if (window.history.length <= 1) router.push('/livros');
        else router.back();
    }, [router]);
}
