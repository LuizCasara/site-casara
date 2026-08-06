/**
 * Ordenação e filtro da estante dentro da sala 3D — lógica pura, sem
 * dependência de three/R3F, testável com node --test (mesmo espírito de
 * lib/livros-routing.mjs).
 *
 * Ambas operam sobre o array já convertido por toShelfBooks
 * (lib/book-dimensions.mjs) e devolvem um array na mesma forma — quem chama
 * (RoomCanvas.tsx) passa o resultado direto pra <Bookshelf/>, que recalcula
 * posições a partir da ordem do array. É assim que a "animação com mola" da
 * reordenação e o fechamento de espaço da filtragem saem de graça: Book.tsx
 * já anima (damp) até a posição recebida por prop a cada frame, então só
 * trocar a ordem/composição do array já produz o movimento.
 */

import {casaBusca} from './busca-livros.mjs';

export const SORT_CRITERIA = ['padrao', 'nota', 'ano', 'categoria'];

export function sortShelfBooks(shelfBooks, criterio) {
    if (criterio === 'nota') {
        return [...shelfBooks].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    if (criterio === 'ano') {
        return [...shelfBooks].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    }
    if (criterio === 'categoria') {
        return [...shelfBooks].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
    }
    return shelfBooks; // 'padrao' — mantém a ordem que já veio do banco (listarLivros)
}

/**
 * Os três filtros do Índice, aplicados juntos: categoria, tag e busca por
 * texto. A busca casa contra título e autor — ver lib/busca-livros.mjs, que é
 * compartilhado com a listagem em HTML para os dois acharem o mesmo livro com
 * o mesmo termo.
 */
export function filterShelfBooks(shelfBooks, filtros) {
    return shelfBooks.filter((b) => {
        if (filtros.categoria && b.category !== filtros.categoria) return false;
        if (filtros.tag && !b.tags.includes(filtros.tag)) return false;
        if (!casaBusca(b, filtros.busca)) return false;
        return true;
    });
}

/**
 * Slug do livro anterior e do próximo, na MESMA ordem que a pessoa está
 * vendo na estante (ou seja, já ordenada e filtrada) — folhear tem que
 * seguir o que está na tela, não a ordem crua do banco.
 *
 * Não dá a volta nas pontas de propósito: com a seta desabilitada no
 * primeiro e no último, dá pra perceber onde o acervo começa e termina.
 * Um livro que não está na lista (abrir um livro e depois filtrar a estante
 * excluindo justamente ele) simplesmente não oferece navegação, em vez de
 * cair no índice -1 e pular pro fim.
 */
export function vizinhosDe(shelfBooks, slug) {
    const i = shelfBooks.findIndex((b) => b.slug === slug);
    if (i === -1) return {anterior: null, proximo: null};
    return {
        anterior: i > 0 ? shelfBooks[i - 1].slug : null,
        proximo: i < shelfBooks.length - 1 ? shelfBooks[i + 1].slug : null,
    };
}
