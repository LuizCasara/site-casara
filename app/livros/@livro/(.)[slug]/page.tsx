import Link from 'next/link';
import {notFound} from 'next/navigation';
import {buscarLivroPorSlug} from '@/lib/books';
import BookOverlay from '@/components/livros/BookOverlay';

export default async function LivroInterceptado({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
            <div className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl
                            bg-black/70 p-8 shadow-2xl backdrop-blur-md">
                <Link href="/livros"
                      className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
                      aria-label="Fechar">
                    ✕ fechar
                </Link>
                <BookOverlay livro={livro}/>
            </div>
        </div>
    );
}
