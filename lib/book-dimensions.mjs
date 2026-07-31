/**
 * Dimensões 3D dos livros na sala de leitura — lógica pura, sem dependências.
 *
 * .mjs de propósito, mesma razão de lib/book-utils.mjs e lib/contraste.mjs:
 * é o único jeito de rodar `node --test` neste projeto (`lib/**\/*.test.mjs`).
 * A geração da textura em si (lib/spine-canvas.ts) usa `<canvas>` do DOM e
 * não pode ser testada sem um browser real — por isso fica separada e não
 * coberta por teste, seguindo a mesma convenção do resto do projeto.
 */

/*
 * Escala deliberadamente MAIOR que um livro real (um de verdade tem ~22cm de
 * altura e 12-60mm de lombada). Motivo: o texto da lombada corre na vertical,
 * então a altura física das letras é limitada pela ESPESSURA do livro, não
 * pela altura dele — com espessura realista o título fica com ~7mm, o que na
 * distância da câmera vira ~4px na tela e é ilegível. A sala é low-poly
 * estilizada, não uma simulação física, então livros "grandes demais" são um
 * preço aceitável por lombadas que dá pra ler. Isto substitui os números do
 * spec (`clamp(pages * 0.055mm, 12mm, 60mm)`), que eram fiéis ao mundo real
 * mas ilegíveis na tela; a FORMA da fórmula (proporcional a páginas, com
 * clamp nas pontas) continua a mesma.
 */
export const BOOK_HEIGHT_BASE_M = 0.30;
export const BOOK_HEIGHT_VARIANCE_M = 0.022;
export const BOOK_DEPTH_M = 0.20;
export const SPINE_THICKNESS_MIN_M = 0.030;
export const SPINE_THICKNESS_MAX_M = 0.110;
export const SPINE_THICKNESS_PER_PAGE_M = 0.00013;
// Este número é o comprimento disponível para o texto da lombada (o título
// corre ao longo da altura do livro), não a nitidez das letras — o tamanho
// da fonte deriva da LARGURA da fatia. Com 512 títulos comuns como
// "A Revolução dos Bichos" eram truncados com "…" na fonte maior.
export const DEFAULT_ATLAS_ROW_HEIGHT_PX = 768;
export const DEFAULT_ATLAS_PIXELS_PER_MM = 4;
// 8192 é o limite de textura da esmagadora maioria das GPUs atuais (o mínimo
// garantido pelo WebGL2 é 2048, mas na prática 8192+ é universal em desktop e
// comum em celular). Com lombadas mais grossas, 4096 faria o atlas ser
// reduzido proporcionalmente já com poucas dezenas de livros, borrando o
// texto — que é justamente o problema que esta escala veio resolver.
export const DEFAULT_MAX_ATLAS_WIDTH_PX = 8192;

/** Mediana de uma lista de páginas, ignorando null/undefined. `null` se a lista ficar vazia. */
export function medianPages(pagesList) {
    const validos = pagesList.filter((p) => typeof p === 'number' && p > 0).sort((a, b) => a - b);
    if (validos.length === 0) return null;
    const meio = Math.floor(validos.length / 2);
    return validos.length % 2 === 0 ? (validos[meio - 1] + validos[meio]) / 2 : validos[meio];
}

/**
 * espessura = clamp(pages * 0.055mm, 12mm, 60mm), em metros.
 * Quando `pages` é nulo, usa `medianPagesFallback` (a mediana do acervo
 * atual) — ver spec, seção "Como um livro é representado".
 */
export function bookThicknessM(pages, medianPagesFallback) {
    const paginas = typeof pages === 'number' && pages > 0 ? pages : medianPagesFallback;
    if (!paginas) return SPINE_THICKNESS_MIN_M;
    const bruto = paginas * SPINE_THICKNESS_PER_PAGE_M;
    return Math.min(SPINE_THICKNESS_MAX_M, Math.max(SPINE_THICKNESS_MIN_M, bruto));
}

/** Hash determinístico simples (djb2), normalizado para 0..1. */
function hashString01(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) {
        h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
    }
    return (h % 10000) / 10000;
}

/**
 * Altura do livro, variando levemente por slug — determinístico, não
 * aleatório, para a estante não mudar de aparência a cada render.
 */
export function bookHeightM(slug) {
    const t = hashString01(slug);
    return BOOK_HEIGHT_BASE_M + (t * 2 - 1) * BOOK_HEIGHT_VARIANCE_M;
}

/**
 * Empacota as lombadas lado a lado num atlas de uma única fileira: a altura
 * do atlas é fixa (a textura inteira representa a altura "canônica" da
 * lombada, mapeada por V 0..1 em qualquer livro); só a largura de cada
 * lombada varia, proporcional à espessura física do livro. Se a soma das
 * larguras passar de `maxWidthPx`, tudo é reduzido proporcionalmente para
 * caber — protege contra o limite de textura da GPU (tipicamente 4096-8192px).
 */
export function layoutSpineAtlas(books, options = {}) {
    const pixelsPerMm = options.pixelsPerMm ?? DEFAULT_ATLAS_PIXELS_PER_MM;
    const rowHeightPx = options.rowHeightPx ?? DEFAULT_ATLAS_ROW_HEIGHT_PX;
    const maxWidthPx = options.maxWidthPx ?? DEFAULT_MAX_ATLAS_WIDTH_PX;

    const largurasBrutas = books.map((b) => Math.max(1, Math.round(b.thicknessM * 1000 * pixelsPerMm)));
    const larguraTotalBruta = largurasBrutas.reduce((soma, w) => soma + w, 0);
    const fatorEscala = larguraTotalBruta > maxWidthPx ? maxWidthPx / larguraTotalBruta : 1;

    let x = 0;
    const spines = books.map((b, i) => {
        const widthPx = Math.max(1, Math.round(largurasBrutas[i] * fatorEscala));
        const spine = {slug: b.slug, xPx: x, widthPx, u0: 0, u1: 0};
        x += widthPx;
        return spine;
    });
    const atlasWidthPx = x;
    for (const s of spines) {
        s.u0 = s.xPx / atlasWidthPx;
        s.u1 = (s.xPx + s.widthPx) / atlasWidthPx;
    }
    return {atlasWidthPx, atlasHeightPx: rowHeightPx, spines};
}

/**
 * Converte livros crus do banco (formato de `lib/books.ts`) no formato que
 * `components/livros/Book.tsx` espera, com as dimensões já calculadas.
 * Preserva a ordem de entrada — quem chama depende disso para casar o índice
 * de cada livro com o índice do atlas gerado por `layoutSpineAtlas`.
 */
export function toShelfBooks(books) {
    const mediana = medianPages(books.map((b) => b.pages));
    return books.map((b) => ({
        slug: b.slug,
        title: b.title,
        author: b.author ?? null,
        rating: b.rating ?? null,
        spineColor: b.spine_color ?? null,
        coverPath: b.cover_path ?? null,
        category: b.category,
        tags: b.tags ?? [],
        year: b.year ?? null,
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}

const DESK_BASE_OFFSETS = [
    {x: 0, z: 0},
    {x: -0.11, z: 0.035},
    {x: 0.1, z: -0.03},
];
const DESK_ROTATION_VARIANCE_RAD = 0.3;
const DESK_MAX_BOOKS = DESK_BASE_OFFSETS.length;

/**
 * Posição de cada livro "lendo agora" sobre a mesa — espalhados, não em fila
 * como a estante. Determinístico por slug (mesmo espírito de bookHeightM): a
 * disposição não pode mudar a cada render. Limitado a DESK_MAX_BOOKS porque o
 * spec prevê 1 a 3 livros "lendo agora" simultâneos; um quarto livro (dado
 * incomum) simplesmente não aparece na mesa, sem erro.
 */
export function layoutDeskBooks(slugs) {
    return slugs.slice(0, DESK_MAX_BOOKS).map((slug, i) => {
        const base = DESK_BASE_OFFSETS[i];
        const t = hashString01(`${slug}:desk-rotation`);
        const rotationY = (t * 2 - 1) * DESK_ROTATION_VARIANCE_RAD;
        return {slug, x: base.x, z: base.z, rotationY};
    });
}

export const SHELF_GAP_M = 0.003;

/**
 * Largura total da estante — soma das espessuras mais o espaçamento entre
 * livros. Extraída pra cá porque Bookshelf.tsx (posiciona os livros) e
 * RoomCanvas.tsx (configura o boundary do trilho mobile — ver plano da
 * fase 5) precisam do mesmo número; antes só Bookshelf.tsx calculava isso
 * inline.
 */
export function shelfWidthM(shelfBooks) {
    if (shelfBooks.length === 0) return 0;
    return shelfBooks.reduce((soma, b) => soma + b.thicknessM + SHELF_GAP_M, 0) - SHELF_GAP_M;
}
