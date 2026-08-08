import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MESA_NATIVA, GAVETA, PUXADOR_Z, CURSO, FRACAO_ABERTA,
    deslocamentoDaGaveta, gavetaEmMetros,
} from './gaveta-model.mjs';

/**
 * O que estes testes protegem é a troca do `.glb` da mesa. As medidas em
 * `gaveta-model.mjs` foram lidas dos vértices do arquivo de hoje; trocá-lo por
 * outro `desk-corner` sem reler os números daria uma gaveta abrindo para o lado
 * errado ou objetos enterrados na madeira — defeitos que só aparecem olhando, e
 * tarde.
 */

test('a gaveta está inteira dentro da mesa', () => {
    assert.ok(GAVETA.minX >= MESA_NATIVA.minX && GAVETA.maxX <= MESA_NATIVA.maxX);
    assert.ok(GAVETA.minY >= MESA_NATIVA.minY && GAVETA.maxY <= MESA_NATIVA.maxY);
    assert.ok(GAVETA.minZ >= MESA_NATIVA.minZ && GAVETA.maxZ <= MESA_NATIVA.maxZ);
});

test('o puxador fica na face de MENOR z — é ele que diz para que lado abre', () => {
    assert.ok(
        PUXADOR_Z < GAVETA.minZ,
        'o puxador avançou para o outro lado da caixa: a gaveta abriria para dentro da parede',
    );
});

test('fechada não desloca nada', () => {
    assert.equal(deslocamentoDaGaveta(0), 0);
});

test('abrir caminha no sentido do puxador (z negativo)', () => {
    assert.ok(deslocamentoDaGaveta(1) < 0);
    assert.equal(deslocamentoDaGaveta(1), -CURSO);
});

test('a abertura é limitada nos dois extremos', () => {
    // O `damp` do useFrame passa perto de 0 e de 1 sem garantir que fique
    // dentro; e um dedo arrastando não deve conseguir arrancar a gaveta.
    assert.equal(deslocamentoDaGaveta(-3), 0);
    assert.equal(deslocamentoDaGaveta(9), deslocamentoDaGaveta(1));
});

test('aberta, a gaveta continua encaixada na corrediça', () => {
    const profundidade = GAVETA.maxZ - GAVETA.minZ;
    const fora = -deslocamentoDaGaveta(1);
    assert.ok(fora < profundidade, 'a gaveta saiu inteira do móvel — cairia');
    assert.ok(fora > profundidade / 2, 'abriu menos da metade: o conteúdo fica escondido');
});

test('o movimento é monótono', () => {
    let anterior = deslocamentoDaGaveta(0);
    for (let t = 0.1; t <= 1.0001; t += 0.1) {
        const atual = deslocamentoDaGaveta(t);
        assert.ok(atual < anterior, `recuou em t=${t.toFixed(1)}`);
        anterior = atual;
    }
});

test('em metros, a gaveta tem tamanho de gaveta', () => {
    // Medidas com a mesa no tamanho em que ela é montada hoje (ALTURA_MESA).
    const g = gavetaEmMetros(0.74);

    assert.ok(g.largura > 0.30 && g.largura < 0.45, `largura fora de escala: ${g.largura}`);
    assert.ok(g.profundidade > 0.25 && g.profundidade < 0.40, `profundidade fora de escala: ${g.profundidade}`);
    assert.ok(g.curso > 0.15 && g.curso < 0.28, `curso fora de escala: ${g.curso}`);
    // O fundo tem que estar acima do chão e abaixo do tampo — uma gaveta.
    assert.ok(g.fundoY > 0.4 && g.fundoY < 0.74);
});

test('sobra altura livre entre o fundo da gaveta e o tampo', () => {
    const g = gavetaEmMetros(0.74);
    // As paredinhas da bandeja têm 2,5cm e o bloco de notas, meio centímetro.
    // Se este espaço encolher para menos de 5cm, alguma coisa vai atravessar a
    // madeira e ninguém vai desconfiar deste arquivo.
    assert.ok(g.alturaLivre > 0.05, `só ${g.alturaLivre}m de vão sob o tampo`);
});

test('a escala vale para qualquer tamanho de mesa', () => {
    const a = gavetaEmMetros(0.74);
    const b = gavetaEmMetros(1.48);
    for (const chave of ['largura', 'profundidade', 'curso', 'fundoY', 'dx', 'dz']) {
        assert.ok(
            Math.abs(b[chave] - a[chave] * 2) < 1e-9,
            `${chave} não dobrou junto com a mesa`,
        );
    }
});

test('a fração aberta é o que manda no curso', () => {
    assert.equal(CURSO, (GAVETA.maxZ - GAVETA.minZ) * FRACAO_ABERTA);
});
