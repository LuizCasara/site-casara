import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CENAS, cenaVizinha} from './livros-cenas.mjs';

test('cenaVizinha anda para os dois lados', () => {
    assert.equal(cenaVizinha('geral', 1), 'estante');
    assert.equal(cenaVizinha('estante', 1), 'mesa');
    assert.equal(cenaVizinha('mesa', -1), 'estante');
    assert.equal(cenaVizinha('estante', -1), 'geral');
});

test('cenaVizinha dá a volta nas duas pontas', () => {
    // O caso que o `+ CENAS.length` antes do módulo protege: sem ele,
    // (0 - 1) % 3 é -1 em JS e isto devolveria undefined.
    assert.equal(cenaVizinha('geral', -1), 'mesa');
    assert.equal(cenaVizinha('mesa', 1), 'geral');
});

test('cenaVizinha cai na primeira cena quando a atual é desconhecida', () => {
    assert.equal(cenaVizinha('livro', 1), CENAS[0].id);
    assert.equal(cenaVizinha(undefined, -1), CENAS[0].id);
});

test('CENAS não tem id repetido — a navegação depende de findIndex', () => {
    assert.equal(new Set(CENAS.map((c) => c.id)).size, CENAS.length);
});
