'use client';

import Link from 'next/link';
import {trackBookTagClick, trackBookBackToList, trackBookBackToRoom} from '@/utils/analytics';

/**
 * Os dois links da página do livro que precisam registrar evento.
 *
 * Existem como componentes de cliente separados porque `/livros/[slug]` é
 * server-rendered de propósito (é a página que o Google indexa e o WhatsApp
 * desembrulha) e um handler de clique não atravessa essa fronteira. Cada um
 * recebe dados simples e chama o track sozinho, em vez de receber a função —
 * função não é serializável do servidor para o cliente.
 *
 * O estilo fica aqui junto e não é prop: são dois links específicos desta
 * página, não um sistema de links reutilizável.
 */

export function TagDoLivro({slug, tag}: {slug: string; tag: string}) {
    return (
        <Link
            href={`/livros/lista?tag=${encodeURIComponent(tag)}`}
            onClick={() => trackBookTagClick(slug, tag)}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600
                       hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        >
            {tag}
        </Link>
    );
}

/**
 * Os dois caminhos de volta, lado a lado, porque levam a lugares diferentes: a
 * sala 3D e a grade de capas. Um só deles obrigaria quem chegou por link
 * externo a passar pela listagem para descobrir que existe uma sala.
 *
 * "Voltar para a sala" vem primeiro e com mais peso: é a rota principal do
 * acervo, e é ela que o link externo não mostrou.
 */
export function VoltarDoLivro({slug}: {slug: string}) {
    const base = 'text-sm underline underline-offset-2 transition';

    return (
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
                href="/livros"
                onClick={() => trackBookBackToRoom(slug)}
                className={`${base} font-medium text-gray-700 hover:text-gray-900
                            dark:text-gray-300 dark:hover:text-white`}
            >
                ← voltar para a sala
            </Link>
            <Link
                href="/livros/lista"
                onClick={() => trackBookBackToList(slug)}
                className={`${base} text-gray-500 hover:text-gray-800 dark:hover:text-gray-200`}
            >
                todos os livros
            </Link>
        </div>
    );
}
