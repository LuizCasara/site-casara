import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    medianPages, bookThicknessM, bookHeightM, layoutSpineAtlas, toShelfBooks, layoutDeskBooks,
    shelfWidthM, SHELF_GAP_M,
    SPINE_THICKNESS_MIN_M, SPINE_THICKNESS_MAX_M, BOOK_HEIGHT_BASE_M, BOOK_HEIGHT_VARIANCE_M,
} from './book-dimensions.mjs';

test('medianPages ignora nulos/undefined e calcula corretamente', () => {
    assert.equal(medianPages([100, 200, 300]), 200);
    assert.equal(medianPages([100, 200, 300, 400]), 250);
    assert.equal(medianPages([null, 150, undefined, 250]), 200);
    assert.equal(medianPages([]), null);
});

test('bookThicknessM aplica pages*0.055mm e respeita os limites de 12-60mm', () => {
    assert.equal(bookThicknessM(300, 250), 300 * 0.000055);
    assert.equal(bookThicknessM(10, 250), SPINE_THICKNESS_MIN_M);
    assert.equal(bookThicknessM(2000, 250), SPINE_THICKNESS_MAX_M);
    assert.equal(bookThicknessM(null, 300), 300 * 0.000055);
    assert.equal(bookThicknessM(null, null), SPINE_THICKNESS_MIN_M);
});

test('bookHeightM é determinístico e fica dentro da variação declarada', () => {
    const h1 = bookHeightM('o-nome-do-vento');
    const h2 = bookHeightM('o-nome-do-vento');
    assert.equal(h1, h2, 'mesma slug tem que dar sempre a mesma altura');
    assert.ok(h1 >= BOOK_HEIGHT_BASE_M - BOOK_HEIGHT_VARIANCE_M);
    assert.ok(h1 <= BOOK_HEIGHT_BASE_M + BOOK_HEIGHT_VARIANCE_M);
    assert.notEqual(bookHeightM('duna'), bookHeightM('1984'), 'slugs diferentes tendem a alturas diferentes');
});

test('layoutSpineAtlas empacota lombadas lado a lado sem sobreposição', () => {
    const books = [
        {slug: 'a', thicknessM: 0.02},
        {slug: 'b', thicknessM: 0.03},
        {slug: 'c', thicknessM: 0.015},
    ];
    const layout = layoutSpineAtlas(books, {pixelsPerMm: 4, rowHeightPx: 256});
    assert.equal(layout.spines.length, 3);
    assert.equal(layout.atlasHeightPx, 256);
    assert.equal(layout.spines[0].u0, 0);
    assert.equal(layout.spines[2].u1, 1);
    assert.equal(layout.spines[1].xPx, layout.spines[0].xPx + layout.spines[0].widthPx);
    assert.equal(layout.spines[2].xPx, layout.spines[1].xPx + layout.spines[1].widthPx);
});

test('layoutSpineAtlas reduz proporcionalmente quando excede a largura máxima', () => {
    const books = Array.from({length: 60}, (_, i) => ({slug: `livro-${i}`, thicknessM: 0.05}));
    const layout = layoutSpineAtlas(books, {pixelsPerMm: 4, maxWidthPx: 4096});
    assert.ok(layout.atlasWidthPx <= 4096);
    assert.equal(layout.spines.at(-1).u1, 1);
});

test('toShelfBooks preserva ordem e preenche thicknessM/heightM/coverPath/category/tags/year', () => {
    const shelf = toShelfBooks([
        {
            slug: 'a', title: 'A', author: 'Fulano', rating: '4.5', pages: 300,
            spine_color: '#ec4899', cover_path: '/livros/capas/a.jpg',
            category: 'ficcao', tags: ['aventura'], year: 2010,
        },
        {
            slug: 'b', title: 'B', author: null, rating: null, pages: null,
            spine_color: null, cover_path: null,
            category: 'filosofia', tags: [], year: null,
        },
    ]);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0].slug, 'a');
    assert.equal(shelf[0].coverPath, '/livros/capas/a.jpg');
    assert.deepEqual(shelf[0].tags, ['aventura']);
    assert.equal(shelf[0].year, 2010);
    assert.equal(shelf[1].slug, 'b');
    assert.ok(shelf[0].thicknessM > 0);
    assert.ok(shelf[1].thicknessM > 0, 'livro sem pages usa a mediana do acervo, não quebra');
    assert.equal(shelf[1].spineColor, null);
    assert.equal(shelf[1].coverPath, null);
    assert.deepEqual(shelf[1].tags, []);
    assert.equal(shelf[1].year, null);
});

test('layoutDeskBooks é determinístico e limita a 3 livros', () => {
    const layout1 = layoutDeskBooks(['a', 'b', 'c', 'd']);
    const layout2 = layoutDeskBooks(['a', 'b', 'c', 'd']);
    assert.equal(layout1.length, 3, 'no maximo 3 — spec preve 1 a 3 livros lendo agora');
    assert.deepEqual(layout1, layout2, 'mesma entrada tem que dar sempre a mesma disposicao');
    assert.notEqual(layout1[0].x, layout1[1].x, 'livros ficam espalhados, nao empilhados no mesmo ponto');
});

test('shelfWidthM soma as espessuras mais os espaçamentos entre livros', () => {
    const largura = shelfWidthM([
        {thicknessM: 0.02},
        {thicknessM: 0.03},
        {thicknessM: 0.015},
    ]);
    const esperado = 0.02 + 0.03 + 0.015 + 2 * SHELF_GAP_M; // 2 gaps entre 3 livros
    assert.ok(Math.abs(largura - esperado) < 1e-9);
});

test('shelfWidthM devolve 0 para estante vazia', () => {
    assert.equal(shelfWidthM([]), 0);
});
