import {notFound} from 'next/navigation';
import {buscarLivroPorSlug} from '@/lib/books';
import BookOverlay from '@/components/livros/BookOverlay';
import CloseBookButton from '@/components/livros/CloseBookButton';

export default async function LivroInterceptado({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            {/* `entrada-do-livro` (globals.css) segura o card até a animação
                do livro na estante terminar — sem isso ele cobria a cena no
                mesmo instante do clique. */}
            <div className="entrada-do-livro relative max-h-[85vh] w-full max-w-3xl overflow-y-auto
                            rounded-2xl bg-black/70 p-8 shadow-2xl backdrop-blur-md">
                <CloseBookButton/>
                <BookOverlay livro={livro}/>
            </div>
        </div>
    );
}
