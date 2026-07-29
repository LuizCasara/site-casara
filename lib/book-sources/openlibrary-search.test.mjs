import {test} from 'node:test';
import assert from 'node:assert/strict';
import {montarUrlBusca, parseBusca} from './openlibrary-search.mjs';

test('montarUrlBusca escapa acentos e espaços', () => {
    const url = montarUrlBusca('A Revolução dos Bichos', 'George Orwell');
    assert.ok(url.startsWith('https://openlibrary.org/search.json?'));
    assert.ok(url.includes('title=A+Revolu%C3%A7%C3%A3o+dos+Bichos'));
    assert.ok(url.includes('author=George+Orwell'));
    assert.ok(url.includes('limit=1'));
});

test('parseBusca monta a URL da capa a partir do cover_i', () => {
    const r = parseBusca({
        numFound: 1,
        docs: [{
            title: 'O Hobbit',
            cover_i: 15121777,
            first_publish_year: 1937,
            number_of_pages_median: 310,
        }],
    });
    assert.equal(r.coverUrl, 'https://covers.openlibrary.org/b/id/15121777-L.jpg');
    assert.equal(r.pages, 310);
    assert.equal(r.year, 1937);
});

test('parseBusca devolve null quando não há resultado', () => {
    assert.equal(parseBusca({numFound: 0, docs: []}), null);
    assert.equal(parseBusca({}), null);
});

test('campos ausentes viram null, e a ausência de capa não invalida o resultado', () => {
    const r = parseBusca({docs: [{title: 'X'}]});
    assert.equal(r.coverUrl, null);
    assert.equal(r.pages, null);
    assert.equal(r.year, null);
});

test('parseBusca NUNCA devolve autor — o arquivo de seed é a fonte da verdade', () => {
    // O registro real de "A Revolta de Atlas" traz marketing em author_name.
    const r = parseBusca({
        docs: [{
            title: 'Box A Revolta de Atlas - 3 Volumes',
            author_name: ['Ayn Rand', 'Best-seller há mais de 50 anos, com 11 milhões...'],
            cover_i: 10489048,
        }],
    });
    assert.equal(r.author, undefined);
    assert.equal(r.title, undefined);
});
