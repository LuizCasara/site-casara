import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slugify, normalizeTag, tagKey, extractYear, isbn13Para10} from './book-utils.mjs';

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

test('isbn13Para10 recalcula o dígito verificador, não trunca', () => {
    // Os cinco livros reais do acervo cujo ISBN-10 foi conferido contra a
    // Amazon. O último dígito NUNCA é o do ISBN-13: em 9788576658764 o
    // ISBN-13 termina em 4 e o ISBN-10 em 3.
    assert.equal(isbn13Para10('9788576658764'), '8576658763');
    assert.equal(isbn13Para10('9786558100393'), '6558100398');
    assert.equal(isbn13Para10('9786559226955'), '6559226956');
    assert.equal(isbn13Para10('9786555845587'), '6555845589');
    assert.equal(isbn13Para10('9788579300912'), '8579300916');
    // Aceita a forma impressa, com hífens.
    assert.equal(isbn13Para10('978-85-7665-876-4'), '8576658763');
});

test('isbn13Para10 devolve X quando o resto é 10', () => {
    // 9780306406157 é o exemplo canônico da Wikipédia: ISBN-10 030640615-2.
    assert.equal(isbn13Para10('9780306406157'), '0306406152');
    // 0-8044-2957-X, o exemplo clássico de ISBN-10 terminado em X.
    assert.equal(isbn13Para10('9780804429573'), '080442957X');
});

test('isbn13Para10 recusa o que não converte', () => {
    assert.equal(isbn13Para10('9791234567896'), null, 'prefixo 979 não tem ISBN-10');
    assert.equal(isbn13Para10('857665876'), null, 'já é ISBN-10');
    assert.equal(isbn13Para10(''), null);
    assert.equal(isbn13Para10(null), null);
    assert.equal(isbn13Para10(undefined), null);
});
