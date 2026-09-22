import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corDeLombada} from './cor-lombada.mjs';
import {luminanciaRelativa, hexParaRgb} from './contraste.mjs';

/** Distância euclidiana no RGB, de 0 a 441. */
function distancia(a, b) {
    const [x, y] = [hexParaRgb(a), hexParaRgb(b)];
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

const LIMIAR_BLOOM = 0.78;

test('nenhuma lombada passa do teto de luminância', () => {
    // As três primeiras são casos reais do acervo: capas de fundo branco viram
    // spine_color quase branco, e eram elas que brilhavam na estante.
    for (const cor of ['#f8f8e8', '#ffffff', '#fdfaf2', '#e8dcc8', '#c9a24a']) {
        const luz = luminanciaRelativa(corDeLombada(cor));
        assert.ok(luz <= 0.43, `${cor} -> ${corDeLombada(cor)} com luminância ${luz.toFixed(3)}`);
        assert.ok(luz < LIMIAR_BLOOM, 'a lombada ainda cruzaria o limiar do Bloom');
    }
});

test('cores escuras clareiam um pouco, em vez de sumirem no preto', () => {
    // A mistura com creme não serve só para dessaturar: sem ela, uma capa
    // preta viraria um retângulo invisível na sala escura.
    const preto = luminanciaRelativa(corDeLombada('#000000'));
    assert.ok(preto > luminanciaRelativa('#000000'), 'preto não clareou');
    assert.ok(preto < 0.2, 'preto clareou demais e perdeu a identidade');
});

test('a paleta aquece: o azul puro perde azul e ganha vermelho', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(corDeLombada('#0000ff').slice(i, i + 2), 16));
    assert.ok(r > 0, 'não ganhou nada de vermelho');
    assert.ok(g > 0, 'não ganhou nada de verde');
    assert.ok(b < 255, 'continuou com azul puro');
    assert.ok(r > g * 0.8, 'o vermelho ficou baixo demais para ler como quente');
});

test('cores diferentes continuam distinguíveis entre si', () => {
    // O risco do outro lado: dessaturar tanto que a estante vire uma fileira
    // de tijolos iguais.
    //
    // A régua é distância no RGB, e NÃO a razão de contraste da WCAG: aquela
    // só compara luminância, então duas cores de matizes bem diferentes mas
    // igualmente claras (um salmão e um azul-acinzentado, por exemplo)
    // pontuam como se fossem a mesma cor. Foi o que reprovou este teste na
    // primeira escrita, com o código já correto.
    const pares = [['#b53b3b', '#3f5f8a'], ['#2d6a4f', '#8a3b2e'], ['#000000', '#ffffff']];
    for (const [x, y] of pares) {
        const [a, b] = [corDeLombada(x), corDeLombada(y)];
        assert.ok(distancia(a, b) > 40, `${x}->${a} e ${y}->${b} ficaram parecidas demais`);
    }
});

test('é determinística e devolve hex válido', () => {
    assert.equal(corDeLombada('#b53b3b'), corDeLombada('#b53b3b'));
    assert.match(corDeLombada('#b53b3b'), /^#[0-9a-f]{6}$/);
    // Entrada quebrada não pode derrubar a estante inteira.
    assert.match(corDeLombada('nao-e-cor'), /^#[0-9a-f]{6}$/);
});
