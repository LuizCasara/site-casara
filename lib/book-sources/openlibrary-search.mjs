/**
 * Busca na Open Library por título + autor.
 *
 * Endpoint diferente do lookup por ISBN (openlibrary.mjs): /search.json em vez
 * de /api/books. Usado só pelo comando `seed`, onde não existem ISBNs.
 *
 * Devolve APENAS pages, year e coverUrl. Nunca título nem autor: a busca da
 * Open Library é suja nesses campos — o registro de "A Revolta de Atlas" traz
 * um texto publicitário dentro de author_name, e a melhor correspondência de
 * título costuma ser um box ou uma edição estrangeira.
 */
const ENDPOINT = 'https://openlibrary.org/search.json';
const CAMPOS = 'title,author_name,first_publish_year,number_of_pages_median,cover_i';

export function montarUrlBusca(title, author) {
    const p = new URLSearchParams({
        title: String(title),
        author: String(author ?? ''),
        limit: '1',
        fields: CAMPOS,
    });
    return `${ENDPOINT}?${p}`;
}

/** Extrai só o que é confiável do primeiro resultado. */
export function parseBusca(json) {
    const doc = json?.docs?.[0];
    if (!doc) return null;
    return {
        pages: Number(doc.number_of_pages_median) || null,
        year: Number(doc.first_publish_year) || null,
        coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
            : null,
    };
}

/**
 * Sinaliza falha de REDE (fetch rejeitou, ou a resposta não foi 2xx) — algo
 * transitório, diferente de "a Open Library respondeu e não tem o livro".
 *
 * Essa distinção importa no `seed`: engolir os dois casos em `null` (como o
 * lookup por ISBN faz em openlibrary.mjs, onde a diferença não importa tanto
 * porque é um livro por vez) faria uma falha passageira de rede virar, para
 * o operador, um "achou: NÃO" indistinguível de um livro que a Open Library
 * realmente não tem — em uma importação de 51 livros em sequência, isso é
 * grave o bastante para merecer um tipo de erro próprio.
 */
export class BuscaFalhouError extends Error {}

export async function buscarPorTitulo(title, author) {
    let res;
    try {
        res = await fetch(montarUrlBusca(title, author), {
            headers: {'User-Agent': 'luizcasara.com/livros'},
        });
    } catch (erro) {
        throw new BuscaFalhouError(`Falha de rede ao buscar "${title}": ${erro.message}`);
    }
    if (!res.ok) {
        throw new BuscaFalhouError(`Open Library respondeu HTTP ${res.status} para "${title}"`);
    }
    return parseBusca(await res.json());
}
