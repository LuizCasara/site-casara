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
    /*
      A gaveta está AQUI, e não no fim, porque a ordem é a posição no mundo: o
      trilho varre o canto da esquerda para a direita, e ela está em x ≈ 1,01,
      entre o quadro de recados (0,68) e os monitores (1,84). Enfileirar por
      ordem de chegada faria a câmera saltar para a frente e voltar.

      **`foraDoTrilho` a tira da NAVEGAÇÃO, não da sala.** A gaveta é a única
      parada que ninguém atravessa: roda, setas e nenhum outro gesto de percorrer
      passam por ela. Chega-se lá clicando na gaveta — e só —, o que a torna uma
      coisa que se DESCOBRE em vez de uma que se recebe pronta ao rolar a página.
      Ela continua na lista, e continua no índice que `VIEWPOINTS_DO_PC` usa: o
      enquadramento existe, o clique leva até ele, o trilho é que não para ali.
    */
    {id: 'gaveta', rotulo: 'Gaveta', foraDoTrilho: true},
    {id: 'monitores', rotulo: 'Monitores'},
    {id: 'som', rotulo: 'Alto-falante'},
    {id: 'biblia', rotulo: 'Bíblia'},
];

/**
 * Onde um foco do PC está na lista, pelo id.
 *
 * Existe para que quem CLICA num objeto da sala possa levar a câmera até a
 * parada dele sem escrever o índice na mão. Um `1` solto no meio do `RoomCanvas`
 * apontaria para a gaveta hoje e para outro objeto no dia em que a ordem mudasse
 * — e a ordem MUDA, porque ela é a posição no mundo, não a ordem de criação.
 */
export function indiceDoFoco(id) {
    const i = FOCOS_DO_PC.findIndex((f) => f.id === id);
    if (i < 0) throw new Error(`foco desconhecido no canto do PC: ${id}`);
    return i;
}

/** A cena cujas sub-paradas são os nichos de ano do acervo. */
const CENA_DOS_ANOS = 'estante';
/** A cena cujas sub-paradas são FOCOS_DO_PC. */
const CENA_DO_PC = 'pc';

/**
 * As sub-paradas de uma cena que a navegação alcança, na ordem VERTICAL do
 * mundo — da base para o topo, na estante; da esquerda para a direita, no canto
 * do PC. É uma lista de índices, não uma contagem: com a gaveta fora do trilho,
 * o canto do PC tem quatro paradas navegáveis cujos índices são [0, 2, 3, 4], e
 * um `total = 4` faria a navegação parar na caixa de som e nunca chegar à
 * bíblia.
 *
 * As duas famílias diferem numa coisa que importa: os anos são DINÂMICOS
 * (dependem de quantos grupos o acervo produziu) e os focos do PC são fixos,
 * porque são objetos da sala. Por isso `totalGrupos` entra como parâmetro e a
 * lista do PC sai de uma constante.
 *
 * `incluirOcultas` existe para um caso só: localizar no trilho quem já ESTÁ numa
 * parada oculta (chegou nela por clique). Ver `paradaVizinha`.
 */
export function subParadasDaCena(cena, totalGrupos, {incluirOcultas = false} = {}) {
    if (cena === CENA_DOS_ANOS) return Array.from({length: totalGrupos}, (_, i) => i);
    if (cena !== CENA_DO_PC) return [];
    return FOCOS_DO_PC
        .map((foco, i) => ({foco, i}))
        .filter(({foco}) => incluirOcultas || !foco.foraDoTrilho)
        .map(({i}) => i);
}

/**
 * As mesmas sub-paradas, na ordem em que o TRILHO as varre.
 *
 * Só a estante diverge da ordem do mundo, e de propósito: ela é varrida de CIMA
 * para BAIXO, começando pelo ano mais recente. O eixo do trilho é o de andar
 * pela sala, não o da cronologia — e quem chega na estante quer ver primeiro o
 * que foi lido por último, do mesmo jeito que uma linha do tempo de site abre no
 * post mais novo. As setas ↑/↓ continuam seguindo o mundo (ver `subVizinha`):
 * subir é subir na estante, e lá a cronologia sobe junto.
 */
function subParadasNoTrilho(cena, totalGrupos, opcoes) {
    const subs = subParadasDaCena(cena, totalGrupos, opcoes);
    return cena === CENA_DOS_ANOS ? subs.reverse() : subs;
}

/**
 * O TRILHO: a lista ordenada de todas as paradas da sala, cenas e sub-paradas
 * misturadas num caminho só.
 *
 * `[sala, camping, mesa, estante, 2026, 2025, …, PC, recomendações,
 * monitores, alto-falante, bíblia]` — as sub-paradas entram logo depois da cena
 * a que pertencem, que é onde elas moram no mundo. Andar para o lado percorre
 * isso inteiro, em loop, em vez de tratar as sub-paradas como um segundo eixo:
 * com dois eixos cruzados, quem chegava na estante ficava preso nos nichos e o
 * mesmo gesto significava coisas diferentes conforme onde se estava.
 *
 * Duas coisas que o exemplo acima mostra e vale dizer em voz alta: os anos vêm
 * do mais recente ao mais antigo (ver `subParadasNoTrilho`), e a gaveta NÃO está
 * entre os focos do PC (ver `FOCOS_DO_PC`).
 *
 * Uma parada é `{cena, sub}`, com `sub` nulo na cena "solta" — o plano aberto
 * do móvel, antes de escolher um detalhe dentro dele.
 */
export function trilhoDeCenas(totalGrupos, opcoes) {
    const paradas = [];
    for (const cena of CENAS) {
        paradas.push({cena: cena.id, sub: null});
        for (const sub of subParadasNoTrilho(cena.id, totalGrupos, opcoes)) {
            paradas.push({cena: cena.id, sub});
        }
    }
    return paradas;
}

/** Duas paradas são a mesma quando cena e sub batem — `sub` pode ser `null`. */
function mesmaParada(a, b) {
    return a.cena === b.cena && a.sub === b.sub;
}

/**
 * A parada seguinte (`direcao` 1) ou anterior (-1) no trilho, dando a volta nas
 * pontas — ao contrário de folhear livros (`vizinhosDe`, em lib/livros-shelf.mjs),
 * que para no primeiro e no último de propósito: um acervo tem começo e fim que
 * vale perceber, enquanto aqui parar na ponta só produziria uma tecla que não faz
 * nada. Uma parada desconhecida cai na primeira.
 *
 * O `+ todas.length` antes do módulo não é decoração: em JS `(0 - 1) % 3` é
 * -1, não 2, e sem ele a seta para trás na primeira parada devolveria undefined.
 *
 * **Os dois trilhos**: a busca acontece no COMPLETO (com as paradas ocultas) e a
 * chegada, no visível. Quem clicou na gaveta está numa parada que o trilho não
 * conhece — procurá-la só no visível daria -1, e a primeira roda do mouse depois
 * de abrir a gaveta jogaria a câmera lá no começo da sala. Achando-a no completo,
 * o passo seguinte cai no vizinho certo dela: monitores para a frente, quadro de
 * recados para trás.
 */
export function paradaVizinha(atual, direcao, totalGrupos) {
    const visiveis = trilhoDeCenas(totalGrupos);
    const todas = trilhoDeCenas(totalGrupos, {incluirOcultas: true});
    const sub = atual?.sub ?? null;
    const i = todas.findIndex((p) => p.cena === atual?.cena && p.sub === sub);
    if (i === -1) return visiveis[0];

    for (let passo = 1; passo <= todas.length; passo++) {
        const j = (((i + direcao * passo) % todas.length) + todas.length) % todas.length;
        if (visiveis.some((p) => mesmaParada(p, todas[j]))) return todas[j];
    }
    return visiveis[0];
}

/**
 * Navegação VERTICAL dentro de uma cena — um atalho, não o caminho principal:
 * estando na estante ou no canto do PC, as setas de cima e de baixo pulam de
 * sub-parada em sub-parada sem percorrer o trilho todo.
 *
 * A escada tem um degrau a mais que as sub-paradas: `null` é a cena inteira em
 * quadro, e dali para cima vêm as sub-paradas, da primeira à última. Isso dá
 * uma saída natural do zoom — descer da primeira devolve a visão do móvel todo
 * — e, na estante, faz o eixo da tecla bater com o eixo do mundo: subir é subir
 * na estante, e a cronologia sobe junto. É por isso que aqui a ordem é a do
 * mundo e não a do trilho, que varre os anos de cima para baixo.
 *
 * Nas pontas o comportamento é assimétrico de propósito: no topo, subir não
 * faz nada (não há para onde), enquanto descer abaixo da base volta para
 * `null`. Entrar com `null` pega a ponta de onde o movimento vem: subindo
 * entra pela base, descendo entra pelo topo.
 *
 * @param subs os índices navegáveis da cena, de `subParadasDaCena` — uma lista,
 *   e não uma contagem, porque a gaveta deixa um buraco no meio dos índices do
 *   canto do PC.
 */
export function subVizinha(focada, direcao, subs) {
    if (subs.length === 0) return null;
    if (focada === null || focada === undefined) return direcao > 0 ? subs[0] : subs[subs.length - 1];

    const i = subs.indexOf(focada);
    if (i === -1) {
        // Estamos numa parada oculta (a gaveta, alcançada por clique): a saída é
        // a navegável mais próxima NA DIREÇÃO do movimento, e não a ponta da
        // lista — sair da gaveta para cima é chegar aos monitores, o vizinho
        // dela no mundo. As duas pontas seguem a mesma assimetria de sempre: em
        // cima, ficar onde está; em baixo, `null`, a saída do zoom.
        if (direcao > 0) return subs.find((s) => s > focada) ?? focada;
        return [...subs].reverse().find((s) => s < focada) ?? null;
    }

    const proxima = i + direcao;
    if (proxima < 0) return null;
    if (proxima > subs.length - 1) return focada;
    return subs[proxima];
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
