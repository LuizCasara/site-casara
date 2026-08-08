import {notFound} from 'next/navigation';
import {buscarLivroPorSlug} from '@/lib/books';
import BookOverlay from '@/components/livros/BookOverlay';
import CardDoLivro from '@/components/livros/CardDoLivro';
import CloseBookButton from '@/components/livros/CloseBookButton';

export default async function LivroInterceptado({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    return (
        // A moldura é cliente e decide sozinha se está sobre a sala 3D ou sobre
        // a listagem — ver CardDoLivro. Esta página continua servidor, que é o
        // que mantém a busca no banco fora do bundle.
        <CardDoLivro>
            <CloseBookButton/>
            <BookOverlay livro={livro}/>
        </CardDoLivro>
    );
}
