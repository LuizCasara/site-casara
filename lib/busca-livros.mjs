/**
 * Busca por texto no acervo — casa contra título e autor.
 *
 * Roda no cliente, sobre a lista inteira já carregada, e não como um `LIKE` no
 * banco. Com ~50 livros a lista toda cabe numa página e filtrar em memória é
 * instantâneo; um `ILIKE` por tecla digitada seria um round-trip por
 * caractere para responder o que já está na tela. Se o acervo passar de uns
 * poucos milhares, isto vira uma query — e é por isso que a regra de
 * casamento mora aqui, isolada de quem chama.
 *
 * .mjs e testado: acento e caixa são exatamente o tipo de coisa que quebra em
 * silêncio, devolvendo "nenhum livro" para uma busca que deveria achar.
 */

/**
 * Minúsculas e SEM acento. `NFD` separa a letra do acento em dois pontos de
 * código, e o replace apaga só os acentos — é o que faz "revolucao" achar
 * "Revolução" e "Sofia" achar "Sofía". Sem isso, quem digita sem acento (a
 * maioria, no celular) não acha nada.
 */
export function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
}

/**
 * O livro casa com o termo?
 *
 * Cada palavra do termo precisa aparecer em algum lugar do título ou do autor,
 * e não a frase inteira em sequência: assim "sapiens harari" acha o livro, e
 * "harari sapiens" também. Buscar a frase exata falharia nos dois casos, que
 * é justamente como se busca um livro de que se lembra pela metade.
 */
export function casaBusca(livro, termo) {
    const alvo = normalizar(termo);
    if (!alvo) return true;

    const campos = `${normalizar(livro.title)} ${normalizar(livro.author)}`;
    return alvo.split(/\s+/).every((palavra) => campos.includes(palavra));
}

/** Filtra preservando a ordem recebida. */
export function filtrarPorBusca(livros, termo) {
    if (!normalizar(termo)) return livros;
    return livros.filter((livro) => casaBusca(livro, termo));
}
