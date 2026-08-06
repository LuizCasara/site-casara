/**
 * As cenas navegáveis da sala e como andar entre elas — lógica pura,
 * testável com node --test (mesmo espírito de lib/livros-routing.mjs).
 *
 * Fonte única da ordem: os botões flutuantes em RoomCanvas.tsx e as setas do
 * teclado leem daqui, então nunca discordam sobre o que vem depois do quê.
 * `id` casa com o tipo `Viewpoint` de components/livros/CameraRig.tsx.
 */

/**
 * A ordem é a dos botões na tela E a das setas do teclado — e ela desenha um
 * caminho pela sala, não uma lista qualquer: da visão geral para o canto de
 * leitura (poltrona e mesa, à esquerda), daí para a estante, no fundo, e daí
 * para o canto de trabalho, à direita dela. Andar para o lado com a seta
 * atravessa o cômodo da esquerda para a direita.
 */
export const CENAS = [
    {id: 'geral', rotulo: 'Sala'},
    {id: 'mesa', rotulo: 'Mesa'},
    {id: 'estante', rotulo: 'Estante'},
    {id: 'pc', rotulo: 'PC'},
];

/** A cena depois da qual os anos do acervo entram no trilho. */
const CENA_DOS_ANOS = 'estante';

/**
 * O TRILHO: a lista ordenada de todas as paradas da sala, cenas e anos
 * misturados num caminho só.
 *
 * `[sala, mesa, estante, 2020-21, 2022, …, PC]` — os anos entram logo depois da
 * cena da estante, que é o móvel onde eles moram, e o canto de trabalho fecha a
 * volta. Andar para o lado percorre isso inteiro, em loop, em vez de tratar os
 * anos como um segundo eixo: com dois eixos cruzados, quem chegava na estante
 * ficava preso nos nichos e o mesmo gesto significava coisas diferentes conforme
 * onde se estava.
 *
 * Uma parada é `{cena, ano}`, com `ano` nulo em tudo que não for nicho.
 */
export function trilhoDeCenas(totalGrupos) {
    const paradas = [];
    for (const cena of CENAS) {
        paradas.push({cena: cena.id, ano: null});
        if (cena.id !== CENA_DOS_ANOS) continue;
        for (let i = 0; i < totalGrupos; i++) paradas.push({cena: cena.id, ano: i});
    }
    return paradas;
}

/**
 * A parada seguinte (`direcao` 1) ou anterior (-1) no trilho, dando a volta nas
 * pontas — ao contrário de folhear livros (`vizinhosDe`, em lib/livros-shelf.mjs),
 * que para no primeiro e no último de propósito: um acervo tem começo e fim que
 * vale perceber, enquanto aqui parar na ponta só produziria uma tecla que não faz
 * nada. Uma parada desconhecida cai na primeira.
 *
 * O `+ paradas.length` antes do módulo não é decoração: em JS `(0 - 1) % 3` é
 * -1, não 2, e sem ele a seta para trás na primeira parada devolveria undefined.
 */
export function paradaVizinha(atual, direcao, totalGrupos) {
    const paradas = trilhoDeCenas(totalGrupos);
    const ano = atual?.ano ?? null;
    const i = paradas.findIndex((p) => p.cena === atual?.cena && p.ano === ano);
    if (i === -1) return paradas[0];
    return paradas[(i + direcao + paradas.length) % paradas.length];
}

/**
 * Navegação VERTICAL dentro da estante — um atalho, não o caminho principal:
 * estando na estante, as setas de cima e de baixo pulam de ano em ano sem
 * percorrer o trilho todo.
 *
 * A escada tem um degrau a mais que os nichos: `null` é a estante inteira em
 * quadro, e dali para cima vêm os grupos, do mais antigo (0, na base) ao mais
 * recente. Isso dá uma saída natural do zoom — descer do nicho de baixo
 * devolve a visão do móvel todo — e faz o eixo da tecla bater com o eixo do
 * mundo: subir é subir na estante, e a cronologia sobe junto.
 *
 * Nas pontas o comportamento é assimétrico de propósito: no topo, subir não
 * faz nada (não há para onde), enquanto descer abaixo da base volta para
 * `null`. Entrar com `null` pega a ponta de onde o movimento vem: subindo
 * entra pela base, descendo entra pelo topo.
 */
export function anoVizinho(focado, direcao, totalGrupos) {
    if (totalGrupos <= 0) return null;
    if (focado === null || focado === undefined) return direcao > 0 ? 0 : totalGrupos - 1;

    const proximo = focado + direcao;
    if (proximo < 0) return null;
    if (proximo > totalGrupos - 1) return focado;
    return proximo;
}
