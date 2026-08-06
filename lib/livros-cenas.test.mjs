import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CENAS, anoVizinho, trilhoDeCenas, paradaVizinha} from './livros-cenas.mjs';

// Estes testes leem de CENAS em vez de escrever os ids à mão: a ORDEM das cenas
// é uma decisão de layout que já mudou e deve poder mudar de novo sem quebrar
// teste. O que se garante aqui é o andar em si.

test('CENAS não tem id repetido — a navegação depende de findIndex', () => {
    assert.equal(new Set(CENAS.map((c) => c.id)).size, CENAS.length);
});

test('o trilho põe os anos logo depois da estante e antes do resto', () => {
    const t = trilhoDeCenas(3);
    assert.equal(t.length, CENAS.length + 3);

    const iEstante = t.findIndex((p) => p.cena === 'estante' && p.ano === null);
    assert.deepEqual(t.slice(iEstante + 1, iEstante + 4).map((p) => p.ano), [0, 1, 2]);
    // O que vinha depois da estante na lista de cenas continua vindo depois
    // dos anos — o trilho insere, não reordena.
    const depois = CENAS[CENAS.findIndex((c) => c.id === 'estante') + 1];
    if (depois) assert.deepEqual(t[iEstante + 4], {cena: depois.id, ano: null});
});

test('o trilho sem nenhum ano é só a lista de cenas', () => {
    // Acontece com o banco vazio de datas de leitura: não há nicho nenhum.
    assert.deepEqual(trilhoDeCenas(0).map((p) => p.cena), CENAS.map((c) => c.id));
});

test('paradaVizinha percorre tudo e dá a volta', () => {
    const total = 2;
    const t = trilhoDeCenas(total);
    let atual = t[0];
    const visitadas = [atual];
    for (let i = 0; i < t.length - 1; i++) {
        atual = paradaVizinha(atual, 1, total);
        visitadas.push(atual);
    }
    assert.deepEqual(visitadas, t, 'o caminho para a frente não cobre o trilho inteiro');
    // Mais um passo fecha o ciclo.
    assert.deepEqual(paradaVizinha(atual, 1, total), t[0]);
    assert.deepEqual(paradaVizinha(t[0], -1, total), t[t.length - 1]);
});

test('paradaVizinha atravessa a fronteira entre cena e ano nos dois sentidos', () => {
    // O ponto da mudança: sair de um ano continuando o caminho, sem ter de
    // primeiro "sair da estante".
    const ultimoAno = {cena: 'estante', ano: 2};
    const depoisDoUltimoAno = paradaVizinha(ultimoAno, 1, 3);
    assert.equal(depoisDoUltimoAno.ano, null, 'ficou preso nos anos');

    assert.deepEqual(paradaVizinha({cena: 'estante', ano: null}, 1, 3), {cena: 'estante', ano: 0});
    assert.deepEqual(paradaVizinha({cena: 'estante', ano: 0}, -1, 3), {cena: 'estante', ano: null});
});

test('paradaVizinha cai na primeira parada quando a atual é desconhecida', () => {
    assert.deepEqual(paradaVizinha({cena: 'inexistente', ano: null}, 1, 3), trilhoDeCenas(3)[0]);
    assert.deepEqual(paradaVizinha(null, 1, 3), trilhoDeCenas(3)[0]);
    // Ano que não existe mais (o acervo encolheu entre dois renders).
    assert.deepEqual(paradaVizinha({cena: 'estante', ano: 9}, 1, 3), trilhoDeCenas(3)[0]);
});

test('anoVizinho entra na estante pela ponta de onde o movimento vem', () => {
    assert.equal(anoVizinho(null, 1, 5), 0, 'subindo, entra pela base');
    assert.equal(anoVizinho(null, -1, 5), 4, 'descendo, entra pelo topo');
});

test('anoVizinho anda de nicho em nicho', () => {
    assert.equal(anoVizinho(0, 1, 5), 1);
    assert.equal(anoVizinho(3, 1, 5), 4);
    assert.equal(anoVizinho(3, -1, 5), 2);
});

test('anoVizinho para no topo e sai do zoom pela base', () => {
    // Assimétrico de propósito: acima do último nicho não há para onde ir,
    // mas abaixo do primeiro existe um lugar — a estante inteira em quadro.
    assert.equal(anoVizinho(4, 1, 5), 4);
    assert.equal(anoVizinho(0, -1, 5), null);
});

test('anoVizinho aguenta um acervo sem nenhum grupo', () => {
    // Acontece de verdade: o banco pode não ter nenhum livro com data de
    // leitura, e aí a estante não tem nicho nenhum para focar.
    assert.equal(anoVizinho(null, 1, 0), null);
    assert.equal(anoVizinho(2, -1, 0), null);
});
