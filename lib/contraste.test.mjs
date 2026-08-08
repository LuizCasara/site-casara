import {test} from 'node:test';
import assert from 'node:assert/strict';
import {luminanciaRelativa, razaoDeContraste, corDeTextoSobre} from './contraste.mjs';
import {CATEGORIES} from './book-categories.mjs';

test('casos conhecidos da fórmula', () => {
    assert.equal(luminanciaRelativa('#ffffff'), 1);
    assert.equal(luminanciaRelativa('#000000'), 0);
    assert.equal(razaoDeContraste('#ffffff', '#000000'), 21);
    assert.equal(razaoDeContraste('#ec4899', '#ec4899'), 1);
    assert.equal(razaoDeContraste('#000000', '#000000'), 1);
});

test('corDeTextoSobre escolhe a cor de maior contraste', () => {
    assert.equal(corDeTextoSobre('#84cc16'), '#000000');
    assert.equal(corDeTextoSobre('#475569'), '#ffffff');
});

test('toda cor de CATEGORIES atinge pelo menos 4.5:1 com a cor de texto escolhida', () => {
    for (const {id, cor} of CATEGORIES) {
        const texto = corDeTextoSobre(cor);
        const contraste = razaoDeContraste(cor, texto);
        assert.ok(contraste >= 4.5,
            `categoria ${id} (${cor}): contraste ${contraste.toFixed(2)} com ${texto} < 4.5`);
    }
});

test('cores usadas nos chips fixos do BookFilters atingem pelo menos 4.5:1', () => {
    for (const cor of ['#059669', '#475569', '#0ea5e9']) {
        const texto = corDeTextoSobre(cor);
        const contraste = razaoDeContraste(cor, texto);
        assert.ok(contraste >= 4.5,
            `${cor}: contraste ${contraste.toFixed(2)} com ${texto} < 4.5`);
    }
});
