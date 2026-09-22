import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tierPosition, computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers} from './ingress-tier-score.mjs'
import {BADGES} from '../catalog/ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {TIERS, TIER_RANK, TIER_LABELS} from '../catalog/ingress-tiers.mjs'

const builder = BADGES.find((b) => b.slug === 'builder')
const purifier = BADGES.find((b) => b.slug === 'purifier')

/** Limiar de Onyx real de cada parte do radar (badge própria, ou Purifier ÷ 8 pra portalsNeutralized). */
function onyxOf(part) {
    if (part.badge) return BADGES.find((b) => b.slug === part.badge).tiers.onyx
    return purifier.tiers.onyx / 8
}

/** Stats sintéticas com TODAS as 12 partes do radar em `multiple` × o Onyx da parte. */
function statsAtMultiple(multiple) {
    const stats = {}
    for (const axis of RADAR_AXES) {
        for (const part of axis.parts) stats[part.key] = onyxOf(part) * multiple
    }
    return stats
}

test('tierPosition: valor 0 -> posição 0 (abaixo de Bronze)', () => {
    assert.equal(tierPosition(builder, 0), 0)
})

test('tierPosition: valor exatamente no limiar de cada tier -> posição == TIER_RANK do tier', () => {
    for (const tierName of TIERS) {
        assert.equal(tierPosition(builder, builder.tiers[tierName]), TIER_RANK[tierName])
    }
})

test('tierPosition: além do Onyx cresce em log₂ — cada dobra soma 1 posição (ADR-0005)', () => {
    const onyx = builder.tiers.onyx
    assert.equal(tierPosition(builder, onyx), 5)
    assert.equal(tierPosition(builder, onyx * 2), 6)
    assert.equal(tierPosition(builder, onyx * 4), 7)
    assert.equal(tierPosition(builder, onyx * 16), 9)
    assert.ok(Math.abs(tierPosition(builder, onyx * 25) - (5 + Math.log2(25))) < 1e-12)
})

test('tierPosition: 148× Onyx (o caso do BayBadMan em MU) vale ~12,2, não 152', () => {
    const illuminator = BADGES.find((b) => b.slug === 'illuminator')
    const p = tierPosition(illuminator, illuminator.tiers.onyx * 148)
    assert.ok(p > 12.2 && p < 12.3, `posição ${p}`)
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

test('computeOverallScore: todos os 12 stats em 2× Onyx -> nota geral 120', () => {
    const axisScores = computeAxisScores(statsAtMultiple(2))
    assert.ok(axisScores.every((a) => Math.abs(a.score - 6) < 1e-9))
    assert.ok(Math.abs(computeOverallScore(axisScores) - 120) < 1e-9)
})

test('computeOverallScore: todos os 12 stats em 25× Onyx -> nota geral 20 × (5 + log₂ 25) ≈ 192,9', () => {
    const axisScores = computeAxisScores(statsAtMultiple(25))
    assert.ok(axisScores.every((a) => Math.abs(a.score - (5 + Math.log2(25))) < 1e-9))
    assert.ok(Math.abs(computeOverallScore(axisScores) - 20 * (5 + Math.log2(25))) < 1e-9)
})

test('computeOverallScore: UMA parte em 265× Onyx não decide a nota (regressão do problema do ADR-0005)', () => {
    // Todos os 12 stats no Onyx (nota 100) e só Mind Units disparado em 265× (o gal0daxj real).
    const stats = statsAtMultiple(1)
    stats.mindUnitsCaptured = 4000000 * 265
    const nota = computeOverallScore(computeAxisScores(stats))
    // No cálculo linear antigo essa única parte levava a nota geral a ~450 (posição 269 no MU). No log₂ o eixo
    // "Links e campos" fica em (5+5+13,05)/3 ≈ 7,68 posições e a nota geral em ~111.
    assert.ok(nota > 100 && nota < 130, `nota ${nota}`)
})

test('computeOverallScore: monotônico — mais em qualquer stat nunca reduz a nota (a medalha continua somando)', () => {
    let prev = -1
    for (const m of [0.5, 1, 1.5, 2, 3, 8, 64, 1000]) {
        const nota = computeOverallScore(computeAxisScores(statsAtMultiple(m)))
        assert.ok(nota > prev, `${m}×: ${nota} <= ${prev}`)
        prev = nota
    }
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

test('overallTierLabel: 2× Onyx em tudo -> "Onyx +1"; 25× Onyx em tudo -> "Onyx +4" (⌊log₂ 25⌋ = 4 dobras)', () => {
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2))), 'Onyx +1')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(25))), 'Onyx +4')
})

test('overallTierLabel: lang="en" devolve o nome oficial em inglês (ISTATS-19 fix)', () => {
    assert.equal(overallTierLabel(computeAxisScores({}), 'en'), 'No medal')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2)), 'en'), 'Onyx +1')
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(25)), 'en'), 'Onyx +4')
})

test('overallTierLabel: sem `lang` continua devolvendo PT (default não regride call sites existentes)', () => {
    assert.equal(overallTierLabel(computeAxisScores({})), TIER_LABELS.none)
    assert.equal(overallTierLabel(computeAxisScores(statsAtMultiple(2))), 'Onyx +1')
})

test('computeStatTiers: as 12 partes do radar aparecem, cada uma com um `tier` válido', () => {
    const tiers = computeStatTiers(statsAtMultiple(1))
    const keys = RADAR_AXES.flatMap((a) => a.parts.map((p) => p.key))
    assert.equal(Object.keys(tiers).length, keys.length)
    for (const key of keys) {
        assert.ok(TIERS.includes(tiers[key].tier) || tiers[key].tier === 'none', `${key}: tier inválido ${tiers[key].tier}`)
    }
})

test('computeStatTiers: valor exatamente no Onyx de cada parte -> tier "onyx"', () => {
    const tiers = computeStatTiers(statsAtMultiple(1))
    assert.equal(tiers.resonatorsDeployed.tier, 'onyx')
    assert.equal(tiers.resonatorsDeployed.badgeSlug, 'builder')
})

test('computeStatTiers: stats vazio -> todas as partes em tier "none"', () => {
    const tiers = computeStatTiers({})
    for (const {tier} of Object.values(tiers)) assert.equal(tier, 'none')
})

test('computeStatTiers: portalsNeutralized não tem badge própria -> badgeSlug null', () => {
    const tiers = computeStatTiers(statsAtMultiple(1))
    assert.equal(tiers.portalsNeutralized.badgeSlug, null)
})
