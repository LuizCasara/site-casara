import type {Metadata} from 'next';
import {listarLivros, listarTags} from '@/lib/books';
import ListaFiltravel from '@/components/livros/ListaFiltravel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Livros',
    description: 'Os livros que li e o que penso sobre cada um deles.',
};

/**
 * O acervo INTEIRO vai para o HTML, e filtrar é assunto do cliente (ver
 * ListaFiltravel). A query só recebe os filtros da URL para o estado inicial —
 * um link compartilhado como `/livros/lista?tag=estoicismo` abre já filtrado.
 *
 * Mandar tudo é melhor para indexação (o Google vê o acervo completo, não um
 * subconjunto) e é o que torna a busca por texto instantânea, sem um
 * round-trip por tecla digitada. Com ~50 livros, isso é uma página de HTML.
 */
export default async function ListaPage({searchParams}: {
    searchParams: Promise<{categoria?: string; tag?: string; status?: string; busca?: string}>;
}) {
    const iniciais = await searchParams;
    const [livros, tags] = await Promise.all([listarLivros(), listarTags()]);

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
                        Livros
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        Os livros que li e o que penso sobre cada um deles.
                    </p>
                </div>

                {livros.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">
                        Nenhum livro por aqui ainda.
                    </p>
                ) : (
                    <ListaFiltravel livros={livros} tags={tags} iniciais={iniciais}/>
                )}
            </div>
        </div>
    );
}
