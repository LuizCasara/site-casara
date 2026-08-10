import test from 'node:test';
import assert from 'node:assert/strict';
import {
    QUADROS_DO_FUNDO, FOLGA_MINIMA_M, vaoDe, sobreposicaoM,
    colisoesNaParede, ocupantesDaParedeDoFundo,
} from './parede-do-fundo.mjs';
import {BOOKSHELF_SIZE_M} from './bookshelf-model.mjs';

/**
 * A folga entre duas estantes vizinhas. **Espelha `ESTANTE_GAP_M` de
 * `components/livros/decor/EstanteDoAcervo.tsx`**, que é território congelado e
 * um `.tsx` — `node --test` não importa TypeScript sem build, e mover a
 * constante para cá exigiria mexer num arquivo que só se toca com pedido
 * explícito. É a única coisa duplicada neste arquivo, e a menos provável de
 * mudar: o que cresce é a QUANTIDADE de estantes, e disso o teste sabe sozinho.
 */
const ESTANTE_GAP_M = 0.06;

/** Mesma conta de `posicaoDaEstante`: o conjunto fica centrado na parede. */
function vaosDasEstantes(total) {
    const passo = BOOKSHELF_SIZE_M.larguraM + ESTANTE_GAP_M;
    return Array.from({length: total}, (_, i) => {
        const x = (i - (total - 1) / 2) * passo;
        return [x - BOOKSHELF_SIZE_M.larguraM / 2, x + BOOKSHELF_SIZE_M.larguraM / 2];
    });
}

/** Os pares em colisão, como "a × b" ordenado — o que os testes comparam. */
function paresEmColisao(total) {
    return colisoesNaParede(ocupantesDaParedeDoFundo(vaosDasEstantes(total)))
        .map((c) => [c.a, c.b].sort().join(' × '))
        .sort();
}

test('o vão de uma peça é o centro dela mais e menos meia largura', () => {
    assert.deepEqual(vaoDe({x: -1.45, larguraM: 0.5}), [-1.7, -1.2]);
});

test('sobreposição positiva é invasão; negativa é a folga que sobra', () => {
    assert.equal(Number(sobreposicaoM([0, 1], [0.8, 2]).toFixed(4)), 0.2);
    assert.equal(Number(sobreposicaoM([0, 1], [1.3, 2]).toFixed(4)), -0.3);
    // Encostando exatamente, a sobreposição é zero — nem invasão nem folga.
    assert.equal(sobreposicaoM([0, 1], [1, 2]), 0);
});

test('duas peças separadas por menos que a folga já contam como colisão', () => {
    const quase = colisoesNaParede(
        [{nome: 'a', vao: [0, 1]}, {nome: 'b', vao: [1.01, 2]}],
        FOLGA_MINIMA_M,
    );
    assert.equal(quase.length, 1);
    assert.deepEqual([quase[0].a, quase[0].b], ['a', 'b']);

    const folgado = colisoesNaParede(
        [{nome: 'a', vao: [0, 1]}, {nome: 'b', vao: [1.2, 2]}],
        FOLGA_MINIMA_M,
    );
    assert.deepEqual(folgado, []);
});

test('a colisão diz QUEM está em cima de quem, e por quanto', () => {
    const [colisao] = colisoesNaParede([
        {nome: 'quadro', vao: [-1, 0]},
        {nome: 'estante', vao: [-0.3, 1]},
    ]);
    assert.deepEqual(colisao, {a: 'quadro', b: 'estante', sobreposicaoM: 0.3});
});

test('COM UMA ESTANTE — a configuração de hoje — a parede do fundo está livre', () => {
    assert.deepEqual(paresEmColisao(1), []);
});

test('a folga mínima não reprova o par mais apertado que a sala já tem', () => {
    // Quadro de recados contra a estante: 4,2cm. É o vizinho mais próximo da
    // parede hoje e funciona — é dele que sai o limiar de 3cm. Se este número
    // encolher, o teste acima vira falso positivo antes de qualquer outra coisa.
    const entreQuadroEEstante = -sobreposicaoM(
        vaoDe(QUADROS_DO_FUNDO.recomendacoes),
        vaosDasEstantes(1)[0],
    );
    assert.ok(
        entreQuadroEEstante > FOLGA_MINIMA_M,
        `o quadro de recados está a ${(entreQuadroEEstante * 100).toFixed(1)}cm da estante,`
        + ` abaixo da folga mínima de ${FOLGA_MINIMA_M * 100}cm`,
    );
    assert.ok(entreQuadroEEstante < 0.05, 'esperava que este fosse o par mais apertado da parede');
});

/**
 * Os dois limites conhecidos desta parede, registrados como asserção em vez de
 * comentário.
 *
 * A estante do acervo ganha uma cópia a cada cinco grupos de ano, e o conjunto
 * fica CENTRADO na parede — então cada móvel novo empurra as bordas para os dois
 * lados, por cima do que já está pendurado ali. Um quadro enterrado em madeira
 * não estoura exceção nem quebra build: só some.
 *
 * O teste AFIRMA as colisões em vez de falhar por causa delas porque hoje não
 * acontecem, e uma suíte vermelha por um estado futuro é ruído, não aviso. O que
 * ele garante é que a conta continua sendo feita: mexer nas larguras e alguma
 * dessas colisões mudar de tamanho ou de par quebra o teste, e obriga a reler a
 * parede em vez de descobrir de olho.
 */
test('COM DUAS ESTANTES o quadro de recados é engolido pela segunda — limite conhecido', () => {
    // **Este é o próximo passo do crescimento, não um cenário remoto**, e o
    // problema é anterior a qualquer pôster: o quadro de recados está em x=0,68
    // desde que existe, e a segunda estante avança até 0,87.
    assert.deepEqual(paresEmColisao(2), ['estante-1 × quadro-recomendacoes']);
});

test('COM TRÊS ESTANTES o Gorillaz também deixa de caber — limite conhecido', () => {
    assert.deepEqual(paresEmColisao(3), [
        'estante-0 × quadro-gorillaz',
        'estante-2 × quadro-recomendacoes',
    ]);
});
