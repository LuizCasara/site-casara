import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slugify, normalizeTag, tagKey, extractYear} from './book-utils.mjs';

test('slugify remove acentos e normaliza', () => {
    assert.equal(slugify('A Revolta de Atlas'), 'a-revolta-de-atlas');
    assert.equal(slugify('Ensaio sobre a Cegueira'), 'ensaio-sobre-a-cegueira');
    assert.equal(slugify('  Duna   '), 'duna');
    assert.equal(slugify('O Senhor dos Anéis: A Sociedade do Anel'),
        'o-senhor-dos-aneis-a-sociedade-do-anel');
    assert.equal(slugify('1984'), '1984');
});

test('slugify nunca devolve string vazia nem hifens nas pontas', () => {
    assert.equal(slugify('!!!'), 'livro');
    assert.equal(slugify('---abc---'), 'abc');
});

test('normalizeTag preserva acento, tagKey remove', () => {
    assert.equal(normalizeTag('  Política  '), 'política');
    assert.equal(normalizeTag('FICÇÃO   CIENTÍFICA'), 'ficção científica');
    // Três grafias diferentes precisam colidir na mesma chave.
    assert.equal(tagKey('Política'), tagKey('politica'));
    assert.equal(tagKey('POLÍTICA'), 'politica');
});

test('extractYear aceita os formatos que a Open Library devolve', () => {
    assert.equal(extractYear('2009'), 2009);
    assert.equal(extractYear('March 2009'), 2009);
    assert.equal(extractYear('1st ed. 1985, reprint 2001'), 1985);
    assert.equal(extractYear(null), null);
    assert.equal(extractYear('sem data'), null);
});
