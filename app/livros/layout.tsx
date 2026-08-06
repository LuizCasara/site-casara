import {listarLivros, listarTags, type Book} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

function mapShelved(l: Book) {
    return {
        slug: l.slug,
        title: l.title,
        author: l.author,
        rating: l.rating,
        pages: l.pages,
        spine_color: l.spine_color,
        cover_path: l.cover_path,
        category: l.category,
        tags: l.tags,
        year: l.year,
        finished_at: l.finished_at,
    };
}

export default async function LivrosLayout({children, livro}: {
    children: React.ReactNode;
    livro: React.ReactNode;
}) {
    const [livrosLidos, livrosLendo, tags] = await Promise.all([
        listarLivros({status: 'lido'}),
        listarLivros({status: 'lendo'}),
        listarTags(),
    ]);

    return (
        <>
            <RoomCanvasLoader
                books={livrosLidos.map(mapShelved)}
                deskBooks={livrosLendo.map(mapShelved)}
                tags={tags}
            />
            {children}
            {livro}
        </>
    );
}
