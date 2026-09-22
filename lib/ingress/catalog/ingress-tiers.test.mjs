import {test} from 'node:test'
import assert from 'node:assert/strict'
import {TIER_LABELS, TIER_LABELS_EN, tierLabel} from './ingress-tiers.mjs'

test('tierLabel: pt devolve exatamente TIER_LABELS, para cada tier', () => {
    for (const tier of Object.keys(TIER_LABELS)) {
        assert.equal(tierLabel(tier, 'pt'), TIER_LABELS[tier])
    }
})

test('tierLabel: en devolve os nomes oficiais em inglês, para cada tier', () => {
    assert.equal(tierLabel('none', 'en'), 'No medal')
    assert.equal(tierLabel('bronze', 'en'), 'Bronze')
    assert.equal(tierLabel('silver', 'en'), 'Silver')
    assert.equal(tierLabel('gold', 'en'), 'Gold')
    assert.equal(tierLabel('platinum', 'en'), 'Platinum')
    assert.equal(tierLabel('onyx', 'en'), 'Onyx')
    assert.equal(tierLabel('single', 'en'), 'Event')
})

test('tierLabel: TIER_LABELS_EN cobre exatamente as mesmas chaves de TIER_LABELS', () => {
    assert.deepEqual(Object.keys(TIER_LABELS_EN).sort(), Object.keys(TIER_LABELS).sort())
})

test('TIER_LABELS export original permanece inalterado (call sites existentes não quebram)', () => {
    assert.equal(TIER_LABELS.none, 'Sem medalha')
    assert.equal(TIER_LABELS.bronze, 'Bronze')
    assert.equal(TIER_LABELS.silver, 'Prata')
    assert.equal(TIER_LABELS.gold, 'Ouro')
    assert.equal(TIER_LABELS.platinum, 'Platina')
    assert.equal(TIER_LABELS.onyx, 'Onyx')
    assert.equal(TIER_LABELS.single, 'Evento')
})
