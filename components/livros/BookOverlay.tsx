import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import {getCategory} from '@/lib/book-categories.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';
import StarRating from '@/components/livros/StarRating';
import BotaoComentario from '@/components/livros/BotaoComentario';
import BotaoCompartilhar from '@/components/livros/BotaoCompartilhar';
import {REMAP_HEADINGS} from '@/components/livros/markdown-headings';
import type {Book} from '@/lib/books';

export default function BookOverlay({livro}: {livro: Book}) {
    const categoria = getCategory(livro.category);

    return (
        <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-3">
                {livro.cover_path && (
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded shadow-lg">
                        <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill sizes="220px"
                               className="object-cover"/>
                    </div>
                )}
                <h2 className="text-xl font-bold text-white">{livro.title}</h2>
                {livro.author && <p className="text-sm text-white/70">{livro.author}</p>}
                <StarRating nota={livro.rating} tamanho="text-base"/>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
                    {livro.year && (<><dt className="font-medium">Ano</dt><dd>{livro.year}</dd></>)}
                    {livro.pages && (<><dt className="font-medium">Páginas</dt><dd>{livro.pages}</dd></>)}
                </dl>

                <div className="flex flex-wrap gap-2">
                    {categoria && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{backgroundColor: categoria.cor, color: corDeTextoSobre(categoria.cor)}}>
                            {categoria.nome}
                        </span>
                    )}
                    {livro.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                            {t}
                        </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <BotaoComentario slug={livro.slug} titulo={livro.title} autor={livro.author}/>
                    <BotaoCompartilhar slug={livro.slug} titulo={livro.title} autor={livro.author}/>
                </div>
            </div>

            <div className="prose prose-sm prose-invert max-h-[60vh] max-w-none overflow-y-auto pr-2">
                {livro.review ? (
                    <ReactMarkdown components={REMAP_HEADINGS}>{livro.review}</ReactMarkdown>
                ) : (
                    <p className="italic text-white/50">Resenha ainda não escrita.</p>
                )}
            </div>
        </div>
    );
}
