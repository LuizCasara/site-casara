import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortShelfBooks, filterShelfBooks, vizinhosDe} from './livros-shelf.mjs';

const LIVROS = [
    {slug: 'a', title: 'Alfa', rating: '3.0', year: 2010, category: 'ficcao', tags: ['aventura']},
    {slug: 'b', title: 'Beta', rating: '4.5', year: 2020, category: 'filosofia', tags: ['estoicismo', 'aventura']},
    {slug: 'c', title: 'Gama', rating: null, year: 2005, category: 'ficcao', tags: []},
];

test('sortShelfBooks "padrao" preserva a ordem de entrada', () => {
    const resultado = sortShelfBooks(LIVROS, 'padrao');
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'b', 'c']);
});

test('sortShelfBooks "nota" ordena por rating decrescente, tratando null como 0', () => {
    const resultado = sortShelfBooks(LIVROS, 'nota');
    assert.deepEqual(resultado.map((l) => l.slug), ['b', 'a', 'c']);
});

test('sortShelfBooks "ano" ordena por ano decrescente', () => {
    const resultado = sortShelfBooks(LIVROS, 'ano');
    assert.deepEqual(resultado.map((l) => l.slug), ['b', 'a', 'c']);
});

test('sortShelfBooks "categoria" agrupa por categoria e desempata por título', () => {
    const resultado = sortShelfBooks(LIVROS, 'categoria');
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'c', 'b']);
});

test('sortShelfBooks não modifica o array original', () => {
    const copiaOriginal = [...LIVROS];
    sortShelfBooks(LIVROS, 'nota');
    assert.deepEqual(LIVROS, copiaOriginal);
});

test('filterShelfBooks sem filtros devolve tudo', () => {
    assert.equal(filterShelfBooks(LIVROS, {categoria: null, tag: null}).length, 3);
});

test('filterShelfBooks por categoria', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: 'ficcao', tag: null});
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'c']);
});

test('filterShelfBooks por tag', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: null, tag: 'estoicismo'});
    assert.deepEqual(resultado.map((l) => l.slug), ['b']);
});

test('filterShelfBooks combina categoria e tag (AND)', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: 'ficcao', tag: 'aventura'});
    assert.deepEqual(resultado.map((l) => l.slug), ['a']);
});

test('vizinhosDe devolve anterior e próximo na ordem da lista', () => {
    assert.deepEqual(vizinhosDe(LIVROS, 'b'), {anterior: 'a', proximo: 'c'});
});

test('vizinhosDe não dá a volta nas pontas', () => {
    assert.deepEqual(vizinhosDe(LIVROS, 'a'), {anterior: null, proximo: 'b'});
    assert.deepEqual(vizinhosDe(LIVROS, 'c'), {anterior: 'b', proximo: null});
});

test('vizinhosDe devolve vazio quando o livro não está na lista', () => {
    // Acontece de verdade: abrir um livro e depois filtrar a estante de um
    // jeito que exclui justamente ele.
    assert.deepEqual(vizinhosDe(LIVROS, 'inexistente'), {anterior: null, proximo: null});
    assert.deepEqual(vizinhosDe([], 'a'), {anterior: null, proximo: null});
});

test('vizinhosDe com um livro só não oferece navegação', () => {
    assert.deepEqual(vizinhosDe([LIVROS[0]], 'a'), {anterior: null, proximo: null});
});
