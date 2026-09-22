/**
 * As medidas do `janela.glb` e a cinemática das duas cortinas.
 *
 * **Todos os números aqui foram LIDOS dos vértices do arquivo**, não estimados —
 * mesmo tratamento dos nichos da estante (`bookshelf-model.mjs`) e do vão do
 * relógio (`relogio-model.mjs`), e pelo mesmo motivo: trocar o `.glb` sem
 * atualizar esta tabela quebra o teste, em vez de deixar a cortina fechando no
 * lugar errado e o vidro aparecendo pela fresta.
 *
 * As unidades são as do MODELO, não metros. Isso é de propósito: o
 * `KenneyModel` escala a peça inteira para o tamanho pedido, e uma cortina que
 * anda "8 centímetros" precisaria saber por quanto a peça foi escalada. Em
 * fração do modelo, o movimento vale para qualquer tamanho de janela.
 */

/** Caixa envolvente da peça inteira, em unidades do modelo. */
export const JANELA_NATIVA = {largura: 1.040, altura: 1.380, profundidade: 0.090};

/**
 * O painel de vidro — `mat25`, o material translúcido (alfa 0,40).
 *
 * **É um quad de quatro vértices**, e é isso que permite pintar o céu nele com
 * o `texturas` do `KenneyModel`: o `normalizarUV` de lá é EXATO para uma malha
 * retangular de quatro vértices, não uma aproximação. Daí não haver plano
 * nenhum colado na frente da janela — o lado de fora é o próprio vidro, do
 * mesmo jeito que a tela do monitor é o material da tela.
 */
export const VIDRO = {minX: -0.329, maxX: 0.351, minY: -0.581, maxY: 0.326};

/**
 * A espessura da peça, e onde o vidro está dentro dela.
 *
 * Serve para encostar a janela na parede pelo lado certo, e o lado certo não é
 * óbvio: **as cortinas estão no z NEGATIVO e o vidro no positivo**, ou seja, o
 * "dentro do cômodo" deste modelo é o -z. É isso que obriga a peça a levar um
 * quarto de volta com o +z apontando para dentro da parede, e não para a sala.
 */
export const PROFUNDIDADE = {min: -0.037, max: 0.053};
/** O plano do vidro, no eixo da espessura. É a face que precisa ficar rente à
 *  parede — um pouco à frente dela, nunca atrás: a parede é opaca e esconderia
 *  o céu, e exatamente rente as duas disputariam cada pixel (z-fighting). */
export const VIDRO_Z = PROFUNDIDADE.max;

/** Proporção do vidro (largura ÷ altura). O canvas do céu nasce com ela, senão
 *  a textura chega esticada no vão. */
export const VIDRO_PROPORCAO =
    (VIDRO.maxX - VIDRO.minX) / (VIDRO.maxY - VIDRO.minY);

/**
 * O varão, acima do caixilho (`mat15`, o mesmo material das travessas do vidro
 * — recolorir um recolore o outro).
 *
 * Ele é o LIMITE do movimento: cortina que passa da ponta do varão fica
 * pendurada no ar, e é o teste que garante que nenhum dos dois extremos do
 * movimento chega lá.
 */
export const VARAO = {minX: -0.529, maxX: 0.511};

/**
 * As duas cortinas, cada uma um nó próprio do `.glb`.
 *
 * **Os nomes de nó são lixo gerado pelo `obj2gltf`** (`group1329612974`), não
 * têm significado nenhum e não dá para adivinhá-los — saíram de percorrer a
 * árvore do arquivo. Ficam nomeados aqui uma vez para nunca mais aparecerem
 * soltos no meio de um componente.
 *
 * As duas dividem o material `mat13`, então a cor é necessariamente a mesma nas
 * duas — o que é o desejado, mas significa que `ocultos`/`cores` não conseguem
 * distinguir uma da outra. Quem distingue é o nó, e é por isso que animar isto
 * exigiu o `articulados` do `KenneyModel`.
 *
 * `externa` é a borda que fica sob a ponta do varão; `interna` é a que avança
 * sobre o vidro. Elas trocam de lado entre esquerda e direita, e é justamente
 * esse espelhamento que a conta abaixo precisa respeitar.
 */
export const CORTINAS = {
    esquerda: {no: 'group1192423041', minX: -0.499, maxX: -0.079, externa: 'minX'},
    direita: {no: 'group1329612974', minX: 0.081, maxX: 0.491, externa: 'maxX'},
};

/**
 * Quanto as duas se cruzam no meio quando fechadas.
 *
 * No arquivo as cortinas nascem ENTREABERTAS: sobra uma fresta de 16cm sobre um
 * vidro de 68cm. Fechar não é deixá-las como vieram, é trazer cada uma para o
 * centro até se cruzarem — e cruzar, e não só encostar, porque duas bordas que
 * se tocam exatamente deixam uma linha de vidro aparecendo na primeira vez que
 * alguém mexer num número daqui.
 */
export const SOBREPOSICAO = 0.02;

/**
 * O quanto a cortina FRANZE ao abrir, como fração da largura original.
 *
 * **Abrir não é só deslizar**, e isso não é capricho: a ponta do varão está a
 * apenas 3cm da borda externa da cortina fechada, então translação pura abriria
 * a janela em 3cm e depois penduraria o tecido fora do varão. Cortina de
 * verdade se amontoa na lateral, e é o que este fator faz — a peça encolhe em X
 * mantendo a borda externa presa no lugar, que é o gesto certo E o único que
 * cabe no espaço disponível.
 *
 * 0,30 é o maior valor que ainda libera o vidro INTEIRO dos dois lados (o teste
 * confere): mais que isso e a cortina direita, que é a mais larga das duas,
 * continua tapando uma faixa do vidro com a janela supostamente aberta.
 */
export const FRANZIDO = 0.30;

/**
 * Escala e deslocamento em X de uma cortina, para um grau de abertura.
 *
 * Um vértice em `x` acaba em `escalaX * x + deslocX` — que é exatamente o que o
 * three faz com `node.scale.x` e `node.position.x`, nessa ordem. É por isso que
 * a conta pode ser feita aqui, sem cena nenhuma montada, e conferida por teste.
 *
 * O pivô do encolhimento é a borda EXTERNA, e não a origem do nó (que fica no
 * centro da janela): `desloc = externa * (1 - escala)` é o que mantém aquela
 * borda parada enquanto o resto do tecido se amontoa em direção a ela. Sem
 * isso, franzir puxaria a cortina inteira para o meio do vidro.
 *
 * @param lado 'esquerda' | 'direita'
 * @param abertura 0 = fechada (cobre o vidro), 1 = aberta (franzida na lateral)
 */
export function estadoDaCortina(lado, abertura) {
    const c = CORTINAS[lado];
    if (!c) throw new Error(`lado desconhecido: ${lado}`);

    const externa = c[c.externa];
    // A borda interna é a outra ponta — a que precisa cruzar o centro quando
    // fecha. Deduzida de `externa` para os dois lados saírem da mesma conta, em
    // vez de dois ramos espelhados que se desencontram no primeiro ajuste.
    const interna = c.externa === 'minX' ? c.maxX : c.minX;
    const sinal = c.externa === 'minX' ? 1 : -1;

    // Fechada: escala cheia, e a borda interna levada até meia sobreposição do
    // outro lado do centro.
    const deslocFechada = sinal * (SOBREPOSICAO / 2) - interna;
    // Aberta: franzida contra a borda externa, que fica onde está.
    const deslocAberta = externa * (1 - FRANZIDO);

    const t = Math.min(1, Math.max(0, abertura));
    return {
        escalaX: 1 + (FRANZIDO - 1) * t,
        deslocX: deslocFechada + (deslocAberta - deslocFechada) * t,
    };
}

/** Onde as duas pontas da cortina ficam, dado um estado — o que o teste mede e
 *  o que torna possível afirmar "cobre o vidro" sem olhar a tela. */
export function faixaDaCortina(lado, abertura) {
    const c = CORTINAS[lado];
    const {escalaX, deslocX} = estadoDaCortina(lado, abertura);
    return {min: escalaX * c.minX + deslocX, max: escalaX * c.maxX + deslocX};
}
