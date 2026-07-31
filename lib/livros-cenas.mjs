/**
 * As cenas navegáveis da sala e como andar entre elas — lógica pura,
 * testável com node --test (mesmo espírito de lib/livros-routing.mjs).
 *
 * Fonte única da ordem: os botões flutuantes em RoomCanvas.tsx e as setas do
 * teclado leem daqui, então nunca discordam sobre o que vem depois do quê.
 * `id` casa com o tipo `Viewpoint` de components/livros/CameraRig.tsx.
 */

export const CENAS = [
    {id: 'geral', rotulo: 'Sala'},
    {id: 'estante', rotulo: 'Estante'},
    {id: 'mesa', rotulo: 'Mesa'},
];

/**
 * Cena à esquerda (`direcao === -1`) ou à direita (`direcao === 1`) da atual.
 *
 * Dá a volta nas pontas, ao contrário de folhear livros (`vizinhosDe`, em
 * lib/livros-shelf.mjs), que para no primeiro e no último de propósito. A
 * diferença é intencional: um acervo tem começo e fim que vale perceber,
 * enquanto isto aqui é um punhado fixo de pontos de vista com os botões
 * sempre à vista mostrando onde você está — parar na ponta só produziria
 * uma tecla que não faz nada.
 */
export function cenaVizinha(atual, direcao) {
    const i = CENAS.findIndex((c) => c.id === atual);
    if (i === -1) return CENAS[0].id;
    // O `+ CENAS.length` antes do módulo não é decoração: em JS `(0 - 1) % 3`
    // é -1, não 2, e sem ele a seta para a esquerda na primeira cena
    // devolveria `undefined`.
    return CENAS[(i + direcao + CENAS.length) % CENAS.length].id;
}
