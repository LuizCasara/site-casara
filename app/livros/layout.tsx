import {listarLivros} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

export default async function LivrosLayout({children}: {children: React.ReactNode}) {
    const livrosLidos = await listarLivros({status: 'lido'});

    const shelvedBooks = livrosLidos.map((livro) => ({
        slug: livro.slug,
        title: livro.title,
        author: livro.author,
        rating: livro.rating,
        pages: livro.pages,
        spine_color: livro.spine_color,
    }));

    return (
        <>
            <RoomCanvasLoader books={shelvedBooks}/>
            {children}
        </>
    );
}
