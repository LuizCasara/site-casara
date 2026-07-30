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

export function filterShelfBooks(shelfBooks, filtros) {
    return shelfBooks.filter((b) => {
        if (filtros.categoria && b.category !== filtros.categoria) return false;
        if (filtros.tag && !b.tags.includes(filtros.tag)) return false;
        return true;
    });
}
