import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {buscarLivroPorSlug} from '@/lib/books';
import {getCategory} from '@/lib/book-categories.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';
import StarRating from '@/components/livros/StarRating';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {
    params: Promise<{slug: string}>;
}): Promise<Metadata> {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) return {title: 'Livro não encontrado'};

    const descricao = livro.synopsis
        ?? `${livro.title}${livro.author ? `, de ${livro.author}` : ''} — o que achei do livro.`;

    const imagens = livro.cover_path ? [livro.cover_path] : undefined;

    return {
        title: livro.title,
        description: descricao,
        openGraph: {
            title: livro.title,
            description: descricao,
            type: 'article',
            images: imagens,
        },
        // O bloco `twitter` precisa ser explícito: sem ele o Next herda o do
        // layout raiz, e o card sai com a capa do livro mas com o título e a
        // descrição do perfil profissional — combinação confusa justamente no
        // canal em que a página mais é compartilhada.
        twitter: {
            card: 'summary_large_image',
            title: livro.title,
            description: descricao,
            images: imagens,
        },
    };
}

export default async function LivroPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    const categoria = getCategory(livro.category);

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <Link href="/livros/lista"
                      className="mb-8 inline-block text-sm text-gray-500 underline
                                 hover:text-gray-800 dark:hover:text-gray-200">
                    ← todos os livros
                </Link>

                <div className="flex flex-col gap-8 sm:flex-row">
                    {livro.cover_path && (
                        <div className="relative aspect-[2/3] w-40 shrink-0 self-start
                                        overflow-hidden rounded shadow-lg">
                            <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill
                                   sizes="160px" className="object-cover" priority/>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {livro.title}
                        </h1>
                        {livro.author && (
                            <p className="text-gray-600 dark:text-gray-300">{livro.author}</p>
                        )}

                        <StarRating nota={livro.rating} tamanho="text-lg"/>

                        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm
                                       text-gray-500 dark:text-gray-400">
                            {livro.year && (<><dt className="font-medium">Ano</dt><dd>{livro.year}</dd></>)}
                            {livro.publisher && (<><dt className="font-medium">Editora</dt><dd>{livro.publisher}</dd></>)}
                            {livro.pages && (<><dt className="font-medium">Páginas</dt><dd>{livro.pages}</dd></>)}
                        </dl>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {categoria && (
                                <span className="rounded px-2 py-0.5 text-xs font-medium"
                                      style={{
                                          backgroundColor: categoria.cor,
                                          color: corDeTextoSobre(categoria.cor),
                                      }}>
                                    {categoria.nome}
                                </span>
                            )}
                            {livro.tags.map((t) => (
                                <Link key={t} href={`/livros/lista?tag=${encodeURIComponent(t)}`}
                                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs
                                                 text-gray-600 hover:bg-gray-200
                                                 dark:bg-gray-800 dark:text-gray-300">
                                    {t}
                                </Link>
                            ))}
                        </div>

                        {livro.status === 'lendo' && livro.progress_pct !== null && (
                            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                Lendo agora — {livro.progress_pct}%
                            </p>
                        )}
                    </div>
                </div>

                {livro.synopsis && (
                    <p className="mt-10 border-l-2 border-gray-300 pl-4 text-sm italic
                                  text-gray-600 dark:border-gray-700 dark:text-gray-400">
                        {livro.synopsis}
                    </p>
                )}

                {livro.review && (
                    <article className="prose prose-sm mt-10 max-w-none dark:prose-invert">
                        {/*
                          O CLI de cadastro (scripts/livros.mjs) abre a resenha já com
                          "# <título>" — ou seja, todo review real começa com um heading nível 1.
                          Sem remapear, isso vira um segundo <h1> na página (o primeiro é o
                          título do livro logo acima), quebrando a hierarquia semântica. Por
                          isso cada nível do Markdown desce um degrau (h1->h2 ... h5->h6): a
                          resenha é uma seção da página, não um documento à parte.
                        */}
                        <ReactMarkdown components={{
                            // `node` é o nó hast que o react-markdown injeta em toda prop de
                            // componente; descartado aqui de propósito para não vazar como um
                            // atributo `node="[object Object]"` inválido no HTML renderizado.
                            /* eslint-disable @typescript-eslint/no-unused-vars */
                            h1: ({node, ...props}) => <h2 {...props}/>,
                            h2: ({node, ...props}) => <h3 {...props}/>,
                            h3: ({node, ...props}) => <h4 {...props}/>,
                            h4: ({node, ...props}) => <h5 {...props}/>,
                            h5: ({node, ...props}) => <h6 {...props}/>,
                            h6: ({node, ...props}) => <h6 {...props}/>,
                            /* eslint-enable @typescript-eslint/no-unused-vars */
                        }}>
                            {livro.review}
                        </ReactMarkdown>
                    </article>
                )}
            </div>
        </div>
    );
}
