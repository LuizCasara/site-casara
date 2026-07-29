import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    montarUrlBusca,
    parseBusca,
    buscarPorTitulo,
    buscarComRetentativa,
    BuscaFalhouError,
} from './openlibrary-search.mjs';

test('montarUrlBusca escapa acentos e espaços', () => {
    const url = montarUrlBusca('A Revolução dos Bichos', 'George Orwell');
    assert.ok(url.startsWith('https://openlibrary.org/search.json?'));
    assert.ok(url.includes('title=A+Revolu%C3%A7%C3%A3o+dos+Bichos'));
    assert.ok(url.includes('author=George+Orwell'));
    assert.ok(url.includes('limit=1'));
});

test('parseBusca monta a URL da capa a partir do cover_i', () => {
    const r = parseBusca({
        numFound: 1,
        docs: [{
            title: 'O Hobbit',
            cover_i: 15121777,
            first_publish_year: 1937,
            number_of_pages_median: 310,
        }],
    });
    assert.equal(r.coverUrl, 'https://covers.openlibrary.org/b/id/15121777-L.jpg');
    assert.equal(r.pages, 310);
    assert.equal(r.year, 1937);
});

test('parseBusca devolve null quando não há resultado', () => {
    assert.equal(parseBusca({numFound: 0, docs: []}), null);
    assert.equal(parseBusca({}), null);
});

test('campos ausentes viram null, e a ausência de capa não invalida o resultado', () => {
    const r = parseBusca({docs: [{title: 'X'}]});
    assert.equal(r.coverUrl, null);
    assert.equal(r.pages, null);
    assert.equal(r.year, null);
});

test('parseBusca NUNCA devolve autor — o arquivo de seed é a fonte da verdade', () => {
    // O registro real de "A Revolta de Atlas" traz marketing em author_name.
    const r = parseBusca({
        docs: [{
            title: 'Box A Revolta de Atlas - 3 Volumes',
            author_name: ['Ayn Rand', 'Best-seller há mais de 50 anos, com 11 milhões...'],
            cover_i: 10489048,
        }],
    });
    assert.equal(r.author, undefined);
    assert.equal(r.title, undefined);
});

// --- buscarPorTitulo / buscarComRetentativa -------------------------------
//
// Testados com um `fetchImpl` falso injetado (a assinatura de dois
// argumentos usada pelo `seed` continua funcionando com o `fetch` global por
// padrão). Preferi isso a substituir `globalThis.fetch` porque não exige
// setup/teardown nem risco de vazar o mock para outro teste se algo lançar
// no meio — cada teste passa exatamente a função que quer.

test('buscarPorTitulo lança BuscaFalhouError quando a resposta HTTP não é ok', async () => {
    const fetchFalso = async () => ({ok: false, status: 503, json: async () => ({})});
    await assert.rejects(
        () => buscarPorTitulo('X', 'Y', fetchFalso),
        BuscaFalhouError,
    );
});

test('buscarPorTitulo lança BuscaFalhouError quando o corpo não é JSON válido (Achado 1)', async () => {
    // Simula uma resposta 200 com corpo ilegível — proxy, timeout parcial,
    // resposta cortada. res.json() lança SyntaxError; isso tem que ser
    // reclassificado como falha de rede, não escapar cru.
    const fetchFalso = async () => ({
        ok: true,
        status: 200,
        json: async () => {
            throw new SyntaxError('Unexpected end of JSON input');
        },
    });
    await assert.rejects(
        () => buscarPorTitulo('X', 'Y', fetchFalso),
        BuscaFalhouError,
    );
});

test('buscarPorTitulo lança BuscaFalhouError quando o fetch aborta por timeout (Achado 2)', async () => {
    // O AbortController real dispara depois de TIMEOUT_MS e faz o fetch
    // rejeitar com um AbortError — aqui simulamos diretamente essa rejeição
    // para testar a classificação sem esperar o timeout de verdade.
    const fetchFalso = async () => {
        throw new DOMException('This operation was aborted', 'AbortError');
    };
    await assert.rejects(
        () => buscarPorTitulo('X', 'Y', fetchFalso),
        BuscaFalhouError,
    );
});

test('buscarPorTitulo devolve null (não é falha de rede) quando a Open Library responde sem achar nada', async () => {
    const fetchFalso = async () => ({
        ok: true,
        status: 200,
        json: async () => ({numFound: 0, docs: []}),
    });
    const r = await buscarPorTitulo('X', 'Y', fetchFalso);
    assert.equal(r, null);
});

test('buscarComRetentativa tenta de novo após falha de rede e devolve o resultado da segunda tentativa', async () => {
    let chamadas = 0;
    const fetchFalso = async () => {
        chamadas += 1;
        if (chamadas === 1) {
            return {ok: false, status: 503, json: async () => ({})};
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({
                docs: [{cover_i: 42, first_publish_year: 2000, number_of_pages_median: 100}],
            }),
        };
    };

    const {resultado, falhouRede} = await buscarComRetentativa('X', 'Y', fetchFalso, 1);

    assert.equal(chamadas, 2);
    assert.equal(falhouRede, false);
    assert.equal(resultado.year, 2000);
});

test('buscarComRetentativa desiste depois da segunda falha e marca falhouRede', async () => {
    let chamadas = 0;
    const fetchFalso = async () => {
        chamadas += 1;
        return {ok: false, status: 500, json: async () => ({})};
    };

    const {resultado, falhouRede} = await buscarComRetentativa('X', 'Y', fetchFalso, 1);

    assert.equal(chamadas, 2);
    assert.equal(falhouRede, true);
    assert.equal(resultado, null);
});
