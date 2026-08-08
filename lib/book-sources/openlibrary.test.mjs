import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOpenLibrary} from './openlibrary.mjs';

/** Resposta real da Open Library, formato jscmd=data. */
const RESPOSTA_COMPLETA = {
    'ISBN:9780441013593': {
        title: 'Dune',
        authors: [{name: 'Frank Herbert'}],
        number_of_pages: 604,
        publish_date: 'August 2005',
        publishers: [{name: 'Ace'}],
        cover: {
            small: 'https://covers.openlibrary.org/b/id/1-S.jpg',
            medium: 'https://covers.openlibrary.org/b/id/1-M.jpg',
            large: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
        subjects: [{name: 'Science fiction'}, {name: 'Desert'}],
    },
};

test('parseOpenLibrary extrai os campos da resposta completa', () => {
    const m = parseOpenLibrary(RESPOSTA_COMPLETA, '9780441013593');
    assert.equal(m.title, 'Dune');
    assert.equal(m.author, 'Frank Herbert');
    assert.equal(m.pages, 604);
    assert.equal(m.year, 2005);
    assert.equal(m.publisher, 'Ace');
    assert.equal(m.coverUrl, 'https://covers.openlibrary.org/b/id/1-L.jpg');
    assert.deepEqual(m.subjects, ['Science fiction', 'Desert']);
});

test('parseOpenLibrary devolve null quando o ISBN não está na resposta', () => {
    assert.equal(parseOpenLibrary({}, '9780441013593'), null);
    assert.equal(parseOpenLibrary(RESPOSTA_COMPLETA, '9999999999999'), null);
});

test('campos ausentes viram null em vez de quebrar — o caso comum em livro BR', () => {
    const m = parseOpenLibrary({'ISBN:123': {title: 'Só o título'}}, '123');
    assert.equal(m.title, 'Só o título');
    assert.equal(m.author, null);
    assert.equal(m.pages, null);
    assert.equal(m.year, null);
    assert.equal(m.publisher, null);
    assert.equal(m.coverUrl, null);
    assert.deepEqual(m.subjects, []);
});

test('múltiplos autores viram uma string só', () => {
    const m = parseOpenLibrary(
        {'ISBN:123': {title: 'X', authors: [{name: 'Ana'}, {name: 'Bruno'}]}}, '123');
    assert.equal(m.author, 'Ana, Bruno');
});

test('cai para medium quando large não existe', () => {
    const m = parseOpenLibrary(
        {'ISBN:123': {title: 'X', cover: {medium: 'http://m.jpg'}}}, '123');
    assert.equal(m.coverUrl, 'http://m.jpg');
});
