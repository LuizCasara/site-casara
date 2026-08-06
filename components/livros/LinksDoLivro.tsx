'use client';

import Link from 'next/link';
import {trackBookTagClick, trackBookBackToList} from '@/utils/analytics';

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

export function VoltarParaLista({slug, className}: {slug: string; className: string}) {
    return (
        <Link href="/livros/lista" onClick={() => trackBookBackToList(slug)} className={className}>
            ← todos os livros
        </Link>
    );
}
