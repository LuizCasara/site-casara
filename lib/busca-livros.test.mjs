import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizar, casaBusca, filtrarPorBusca} from './busca-livros.mjs';

const ACERVO = [
    {title: 'A Revolução dos Bichos', author: 'George Orwell'},
    {title: 'Sapiens', author: 'Yuval Noah Harari'},
    {title: 'Duna', author: 'Frank Herbert'},
    {title: 'O Homem Mais Rico da Babilônia', author: null},
];

test('normalizar tira acento e caixa', () => {
    assert.equal(normalizar('Revolução'), 'revolucao');
    assert.equal(normalizar('  BABILÔNIA '), 'babilonia');
    assert.equal(normalizar(null), '');
});

test('acha digitando sem acento — o caso do teclado de celular', () => {
    assert.deepEqual(filtrarPorBusca(ACERVO, 'revolucao').map((l) => l.title), ['A Revolução dos Bichos']);
    assert.deepEqual(filtrarPorBusca(ACERVO, 'babilonia').map((l) => l.title), ['O Homem Mais Rico da Babilônia']);
});

test('busca pelo autor, não só pelo título', () => {
    assert.deepEqual(filtrarPorBusca(ACERVO, 'orwell').map((l) => l.title), ['A Revolução dos Bichos']);
});

test('palavras soltas casam em qualquer ordem', () => {
    // Como se busca um livro lembrado pela metade: título + autor, na ordem que
    // vier na cabeça. Exigir a frase exata falharia nos dois.
    for (const termo of ['sapiens harari', 'harari sapiens']) {
        assert.deepEqual(filtrarPorBusca(ACERVO, termo).map((l) => l.title), ['Sapiens'], termo);
    }
});

test('livro sem autor não quebra a busca', () => {
    assert.equal(casaBusca({title: 'Duna', author: null}, 'duna'), true);
    assert.equal(casaBusca({title: 'Duna', author: null}, 'null'), false);
});

test('termo vazio devolve tudo, e a mesma referência', () => {
    for (const vazio of ['', '   ', null, undefined]) {
        assert.equal(filtrarPorBusca(ACERVO, vazio), ACERVO, JSON.stringify(vazio));
    }
});

test('termo sem resultado devolve lista vazia, não o acervo inteiro', () => {
    assert.deepEqual(filtrarPorBusca(ACERVO, 'tolkien'), []);
});
