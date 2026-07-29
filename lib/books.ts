import sql from '@/lib/db';

export type BookStatus = 'lendo' | 'lido';

export type Book = {
    id: number;
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
    finished_at: string | null;
    review: string | null;
    shelf_order: number | null;
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
 */
export async function listarLivros(filtros: BookFilters = {}): Promise<Book[]> {
    const categoria = filtros.categoria || null;
    const tag = filtros.tag || null;
    const status = filtros.status || null;

    return (await sql`
        SELECT *
        FROM casara.books
        WHERE (${categoria}::text IS NULL OR category = ${categoria})
          AND (${tag}::text IS NULL OR ${tag} = ANY (tags))
          AND (${status}::text IS NULL OR status = ${status})
        ORDER BY status DESC, COALESCE(shelf_order, 32767), title
    `) as Book[];
}

export async function buscarLivroPorSlug(slug: string): Promise<Book | null> {
    const linhas = (await sql`
        SELECT * FROM casara.books WHERE slug = ${slug}
    `) as Book[];
    return linhas[0] ?? null;
}

/** Tags distintas do acervo, para montar os filtros. */
export async function listarTags(): Promise<string[]> {
    const linhas = (await sql`
        SELECT DISTINCT unnest(tags) AS tag FROM casara.books ORDER BY tag
    `) as {tag: string}[];
    return linhas.map((l) => l.tag);
}

/** Usado pelo generateStaticParams da página do livro. */
export async function listarSlugs(): Promise<string[]> {
    const linhas = (await sql`SELECT slug FROM casara.books`) as {slug: string}[];
    return linhas.map((l) => l.slug);
}
