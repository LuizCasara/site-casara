/**
 * Dimensões 3D dos livros na sala de leitura — lógica pura, sem dependências.
 *
 * .mjs de propósito, mesma razão de lib/book-utils.mjs e lib/contraste.mjs: é o
 * único jeito de rodar `node --test` neste projeto (`lib/**\/*.test.mjs`). A
 * geração da textura em si (lib/spine-canvas.ts) usa `<canvas>` do DOM e não
 * pode ser testada sem um browser real, por isso fica separada.
 */

/*
 * Escala deliberadamente MAIOR que um livro real (um de verdade tem ~22cm de
 * altura e 12-60mm de lombada). Motivo: o texto da lombada corre na vertical,
 * então a altura física das letras é limitada pela ESPESSURA do livro, não pela
 * altura dele — com espessura realista o título fica com ~7mm, o que na
 * distância da câmera vira ~4px na tela e é ilegível. A sala é low-poly
 * estilizada, não uma simulação física, então livros "grandes demais" são um
 * preço aceitável por lombadas que dá pra ler.
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
 * Espessura da lombada em metros: proporcional às páginas, com piso e teto para
 * um livro de 90 páginas não virar uma folha invisível nem um de 1200 virar
 * tijolo. Quando `pages` é nulo, usa `medianPagesFallback` (a mediana do acervo).
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
        finishedAt: b.finished_at ?? null,
        status: b.status ?? null,
        progressPct: b.progress_pct ?? null,
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}

// Desalinhamento de cada livro da pilha em relação ao de baixo. Uma pilha
// perfeitamente alinhada lê como um bloco maciço, não como livros empilhados
// por alguém.
const DESK_STACK_OFFSETS = [
    {x: 0, z: 0},
    {x: 0.018, z: -0.012},
    {x: -0.014, z: 0.016},
];
const DESK_ROTATION_VARIANCE_RAD = 0.25;
const DESK_MAX_BOOKS = DESK_STACK_OFFSETS.length;

/**
 * Pilha de livros "lendo agora" sobre a mesa — deitados, um em cima do outro,
 * cada um levemente torto em relação ao de baixo.
 *
 * Recebe `{slug, thicknessM}` e não só slugs porque a altura de cada livro na
 * pilha É a soma das espessuras abaixo dele: com uma altura fixa por posição,
 * livros grossos e finos se atravessariam.
 *
 * `y` é o CENTRO do livro deitado, medido a partir da superfície de apoio.
 * Como deitado a espessura é a dimensão vertical (ver `DESK_REST_ROT_Z_RAD`
 * em Book.tsx), o centro fica meia espessura acima do topo do livro anterior.
 *
 * Determinístico por slug (mesmo espírito de bookHeightM): a pilha não pode
 * mudar a cada render. Limitado a DESK_MAX_BOOKS — a mesa comporta 1 a 3 livros
 * "lendo agora"; um quarto simplesmente não aparece, sem erro.
 */
export function layoutDeskBooks(books) {
    let alturaAcumulada = 0;
    return books.slice(0, DESK_MAX_BOOKS).map((livro, i) => {
        const base = DESK_STACK_OFFSETS[i];
        const t = hashString01(`${livro.slug}:desk-rotation`);
        const rotationY = (t * 2 - 1) * DESK_ROTATION_VARIANCE_RAD;
        const y = alturaAcumulada + livro.thicknessM / 2;
        alturaAcumulada += livro.thicknessM;
        return {slug: livro.slug, x: base.x, y, z: base.z, rotationY};
    });
}

/**
 * Torre dos livros "quero ler", no chão ao lado da estante: os mesmos livros
 * deitados de `layoutDeskBooks`, mas sem teto de quantidade — uma fila de
 * leitura pode ter dez títulos, e todos precisam estar lá para poderem ser
 * clicados.
 *
 * O desalinho de cada volume é DERIVADO DO SLUG, e não uma tabela de posições
 * como na pilha da mesa: com três livros dá para escrever os três offsets à
 * mão, com uma fila que cresce, não. Determinístico pelo mesmo motivo de
 * sempre — a torre não pode mudar de forma a cada render.
 *
 * O empilhamento em si é igual: `y` é o CENTRO do livro deitado, e a espessura
 * é a dimensão vertical, então cada um sobe meia espessura acima do topo do
 * anterior.
 */
export const TOWER_OFFSET_MAX_M = 0.022;
export const TOWER_ROTATION_VARIANCE_RAD = 0.35;

export function layoutTorreDeLivros(books) {
    let alturaAcumulada = 0;
    return books.map((livro) => {
        const tx = hashString01(`${livro.slug}:torre-x`);
        const tz = hashString01(`${livro.slug}:torre-z`);
        const tr = hashString01(`${livro.slug}:torre-rot`);
        const y = alturaAcumulada + livro.thicknessM / 2;
        alturaAcumulada += livro.thicknessM;
        return {
            slug: livro.slug,
            x: (tx * 2 - 1) * TOWER_OFFSET_MAX_M,
            y,
            z: (tz * 2 - 1) * TOWER_OFFSET_MAX_M,
            rotationY: (tr * 2 - 1) * TOWER_ROTATION_VARIANCE_RAD,
        };
    });
}

export const SHELF_GAP_M = 0.003;

/**
 * Largura de uma fila de livros — soma das espessuras mais o espaçamento entre
 * eles. Serve tanto para centrar a fila no nicho (Bookshelf.tsx) quanto para
 * decidir se dois anos cabem no mesmo nicho (lib/shelf-years.mjs).
 */
export function shelfWidthM(shelfBooks) {
    if (shelfBooks.length === 0) return 0;
    return shelfBooks.reduce((soma, b) => soma + b.thicknessM + SHELF_GAP_M, 0) - SHELF_GAP_M;
}
