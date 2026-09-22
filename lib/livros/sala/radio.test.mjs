import test from 'node:test';
import assert from 'node:assert/strict';
import {proximoPollMs, tempoCurto, urlDaCapa, buscarFaixa} from './radio.ts';

/**
 * `lib/radio.ts` é TypeScript e mesmo assim é testado por `node --test`: o Node
 * 24 remove os tipos sozinho, e o arquivo não importa nada nem usa recurso que
 * precise de transformação (só `as const` e aliases, todos apagáveis).
 *
 * A regra do `.mjs` que vale para `lib/book-*.mjs` não se aplica aqui — ela
 * existe porque aqueles arquivos são importados pelo CLI, que é Node puro. Este
 * só é usado pelo Next.
 */

test('tempoCurto formata com dois dígitos no segundo', () => {
    assert.equal(tempoCurto(0), '0:00');
    assert.equal(tempoCurto(9), '0:09');
    assert.equal(tempoCurto(61), '1:01');
    assert.equal(tempoCurto(166), '2:46');
    assert.equal(tempoCurto(3599), '59:59');
});

test('tempoCurto trunca frações em vez de arredondar para cima', () => {
    // A barra de progresso é interpolada e chega aqui com casas decimais.
    // Arredondando, o relógio mostraria 1:00 faltando meio segundo para o
    // minuto — um relógio que adianta.
    assert.equal(tempoCurto(59.9), '0:59');
});

test('tempoCurto não produz tempo negativo', () => {
    // Acontece de verdade: a posição vem da estação e o relógio local
    // interpola daí, então um ajuste de horário pode empurrar a conta abaixo
    // de zero por um instante.
    assert.equal(tempoCurto(-5), '0:00');
});

test('proximoPollMs agenda para o fim da faixa, não num intervalo fixo', () => {
    const faixa = {duracaoS: 200, posicaoS: 80};
    // Faltam 120s; a margem de 1,5s entra para o pedido cair depois da troca,
    // e não em cima dela.
    assert.equal(proximoPollMs(faixa), 121_500);
});

test('proximoPollMs respeita o piso perto do fim da faixa', () => {
    // Sem piso, uma faixa acabando viraria uma rajada de requisições.
    assert.equal(proximoPollMs({duracaoS: 200, posicaoS: 199.5}), 5_000);
    assert.equal(proximoPollMs({duracaoS: 200, posicaoS: 200}), 5_000);
});

test('o teto só pega duração absurda, não faixa comprida', () => {
    // Uma música de 6 minutos ainda é agendada pelo fim dela. O teto está lá
    // para uma estação que informe duração errada, não para achatar todo
    // agendamento num intervalo fixo — foi assim que um teto de 1 minuto
    // desperdiçava um pedido no meio de praticamente toda faixa.
    assert.equal(proximoPollMs({duracaoS: 240, posicaoS: 0}), 241_500);
    assert.equal(proximoPollMs({duracaoS: 200, posicaoS: 10}), 191_500);
    // Duas horas, aí sim: a tela não pode ficar sem atualizar esse tempo todo.
    assert.equal(proximoPollMs({duracaoS: 7200, posicaoS: 0}), 300_000);
});

test('proximoPollMs cai no padrão quando não há duração', () => {
    // Estação que não informa duração é caminho normal, não defeito.
    assert.equal(proximoPollMs(null), 15_000);
    assert.equal(proximoPollMs({duracaoS: 0, posicaoS: 0}), 15_000);
});

test('urlDaCapa escapa a origem inteira', () => {
    // O `&` é o caso que importa: sem encodeURIComponent ele encerraria o
    // parâmetro `u` e a rota receberia meia URL.
    const url = urlDaCapa('https://i.plaza.one/a.jpg?v=1&x=2');
    assert.equal(url, '/api/livros/capa-radio?u=https%3A%2F%2Fi.plaza.one%2Fa.jpg%3Fv%3D1%26x%3D2');
    assert.equal(new URL(url, 'https://exemplo.com').searchParams.get('u'),
        'https://i.plaza.one/a.jpg?v=1&x=2');
});

/** Troca o fetch global por um que devolve `corpo`, e restaura no fim. */
async function comFetch(corpo, ok = true) {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok,
        json: async () => {
            if (typeof corpo === 'string') throw new SyntaxError('JSON inválido');
            return corpo;
        },
    });
    try {
        return await buscarFaixa();
    } finally {
        globalThis.fetch = original;
    }
}

test('buscarFaixa lê a resposta completa da estação', async () => {
    const faixa = await comFetch({
        song: {
            id: 'abc', title: 'Tropics', artist: 'Miami Vice', album: 'Palm Haze',
            length: 166, position: 81,
            artwork_sm_src: 'https://i.plaza.one/a.sm.jpg',
            artwork_src: 'https://i.plaza.one/a.jpg',
        },
        listeners: 193,
    });
    assert.equal(faixa.titulo, 'Tropics');
    assert.equal(faixa.artista, 'Miami Vice');
    assert.equal(faixa.duracaoS, 166);
    assert.equal(faixa.posicaoS, 81);
    assert.equal(faixa.ouvintes, 193);
    // A miniatura ganha da capa cheia: ela é desenhada num quadrado de ~100px.
    assert.match(faixa.capa, /a\.sm\.jpg/);
    // E já sai passada pelo proxy, nunca apontando para i.plaza.one direto —
    // é o proxy que resolve a falta de CORS naquele host.
    assert.ok(faixa.capa.startsWith('/api/livros/capa-radio?u='));
});

test('buscarFaixa cai na capa cheia quando não há miniatura', async () => {
    const faixa = await comFetch({song: {title: 'X', artwork_src: 'https://i.plaza.one/b.jpg'}});
    assert.match(faixa.capa, /b\.jpg/);
});

test('buscarFaixa devolve faixa sem capa em vez de recusar a resposta', async () => {
    const faixa = await comFetch({song: {title: 'X', artist: 'Y'}});
    assert.equal(faixa.capa, null);
    assert.equal(faixa.titulo, 'X');
    // Campos ausentes viram vazio/zero, não `undefined` — a tela desenha o que
    // recebe sem ter de checar cada um.
    assert.equal(faixa.album, '');
    assert.equal(faixa.duracaoS, 0);
    assert.equal(faixa.ouvintes, 0);
});

test('buscarFaixa devolve null sem música, sem título, ou com erro HTTP', async () => {
    assert.equal(await comFetch({}), null);
    assert.equal(await comFetch({song: {}}), null);
    assert.equal(await comFetch({song: {artist: 'só o artista'}}), null);
    assert.equal(await comFetch({song: {title: 'X'}}, false), null);
});

test('buscarFaixa engole JSON inválido em vez de lançar', async () => {
    // O contrato é não lançar NUNCA: quem chama trata `null` como "não sei o
    // que toca", que é diferente de "parou de tocar". Uma exceção aqui subiria
    // pelo poll e calaria a rádio por um soluço da API.
    assert.equal(await comFetch('isto não é json'), null);
});

test('buscarFaixa devolve null quando a rede falha', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
    };
    try {
        assert.equal(await buscarFaixa(), null);
    } finally {
        globalThis.fetch = original;
    }
});
