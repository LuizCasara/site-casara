import {listarLivros, listarTags, type Book} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';
import ProvedorDaSala from '@/components/livros/ContextoDaSala';

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
    // Um status por lugar da sala: estante, mesa de centro e a torre no chão.
    // 'referencia' não aparece aqui — aquele livro é alcançado pelo objeto 3D
    // que o representa, e a página dele carrega sozinha.
    const [livrosLidos, livrosLendo, livrosQueroLer, tags] = await Promise.all([
        listarLivros({status: 'lido'}),
        listarLivros({status: 'lendo'}),
        listarLivros({status: 'quero-ler'}),
        listarTags(),
    ]);

    return (
        // O provedor embrulha os três porque a resposta "a sala está atrás?" é a
        // mesma para quem monta a cena e para quem desenha o card do livro —
        // ver ContextoDaSala.
        <ProvedorDaSala>
            <RoomCanvasLoader
                books={livrosLidos.map(mapShelved)}
                deskBooks={livrosLendo.map(mapShelved)}
                queroLer={livrosQueroLer.map(mapShelved)}
                tags={tags}
            />
            {children}
            {livro}
        </ProvedorDaSala>
    );
}
