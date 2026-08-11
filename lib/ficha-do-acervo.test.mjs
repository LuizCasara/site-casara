import test from 'node:test';
import assert from 'node:assert/strict';
import {fichaDoAcervo} from './ficha-do-acervo.mjs';

/** Um livro lido completo — cada teste sobrescreve só o campo que está testando. */
const livro = (extra = {}) => ({
    pages: 200,
    finished_at: '2024-05-10',
    rating: '4',
    category: 'negocios',
    ...extra,
});

test('acervo vazio devolve zeros e nulos, nunca NaN', () => {
    const ficha = fichaDoAcervo([]);
    assert.deepEqual(ficha, {
        lidos: 0,
        paginas: 0,
        semPaginas: 0,
        desde: null,
        categoriaTop: null,
        notaMedia: null,
    });
    // Sem argumento nenhum também: a carteira pode ser montada antes de os
    // livros chegarem, e um `undefined.length` derrubaria a cena inteira.
    assert.deepEqual(fichaDoAcervo(), ficha);
});

test('soma as páginas e conta quantos livros ficaram de fora', () => {
    const ficha = fichaDoAcervo([
        livro({pages: 300}),
        livro({pages: 150}),
        livro({pages: null}),
    ]);
    assert.equal(ficha.lidos, 3);
    assert.equal(ficha.paginas, 450);
    assert.equal(ficha.semPaginas, 1);
});

test('página zero ou negativa é dado corrompido, não livro fininho', () => {
    // Sem esta guarda o total sai errado em silêncio: um -50 vindo de um
    // cadastro torto subtrairia páginas de livros que existem.
    const ficha = fichaDoAcervo([livro({pages: 300}), livro({pages: 0}), livro({pages: -50})]);
    assert.equal(ficha.paginas, 300);
    assert.equal(ficha.semPaginas, 2);
});

test('"desde" é o ano do livro lido mais antigo', () => {
    const ficha = fichaDoAcervo([
        livro({finished_at: '2024-05-10'}),
        livro({finished_at: '2019-01-02'}),
        livro({finished_at: '2022-11-30'}),
    ]);
    assert.equal(ficha.desde, 2019);
});

test('livro sem data de leitura não impede o "desde" dos outros', () => {
    const ficha = fichaDoAcervo([livro({finished_at: null}), livro({finished_at: '2021-03-01'})]);
    assert.equal(ficha.desde, 2021);
});

test('sem NENHUMA data, "desde" é null — não o ano corrente', () => {
    // Um acervo recém cadastrado pode ter os 50 livros e nenhuma data. A
    // carteira omite a linha; inventar "desde 2026" seria mentir.
    assert.equal(fichaDoAcervo([livro({finished_at: null})]).desde, null);
});

test('o ano vem do relógio UTC, senão o livro de 1º de janeiro pula de ano', () => {
    // Mesma armadilha que `anoDeLeitura` já resolve para os nichos da estante:
    // DATE volta como meia-noite UTC, e lido em America/Sao_Paulo (UTC-3)
    // 2024-01-01 viraria 31/12/2023.
    assert.equal(fichaDoAcervo([livro({finished_at: '2024-01-01'})]).desde, 2024);
});

test('a categoria mais lida é a de maior contagem', () => {
    const ficha = fichaDoAcervo([
        livro({category: 'negocios'}),
        livro({category: 'ficcao'}),
        livro({category: 'ficcao'}),
    ]);
    assert.deepEqual(ficha.categoriaTop, {categoria: 'ficcao', quantos: 2});
});

test('empate de categoria desempata em ordem alfabética, não pela ordem da lista', () => {
    // O critério do Índice reordena a lista que chega aqui. Sem desempate
    // estável, a carteira trocaria de categoria favorita conforme a ordenação
    // escolhida na tela — um número que não quer dizer nada.
    const aLista = [livro({category: 'ficcao'}), livro({category: 'biografia'})];
    assert.deepEqual(fichaDoAcervo(aLista).categoriaTop, {categoria: 'biografia', quantos: 1});
    assert.deepEqual(
        fichaDoAcervo([...aLista].reverse()).categoriaTop,
        {categoria: 'biografia', quantos: 1},
    );
});

test('a nota média soma NÚMEROS, e não as strings que o Neon devolve', () => {
    // NUMERIC volta como string do driver: somar direto daria "45" em vez de 9.
    const ficha = fichaDoAcervo([livro({rating: '4'}), livro({rating: '5'})]);
    assert.equal(ficha.notaMedia, 4.5);
});

test('a nota média arredonda em uma casa e ignora livro sem nota', () => {
    const ficha = fichaDoAcervo([
        livro({rating: '5'}),
        livro({rating: '4'}),
        livro({rating: '4'}),
        livro({rating: null}),
    ]);
    assert.equal(ficha.notaMedia, 4.3);
    // O livro sem nota continua contando como lido; ele só não vota na média.
    assert.equal(ficha.lidos, 4);
});

test('sem nenhuma nota, a média é null em vez de NaN', () => {
    assert.equal(fichaDoAcervo([livro({rating: null})]).notaMedia, null);
});
