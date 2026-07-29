import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeXml, quebrarLinhas} from './book-cover.mjs';

test('escapeXml escapa os 5 caracteres especiais do XML', () => {
    assert.equal(escapeXml('Marketing & Vendas'), 'Marketing &amp; Vendas');
    assert.equal(escapeXml('<script>'), '&lt;script&gt;');
    assert.equal(escapeXml(`"Aspas" e 'apóstrofo'`), '&quot;Aspas&quot; e &apos;apóstrofo&apos;');
    assert.equal(escapeXml('A & B < C > D'), 'A &amp; B &lt; C &gt; D');
});

test('escapeXml não mexe em texto sem caracteres especiais, inclusive acentos', () => {
    assert.equal(escapeXml('A Revolução dos Bichos'), 'A Revolução dos Bichos');
    assert.equal(escapeXml('A Sutil Arte de Ligar o F*da-se'), 'A Sutil Arte de Ligar o F*da-se');
});

test('quebrarLinhas não corta palavras ao meio e respeita o limite de caracteres', () => {
    const {linhas, truncado} = quebrarLinhas('Por que Generalistas Vencem em um Mundo de Especialistas', 20, 4);
    assert.equal(truncado, false);
    for (const linha of linhas) {
        assert.ok(linha.length <= 20, `linha "${linha}" excede 20 caracteres`);
    }
    // Reconstituir as linhas (sem o marcador de truncamento) deve reproduzir
    // o título original palavra por palavra — nenhuma palavra pode sumir.
    assert.equal(linhas.join(' '), 'Por que Generalistas Vencem em um Mundo de Especialistas');
});

test('quebrarLinhas trunca com "…" quando o título não cabe no máximo de linhas', () => {
    const tituloLongo = 'Uma Palavra '.repeat(30).trim();
    const {linhas, truncado} = quebrarLinhas(tituloLongo, 20, 3);
    assert.equal(truncado, true);
    assert.equal(linhas.length, 3);
    assert.ok(linhas[2].endsWith('…'), `última linha "${linhas[2]}" deveria terminar com "…"`);
});

test('quebrarLinhas devolve truncado:false quando o título cabe exatamente', () => {
    const {linhas, truncado} = quebrarLinhas('Duna', 20, 4);
    assert.equal(truncado, false);
    assert.deepEqual(linhas, ['Duna']);
});
