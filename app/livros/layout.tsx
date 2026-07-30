import {listarLivros} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

export default async function LivrosLayout({children, livro}: {
    children: React.ReactNode;
    livro: React.ReactNode;
}) {
    const livrosLidos = await listarLivros({status: 'lido'});

    const shelvedBooks = livrosLidos.map((l) => ({
        slug: l.slug,
        title: l.title,
        author: l.author,
        rating: l.rating,
        pages: l.pages,
        spine_color: l.spine_color,
        cover_path: l.cover_path,
    }));

    return (
        <>
            <RoomCanvasLoader books={shelvedBooks}/>
            {children}
            {livro}
        </>
    );
}
