import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    medianPages, bookThicknessM, bookHeightM, layoutSpineAtlas, toShelfBooks, layoutDeskBooks,
    shelfWidthM, splitShelfRows, SHELF_GAP_M, SPINE_THICKNESS_PER_PAGE_M,
    SPINE_THICKNESS_MIN_M, SPINE_THICKNESS_MAX_M, BOOK_HEIGHT_BASE_M, BOOK_HEIGHT_VARIANCE_M,
} from './book-dimensions.mjs';

test('medianPages ignora nulos/undefined e calcula corretamente', () => {
    assert.equal(medianPages([100, 200, 300]), 200);
    assert.equal(medianPages([100, 200, 300, 400]), 250);
    assert.equal(medianPages([null, 150, undefined, 250]), 200);
    assert.equal(medianPages([]), null);
});

test('bookThicknessM é proporcional às páginas e respeita os limites', () => {
    // Escrito em cima das constantes, não de números soltos: a escala é
    // ajustável (foi aumentada para as lombadas ficarem legíveis na tela) e
    // o que precisa continuar valendo é a forma da fórmula, não o valor.
    const paginasDentroDoIntervalo = SPINE_THICKNESS_MIN_M / SPINE_THICKNESS_PER_PAGE_M * 2;
    assert.equal(bookThicknessM(paginasDentroDoIntervalo, 250), paginasDentroDoIntervalo * SPINE_THICKNESS_PER_PAGE_M);
    assert.equal(bookThicknessM(1, 250), SPINE_THICKNESS_MIN_M, 'livro fininho não some');
    assert.equal(bookThicknessM(100000, 250), SPINE_THICKNESS_MAX_M, 'livro gigante não vira tijolo');
    assert.equal(bookThicknessM(null, paginasDentroDoIntervalo), paginasDentroDoIntervalo * SPINE_THICKNESS_PER_PAGE_M,
        'sem pages, usa a mediana do acervo');
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

const PILHA = [
    {slug: 'a', thicknessM: 0.04},
    {slug: 'b', thicknessM: 0.06},
    {slug: 'c', thicknessM: 0.03},
    {slug: 'd', thicknessM: 0.05},
];

test('layoutDeskBooks é determinístico e limita a 3 livros', () => {
    const layout1 = layoutDeskBooks(PILHA);
    const layout2 = layoutDeskBooks(PILHA);
    assert.equal(layout1.length, 3, 'no maximo 3 — spec preve 1 a 3 livros lendo agora');
    assert.deepEqual(layout1, layout2, 'mesma entrada tem que dar sempre a mesma disposicao');
});

test('layoutDeskBooks empilha sem sobreposição, cada livro sobre o anterior', () => {
    const layout = layoutDeskBooks(PILHA);
    // Centro do primeiro fica a meia espessura do tampo.
    assert.ok(Math.abs(layout[0].y - 0.02) < 1e-9);
    // O topo de um tem que ser exatamente a base do proximo — se a conta usasse
    // altura fixa por posicao, livros de espessuras diferentes se atravessariam.
    for (let i = 1; i < layout.length; i++) {
        const topoAnterior = layout[i - 1].y + PILHA[i - 1].thicknessM / 2;
        const baseAtual = layout[i].y - PILHA[i].thicknessM / 2;
        assert.ok(Math.abs(topoAnterior - baseAtual) < 1e-9, `livro ${i} nao assenta no de baixo`);
    }
});

test('layoutDeskBooks desalinha os livros da pilha entre si', () => {
    const layout = layoutDeskBooks(PILHA);
    assert.notEqual(layout[0].x, layout[1].x, 'pilha alinhada demais lê como bloco macico');
    assert.notEqual(layout[0].rotationY, layout[1].rotationY);
});

test('splitShelfRows equilibra as fileiras por largura, não por contagem', () => {
    // Um livro grosso e varios finos: partir pela contagem daria fileiras de
    // comprimentos bem diferentes.
    const livros = [
        {slug: 'grosso', thicknessM: 0.11},
        {slug: 'f1', thicknessM: 0.03},
        {slug: 'f2', thicknessM: 0.03},
        {slug: 'f3', thicknessM: 0.03},
        {slug: 'f4', thicknessM: 0.03},
    ];
    const [cima, baixo] = splitShelfRows(livros, 2);
    assert.equal(cima.length + baixo.length, livros.length, 'nenhum livro pode sumir');
    const diferenca = Math.abs(shelfWidthM(cima) - shelfWidthM(baixo));
    assert.ok(diferenca < 0.06, `fileiras muito desiguais: ${diferenca.toFixed(3)}m`);
});

test('splitShelfRows preserva a ordem de entrada', () => {
    const livros = 'abcdefgh'.split('').map((slug) => ({slug, thicknessM: 0.04}));
    const fileiras = splitShelfRows(livros, 2);
    const achatado = fileiras.flat().map((b) => b.slug);
    assert.deepEqual(achatado, 'abcdefgh'.split(''));
});

test('splitShelfRows nunca deixa uma fileira vazia', () => {
    // Um livro muito grosso encheria a primeira fileira sozinho e a de baixo
    // ficaria vazia, desenhando uma prateleira sem nada.
    const [cima, baixo] = splitShelfRows([
        {slug: 'gigante', thicknessM: 0.11},
        {slug: 'fino', thicknessM: 0.03},
    ], 2);
    assert.equal(cima.length, 1);
    assert.equal(baixo.length, 1);
});

test('splitShelfRows com estante vazia devolve uma fileira vazia, não quebra', () => {
    assert.deepEqual(splitShelfRows([], 2), [[]]);
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

test('toShelfBooks carrega a data de leitura adiante', () => {
    const livros = [{
        slug: 'x', title: 'X', author: null, rating: null, spine_color: null,
        cover_path: null, category: 'ficcao', tags: [], year: null, pages: 200,
        finished_at: '2024-03-15T00:00:00.000Z',
    }];
    assert.equal(toShelfBooks(livros)[0].finishedAt, '2024-03-15T00:00:00.000Z');
});

test('toShelfBooks aceita livro sem data de leitura', () => {
    const livros = [{
        slug: 'y', title: 'Y', author: null, rating: null, spine_color: null,
        cover_path: null, category: 'ficcao', tags: [], year: null, pages: 200,
    }];
    assert.equal(toShelfBooks(livros)[0].finishedAt, null);
});
