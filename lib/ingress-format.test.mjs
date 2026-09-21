import test from 'node:test'
import assert from 'node:assert/strict'
import {fmtStatCompact, fmtStatCompactPrecise} from './ingress-format.mjs'

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
