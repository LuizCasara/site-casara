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

const ROTA_DA_LISTA = '/livros/lista';

/**
 * A sala 3D deve ser montada nesta rota, sabendo de ONDE se veio?
 *
 * A regra que interessa é a última: `/livros/<slug>` normalmente monta a sala
 * (é o que faz um link externo materializar a cena atrás do conteúdo), mas
 * **não quando se veio da listagem**. Ali o livro tem de abrir como um modal
 * sobre a grade que a pessoa estava lendo — puxar a sala inteira por cima é
 * trocar o contexto dela sem que ela tenha pedido.
 *
 * Recebe o pathname anterior em vez de descobri-lo sozinha para continuar pura
 * e testável; a memória de qual era ele é de quem chama (ver ContextoDaSala).
 */
export function deveMontarSala(pathname, pathnameAnterior) {
    const modo = deriveLivrosMode(pathname);
    if (!modo) return false;
    if (modo.kind === 'sala') return true;
    return pathnameAnterior !== ROTA_DA_LISTA;
}
