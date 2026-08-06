import type {Metadata} from 'next';
import {listarLivros, listarTags} from '@/lib/books';
import {CATEGORIES} from '@/lib/book-categories.mjs';
import BookCard from '@/components/livros/BookCard';
import BookFilters from '@/components/livros/BookFilters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Livros',
    description: 'Os livros que li e o que penso sobre cada um deles.',
};

export default async function ListaPage({searchParams}: {
    searchParams: Promise<{categoria?: string; tag?: string; status?: string}>;
}) {
    const filtros = await searchParams;
    const [livros, tags] = await Promise.all([listarLivros(filtros), listarTags()]);

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10">
                    <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
                        Livros
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        Os livros que li e o que penso sobre cada um deles.
                    </p>
                </div>

                <BookFilters categorias={CATEGORIES} tags={tags} ativos={filtros}/>

                {livros.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">
                        Nenhum livro por aqui ainda.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {livros.map((l, i) => <BookCard key={l.slug} livro={l} posicao={i + 1}/>)}
                    </div>
                )}
            </div>
        </div>
    );
}
