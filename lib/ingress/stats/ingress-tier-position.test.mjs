import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tierPositionFromTiers, ONYX_POSITION, POINTS_PER_POSITION} from './ingress-tier-position.mjs'

const TIERS = [100, 1000, 5000, 20000, 100000] // bronze .. onyx (valores de teste)
const close = (a, b) => Math.abs(a - b) < 1e-9

test('abaixo de Bronze: interpola de 0 até 1', () => {
    assert.equal(tierPositionFromTiers(0, TIERS), 0)
    assert.equal(tierPositionFromTiers(50, TIERS), 0.5)
    assert.equal(tierPositionFromTiers(100, TIERS), 1)
})

test('entre limiares: interpolação linear (posição = tier atingido + progresso até o próximo)', () => {
    // meio caminho entre Silver (1000) e Gold (5000) = 3000 -> 2,5
    assert.equal(tierPositionFromTiers(3000, TIERS), 2.5)
    // meio caminho entre Platinum (20000) e Onyx (100000) = 60000 -> 4,5
    assert.equal(tierPositionFromTiers(60000, TIERS), 4.5)
})

test('no Onyx a posição é exatamente 5 (as duas fórmulas se encontram, sem salto)', () => {
    assert.equal(tierPositionFromTiers(100000, TIERS), ONYX_POSITION)
    // logo abaixo e logo acima: contínua
    assert.ok(Math.abs(tierPositionFromTiers(99999, TIERS) - 5) < 1e-4)
    assert.ok(Math.abs(tierPositionFromTiers(100001, TIERS) - 5) < 1e-4)
})

test('além do Onyx: cada dobra soma exatamente 1 posição', () => {
    for (let k = 0; k <= 12; k += 1) {
        assert.ok(close(tierPositionFromTiers(100000 * 2 ** k, TIERS), 5 + k), `dobra ${k}`)
    }
})

test('além do Onyx: o retorno é decrescente — 4M→8M rende o mesmo que 300M→600M', () => {
    const ganho = (de) => tierPositionFromTiers(de * 2, TIERS) - tierPositionFromTiers(de, TIERS)
    assert.ok(close(ganho(400000), ganho(30000000)))
    assert.ok(close(ganho(400000), 1))
})

test('além do Onyx: estritamente crescente (a estatística nunca deixa de somar)', () => {
    let prev = -Infinity
    for (const m of [1, 1.01, 1.5, 2, 3, 10, 100, 1e4, 1e9]) {
        const p = tierPositionFromTiers(100000 * m, TIERS)
        assert.ok(p > prev, `${m}×`)
        prev = p
    }
})

test('coincide com a escala linear antiga em ×1 e ×2 (a mudança só aparece de ×3 em diante)', () => {
    assert.equal(tierPositionFromTiers(100000 * 1, TIERS), 5)
    assert.equal(tierPositionFromTiers(100000 * 2, TIERS), 6)
    // ×3: linear dava 7, log₂ dá 6,58
    assert.ok(close(tierPositionFromTiers(100000 * 3, TIERS), 5 + Math.log2(3)))
})

test('entrada inválida (NaN, negativo, undefined, string) conta como 0', () => {
    for (const bad of [NaN, -5, undefined, null, 'abc', Infinity * 0]) {
        assert.equal(tierPositionFromTiers(bad, TIERS), 0)
    }
    assert.equal(tierPositionFromTiers('200', TIERS), 1 + (200 - 100) / (1000 - 100))
})

test('POINTS_PER_POSITION: Onyx (posição 5) = nota 100', () => {
    assert.equal(ONYX_POSITION * POINTS_PER_POSITION, 100)
})
