import {cache} from 'react';
import {unstable_cache} from 'next/cache';
import sql from '@/lib/global/db';

/**
 * Tag de cache de toda leitura de `casara.books`. O acervo só muda quando
 * `scripts/livros/livros.mjs` ou `aplicar-leitura.mjs` rodam localmente, e os
 * dois chamam `POST /api/revalidate` com esta tag no final (ver
 * `scripts/livros/revalidar.mjs`). `LIVROS_REVALIDATE_S` é a rede de
 * segurança para quando essa chamada falha ou o segredo não está configurado.
 *
 * Por que cachear: cada render de `/livros*` (inclusive bots, previews de link
 * e prefetch, que não gravam `page_view`) acordava o compute do Neon, que só
 * suspende após 5 min sem query. Com o cache, o render lê do Data Cache da
 * Vercel e o banco só é tocado uma vez por hora, no máximo.
 */
export const LIVROS_CACHE_TAG = 'livros';
const LIVROS_REVALIDATE_S = 3600;

/**
 * Onde o livro aparece na sala 3D — e, no caso de 'referencia', onde ele NÃO
 * aparece. Ver o CHECK em db/schema.sql.
 */
export type BookStatus = 'lendo' | 'lido' | 'referencia' | 'quero-ler';

/**
 * Status que ficam de fora de toda listagem pública: a página existe e é
 * alcançável por link direto ou pelo objeto 3D correspondente, mas o livro não
 * entra na lista, nos filtros nem nas contagens do acervo.
 */
const STATUS_OCULTOS = ['referencia'];

export type Book = {
    id: string;
    slug: string;
    isbn: string | null;
    title: string;
    author: string | null;
    year: number | null;
    publisher: string | null;
    pages: number | null;
    synopsis: string | null;
    cover_path: string | null;
    spine_color: string | null;
    rating: string | null;   // NUMERIC volta como string do driver do Neon
    category: string;
    tags: string[];
    status: BookStatus;
    progress_pct: number | null;
    finished_at: Date | null;   // DATE do Postgres volta como Date; cuidado: 2024-03-15 vira 2024-03-15T03:00:00.000Z (meia-noite local em UTC)
    review: string | null;
    shelf_order: number | null;
    created_at: Date;
    updated_at: Date;
};

export type BookFilters = {
    categoria?: string;
    tag?: string;
    status?: string;
};

/**
 * Lista com filtros opcionais.
 *
 * Cada filtro é aplicado como `(<param> IS NULL OR <coluna> = <param>)`, então
 * a query é uma só e continua parametrizada — nada de concatenar SQL.
 * `casara.` é obrigatório: o search_path da conexão não inclui esse schema.
 *
 * Livros com status 'lendo' aparecem primeiro — é o destaque do acervo.
 *
 * Quem consome usa `listarLivros`, no fim do arquivo (cacheado).
 */
const consultarLivros = async (filtros: BookFilters = {}): Promise<Book[]> => {
    const categoria = filtros.categoria || null;
    const tag = filtros.tag || null;
    const status = filtros.status || null;

    return (await sql`
        SELECT *
        FROM casara.books
        WHERE (${categoria}::text IS NULL OR category = ${categoria})
          AND (${tag}::text IS NULL OR ${tag} = ANY (tags))
          AND (${status}::text IS NULL OR status = ${status})
          -- Os ocultos só saem quando alguém PEDE aquele status pelo nome.
          -- Sem isto, a Bíblia entraria na listagem, nos filtros e nas
          -- contagens do acervo, que é justamente o que 'referencia' evita.
          AND (${status}::text IS NOT NULL OR status <> ALL (${STATUS_OCULTOS}::text[]))
        ORDER BY (status = 'lendo') DESC, COALESCE(shelf_order, 32767), title
    `) as Book[];
};

const consultarLivroPorSlug = async (slug: string): Promise<Book | null> => {
    const linhas = (await sql`
        SELECT * FROM casara.books WHERE slug = ${slug}
    `) as Book[];
    return linhas[0] ?? null;
};

/** Tags distintas do acervo, para montar os filtros. */
const consultarTags = async (): Promise<string[]> => {
    const linhas = (await sql`
        SELECT DISTINCT unnest(tags) AS tag
        FROM casara.books
        WHERE status <> ALL (${STATUS_OCULTOS}::text[])
        ORDER BY tag
    `) as {tag: string}[];
    return linhas.map((l) => l.tag);
};

/**
 * O Data Cache guarda o resultado como JSON, e JSON não tem `Date`: os três
 * campos DATE/TIMESTAMPTZ voltariam como string, quebrando o tipo `Book` (e
 * qualquer `.getTime()` de quem o consome). Remonta na saída do cache.
 */
function reviverDatas(livro: Book): Book {
    return {
        ...livro,
        finished_at: livro.finished_at === null ? null : new Date(livro.finished_at),
        created_at: new Date(livro.created_at),
        updated_at: new Date(livro.updated_at),
    };
}

const opcoesDoCache = {tags: [LIVROS_CACHE_TAG], revalidate: LIVROS_REVALIDATE_S};
const listarLivrosCacheado = unstable_cache(consultarLivros, ['livros:listar'], opcoesDoCache);
const buscarLivroCacheado = unstable_cache(consultarLivroPorSlug, ['livros:slug'], opcoesDoCache);
const listarTagsCacheado = unstable_cache(consultarTags, ['livros:tags'], opcoesDoCache);

/*
 * Duas camadas, cada uma com um papel:
 * - `unstable_cache` (Next) persiste entre requests e deploys, sob a tag acima;
 * - `cache()` (React) dedup dentro da MESMA request — `generateMetadata` e o
 *   componente da página pedem o mesmo livro, e sem ele seriam duas leituras do
 *   Data Cache (e, num miss, dois round-trips ao banco). O driver do Neon é HTTP
 *   direto, não o `fetch()` do Next, então a dedup automática não o cobre.
 */
export const listarLivros = cache(async (filtros: BookFilters = {}): Promise<Book[]> =>
    (await listarLivrosCacheado(filtros)).map(reviverDatas));

export const buscarLivroPorSlug = cache(async (slug: string): Promise<Book | null> => {
    const livro = await buscarLivroCacheado(slug);
    return livro ? reviverDatas(livro) : null;
});

export const listarTags = cache(async (): Promise<string[]> => listarTagsCacheado());
