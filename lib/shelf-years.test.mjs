import {test} from 'node:test';
import assert from 'node:assert/strict';
import {anoDeLeitura, agruparPorAnoDeLeitura, livrosDoGrupo, contarEstantes} from './shelf-years.mjs';

/** Livro de estante mínimo: só o que o agrupamento olha. */
function livro(slug, finishedAt, thicknessM = 0.03) {
    return {slug, finishedAt, thicknessM};
}

test('anoDeLeitura lê o ano em UTC, não no fuso local', () => {
    // finished_at é DATE do Postgres: 2024-01-01 volta como meia-noite UTC.
    // Lido com getFullYear() num fuso negativo isso viraria 2023.
    assert.equal(anoDeLeitura('2024-01-01T00:00:00.000Z'), 2024);
    assert.equal(anoDeLeitura(new Date('2026-12-31T00:00:00.000Z')), 2026);
    assert.equal(anoDeLeitura(null), null);
    assert.equal(anoDeLeitura('nao é data'), null);
});

test('anos pequenos vizinhos dividem nicho; anos grandes ficam sozinhos', () => {
    const livros = [
        livro('a', '2020-06-15T00:00:00Z', 0.05),
        livro('b', '2021-06-15T00:00:00Z', 0.05),
        livro('c', '2022-06-15T00:00:00Z', 0.55),
        livro('d', '2023-06-15T00:00:00Z', 0.55),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2020, 2021], [2022], [2023]]);
});

test('o nicho enche enquanto couber — não há teto de dois anos por nicho', () => {
    // Três anos magros consecutivos cabem no mesmo nicho, e devem ficar
    // juntos: o limite é a capacidade em metros, não uma contagem de anos.
    const livros = [
        livro('a', '2020-06-15T00:00:00Z', 0.05),
        livro('b', '2021-06-15T00:00:00Z', 0.05),
        livro('c', '2022-06-15T00:00:00Z', 0.05),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2020, 2021, 2022]]);
    assert.equal(grupos[0].rotulo, '2020-22');
});

test('o primeiro grupo é o mais antigo — a cronologia sobe na estante', () => {
    const livros = [
        livro('novo', '2026-01-15T00:00:00Z'),
        livro('velho', '2020-01-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos[0].anos, [2020]);
    assert.deepEqual(grupos[1].anos, [2026]);
});

test('anos com buraco entre eles não dividem nicho, mesmo cabendo', () => {
    // Cabem folgados juntos (3cm cada), mas juntá-los produziria a etiqueta
    // "2020-26" — uma faixa de seis anos que só tem dois.
    const livros = [
        livro('a', '2020-06-15T00:00:00Z'),
        livro('b', '2026-06-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2020], [2026]]);
    assert.deepEqual(grupos.map((g) => g.rotulo), ['2020', '2026']);
});

test('rótulo abrevia o segundo ano e escreve o primeiro por extenso', () => {
    const livros = [
        livro('a', '2020-06-15T00:00:00Z'),
        livro('b', '2021-06-15T00:00:00Z'),
        livro('c', '2024-06-15T00:00:00Z', 0.55),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.equal(grupos[0].rotulo, '2020-21');
    assert.equal(grupos[1].rotulo, '2024');
});

test('livro lido sem data entra no grupo mais recente e marca o rótulo', () => {
    const livros = [
        livro('datado', '2024-06-15T00:00:00Z'),
        livro('orfao', null),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    const ultimo = grupos[grupos.length - 1];
    assert.equal(ultimo.temSemData, true);
    assert.match(ultimo.rotulo, /s\/ data/);
    assert.ok(livrosDoGrupo(ultimo, livros).some((b) => b.slug === 'orfao'),
        'livro sem data sumiu da estante');
});

test('acervo só de livros sem data ainda produz um grupo', () => {
    const grupos = agruparPorAnoDeLeitura([livro('x', null)], 0.59);
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].temSemData, true);
    assert.deepEqual(grupos[0].anos, []);
});

test('acervo vazio não produz grupo nenhum', () => {
    assert.deepEqual(agruparPorAnoDeLeitura([], 0.59), []);
});

test('um único ano maior que a capacidade fica sozinho, sem travar', () => {
    const livros = [
        livro('gordo1', '2023-01-15T00:00:00Z', 0.5),
        livro('gordo2', '2023-02-15T00:00:00Z', 0.5),
        livro('depois', '2024-01-15T00:00:00Z', 0.1),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2023], [2024]]);
});

test('livrosDoGrupo filtra pela lista visível, sem remontar os grupos', () => {
    // Lombadas grossas de propósito: com 3cm os dois anos caberiam no mesmo
    // nicho e o teste não estaria verificando o que diz verificar.
    const todos = [
        livro('a', '2022-06-15T00:00:00Z', 0.3),
        livro('b', '2022-07-15T00:00:00Z', 0.3),
        livro('c', '2023-06-15T00:00:00Z', 0.3),
    ];
    const grupos = agruparPorAnoDeLeitura(todos, 0.59);
    const visiveis = todos.filter((b) => b.slug !== 'b'); // como se um filtro tivesse escondido 'b'
    const doPrimeiro = livrosDoGrupo(grupos[0], visiveis);
    assert.deepEqual(doPrimeiro.map((b) => b.slug), ['a']);
    // e o agrupamento em si não mudou
    assert.deepEqual(grupos.map((g) => g.anos), [[2022], [2023]]);
});

test('livrosDoGrupo preserva a ordem que recebeu (a ordenação atua dentro do nicho)', () => {
    const todos = [
        livro('z', '2022-06-15T00:00:00Z'),
        livro('a', '2022-07-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(todos, 0.59);
    const reordenados = [todos[1], todos[0]];
    assert.deepEqual(livrosDoGrupo(grupos[0], reordenados).map((b) => b.slug), ['a', 'z']);
});

test('contarEstantes cresce só quando os nichos acabam', () => {
    assert.equal(contarEstantes(0, 5), 1);
    assert.equal(contarEstantes(5, 5), 1);
    assert.equal(contarEstantes(6, 5), 2);
    assert.equal(contarEstantes(11, 5), 3);
});
