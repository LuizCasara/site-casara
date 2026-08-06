import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveLivrosMode, deveMontarSala} from './livros-routing.mjs';

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

test('a sala monta em /livros e num livro aberto de fora', () => {
    assert.equal(deveMontarSala('/livros', null), true);
    assert.equal(deveMontarSala('/livros/duna', null), true);
    assert.equal(deveMontarSala('/livros/duna', '/livros'), true);
});

test('livro aberto A PARTIR da listagem não monta a sala', () => {
    // O caso todo: na lista, o livro abre como modal sobre a grade. Puxar a
    // sala 3D por cima trocaria o contexto de quem estava lendo a listagem.
    assert.equal(deveMontarSala('/livros/duna', '/livros/lista'), false);
});

test('a listagem nunca monta a sala, venha de onde vier', () => {
    for (const anterior of [null, '/livros', '/livros/duna']) {
        assert.equal(deveMontarSala('/livros/lista', anterior), false);
    }
});

test('fora de /livros a sala não existe', () => {
    assert.equal(deveMontarSala('/about', '/livros'), false);
});
