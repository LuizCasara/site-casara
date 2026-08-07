import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    CENAS, FOCOS_DO_PC, subVizinha, trilhoDeCenas, paradaVizinha,
    totalDeSubParadas, rotuloDaSubParada,
} from './livros-cenas.mjs';

// Estes testes leem de CENAS em vez de escrever os ids à mão: a ORDEM das cenas
// é uma decisão de layout que já mudou e deve poder mudar de novo sem quebrar
// teste. O que se garante aqui é o andar em si.

test('CENAS não tem id repetido — a navegação depende de findIndex', () => {
    assert.equal(new Set(CENAS.map((c) => c.id)).size, CENAS.length);
});

test('FOCOS_DO_PC não tem id repetido', () => {
    assert.equal(new Set(FOCOS_DO_PC.map((f) => f.id)).size, FOCOS_DO_PC.length);
});

test('só estante e pc têm sub-paradas', () => {
    for (const cena of CENAS) {
        const total = totalDeSubParadas(cena.id, 3);
        if (cena.id === 'estante') assert.equal(total, 3, 'a estante segue os grupos de ano');
        else if (cena.id === 'pc') assert.equal(total, FOCOS_DO_PC.length);
        else assert.equal(total, 0, `${cena.id} não devia ter sub-parada`);
    }
});

test('os anos são dinâmicos e os focos do PC não', () => {
    // A diferença que justifica totalGrupos ser parâmetro: o acervo pode
    // encolher a zero grupos, mas o canto do PC tem os mesmos objetos sempre.
    assert.equal(totalDeSubParadas('estante', 0), 0);
    assert.equal(totalDeSubParadas('pc', 0), FOCOS_DO_PC.length);
});

test('o trilho põe as sub-paradas logo depois da cena a que pertencem', () => {
    const t = trilhoDeCenas(3);
    assert.equal(t.length, CENAS.length + 3 + FOCOS_DO_PC.length);

    const iEstante = t.findIndex((p) => p.cena === 'estante' && p.sub === null);
    assert.deepEqual(t.slice(iEstante + 1, iEstante + 4).map((p) => p.sub), [0, 1, 2]);
    // O que vinha depois da estante na lista de cenas continua vindo depois
    // dos anos — o trilho insere, não reordena.
    const depois = CENAS[CENAS.findIndex((c) => c.id === 'estante') + 1];
    if (depois) assert.deepEqual(t[iEstante + 4], {cena: depois.id, sub: null});

    const iPc = t.findIndex((p) => p.cena === 'pc' && p.sub === null);
    assert.deepEqual(
        t.slice(iPc + 1, iPc + 1 + FOCOS_DO_PC.length).map((p) => p.sub),
        FOCOS_DO_PC.map((_, i) => i),
    );
});

test('o trilho sem nenhum ano ainda tem os focos do PC', () => {
    // Acontece com o banco vazio de datas de leitura: não há nicho nenhum, mas
    // o canto de trabalho continua existindo na sala.
    const t = trilhoDeCenas(0);
    assert.equal(t.length, CENAS.length + FOCOS_DO_PC.length);
    assert.equal(t.filter((p) => p.cena === 'estante').length, 1);
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

test('paradaVizinha atravessa a fronteira entre cena e sub-parada nos dois sentidos', () => {
    // O ponto da mudança: sair de uma sub-parada continuando o caminho, sem ter
    // de primeiro "sair da cena".
    const ultimoAno = {cena: 'estante', sub: 2};
    assert.equal(paradaVizinha(ultimoAno, 1, 3).sub, null, 'ficou preso nos anos');

    assert.deepEqual(paradaVizinha({cena: 'estante', sub: null}, 1, 3), {cena: 'estante', sub: 0});
    assert.deepEqual(paradaVizinha({cena: 'estante', sub: 0}, -1, 3), {cena: 'estante', sub: null});
});

test('a última sub-parada do PC fecha a volta para a primeira cena', () => {
    // O PC é a última cena, então a última sub-parada dele é a última parada do
    // trilho inteiro — é ali que o loop fecha.
    const ultima = {cena: 'pc', sub: FOCOS_DO_PC.length - 1};
    assert.deepEqual(paradaVizinha(ultima, 1, 3), trilhoDeCenas(3)[0]);
});

test('paradaVizinha cai na primeira parada quando a atual é desconhecida', () => {
    assert.deepEqual(paradaVizinha({cena: 'inexistente', sub: null}, 1, 3), trilhoDeCenas(3)[0]);
    assert.deepEqual(paradaVizinha(null, 1, 3), trilhoDeCenas(3)[0]);
    // Sub-parada que não existe mais (o acervo encolheu entre dois renders).
    assert.deepEqual(paradaVizinha({cena: 'estante', sub: 9}, 1, 3), trilhoDeCenas(3)[0]);
});

test('subVizinha entra na cena pela ponta de onde o movimento vem', () => {
    assert.equal(subVizinha(null, 1, 5), 0, 'subindo, entra pela base');
    assert.equal(subVizinha(null, -1, 5), 4, 'descendo, entra pelo topo');
});

test('subVizinha anda de sub-parada em sub-parada', () => {
    assert.equal(subVizinha(0, 1, 5), 1);
    assert.equal(subVizinha(3, 1, 5), 4);
    assert.equal(subVizinha(3, -1, 5), 2);
});

test('subVizinha para no topo e sai do zoom pela base', () => {
    // Assimétrico de propósito: acima da última não há para onde ir, mas
    // abaixo da primeira existe um lugar — a cena inteira em quadro.
    assert.equal(subVizinha(4, 1, 5), 4);
    assert.equal(subVizinha(0, -1, 5), null);
});

test('subVizinha aguenta uma cena sem nenhuma sub-parada', () => {
    // Acontece de verdade: o banco pode não ter nenhum livro com data de
    // leitura, e aí a estante não tem nicho nenhum para focar.
    assert.equal(subVizinha(null, 1, 0), null);
    assert.equal(subVizinha(2, -1, 0), null);
});

test('rotuloDaSubParada nomeia os focos do PC e ignora o resto', () => {
    assert.equal(rotuloDaSubParada('pc', 0), FOCOS_DO_PC[0].rotulo);
    // Os anos têm rótulo próprio, montado das datas de leitura — não sai daqui.
    assert.equal(rotuloDaSubParada('estante', 0), '');
    assert.equal(rotuloDaSubParada('pc', 99), '');
});
