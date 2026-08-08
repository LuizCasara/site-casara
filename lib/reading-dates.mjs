/**
 * Estimativa da data de leitura (`finished_at`) a partir da ordem de leitura
 * e do tamanho de cada livro — lógica pura, sem dependências.
 *
 * .mjs de propósito, mesma razão de lib/book-dimensions.mjs: é o único jeito
 * de rodar `node --test` neste projeto e de ser importado tanto pelo CLI
 * (Node puro) quanto pelo Next.
 *
 * O problema que isto resolve: o acervo registra em que ANO cada livro foi
 * lido, mas não em que mês. Espalhar os livros do ano em meses distintos é o
 * que faz a ordenação por data ser estável e a estante por ano ter uma ordem
 * interna que significa alguma coisa.
 */

/**
 * Dia fixo no meio do mês. Não é 1 nem o último dia de propósito: `finished_at`
 * é uma coluna DATE que o driver devolve como meia-noite UTC, e um dia de
 * borda vira o mês vizinho ao ser lido num fuso negativo (America/Sao_Paulo é
 * UTC-3). O dia 15 tem 14 dias de folga dos dois lados.
 */
export const DIA_DO_MES = 15;

/**
 * Distribui os livros de um ano ao longo dos meses, proporcionalmente ao
 * número de páginas: um livro de 600 páginas ocupa o dobro do calendário de
 * um de 300, e a data devolvida é a de TÉRMINO dele.
 *
 * `livros` chega na ordem de leitura e essa ordem é preservada — o resultado
 * é sempre não-decrescente em mês. Livro sem `pages` usa `paginasPadrao`,
 * mesmo espírito do fallback de `bookThicknessM`.
 *
 * `mesLimite` existe para o ano corrente: em julho de 2026, espalhar os
 * livros de 2026 até dezembro dataria leituras no futuro. Passe o mês atual
 * e a distribuição inteira se comprime no que já passou.
 */
export function distribuirMeses(livros, ano, mesLimite = 12, paginasPadrao = 220) {
    if (livros.length === 0) return [];

    const limite = Math.min(12, Math.max(1, mesLimite));
    const paginas = livros.map((l) => (typeof l.pages === 'number' && l.pages > 0 ? l.pages : paginasPadrao));
    const total = paginas.reduce((soma, p) => soma + p, 0);

    let acumulado = 0;
    let mesAnterior = 1;

    return livros.map((livro, i) => {
        acumulado += paginas[i];
        const fracao = acumulado / total;

        // `ceil` e não `round`: a fração só chega a 1 no último livro, então
        // arredondar pra cima garante que o último caia exatamente no mês
        // limite e que nenhum livro caia no mês 0.
        let mes = Math.ceil(fracao * limite);
        mes = Math.min(limite, Math.max(1, mes));
        // A proporcionalidade nunca anda pra trás, mas um `limite` pequeno com
        // muitos livros faz vários caírem no mesmo mês — o que é correto (foram
        // lidos no mesmo mês), desde que a sequência não regrida.
        mes = Math.max(mes, mesAnterior);
        mesAnterior = mes;

        return {
            ...livro,
            ano,
            mes,
            finished_at: `${ano}-${String(mes).padStart(2, '0')}-${String(DIA_DO_MES).padStart(2, '0')}`,
        };
    });
}
