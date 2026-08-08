import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distribuirMeses, DIA_DO_MES} from './reading-dates.mjs';

const L = (title, pages) => ({title, pages});

test('distribuirMeses espalha ao longo do ano e termina em dezembro', () => {
    const r = distribuirMeses([L('a', 100), L('b', 100), L('c', 100), L('d', 100)], 2022);
    assert.deepEqual(r.map((x) => x.mes), [3, 6, 9, 12]);
    assert.equal(r[0].finished_at, `2022-03-${DIA_DO_MES}`);
});

test('distribuirMeses dá mais calendário ao livro mais grosso', () => {
    // 900 de 1000 páginas no primeiro: ele sozinho consome quase o ano todo.
    const r = distribuirMeses([L('tijolo', 900), L('fino', 100)], 2025);
    assert.equal(r[0].mes, 11);
    assert.equal(r[1].mes, 12);
});

test('distribuirMeses preserva a ordem de leitura, nunca regride', () => {
    const r = distribuirMeses(
        'abcdefghijk'.split('').map((t) => L(t, 200)),
        2023,
    );
    const meses = r.map((x) => x.mes);
    assert.deepEqual(meses, [...meses].sort((a, b) => a - b), 'meses não podem andar pra trás');
    assert.deepEqual(r.map((x) => x.title), 'abcdefghijk'.split(''));
});

test('distribuirMeses respeita mesLimite — ano corrente não data no futuro', () => {
    // Julho de 2026: nenhum livro de 2026 pode terminar depois de julho.
    const r = distribuirMeses([L('a', 100), L('b', 100), L('c', 100)], 2026, 7);
    assert.ok(r.every((x) => x.mes <= 7), `passou de julho: ${r.map((x) => x.mes)}`);
    assert.equal(r[r.length - 1].mes, 7, 'o último tem que fechar no mês limite');
});

test('distribuirMeses usa o padrão para livro sem páginas', () => {
    // Sem o fallback, `total` viraria 0 e todo mês sairia NaN.
    const r = distribuirMeses([L('sem', null), L('outro', undefined)], 2024);
    assert.ok(r.every((x) => Number.isInteger(x.mes)), 'mês tem que ser inteiro');
    assert.deepEqual(r.map((x) => x.mes), [6, 12]);
});

test('distribuirMeses com um livro só devolve dezembro', () => {
    const r = distribuirMeses([L('unico', 300)], 2020);
    assert.equal(r[0].mes, 12);
    assert.equal(r[0].finished_at, '2020-12-15');
});

test('distribuirMeses com lista vazia não quebra', () => {
    assert.deepEqual(distribuirMeses([], 2020), []);
});

test('distribuirMeses nunca produz mês 0 nem 13', () => {
    const r = distribuirMeses(
        Array.from({length: 30}, (_, i) => L(`l${i}`, 50 + i * 40)),
        2021,
    );
    assert.ok(r.every((x) => x.mes >= 1 && x.mes <= 12), 'mês fora de 1..12');
});
