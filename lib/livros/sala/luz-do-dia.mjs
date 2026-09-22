/**
 * Que cor tem o lado de fora, a cada hora do dia.
 *
 * É o que a janela da sala mostra: quem abre `/livros` às sete da manhã vê o
 * nascer do sol pelo vidro, e quem abre às onze da noite vê o azul frio da rua.
 * A hora é a do RELÓGIO DE QUEM ESTÁ VENDO — a mesma que o relógio da
 * prateleira aérea mostra (`relogio-model.mjs`), e não por acaso: com duas
 * fontes diferentes a sala se contradiria na mesma tela, mostrando sol de
 * meio-dia ao lado de um display marcando 21:00.
 *
 * Lógica pura, sem `three` e sem DOM, porque é ela que decide se a sala fica
 * bonita ou estranha e porque um erro aqui não quebra nada — só entrega uma
 * cor errada que ninguém sabe dizer por que está errada. Daí o teste.
 */

/**
 * A curva do dia, em pontos de virada. Entre dois pontos as cores são
 * interpoladas canal a canal.
 *
 * As horas NÃO são igualmente espaçadas, e é isso que faz a curva parecer um
 * dia: o céu fica praticamente igual das 21h às 5h e muda por completo entre
 * 6h e 8h. Pontos igualmente espaçados gastariam resolução na madrugada e
 * atravessariam o nascer do sol numa tacada.
 *
 * `intensidade` é em CANDELA, como o resto da iluminação da sala (o three r155+
 * usa luz fisicamente correta, ver o cabeçalho de `LuzDoTeto` em Room.tsx).
 *
 * **O piso da noite não sai de fotometria, sai do que se enxerga.** A luz
 * noturna existe para ser vista com o teto APAGADO, quando o que sobra na sala
 * é o ambiente em 0,07; a referência dela é esse número, não as 22 candelas do
 * teto aceso. Na primeira versão ela ficou em 2,2 e sumia: ninguém abria a
 * cortina de madrugada e via nada acontecer.
 *
 * O último ponto às 24h REPETE o das 0h de propósito — é o que faz a
 * interpolação atravessar a meia-noite sem um ramo especial, e o teste confere
 * que a emenda é invisível.
 */
const CURVA = [
    {hora: 0, topo: [12, 18, 40], base: [22, 30, 60], luz: [120, 150, 220], intensidade: 4.5},
    {hora: 5, topo: [18, 26, 56], base: [44, 48, 84], luz: [130, 155, 215], intensidade: 4.6},
    {hora: 6.5, topo: [70, 86, 140], base: [226, 138, 86], luz: [255, 168, 110], intensidade: 7},
    {hora: 8, topo: [96, 150, 214], base: [196, 206, 226], luz: [255, 214, 168], intensidade: 14},
    {hora: 12, topo: [74, 140, 214], base: [168, 200, 236], luz: [255, 246, 226], intensidade: 24},
    {hora: 16, topo: [92, 148, 206], base: [206, 200, 206], luz: [255, 226, 182], intensidade: 16},
    {hora: 18, topo: [104, 104, 158], base: [236, 132, 72], luz: [255, 150, 88], intensidade: 9},
    {hora: 19.5, topo: [42, 44, 92], base: [112, 66, 110], luz: [180, 130, 180], intensidade: 6},
    {hora: 21, topo: [14, 20, 44], base: [24, 32, 62], luz: [124, 152, 220], intensidade: 4.6},
    {hora: 24, topo: [12, 18, 40], base: [22, 30, 60], luz: [120, 150, 220], intensidade: 4.5},
];

/**
 * Quando o sol aparece e some no vidro.
 *
 * **Uma simplificação assumida:** uma janela real olha para UM lado, então
 * jamais mostraria o nascer e o pôr do sol pelo mesmo vidro. Aqui o astro
 * atravessa o vão da esquerda para a direita ao longo do seu período, porque é
 * o que se lê como "o dia passando" — e ninguém vai auditar o azimute de um
 * cômodo inventado. Fingir precisão astronômica custaria geolocalização e data,
 * e entregaria a mesma imagem.
 */
export const HORARIOS = {nascer: 6, por: 18.6};

/** Traz qualquer hora para 0..24 — inclusive negativa, que em JS o `%` deixa
 *  negativa e produziria uma busca fora da curva. */
function normalizarHora(hora) {
    return ((hora % 24) + 24) % 24;
}

/** A hora fracionária de um `Date`. Minutos importam: às 6h30 o céu está no
 *  meio da virada, e arredondar para 6h ou 7h perderia exatamente o momento
 *  que vale a pena ver. */
export function horaFracionaria(data) {
    return data.getHours() + data.getMinutes() / 60 + data.getSeconds() / 3600;
}

function misturar(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}

/**
 * O clima do lado de fora numa hora qualquer: as duas cores do degradê do céu,
 * a cor da luz que entra e a força dela.
 */
export function climaDaHora(hora) {
    const h = normalizarHora(hora);
    let i = 0;
    while (i < CURVA.length - 2 && CURVA[i + 1].hora <= h) i++;

    const de = CURVA[i];
    const ate = CURVA[i + 1];
    const t = (h - de.hora) / (ate.hora - de.hora);

    return {
        ceuTopo: misturar(de.topo, ate.topo, t),
        ceuBase: misturar(de.base, ate.base, t),
        corDaLuz: misturar(de.luz, ate.luz, t),
        intensidade: de.intensidade + (ate.intensidade - de.intensidade) * t,
    };
}

/**
 * Onde desenhar o sol (ou a lua) no vidro, em fração do vão: `x` da esquerda
 * para a direita, `altura` do horizonte (0) ao topo (1).
 *
 * A altura é um arco de seno sobre o período, e não mais uma coluna na tabela
 * acima: com as duas coisas escritas à mão, mexer no horário do nascer deixaria
 * o sol saindo do chão já no alto. Derivada, ela acompanha sozinha.
 *
 * A lua faz o mesmo trajeto no período de fora — o que também é uma
 * simplificação assumida, porque a lua de verdade não nasce quando o sol se
 * põe. Vale pelo mesmo motivo: é o desenho que se lê como noite.
 */
export function posicaoDoAstro(hora) {
    const h = normalizarHora(hora);
    const ehDia = h >= HORARIOS.nascer && h < HORARIOS.por;

    const duracao = ehDia
        ? HORARIOS.por - HORARIOS.nascer
        : 24 - (HORARIOS.por - HORARIOS.nascer);
    // À noite o período atravessa a meia-noite: contar a partir do pôr do sol
    // com módulo de 24 é o que evita um `if` para "antes" e outro para "depois".
    const desde = ehDia ? h - HORARIOS.nascer : normalizarHora(h - HORARIOS.por);
    const fracao = desde / duracao;

    return {
        tipo: ehDia ? 'sol' : 'lua',
        // Nem 0 nem 1: o astro nasce e se põe DENTRO do vão, não colado nas
        // bordas do caixilho, onde ele viraria meio disco cortado pela moldura.
        x: 0.14 + fracao * 0.72,
        altura: Math.sin(Math.PI * fracao),
    };
}

/**
 * Quanto o sol está alto, de 0 (noite fechada) a 1 (meio-dia). É o que decide
 * até onde a poça de luz entra na sala: sol a pino cai rente à parede, sol
 * baixo entra atravessado e alcança o meio do cômodo.
 *
 * Zero à noite, e não a altura da lua: luar não faz mancha de luz no chão.
 */
export function alturaDoSol(hora) {
    const astro = posicaoDoAstro(hora);
    return astro.tipo === 'sol' ? astro.altura : 0;
}

/** Quanto tempo o céu leva para trocar de regime no nascer e no pôr do sol. */
export const CREPUSCULO_H = 0.7;

/**
 * O quanto a luz que entra é LUZ DE SOL, de 0 (noite) a 1 (dia feito).
 *
 * Existe para desfazer uma confusão que custou caro: `alturaDoSol` devolve 0
 * tanto à meia-noite quanto no instante exato do nascer, e são coisas
 * diferentes — "não há sol" contra "há sol, rente ao horizonte". Quem lê só a
 * altura trata a madrugada como se fosse o amanhecer eterno.
 *
 * A rampa é o que mantém a transição contínua: sem ela, a luz mudaria de
 * regime num quadro, exatamente no minuto do nascer.
 */
export function fracaoDeSol(hora) {
    const h = normalizarHora(hora);
    if (h < HORARIOS.nascer || h >= HORARIOS.por) return 0;
    const desdeONascer = h - HORARIOS.nascer;
    const ateOPor = HORARIOS.por - h;
    return Math.min(1, Math.min(desdeONascer, ateOPor) / CREPUSCULO_H);
}

/** O quanto a luz noturna entra sala adentro. Curto de propósito — ver
 *  `profundidadeDaLuz`. */
export const PROFUNDIDADE_NOTURNA = 0.2;

/**
 * Até que fração da sala a luz da janela alcança: 0 é rente à parede, 1 é o
 * fundo do cômodo.
 *
 * **De dia sai do sol**: a pino ele entra quase reto e a mancha fica no pé da
 * parede; baixo, entra atravessado e a mancha atravessa o piso. É a mesma
 * lógica derivada da mira da lanterna, e é o que faz a hora se ler no chão.
 *
 * **À noite é curta, e essa é a correção que faltava.** Luz de noite não é luz
 * de sol rasante: é o céu inteiro espalhando um pouco de claridade, e ela se
 * derrama logo abaixo do peitoril. Tratando a madrugada como sol no horizonte,
 * o facho saía com o ângulo mais raso possível E a maior distância — as duas
 * coisas que mais gastam luz —, e o resultado era 0,25 de irradiância no chão,
 * indistinguível do escuro. Perto, a MESMA candela entrega umas seis vezes
 * mais, porque a queda é com o quadrado da distância.
 *
 * **Efeito colateral assumido:** como os dois regimes estão em pontas opostas
 * da faixa, o crepúsculo varre a faixa inteira — nos 42 minutos em torno do
 * poente a mancha desliza de volta para o pé da parede, em vez de esticar até o
 * fim. É o contrário do que o rasante faria, e mesmo assim é a escolha certa:
 * a alternativa é a mancha pular de lugar num único quadro, e o que se vê aqui
 * lê como a luz se retirando da sala.
 */
export function profundidadeDaLuz(hora) {
    const doSol = 1 - 0.85 * alturaDoSol(hora);
    const dia = fracaoDeSol(hora);
    return PROFUNDIDADE_NOTURNA + (doSol - PROFUNDIDADE_NOTURNA) * dia;
}
