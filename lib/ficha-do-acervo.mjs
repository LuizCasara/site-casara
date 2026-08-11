/**
 * Os números que a carteira de caçador mostra sobre o acervo.
 *
 * **Conta pura sobre a lista que o `RoomCanvas` JÁ recebe** — nenhuma query
 * nova, nenhuma rota nova, nada gravado. Os livros com status 'lido' chegam ao
 * canvas com `pages`, `finished_at`, `rating` e `category` porque a estante
 * precisa deles de qualquer forma; a ficha é uma leitura diferente do mesmo
 * array.
 *
 * .mjs e não .ts pelo mesmo motivo de `shelf-years.mjs` e `book-dimensions.mjs`:
 * é lógica pura, e lógica pura é a única coisa que este projeto testa por
 * `node --test`, que roda sem etapa de build.
 */

import {anoDeLeitura} from './shelf-years.mjs';

/**
 * @param livros lista de livros LIDOS, na forma que `app/livros/layout.tsx`
 *   entrega ao canvas (`pages`, `finished_at`, `rating`, `category`). Nada aqui
 *   assume que os campos estão preenchidos: um acervo real tem livro sem
 *   página, sem data e sem nota, e cada um deles tem que sair da média sem
 *   derrubar o resto da ficha.
 */
export function fichaDoAcervo(livros = []) {
    const paginas = somarPaginas(livros);
    return {
        lidos: livros.length,
        paginas,
        /** Quantos livros não entraram na soma de páginas — ver `paginas`. */
        semPaginas: livros.filter((l) => !paginaValida(l?.pages)).length,
        desde: primeiroAno(livros),
        categoriaTop: categoriaMaisLida(livros),
        notaMedia: mediaDasNotas(livros),
    };
}

/**
 * `pages` chega do banco como INTEGER, mas um valor zero ou negativo é dado
 * corrompido, não "um livro de zero páginas" — e somá-lo estragaria o total em
 * silêncio.
 */
function paginaValida(pages) {
    const n = Number(pages);
    return Number.isFinite(n) && n > 0;
}

function somarPaginas(livros) {
    let total = 0;
    for (const livro of livros) {
        if (paginaValida(livro?.pages)) total += Number(livro.pages);
    }
    return total;
}

/**
 * O ano do livro lido mais antigo — o "leitor desde" da carteira.
 *
 * `null` quando nenhum livro tem data, que é um estado real: um acervo recém
 * cadastrado pode ter os 50 livros e nenhuma data de leitura. A carteira omite
 * a linha em vez de inventar o ano corrente.
 */
function primeiroAno(livros) {
    let menor = null;
    for (const livro of livros) {
        const ano = anoDeLeitura(livro?.finished_at);
        if (ano === null) continue;
        if (menor === null || ano < menor) menor = ano;
    }
    return menor;
}

/**
 * A categoria com mais livros lidos.
 *
 * **O desempate é alfabético, e não "a primeira que apareceu"**: a ordem da
 * lista muda com o `ORDER BY` da query e com o critério do Índice, e uma
 * carteira que troca de categoria favorita conforme a ordenação escolhida na
 * tela seria um número que não quer dizer nada.
 */
function categoriaMaisLida(livros) {
    const contagem = new Map();
    for (const livro of livros) {
        const cat = livro?.category;
        if (!cat) continue;
        contagem.set(cat, (contagem.get(cat) ?? 0) + 1);
    }
    if (contagem.size === 0) return null;

    let melhor = null;
    for (const [categoria, quantos] of contagem) {
        if (melhor === null
            || quantos > melhor.quantos
            || (quantos === melhor.quantos && categoria < melhor.categoria)) {
            melhor = {categoria, quantos};
        }
    }
    return melhor;
}

/**
 * Média das notas, com uma casa decimal.
 *
 * `rating` é NUMERIC no Postgres e o driver do Neon devolve NUMERIC como
 * STRING — somar direto concatenaria texto ("4"+"5" = "45") e a média sairia
 * absurda sem nada quebrar. Daí o `Number()` explícito em cada item.
 */
function mediaDasNotas(livros) {
    const notas = [];
    for (const livro of livros) {
        if (livro?.rating === null || livro?.rating === undefined) continue;
        const n = Number(livro.rating);
        if (Number.isFinite(n)) notas.push(n);
    }
    if (notas.length === 0) return null;
    const soma = notas.reduce((a, b) => a + b, 0);
    return Math.round((soma / notas.length) * 10) / 10;
}
