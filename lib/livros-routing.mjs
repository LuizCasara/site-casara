/**
 * Deriva o "modo" da sala 3D a partir do pathname atual — lógica pura,
 * sem dependências. .mjs pelo mesmo motivo de lib/book-dimensions.mjs: é a
 * única forma de cobrir isso com `node --test` neste projeto.
 *
 * RoomCanvasLoader usa isso pra decidir o que montar; a rota interceptada
 * (app/livros/@livro/(.)[slug]/page.tsx) chega ao mesmo resultado só por
 * como o Next resolve a URL — as duas nunca precisam se comunicar direto.
 */

const SLUG_RE = /^\/livros\/([a-z0-9-]+)$/;

export function deriveLivrosMode(pathname) {
    if (pathname === '/livros') return {kind: 'sala'};
    if (pathname === '/livros/lista') return null;
    const match = typeof pathname === 'string' ? pathname.match(SLUG_RE) : null;
    if (match) return {kind: 'livro', slug: match[1]};
    return null;
}
