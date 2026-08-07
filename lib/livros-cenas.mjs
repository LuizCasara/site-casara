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
 * caminho pela sala, não uma lista qualquer: da visão geral para a estante
 * amarela (parede lateral esquerda), daí para o canto de leitura (poltrona e
 * mesinha), daí para a estante do acervo, no fundo, e por fim para o canto de
 * trabalho, à direita. Andar para o lado com a seta atravessa o cômodo da
 * esquerda para a direita.
 *
 * **`id` não é `rotulo`, e aqui os dois divergem de propósito.** O id casa com
 * o tipo `Viewpoint` de CameraRig.tsx e com os eventos de analytics já
 * gravados, então continua sendo o nome interno de sempre: `estante` é a
 * estante do ACERVO. O rótulo é o que a pessoa lê no botão, e na sala real o
 * móvel que se chama "estante" é o amarelo — por isso `estante` aparece como
 * "Livros" e `camping` aparece como "Estante". Renomear os ids arrastaria o
 * histórico de analytics junto, sem ganho para quem usa.
 */
export const CENAS = [
    {id: 'geral', rotulo: 'Sala'},
    {id: 'camping', rotulo: 'Estante'},
    {id: 'mesa', rotulo: 'Mesinha'},
    {id: 'estante', rotulo: 'Livros'},
    {id: 'pc', rotulo: 'PC'},
];

/**
 * As sub-paradas do canto de trabalho, na ordem em que a câmera as varre —
 * esquerda para a direita, como o trilho principal faz com a sala.
 *
 * **São exatamente os objetos que TÊM AÇÃO**, e é esse o critério: cada um
 * responde a um clique. Teclado, mouse, headphone e kettlebells estão no mesmo
 * canto e não entram, porque parar a câmera em cima de um objeto que não faz
 * nada ensina que parar não vale a pena.
 *
 * Antes disto, "PC" era uma parada só, tentando enquadrar de uma vez o quadro
 * de recados (x≈0,68) e a bíblia (x≈2,22) — um metro e meio de distância. O
 * resultado é que nada ficava bem enquadrado, e a tela do monitor em especial
 * ficava pequena demais para ler o que estava tocando.
 */
export const FOCOS_DO_PC = [
    {id: 'recomendacoes', rotulo: 'Recomendações'},
    {id: 'monitores', rotulo: 'Monitores'},
    {id: 'som', rotulo: 'Alto-falante'},
    {id: 'biblia', rotulo: 'Bíblia'},
];

/** A cena cujas sub-paradas são os nichos de ano do acervo. */
const CENA_DOS_ANOS = 'estante';
/** A cena cujas sub-paradas são FOCOS_DO_PC. */
const CENA_DO_PC = 'pc';

/**
 * Quantas sub-paradas uma cena tem.
 *
 * As duas famílias diferem numa coisa que importa: os anos são DINÂMICOS
 * (dependem de quantos grupos o acervo produziu) e os focos do PC são fixos,
 * porque são objetos da sala. Por isso `totalGrupos` entra como parâmetro e a
 * contagem do PC sai de uma constante.
 */
export function totalDeSubParadas(cena, totalGrupos) {
    if (cena === CENA_DOS_ANOS) return totalGrupos;
    if (cena === CENA_DO_PC) return FOCOS_DO_PC.length;
    return 0;
}

/**
 * O TRILHO: a lista ordenada de todas as paradas da sala, cenas e sub-paradas
 * misturadas num caminho só.
 *
 * `[sala, camping, mesa, estante, 2020-21, 2022, …, PC, recomendações,
 * monitores, alto-falante, bíblia]` — as sub-paradas entram logo depois da cena
 * a que pertencem, que é onde elas moram no mundo. Andar para o lado percorre
 * isso inteiro, em loop, em vez de tratar as sub-paradas como um segundo eixo:
 * com dois eixos cruzados, quem chegava na estante ficava preso nos nichos e o
 * mesmo gesto significava coisas diferentes conforme onde se estava.
 *
 * Uma parada é `{cena, sub}`, com `sub` nulo na cena "solta" — o plano aberto
 * do móvel, antes de escolher um detalhe dentro dele.
 */
export function trilhoDeCenas(totalGrupos) {
    const paradas = [];
    for (const cena of CENAS) {
        paradas.push({cena: cena.id, sub: null});
        const total = totalDeSubParadas(cena.id, totalGrupos);
        for (let i = 0; i < total; i++) paradas.push({cena: cena.id, sub: i});
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
    const sub = atual?.sub ?? null;
    const i = paradas.findIndex((p) => p.cena === atual?.cena && p.sub === sub);
    if (i === -1) return paradas[0];
    return paradas[(i + direcao + paradas.length) % paradas.length];
}

/**
 * Navegação VERTICAL dentro de uma cena — um atalho, não o caminho principal:
 * estando na estante ou no canto do PC, as setas de cima e de baixo pulam de
 * sub-parada em sub-parada sem percorrer o trilho todo.
 *
 * A escada tem um degrau a mais que as sub-paradas: `null` é a cena inteira em
 * quadro, e dali para cima vêm as sub-paradas, da primeira (0) à última. Isso dá
 * uma saída natural do zoom — descer da primeira devolve a visão do móvel todo
 * — e, na estante, faz o eixo da tecla bater com o eixo do mundo: subir é subir
 * na estante, e a cronologia sobe junto.
 *
 * Nas pontas o comportamento é assimétrico de propósito: no topo, subir não
 * faz nada (não há para onde), enquanto descer abaixo da base volta para
 * `null`. Entrar com `null` pega a ponta de onde o movimento vem: subindo
 * entra pela base, descendo entra pelo topo.
 */
export function subVizinha(focada, direcao, total) {
    if (total <= 0) return null;
    if (focada === null || focada === undefined) return direcao > 0 ? 0 : total - 1;

    const proxima = focada + direcao;
    if (proxima < 0) return null;
    if (proxima > total - 1) return focada;
    return proxima;
}

/**
 * O rótulo de uma sub-parada, para o evento de analytics e para a etiqueta.
 * Os anos não passam por aqui — o rótulo deles vem do próprio grupo, montado a
 * partir das datas de leitura (ver lib/shelf-years.mjs).
 */
export function rotuloDaSubParada(cena, indice) {
    if (cena !== CENA_DO_PC) return '';
    return FOCOS_DO_PC[indice]?.rotulo ?? '';
}
