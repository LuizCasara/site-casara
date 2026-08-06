import {cache} from 'react';
import sql from '@/lib/db';

/**
 * Onde o livro aparece na sala 3D — e, no caso de 'referencia', onde ele NÃO
 * aparece. Ver o CHECK em lib/schema.sql.
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
 * Envolvida em `cache()` do React: o driver do Neon usado por `lib/db.ts` é o
 * HTTP direto do `@neondatabase/serverless`, não o `fetch()` do Next, então a
 * deduplicação automática de requests do framework não cobre essas queries —
 * sem isso, `generateMetadata` e o componente da página fariam dois
 * round-trips idênticos ao banco na mesma requisição.
 */
export const listarLivros = cache(async (filtros: BookFilters = {}): Promise<Book[]> => {
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
});

/** Ver comentário de `listarLivros` sobre por que `cache()` é necessário aqui. */
export const buscarLivroPorSlug = cache(async (slug: string): Promise<Book | null> => {
    const linhas = (await sql`
        SELECT * FROM casara.books WHERE slug = ${slug}
    `) as Book[];
    return linhas[0] ?? null;
});

/**
 * Tags distintas do acervo, para montar os filtros.
 * Ver comentário de `listarLivros` sobre por que `cache()` é necessário aqui.
 */
export const listarTags = cache(async (): Promise<string[]> => {
    const linhas = (await sql`
        SELECT DISTINCT unnest(tags) AS tag
        FROM casara.books
        WHERE status <> ALL (${STATUS_OCULTOS}::text[])
        ORDER BY tag
    `) as {tag: string}[];
    return linhas.map((l) => l.tag);
});
