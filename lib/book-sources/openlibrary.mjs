/**
 * Fonte de metadados: Open Library.
 *
 * Grátis, sem chave de API, sem cadastro. Porém INCOMPLETA — especialmente para
 * edições brasileiras, onde faltar number_of_pages ou capa é rotina, não
 * exceção. Por isso todo campo (menos o título) pode voltar null, e o CLI
 * trata isso como caminho normal.
 */
import {extractYear} from '../book-utils.mjs';

const ENDPOINT = 'https://openlibrary.org/api/books';

/**
 * Converte a resposta bruta em BookMetadata.
 * Separado de buscarMetadados para ser testável sem rede.
 */
export function parseOpenLibrary(json, isbn) {
    const dados = json?.[`ISBN:${isbn}`];
    if (!dados || !dados.title) return null;

    const autores = Array.isArray(dados.authors)
        ? dados.authors.map((a) => a?.name).filter(Boolean)
        : [];

    return {
        isbn,
        title: dados.title,
        author: autores.length ? autores.join(', ') : null,
        year: extractYear(dados.publish_date ?? null),
        publisher: dados.publishers?.[0]?.name ?? null,
        pages: Number(dados.number_of_pages) || null,
        coverUrl: dados.cover?.large ?? dados.cover?.medium ?? dados.cover?.small ?? null,
        subjects: Array.isArray(dados.subjects)
            ? dados.subjects.map((s) => s?.name).filter(Boolean)
            : [],
    };
}

/** Busca por ISBN. Devolve null se não encontrar ou se a rede falhar. */
export async function buscarPorIsbn(isbn) {
    const url = `${ENDPOINT}?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    try {
        const res = await fetch(url, {headers: {'User-Agent': 'luizcasara.com/livros'}});
        if (!res.ok) return null;
        return parseOpenLibrary(await res.json(), isbn);
    } catch {
        return null;
    }
}
