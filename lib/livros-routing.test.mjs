import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveLivrosMode} from './livros-routing.mjs';

test('deriveLivrosMode reconhece a sala', () => {
    assert.deepEqual(deriveLivrosMode('/livros'), {kind: 'sala'});
});

test('deriveLivrosMode ignora a lista — ela nunca ativa o 3D', () => {
    assert.equal(deriveLivrosMode('/livros/lista'), null);
});

test('deriveLivrosMode reconhece um livro pelo slug', () => {
    assert.deepEqual(deriveLivrosMode('/livros/o-nome-do-vento'), {kind: 'livro', slug: 'o-nome-do-vento'});
});

test('deriveLivrosMode ignora rotas fora de /livros', () => {
    assert.equal(deriveLivrosMode('/'), null);
    assert.equal(deriveLivrosMode('/about'), null);
    assert.equal(deriveLivrosMode(null), null);
    assert.equal(deriveLivrosMode(undefined), null);
});
