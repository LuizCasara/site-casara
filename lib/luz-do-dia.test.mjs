import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    HORARIOS, PROFUNDIDADE_NOTURNA, CREPUSCULO_H, climaDaHora, posicaoDoAstro,
    alturaDoSol, fracaoDeSol, profundidadeDaLuz, horaFracionaria,
} from './luz-do-dia.mjs';

const CANAIS = ['ceuTopo', 'ceuBase', 'corDaLuz'];

test('toda hora do dia devolve cor válida e luz positiva', () => {
    // De 15 em 15 minutos, o dia inteiro: um ponto de virada mal encaixado na
    // curva devolveria NaN ou canal fora de 0..255 numa faixa estreita que
    // nenhum teste de horas redondas pegaria.
    for (let h = 0; h < 24; h += 0.25) {
        const clima = climaDaHora(h);
        for (const campo of CANAIS) {
            const cor = clima[campo];
            assert.equal(cor.length, 3, `${h}h: ${campo} não tem três canais`);
            for (const c of cor) {
                assert.ok(Number.isInteger(c) && c >= 0 && c <= 255,
                    `${h}h: ${campo} saiu com o canal ${c}`);
            }
        }
        assert.ok(clima.intensidade > 0 && clima.intensidade <= 30,
            `${h}h: intensidade ${clima.intensidade}`);
    }
});

test('a emenda da meia-noite é invisível', () => {
    // O último ponto da curva repete o primeiro justamente para isto. Se a
    // repetição sair, o céu dá um salto de cor às 00:00 — e ninguém está
    // olhando a tela nessa hora para perceber.
    const antes = climaDaHora(23.999);
    const depois = climaDaHora(0.001);
    for (const campo of CANAIS) {
        for (let i = 0; i < 3; i++) {
            assert.ok(Math.abs(antes[campo][i] - depois[campo][i]) <= 1,
                `${campo}[${i}] saltou de ${antes[campo][i]} para ${depois[campo][i]}`);
        }
    }
    assert.ok(Math.abs(antes.intensidade - depois.intensidade) < 0.01);
});

test('hora negativa e hora acima de 24 dão a volta', () => {
    assert.deepEqual(climaDaHora(25), climaDaHora(1));
    assert.deepEqual(climaDaHora(-2), climaDaHora(22));
    assert.deepEqual(climaDaHora(48 + 13.5), climaDaHora(13.5));
});

test('meio-dia é muito mais forte e mais branco que a madrugada', () => {
    const meioDia = climaDaHora(12);
    const madrugada = climaDaHora(3);

    assert.ok(meioDia.intensidade > madrugada.intensidade * 5,
        `meio-dia ${meioDia.intensidade} contra madrugada ${madrugada.intensidade}`);

    // A luz da madrugada é FRIA: mais azul que vermelho. A do meio-dia é quase
    // branca. É a diferença que o pedido original descreve — "luz do sol de dia,
    // luz fria à noite" — e é fácil de perder num ajuste de paleta.
    assert.ok(madrugada.corDaLuz[2] > madrugada.corDaLuz[0],
        'a luz da madrugada não está fria');
    assert.ok(meioDia.corDaLuz[0] - meioDia.corDaLuz[2] < 40,
        'a luz do meio-dia não está branca');
});

test('o pôr do sol é quente: mais vermelho que azul', () => {
    const entardecer = climaDaHora(18);
    assert.ok(entardecer.corDaLuz[0] > entardecer.corDaLuz[2] + 100,
        `18h saiu ${entardecer.corDaLuz.join(',')}, que não é cor de pôr do sol`);
    // E a base do céu (o horizonte) é mais quente que o topo, que é o que faz
    // um pôr do sol parecer um pôr do sol e não um filtro laranja.
    assert.ok(entardecer.ceuBase[0] > entardecer.ceuTopo[0],
        'o horizonte das 18h não está mais quente que o topo do céu');
});

test('o sol nasce e se põe nos horários declarados', () => {
    assert.equal(posicaoDoAstro(HORARIOS.nascer).tipo, 'sol');
    assert.equal(posicaoDoAstro(HORARIOS.por - 0.01).tipo, 'sol');
    assert.equal(posicaoDoAstro(HORARIOS.por).tipo, 'lua');
    assert.equal(posicaoDoAstro(HORARIOS.nascer - 0.01).tipo, 'lua');
    assert.equal(posicaoDoAstro(2).tipo, 'lua');
});

test('o astro atravessa o vão da esquerda para a direita, sempre', () => {
    // Inclusive a lua, cujo período cruza a meia-noite — o lugar onde uma conta
    // sem módulo faria o disco pular de volta para a esquerda no meio da noite.
    for (const inicio of [HORARIOS.nascer, HORARIOS.por]) {
        let anterior = -Infinity;
        for (let passo = 0; passo < 24; passo++) {
            const h = inicio + passo * 0.4;
            const {tipo, x} = posicaoDoAstro(h);
            const mesmoAstro = tipo === (inicio === HORARIOS.nascer ? 'sol' : 'lua');
            if (!mesmoAstro) break;
            assert.ok(x > anterior, `o astro voltou em ${h.toFixed(1)}h (x=${x})`);
            assert.ok(x > 0 && x < 1, `x=${x} caiu fora do vão`);
            anterior = x;
        }
    }
});

test('o astro nasce e se põe rente ao horizonte, e sobe no meio do período', () => {
    assert.ok(posicaoDoAstro(HORARIOS.nascer).altura < 0.01, 'o sol nasce alto');
    assert.ok(posicaoDoAstro(HORARIOS.por - 0.001).altura < 0.01, 'o sol se põe alto');

    const meio = (HORARIOS.nascer + HORARIOS.por) / 2;
    assert.ok(posicaoDoAstro(meio).altura > 0.99, 'o sol não chega ao alto');
});

test('a altura do sol é zero à noite — luar não faz poça de luz', () => {
    assert.equal(alturaDoSol(23), 0);
    assert.equal(alturaDoSol(3), 0);
    assert.ok(alturaDoSol(12) > 0.99);
    // E é contínua no nascer: um degrau aqui faria a mancha de luz aparecer no
    // chão de uma vez, em vez de entrar pela janela.
    assert.ok(alturaDoSol(HORARIOS.nascer + 0.01) < 0.02);
});

test('a noite NÃO é tratada como sol rente ao horizonte', () => {
    // O bug que motivou `fracaoDeSol`: `alturaDoSol` devolve 0 tanto às três da
    // manhã quanto no instante do nascer, e quem lê só a altura manda a luz da
    // madrugada para o fundo da sala, no ângulo mais raso possível. O resultado
    // era uma mancha grande, rasa e invisível.
    assert.equal(alturaDoSol(3), alturaDoSol(HORARIOS.nascer));
    assert.equal(profundidadeDaLuz(3), PROFUNDIDADE_NOTURNA);
    assert.ok(profundidadeDaLuz(3) < profundidadeDaLuz(HORARIOS.nascer + 0.5),
        'a luz da madrugada entra tão fundo quanto a do amanhecer');
});

test('a luz noturna chega ao chão muitas vezes mais forte que a do amanhecer raso', () => {
    // A conta que decide se a coisa aparece: irradiância = candela ÷ distância².
    // A luz fica a 1,42m do piso (a janela pendurada a 0,86m mais meia altura
    // da peça), e é essa distância vertical que impede a mancha de encolher
    // indefinidamente.
    const ALTURA_DA_LUZ = 1.42;
    const PERTO = 0.55;
    const LONGE = 2.9;

    const irradiancia = (hora) => {
        const poca = PERTO + profundidadeDaLuz(hora) * (LONGE - PERTO);
        return climaDaHora(hora).intensidade / (poca ** 2 + ALTURA_DA_LUZ ** 2);
    };

    // Com o teto apagado a sala fica com 0,07 de ambiente. A luz da janela tem
    // que ficar uma ordem de grandeza acima disso para alguém dizer "abriu".
    assert.ok(irradiancia(3) > 0.07 * 10,
        `a madrugada entrega ${irradiancia(3).toFixed(2)} no chão, contra 0,07 de ambiente`);
    // E o dia continua sendo dia: muito mais forte que a noite.
    assert.ok(irradiancia(12) > irradiancia(3) * 4,
        'o meio-dia deixou de dominar a noite');
});

test('a profundidade da luz é contínua o dia inteiro', () => {
    // Um degrau aqui faz a mancha SALTAR de lugar no chão de um quadro para o
    // outro — no nascer e no pôr do sol, que é justamente quando alguém está
    // olhando para ver o que acontece.
    let anterior = profundidadeDaLuz(0);
    for (let h = 0; h <= 24; h += 1 / 60) {
        const atual = profundidadeDaLuz(h);
        assert.ok(Math.abs(atual - anterior) < 0.05,
            `salto de ${(atual - anterior).toFixed(3)} em ${h.toFixed(2)}h`);
        assert.ok(atual > 0 && atual <= 1, `${h.toFixed(2)}h: profundidade ${atual}`);
        anterior = atual;
    }
});

test('o meio-dia é a mancha mais curta, e o fim da tarde a mais longa', () => {
    const meioDia = profundidadeDaLuz((HORARIOS.nascer + HORARIOS.por) / 2);
    for (const h of [7, 9, 15, 17.5]) {
        assert.ok(profundidadeDaLuz(h) > meioDia,
            `${h}h não entra mais fundo que o meio-dia`);
    }
    // O pico do rasante é o fim da tarde com o sol ainda alto o bastante para
    // ter força — não o minuto do poente, quando a rampa do crepúsculo já está
    // recolhendo a mancha para o pé da parede.
    assert.ok(profundidadeDaLuz(18) > 0.7,
        'a luz das seis da tarde não atravessa a sala');
});

test('ao anoitecer a mancha RECOLHE para o pé da parede, sem saltar', () => {
    // Escolha assumida, e o contrário do que a física do rasante faria: nos 42
    // minutos do crepúsculo a poça desliza de volta para perto da janela, em vez
    // de esticar até o instante do poente e sumir de um quadro para o outro.
    //
    // Some porque a alternativa é pior: o regime noturno precisa da mancha CURTA
    // para ser visível (é a queda com o quadrado da distância que decide isso), e
    // os dois extremos estão em pontas opostas da faixa. Qualquer transição entre
    // eles varre a faixa inteira — resta escolher se ela varre em 42 minutos ou
    // num único quadro. Na tela lê como a luz se retirando da sala.
    // Amarrado a CREPUSCULO_H, e não a meia hora cravada: encurtar a rampa
    // deixaria este teste medindo um trecho que já é noite, e ele continuaria
    // passando sem testar mais nada.
    const antes = profundidadeDaLuz(HORARIOS.por - CREPUSCULO_H * 0.7);
    const noPoente = profundidadeDaLuz(HORARIOS.por - CREPUSCULO_H * 0.02);
    const noite = profundidadeDaLuz(HORARIOS.por + CREPUSCULO_H);

    assert.ok(antes > noPoente, 'a mancha não recolheu durante o crepúsculo');
    assert.ok(noPoente > noite, 'a mancha saltou para o valor noturno');
    assert.ok(Math.abs(noite - PROFUNDIDADE_NOTURNA) < 1e-9);
});

test('fracaoDeSol separa noite de dia e sobe pela rampa do crepúsculo', () => {
    assert.equal(fracaoDeSol(3), 0);
    assert.equal(fracaoDeSol(HORARIOS.nascer), 0);
    assert.equal(fracaoDeSol(HORARIOS.por), 0);
    assert.equal(fracaoDeSol(12), 1);
    const meioDaRampa = fracaoDeSol(HORARIOS.nascer + 0.35);
    assert.ok(meioDaRampa > 0.4 && meioDaRampa < 0.6, `rampa em ${meioDaRampa}`);
});

test('horaFracionaria conta minutos e segundos', () => {
    assert.equal(horaFracionaria(new Date(2026, 7, 7, 6, 30, 0)), 6.5);
    assert.equal(horaFracionaria(new Date(2026, 7, 7, 0, 0, 0)), 0);
    assert.ok(Math.abs(horaFracionaria(new Date(2026, 7, 7, 23, 59, 59)) - 24) < 0.001);
});
