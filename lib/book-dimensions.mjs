/**
 * Dimensões 3D dos livros na sala de leitura — lógica pura, sem dependências.
 *
 * .mjs de propósito, mesma razão de lib/book-utils.mjs e lib/contraste.mjs:
 * é o único jeito de rodar `node --test` neste projeto (`lib/**\/*.test.mjs`).
 * A geração da textura em si (lib/spine-canvas.ts) usa `<canvas>` do DOM e
 * não pode ser testada sem um browser real — por isso fica separada e não
 * coberta por teste, seguindo a mesma convenção do resto do projeto.
 */

export const BOOK_HEIGHT_BASE_M = 0.22;
export const BOOK_HEIGHT_VARIANCE_M = 0.015;
export const BOOK_DEPTH_M = 0.15;
export const SPINE_THICKNESS_MIN_M = 0.012;
export const SPINE_THICKNESS_MAX_M = 0.060;
export const SPINE_THICKNESS_PER_PAGE_M = 0.000055;
export const DEFAULT_ATLAS_ROW_HEIGHT_PX = 512;
export const DEFAULT_ATLAS_PIXELS_PER_MM = 4;
export const DEFAULT_MAX_ATLAS_WIDTH_PX = 4096;

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
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}
