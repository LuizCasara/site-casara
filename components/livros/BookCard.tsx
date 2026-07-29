import Image from 'next/image';
import Link from 'next/link';
import type {Book} from '@/lib/books';
import {getCategory} from '@/lib/book-categories.mjs';
import StarRating from './StarRating';

export default function BookCard({livro}: {livro: Book}) {
    const categoria = getCategory(livro.category);

    return (
        <Link href={`/livros/${livro.slug}`}
              className="group flex flex-col gap-2 rounded-lg p-2 transition
                         hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded shadow-md">
                {livro.cover_path && (
                    <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill
                           sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"
                           className="object-cover transition group-hover:scale-105"/>
                )}
                {livro.status === 'lendo' && (
                    <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5
                                     text-[10px] font-bold uppercase text-white">
                        lendo
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
                    {livro.title}
                </h2>
                {livro.author && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{livro.author}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                    <StarRating nota={livro.rating}/>
                    {categoria && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{backgroundColor: categoria.cor}}>
                            {categoria.nome}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
