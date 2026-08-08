/**
 * Medidas do modelo de estante `public/livros/modelos/bookshelf-tall.glb`
 * (poly.pizza/m/30Iealxb0p, CC0) — 5 nichos empilhados em zigue-zague.
 *
 * Os números NATIVOS abaixo foram medidos lendo os vértices do próprio .glb
 * (planos horizontais = prateleiras, planos verticais = montantes), já
 * multiplicados pela escala 100 do nó que embrulha a malha.
 * `lib/bookshelf-model.test.mjs` refaz essa leitura e confere — trocar o
 * arquivo sem atualizar esta tabela quebra o teste em vez de enterrar os
 * livros na madeira.
 *
 * .mjs, não .ts: é importado tanto pelo Next quanto pelos testes de
 * `node --test`, mesma razão de lib/book-dimensions.mjs.
 */

import {BOOK_HEIGHT_BASE_M} from './book-dimensions.mjs';

const NATIVO = {
    larguraM: 0.574,
    alturaM: 1.320,
    profundidadeM: 0.154,
    /** Topo de cada prateleira — é onde o livro do nicho assenta. */
    pisos: [0.032, 0.289, 0.546, 0.804, 1.062],
    /** Vão livre entre uma prateleira e a de cima. */
    vaoM: 0.235,
    /** Distância entre os dois montantes internos de um nicho. */
    larguraUtilM: 0.409,
    /**
     * Deslocamento do centro do nicho em relação ao centro do MÓVEL (não ao
     * pivô do arquivo): é isso que o zigue-zague significa. O sinal alterna a
     * cada andar, começando pela direita na base. Relativo ao centro porque
     * `KenneyModel` centraliza a peça pela bounding box.
     */
    offsetXM: 0.0615,
    /**
     * A "vitrine": o compartimento estreito que sobra do lado OPOSTO ao vão
     * dos livros. É isto que o zigue-zague deixa livre em cada andar — 10cm
     * nativos entre o montante interno e a lateral externa, com a MESMA
     * prateleira por baixo (elas atravessam a largura inteira do móvel, mesmo
     * onde não há vão fechado), o que faz dela apoio de verdade e não um
     * buraco.
     *
     * Como o `offsetXM` acima, é medido a partir do centro do MÓVEL, e o sinal
     * é sempre o oposto ao do nicho. Nas coordenadas cruas do arquivo as duas
     * vitrines parecem assimétricas (-0.271..-0.169 contra 0.159..0.261), mas
     * isso é só o pivô do modelo estar 5mm fora do centro — descontado ele,
     * as duas caem exatamente em ±0.215.
     */
    vitrineOffsetXM: 0.2150,
    vitrineLarguraM: 0.1022,
};

/**
 * Folga vertical além da altura do livro. O hover puxa o livro para fora e o
 * inclina; sem folga ele raspa na prateleira de cima durante o gesto.
 */
const FOLGA_VERTICAL_M = 0.042;

/**
 * A escala NÃO é escolhida a olho: ela é a menor que faz o livro caber no vão
 * com folga. Sai em ~1,45 — e, por consequência, a profundidade do móvel
 * passa a acomodar os 20cm do livro, que no tamanho nativo ficavam 4,6cm
 * para fora.
 */
export const BOOKSHELF_SCALE = (BOOK_HEIGHT_BASE_M + FOLGA_VERTICAL_M) / NATIVO.vaoM;

export const BOOKSHELF_SIZE_M = {
    larguraM: NATIVO.larguraM * BOOKSHELF_SCALE,
    alturaM: NATIVO.alturaM * BOOKSHELF_SCALE,
    profundidadeM: NATIVO.profundidadeM * BOOKSHELF_SCALE,
};

/**
 * Um nicho por andar, do mais baixo (índice 0) ao mais alto. `pisoY` e
 * `offsetX` são relativos ao ponto de apoio da estante no chão, no centro do
 * móvel — o mesmo contrato de posicionamento de `KenneyModel`.
 */
export const NICHOS = NATIVO.pisos.map((piso, i) => {
    const lado = i % 2 === 0 ? 1 : -1;
    return {
        indice: i,
        pisoY: piso * BOOKSHELF_SCALE,
        offsetX: lado * NATIVO.offsetXM * BOOKSHELF_SCALE,
        larguraUtilM: NATIVO.larguraUtilM * BOOKSHELF_SCALE,
        alturaUtilM: NATIVO.vaoM * BOOKSHELF_SCALE,
        /** Centro do compartimento livre do lado oposto ao vão — ver NATIVO. */
        vitrineOffsetX: -lado * NATIVO.vitrineOffsetXM * BOOKSHELF_SCALE,
        vitrineLarguraM: NATIVO.vitrineLarguraM * BOOKSHELF_SCALE,
    };
});

export const NICHOS_POR_ESTANTE = NICHOS.length;

/** Quanto de lombada cabe num nicho — a régua do agrupamento por ano. */
export const NICHO_CAPACIDADE_M = NICHOS[0].larguraUtilM;
