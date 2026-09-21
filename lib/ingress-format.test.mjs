import test from 'node:test'
import assert from 'node:assert/strict'
import {fmtStatCompact, fmtStatCompactPrecise, fmtScoreDecimal, fmtStatCompactPair} from './ingress-format.mjs'

// O Intl separa número e sufixo com espaço inseparável (U+00A0); normaliza pra comparar.
const plain = (s) => s.replace(/\s/g, ' ')

test('compacto padrão arredonda pra 2 algarismos significativos', () => {
    assert.equal(plain(fmtStatCompact(10608843806)), '11 bi')
    assert.equal(plain(fmtStatCompact(1390379639)), '1,4 bi')
    assert.equal(plain(fmtStatCompact(728437412)), '728 mi')
})

test('compacto preciso mantém 3 algarismos: 10,6 bi em vez de 11 bi', () => {
    assert.equal(plain(fmtStatCompactPrecise(10608843806)), '10,6 bi')
    assert.equal(plain(fmtStatCompactPrecise(1390379639)), '1,39 bi')
    assert.equal(plain(fmtStatCompactPrecise(728437412)), '728 mi')
})

test('compacto preciso não inventa casas em número redondo', () => {
    assert.equal(plain(fmtStatCompactPrecise(5000000000)), '5 bi')
    assert.equal(plain(fmtStatCompactPrecise(0)), '0')
})

test('nota geral com uma casa decimal, vírgula pt-BR: 95,8 em vez de 96', () => {
    assert.equal(fmtScoreDecimal(95.8), '95,8')
    assert.equal(fmtScoreDecimal(95), '95,0')
    assert.equal(fmtScoreDecimal('95.84'), '95,8')
})

test('par compacto: números grandes viram "48 mi" e "49 mi" quando dá pra distinguir', () => {
    const pair = fmtStatCompactPair(48213500, 48964000)
    assert.equal(plain(pair.from), '48 mi')
    assert.equal(plain(pair.to), '49 mi')
})

test('par compacto: se o resumo apaga a diferença, volta ao número por extenso', () => {
    // 1.204.532 e 1.204.542 seriam ambos "1,2 mi" — mostrar isso esconderia o +10.
    const pair = fmtStatCompactPair(1204532, 1204542)
    assert.equal(pair.from, '1.204.532')
    assert.equal(pair.to, '1.204.542')
})

test('par compacto: números pequenos ficam por extenso', () => {
    const pair = fmtStatCompactPair(8546, 8556)
    assert.equal(pair.from, '8.546')
    assert.equal(pair.to, '8.556')
})
