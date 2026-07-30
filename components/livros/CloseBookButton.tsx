'use client';

import {useRouter} from 'next/navigation';

/**
 * Fecha o livro voltando no histórico (`router.back()`), nunca navegando pra
 * frente com um `<Link href="/livros">`. Motivo: rotas paralelas/interceptadas
 * do Next só resetam o slot `@livro` de forma confiável em navegação "pra
 * trás" — um `<Link>` "pra frente" pro mesmo pai deixa o conteúdo antigo do
 * slot preso na tela mesmo com a URL já em `/livros` (confirmado na
 * verificação manual da fase 3). Isso é exatamente o mesmo mecanismo do botão
 * voltar do navegador, só que como um botão dentro do próprio overlay.
 */
export default function CloseBookButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
            aria-label="Fechar"
        >
            ✕ fechar
        </button>
    );
}
