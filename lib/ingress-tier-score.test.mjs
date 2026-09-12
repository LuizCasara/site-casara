import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tierPosition, computeAxisScores, computeOverallScore, overallTierLabel} from './ingress-tier-score.mjs'
import {BADGES, computeBadge} from './ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {TIERS, TIER_RANK, TIER_LABELS} from './ingress-tiers.mjs'

const builder = BADGES.find((b) => b.slug === 'builder')
const purifier = BADGES.find((b) => b.slug === 'purifier')

/** Limiar de Onyx real de cada parte do radar (badge própria, ou Purifier ÷ 8 pra portalsNeutralized). */
function onyxOf(part) {
    if (part.badge) return BADGES.find((b) => b.slug === part.badge).tiers.onyx
    return purifier.tiers.onyx / 8
}

/** Stats sintéticas com TODAS as 11 partes do radar em `multiple` × o Onyx da parte. */
function statsAtMultiple(multiple) {
    const stats = {}
    for (const axis of RADAR_AXES) {
        for (const part of axis.parts) stats[part.key] = onyxOf(part) * multiple
    }
    return stats
}

test('tierPosition: valor 0 -> posição 0 (abaixo de Bronze)', () => {
    assert.equal(tierPosition(computeBadge(builder, 0)), 0)
})

test('tierPosition: valor exatamente no limiar de cada tier -> posição == TIER_RANK do tier', () => {
    for (const tierName of TIERS) {
        const threshold = builder.tiers[tierName]
        const result = computeBadge(builder, threshold)
        assert.equal(result.tier, tierName)
        assert.equal(tierPosition(result), TIER_RANK[tierName])
    }
})

test('tierPosition: overflow além do Onyx -> extensão linear (2×, 25× Onyx)', () => {
    const onyx = builder.tiers.onyx
    assert.equal(tierPosition(computeBadge(builder, onyx * 2)), 6)
    assert.equal(tierPosition(computeBadge(builder, onyx * 25)), 29)
})

test('computeAxisScores: stats vazio -> os 5 eixos ficam em posição 0', () => {
    const axisScores = computeAxisScores({})
    assert.equal(axisScores.length, 5)
    assert.deepEqual(axisScores.map((a) => a.id), RADAR_AXES.map((a) => a.id))
    assert.ok(axisScores.every((a) => a.score === 0))
})

test('computeAxisScores: portalsNeutralized deriva os limiares do Purifier ÷ 8', () => {
    const destruicaoBronze = purifier.tiers.bronze / 8
    const axisScores = computeAxisScores({resonatorsDestroyed: 0, portalsNeutralized: destruicaoBronze})
    const destruicao = axisScores.find((a) => a.id === 'destruicao')
    // média de [0 (resonatorsDestroyed=0), 1 (portalsNeutralized no limiar de Bronze derivado)]
    assert.equal(destruicao.score, 0.5)
})

test('computeOverallScore: todos os 11 stats em 2× Onyx -> nota geral 120', () => {
    const axisScores = computeAxisScores(statsAtMultiple(2))
    assert.ok(axisScores.every((a) => Math.abs(a.score - 6) < 1e-9))
    assert.ok(Math.abs(computeOverallScore(axisScores) - 120) < 1e-9)
})

test('computeOverallScore: todos os 11 stats em 25× Onyx -> nota geral 580', () => {
    const axisScores = computeAxisScores(statsAtMultiple(25))
    assert.ok(axisScores.every((a) => Math.abs(a.score - 29) < 1e-9))
    assert.ok(Math.abs(computeOverallScore(axisScores) - 580) < 1e-9)
})

test('computeOverallScore: stats vazio -> nota geral 0', () => {
    assert.equal(computeOverallScore(computeAxisScores({})), 0)
})

test('overallTierLabel: stats vazio -> "Sem medalha"', () => {
    assert.equal(overallTierLabel(computeAxisScores({})), TIER_LABELS.none)
})

test('overallTierLabel: todos os stats exatamente no limiar de Bronze -> "Bronze"', () => {
    const stats = {}
    for (const axis of RADAR_AXES) {
        for (const part of axis.parts) {
            const def = part.badge ? BADGES.find((b) => b.slug === part.badge) : {tiers: {bronze: purifier.tiers.bronze / 8}}
            stats[part.key] = def.tiers.bronze
        }
    }
    assert.equal(overallTierLabel(computeAxisScores(stats)), 'Bronze')
})

test('overallTierLabel: 2× Onyx em tudo -> "Onyx +1"; 25× Onyx em tudo -> "Onyx +24"', () => {
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2))), 'Onyx +1')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(25))), 'Onyx +24')
})

test('overallTierLabel: lang="en" devolve o nome oficial em inglês (ISTATS-19 fix)', () => {
    assert.equal(overallTierLabel(computeAxisScores({}), 'en'), 'No medal')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2)), 'en'), 'Onyx +1')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(25)), 'en'), 'Onyx +24')
})

test('overallTierLabel: sem `lang` continua devolvendo PT (default não regride call sites existentes)', () => {
    assert.equal(overallTierLabel(computeAxisScores({})), TIER_LABELS.none)
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2))), 'Onyx +1')
})
