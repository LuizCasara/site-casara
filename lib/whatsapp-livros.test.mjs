import {test} from 'node:test';
import assert from 'node:assert/strict';
import {linkDeSugestao, linkDeComentario, MENSAGEM_SUGESTAO} from './whatsapp-livros.mjs';

test('o link de sugestão leva a mensagem pronta', () => {
    const url = linkDeSugestao();
    assert.ok(url.startsWith('https://wa.me/'));
    assert.equal(decodeURIComponent(new URL(url).searchParams.get('text')), MENSAGEM_SUGESTAO);
});

test('o comentário cita o título e o autor', () => {
    const texto = new URL(linkDeComentario('Duna', 'Frank Herbert')).searchParams.get('text');
    assert.match(texto, /"Duna"/);
    assert.match(texto, /de Frank Herbert/);
});

test('livro sem autor não vira "de null"', () => {
    for (const semAutor of [null, undefined, '']) {
        const texto = new URL(linkDeComentario('Duna', semAutor)).searchParams.get('text');
        assert.ok(!/null|undefined|,\s*de\s*:/.test(texto), `vazou: ${texto}`);
        assert.match(texto, /"Duna": $/);
    }
});

test('título com & e : atravessa inteiro', () => {
    // O caso que o encodeURIComponent protege: com encodeURI, o `&` encerraria
    // o parâmetro `text` e o resto do título viraria outra chave da query.
    const titulo = 'Sapiens: Uma Breve História & Outros';
    const url = new URL(linkDeComentario(titulo, null));
    assert.ok(url.searchParams.get('text').includes(titulo));
    assert.deepEqual([...url.searchParams.keys()], ['text']);
});
