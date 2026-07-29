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

/**
 * Tempo máximo de espera por uma resposta antes de desistir e tratar como
 * falha de rede. Sem isso, uma conexão que trava sem rejeitar (nem erro, nem
 * timeout do próprio Node) pendura o `seed` inteiro no meio da fila — a
 * retentativa nunca é acionada porque, do ponto de vista do código, nada
 * "falhou" ainda. 12s é folgado o bastante para uma resposta lenta normal da
 * Open Library, mas curto o bastante para não travar uma importação de 51
 * livros por causa de uma única requisição capenga.
 */
const TIMEOUT_MS = 12000;

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
 * Sinaliza falha de REDE — fetch rejeitou (inclusive por abort de timeout),
 * a resposta não foi 2xx, ou o corpo não era JSON válido (proxy, timeout
 * parcial, resposta cortada podem devolver HTTP 200 com lixo no corpo).
 * Tudo isso é transitório, diferente de "a Open Library respondeu de
 * verdade e não tem o livro".
 *
 * Essa distinção importa no `seed`: engolir os dois casos em `null` (como o
 * lookup por ISBN faz em openlibrary.mjs, onde a diferença não importa tanto
 * porque é um livro por vez) faria uma falha passageira de rede virar, para
 * o operador, um "achou: NÃO" indistinguível de um livro que a Open Library
 * realmente não tem — em uma importação de 51 livros em sequência, isso é
 * grave o bastante para merecer um tipo de erro próprio.
 */
export class BuscaFalhouError extends Error {}

/**
 * `fetchImpl` é injetável (default: `fetch` global) só para permitir testar
 * a classificação de erro e a lógica de timeout sem rede de verdade — a
 * assinatura pública de dois argumentos usada pelo `seed`
 * (`buscarPorTitulo(title, author)`) não muda.
 */
export async function buscarPorTitulo(title, author, fetchImpl = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        let res;
        try {
            res = await fetchImpl(montarUrlBusca(title, author), {
                headers: {'User-Agent': 'luizcasara.com/livros'},
                signal: controller.signal,
            });
        } catch (erro) {
            // Cobre tanto falha de conexão quanto o abort do timeout acima —
            // o AbortController faz o fetch rejeitar, então cai aqui também.
            throw new BuscaFalhouError(`Falha de rede ao buscar "${title}": ${erro.message}`);
        }
        if (!res.ok) {
            throw new BuscaFalhouError(`Open Library respondeu HTTP ${res.status} para "${title}"`);
        }
        // O .json() fica DENTRO do try: um corpo ilegível (200 com HTML de
        // erro de proxy, resposta truncada, etc.) precisa cair no mesmo
        // caminho de falha de rede, não escapar como SyntaxError cru.
        try {
            return parseBusca(await res.json());
        } catch (erro) {
            throw new BuscaFalhouError(`Resposta ilegível da Open Library para "${title}": ${erro.message}`);
        }
    } finally {
        clearTimeout(timer);
    }
}

/** Pausa entre a primeira tentativa e o retry — dá tempo para uma falha transitória se resolver. */
const PAUSA_RETRY_MS = 3000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Busca com UMA retentativa: se a primeira tentativa falhar por rede
 * (`BuscaFalhouError`), espera `pausaMs` e tenta mais uma vez antes de
 * desistir. Devolve `{resultado, falhouRede}` em vez de deixar a exceção
 * escapar — o `seed` processa 51 livros em sequência, e uma falha de rede
 * transitória num deles não pode interromper os outros 50.
 *
 * Erros que NÃO são `BuscaFalhouError` (bug de programação, por exemplo)
 * continuam sendo relançados — só falha de rede é engolida aqui.
 *
 * `pausaMs` tem `PAUSA_RETRY_MS` (3s) como padrão real, mas é parâmetro para
 * os testes poderem passar um valor minúsculo e não esperar 3s de verdade
 * por execução.
 */
export async function buscarComRetentativa(title, author, fetchImpl = fetch, pausaMs = PAUSA_RETRY_MS) {
    try {
        return {resultado: await buscarPorTitulo(title, author, fetchImpl), falhouRede: false};
    } catch (erro) {
        if (!(erro instanceof BuscaFalhouError)) throw erro;
        console.log(`  ⚠ falha de rede em "${title}" — tentando de novo em ${pausaMs / 1000}s...`);
        await dormir(pausaMs);
        try {
            return {resultado: await buscarPorTitulo(title, author, fetchImpl), falhouRede: false};
        } catch (erro2) {
            if (!(erro2 instanceof BuscaFalhouError)) throw erro2;
            return {resultado: null, falhouRede: true};
        }
    }
}
