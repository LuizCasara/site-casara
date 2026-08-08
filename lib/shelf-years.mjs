/**
 * Agrupamento dos livros da estante por ANO DE LEITURA.
 *
 * A estante é uma linha do tempo: cada nicho guarda um ano, ou dois anos
 * vizinhos quando os dois juntos cabem. Quem decide isso é a largura real das
 * lombadas, não uma tabela escrita à mão — assim a divisão continua correta
 * quando o acervo cresce.
 *
 * .mjs pelo mesmo motivo de lib/book-dimensions.mjs: `node --test` roda isto
 * sem etapa de build.
 */

import {shelfWidthM} from './book-dimensions.mjs';

/**
 * Ano em que o livro foi lido, ou `null` se não há data.
 *
 * Lê com `getUTCFullYear`, não com o getter local: `finished_at` é uma coluna
 * DATE do Postgres, que o driver devolve como meia-noite UTC — em
 * America/Sao_Paulo (UTC-3), 2024-01-01 lido localmente vira 31/12/2023 e o
 * livro pularia de nicho.
 */
export function anoDeLeitura(finishedAt) {
    if (!finishedAt) return null;
    const d = new Date(finishedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCFullYear();
}

/** "2024" para um ano só, "2020-21" para uma faixa. */
function rotuloDeAnos(anos) {
    if (anos.length === 0) return 's/ data';
    const primeiro = anos[0];
    const ultimo = anos[anos.length - 1];
    if (primeiro === ultimo) return String(primeiro);
    return `${primeiro}-${String(ultimo).slice(-2)}`;
}

/**
 * Divide os livros em grupos cronológicos que cabem num nicho.
 *
 * Percorre os anos do mais antigo ao mais novo e só junta o ano seguinte ao
 * grupo atual se a soma das lombadas couber em `capacidadeM`. O resultado sai
 * em ordem cronológica — o índice 0 é o grupo mais antigo, que vai no nicho de
 * BAIXO, porque a leitura sobe.
 *
 * Um ano que sozinho já estoura a capacidade fica sozinho mesmo assim: não há
 * como partir um ano ao meio sem mentir sobre o que o nicho guarda, e é o
 * transbordo para a segunda estante (ver `contarEstantes`) que resolve o
 * espaço.
 *
 * Livros sem data de leitura vão para o grupo mais recente, que passa a
 * declarar `temSemData` — sumir da estante seria o pior desfecho possível para
 * um acervo pessoal.
 */
export function agruparPorAnoDeLeitura(shelfBooks, capacidadeM) {
    if (shelfBooks.length === 0) return [];

    const porAno = new Map();
    const semData = [];
    for (const livro of shelfBooks) {
        const ano = anoDeLeitura(livro.finishedAt);
        if (ano === null) {
            semData.push(livro);
            continue;
        }
        if (!porAno.has(ano)) porAno.set(ano, []);
        porAno.get(ano).push(livro);
    }

    const anosOrdenados = [...porAno.keys()].sort((a, b) => a - b);
    const grupos = [];
    let atual = null;

    for (const ano of anosOrdenados) {
        const livrosDoAno = porAno.get(ano);
        if (atual) {
            // Só junta ano CONSECUTIVO no calendário, além de caber. Sem essa
            // condição, um acervo com um buraco (nada lido em 2021-2025)
            // juntaria 2020 com 2026 e a etiqueta diria "2020-26" — uma faixa
            // que promete seis anos de leitura e entrega dois.
            const consecutivo = ano === atual.anos[atual.anos.length - 1] + 1;
            const juntos = [...atual.livros, ...livrosDoAno];
            if (consecutivo && shelfWidthM(juntos) <= capacidadeM) {
                atual.anos.push(ano);
                atual.livros = juntos;
                continue;
            }
        }
        atual = {anos: [ano], livros: livrosDoAno};
        grupos.push(atual);
    }

    if (semData.length > 0) {
        if (grupos.length === 0) grupos.push({anos: [], livros: []});
        grupos[grupos.length - 1].temSemData = true;
    }

    return grupos.map((g) => ({
        anos: g.anos,
        temSemData: Boolean(g.temSemData),
        rotulo: g.temSemData && g.anos.length > 0
            ? `${rotuloDeAnos(g.anos)} + s/ data`
            : rotuloDeAnos(g.anos),
    }));
}

/**
 * Os livros de um grupo dentro de uma lista qualquer — normalmente a lista já
 * ordenada e filtrada que está na tela.
 *
 * Existe separado de `agruparPorAnoDeLeitura` de propósito: o agrupamento é
 * calculado uma vez sobre o acervo INTEIRO, e filtrar não pode fazer os anos
 * trocarem de nicho debaixo do dedo de quem está filtrando. A ordem da lista
 * recebida é preservada, que é como a ordenação do Índice atua dentro do
 * nicho.
 */
export function livrosDoGrupo(grupo, shelfBooks) {
    const anos = new Set(grupo.anos);
    return shelfBooks.filter((livro) => {
        const ano = anoDeLeitura(livro.finishedAt);
        if (ano === null) return grupo.temSemData;
        return anos.has(ano);
    });
}

/** Quantas estantes são necessárias para acomodar os grupos. Nunca menos de uma. */
export function contarEstantes(qtdGrupos, nichosPorEstante) {
    return Math.max(1, Math.ceil(qtdGrupos / nichosPorEstante));
}
