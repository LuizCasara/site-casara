/**
 * Agrupamento dos livros da estante por ANO DE LEITURA.
 *
 * A estante é uma linha do tempo: cada nicho guarda um ano, ou dois anos
 * vizinhos quando os dois juntos cabem. Quem decide isso é a largura real das
 * lombadas, não uma tabela escrita à mão — assim a divisão continua correta
 * quando o acervo cresce.
 *
 * .mjs pelo mesmo motivo de lib/livros/sala/book-dimensions.mjs: `node --test` roda isto
 * sem etapa de build.
 */

import {shelfWidthM, SHELF_GAP_M} from './book-dimensions.mjs';

/**
 * Teto de anos num nicho. **Existe desde 27/10/2026**: antes o nicho enchia
 * enquanto coubesse, e com lombadas mais finas 2020, 2021 e 2022 foram parar
 * juntos — três anos numa prateleira deixam de ler como linha do tempo. Com
 * dois, cada ano encosta numa lateral (ver `posicoesNoNicho`) e a divisão fica
 * à vista.
 */
export const MAX_ANOS_POR_NICHO = 2;

/**
 * Folga entre o livro da ponta e o montante do nicho, quando a fila encosta
 * numa lateral. Sem ela a lombada tocaria a madeira e o hover, que puxa e
 * inclina o livro, raspa no montante.
 */
export const MARGEM_LATERAL_DO_NICHO_M = 0.012;

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
            const temVaga = atual.anos.length < MAX_ANOS_POR_NICHO;
            const juntos = [...atual.livros, ...livrosDoAno];
            if (consecutivo && temVaga && shelfWidthM(juntos) <= capacidadeM) {
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

/**
 * Onde cada livro de um nicho fica, em X, relativo ao CENTRO do nicho — o
 * centro de cada lombada.
 *
 * - Um ano: a fila inteira centrada, como sempre foi.
 * - Dois anos: o mais antigo encosta na lateral ESQUERDA e o mais novo na
 *   DIREITA, e o vão entre eles é a divisória. Livros sem data acompanham o
 *   ano mais novo, que é o grupo a que eles pertencem.
 *
 * A margem contra o montante encolhe quando as duas filas quase enchem o
 * nicho: o agrupamento junta anos até a largura ÚTIL inteira, sem descontar
 * margem, e recentralizar nesse caso misturaria os anos enquanto
 * `ordemNaEstante` os separa. Só passando da largura útil (que o agrupamento
 * não produz) cai para a fila centrada, em vez de sobrepor livros.
 *
 * A ordem de `livros` é preservada dentro de cada lado — é por ela que a
 * ordenação do Índice atua.
 *
 * @returns `[{livro, x}]`, na ordem da esquerda para a direita.
 */
export function posicoesNoNicho(grupo, livros, larguraUtilM) {
    const enfileirar = (fila, inicioX) => {
        let x = inicioX;
        return fila.map((livro) => {
            const centro = x + livro.thicknessM / 2;
            x += livro.thicknessM + SHELF_GAP_M;
            return {livro, x: centro};
        });
    };
    const centrada = () => enfileirar(livros, -shelfWidthM(livros) / 2);

    if (grupo.anos.length < 2) return centrada();

    const primeiroAno = grupo.anos[0];
    const esquerda = livros.filter((l) => anoDeLeitura(l.finishedAt) === primeiroAno);
    const direita = livros.filter((l) => anoDeLeitura(l.finishedAt) !== primeiroAno);
    if (esquerda.length === 0 || direita.length === 0) return centrada();

    const larguraDireita = shelfWidthM(direita);
    const ocupado = shelfWidthM(esquerda) + SHELF_GAP_M + larguraDireita;
    if (ocupado > larguraUtilM) return centrada();
    const margem = Math.min(MARGEM_LATERAL_DO_NICHO_M, (larguraUtilM - ocupado) / 2);
    const limite = larguraUtilM / 2 - margem;

    return [...enfileirar(esquerda, -limite), ...enfileirar(direita, limite - larguraDireita)];
}

/**
 * Os livros de uma lista na ordem em que a ESTANTE de fato os mostra: nicho por
 * nicho, do de baixo para o de cima, e dentro de cada nicho a ordem que a lista
 * recebida já trazia.
 *
 * **Existe porque a lista plana e a estante nunca contaram a mesma história.**
 * `listarLivros` devolve os lidos por `COALESCE(shelf_order, 32767), title`, que
 * na prática é a ordem alfabética do acervo inteiro; a estante desmonta isso em
 * nichos de ano. Quem folheia um livro aberto com as setas percorria a lista
 * plana e via o ano mudar a cada passo — com 51 livros eram 39 trocas de ano,
 * contra as 4 que a estante tem. A seta seguia o alfabeto enquanto o olho
 * seguia as prateleiras.
 *
 * A ordem é a do MUNDO (mais antigo embaixo, subindo), e não a do trilho da
 * câmera, que varre os anos de cima para baixo: aqui se está folheando o que
 * está na prateleira, não sendo apresentado a ela. Ver `subParadasNoTrilho` em
 * lib/livros/sala/livros-cenas.mjs para o outro lado dessa distinção.
 *
 * Os `grupos` têm de vir do acervo INTEIRO (é assim que `Bookshelf` os monta),
 * e a lista pode ser um subconjunto filtrado dele — o contrário deixaria de
 * fora quem tem um ano que nenhum grupo cobre.
 */
export function ordemNaEstante(grupos, shelfBooks) {
    // Num nicho de dois anos o mais antigo vem primeiro, porque é ele que está
    // encostado à esquerda (ver `posicoesNoNicho`): a seta segue o olho.
    return grupos.flatMap((grupo) => {
        const livros = livrosDoGrupo(grupo, shelfBooks);
        if (grupo.anos.length < 2) return livros;
        const doPrimeiro = (l) => anoDeLeitura(l.finishedAt) === grupo.anos[0];
        return [...livros.filter(doPrimeiro), ...livros.filter((l) => !doPrimeiro(l))];
    });
}

/** Quantas estantes são necessárias para acomodar os grupos. Nunca menos de uma. */
export function contarEstantes(qtdGrupos, nichosPorEstante) {
    return Math.max(1, Math.ceil(qtdGrupos / nichosPorEstante));
}
