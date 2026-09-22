import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    anoDeLeitura, agruparPorAnoDeLeitura, livrosDoGrupo, ordemNaEstante, contarEstantes,
} from './shelf-years.mjs';

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

/**
 * A ordem do folhear (setas ← →) contra a ordem em que a estante mostra.
 *
 * O acervo chega alfabético do banco, com os anos embaralhados entre si; a
 * estante reparte isso em nichos. Estes testes guardam a passagem de um para o
 * outro, que é o que fazia a seta trocar de ano quase a cada passo.
 */
const ACERVO_ALFABETICO = [
    livro('a-arte-da-guerra', '2022-05-01T00:00:00.000Z'),
    livro('a-metamorfose', '2024-03-01T00:00:00.000Z'),
    livro('arrume-a-cama', '2021-08-01T00:00:00.000Z'),
    livro('duna', '2022-09-01T00:00:00.000Z'),
    livro('o-hobbit', '2024-11-01T00:00:00.000Z'),
];
const GRUPOS = agruparPorAnoDeLeitura(ACERVO_ALFABETICO, 0.5);

test('ordemNaEstante reagrupa a lista plana nicho por nicho, de baixo para cima', () => {
    // 2021 e 2022 cabem juntos num nicho, 2024 fica no de cima. Dentro do nicho
    // combinado os dois anos SE INTERCALAM na ordem alfabética recebida — e isso
    // é fiel, porque é exatamente assim que Bookshelf.tsx desenha aquele vão.
    assert.deepEqual(GRUPOS.map((g) => g.rotulo), ['2021-22', '2024']);
    assert.deepEqual(
        ordemNaEstante(GRUPOS, ACERVO_ALFABETICO).map((l) => l.slug),
        ['a-arte-da-guerra', 'arrume-a-cama', 'duna', 'a-metamorfose', 'o-hobbit'],
    );
});

test('ordemNaEstante troca de NICHO o mínimo possível — uma vez por nicho', () => {
    // A invariante é o nicho, não o ano: um nicho que guarda dois anos os
    // intercala por dentro, e isso não é a seta pulando de prateleira.
    const nicho = (livroDaVez) => GRUPOS.findIndex(
        (g) => livrosDoGrupo(g, [livroDaVez]).length > 0,
    );
    const nichos = ordemNaEstante(GRUPOS, ACERVO_ALFABETICO).map(nicho);
    let trocas = 0;
    for (let i = 1; i < nichos.length; i++) if (nichos[i] !== nichos[i - 1]) trocas++;
    assert.equal(trocas, GRUPOS.length - 1, 'a seta deveria atravessar cada nicho de uma vez só');

    // O contraste que motivou tudo: na lista plana ela vai e volta entre nichos.
    const planos = ACERVO_ALFABETICO.map(nicho);
    let trocasPlanas = 0;
    for (let i = 1; i < planos.length; i++) if (planos[i] !== planos[i - 1]) trocasPlanas++;
    assert.ok(trocasPlanas > trocas,
        `sem a correção eram ${trocasPlanas} idas e vindas entre nichos, agora são ${trocas}`);
});

test('ordemNaEstante preserva a ordem de dentro do nicho e não perde nem duplica ninguém', () => {
    const ordenada = ordemNaEstante(GRUPOS, ACERVO_ALFABETICO).map((l) => l.slug);
    assert.equal(new Set(ordenada).size, ACERVO_ALFABETICO.length, 'alguém saiu ou entrou duas vezes');
    // Dentro do nicho a ordem alfabética recebida é mantida — é assim que a
    // ordenação do Índice continua atuando dentro de cada ano.
    assert.ok(ordenada.indexOf('a-arte-da-guerra') < ordenada.indexOf('duna'));
});

test('ordemNaEstante com a lista FILTRADA mantém os grupos do acervo inteiro', () => {
    // O caso que o Índice produz: os grupos vêm do acervo completo, a lista é um
    // recorte. Quem sobrou tem de sair na mesma ordem de nicho, sem os outros.
    const soDe2024 = ACERVO_ALFABETICO.filter((l) => anoDeLeitura(l.finishedAt) === 2024);
    assert.deepEqual(
        ordemNaEstante(GRUPOS, soDe2024).map((l) => l.slug),
        ['a-metamorfose', 'o-hobbit'],
    );
});

test('ordemNaEstante inclui os livros sem data, que moram no nicho mais recente', () => {
    const comSemData = [...ACERVO_ALFABETICO, livro('sem-data', null)];
    const grupos = agruparPorAnoDeLeitura(comSemData, 0.5);
    const ordenada = ordemNaEstante(grupos, comSemData).map((l) => l.slug);
    assert.ok(ordenada.includes('sem-data'), 'sumir da seta é o mesmo defeito de sumir da estante');
    assert.equal(ordenada.at(-1), 'sem-data', 'ele fica no fim, junto do nicho mais recente');
});
