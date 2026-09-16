import {test} from 'node:test'
import assert from 'node:assert/strict'
import {computeCommunityTotals, computeFactionComparison} from './ingress-nerd-stats.mjs'
import {BADGES} from './ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'

const purifier = BADGES.find((b) => b.slug === 'purifier')

/** Limiar de Onyx real de cada parte do radar (badge própria, ou Purifier ÷ 8 pra portalsNeutralized) — mesmo helper de `ingress-tier-score.test.mjs`. */
function onyxOf(part) {
    if (part.badge) return BADGES.find((b) => b.slug === part.badge).tiers.onyx
    return purifier.tiers.onyx / 8
}

/** Stats sintéticas com as 12 partes do radar em `multiple` × o Onyx da parte (multiple=0 -> tudo abaixo de Bronze). */
function statsAtMultiple(multiple) {
    const stats = {}
    for (const axis of RADAR_AXES) {
        for (const part of axis.parts) stats[part.key] = onyxOf(part) * multiple
    }
    return stats
}

/** As mesmas 12 stats de `statsAtMultiple(1)`, mas com UMA parte (a primeira do primeiro eixo) zerada — quebra o "clube Onyx" sem afetar as outras 11. */
function statsAtMultipleExceptOne(multiple) {
    const stats = statsAtMultiple(multiple)
    const firstKey = RADAR_AXES[0].parts[0].key
    stats[firstKey] = 0
    return stats
}

function makeRow(overrides = {}) {
    return {
        codename_key: 'agente',
        codename: 'Agente',
        faction: 'enlightened',
        lifetime_ap: 1000,
        overall_score: 50,
        axis_scores: {},
        stat_values: statsAtMultiple(0),
        recursions: null,
        extra_stats: null,
        months_subscribed: null,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    }
}

test('computeCommunityTotals: lista vazia -> tudo zerado, sem lançar', () => {
    const result = computeCommunityTotals([])
    assert.deepEqual(result, {
        totalAgents: 0,
        totalLifetimeAp: 0,
        badgeTiersGranted: {bronze: 0, silver: 0, gold: 0, platinum: 0, onyx: 0},
        onyxBadgesGranted: 0,
        onyxClubCount: 0,
    })
})

test('computeCommunityTotals: totalAgents e totalLifetimeAp somam as linhas', () => {
    const rows = [makeRow({lifetime_ap: 1000}), makeRow({lifetime_ap: 2500})]
    const result = computeCommunityTotals(rows)
    assert.equal(result.totalAgents, 2)
    assert.equal(result.totalLifetimeAp, 3500)
})

test('computeCommunityTotals: agente sem nenhum stat não conta tier nenhum (exclui "none")', () => {
    const rows = [makeRow({stat_values: statsAtMultiple(0)})]
    const result = computeCommunityTotals(rows)
    assert.deepEqual(result.badgeTiersGranted, {bronze: 0, silver: 0, gold: 0, platinum: 0, onyx: 0})
    assert.equal(result.onyxBadgesGranted, 0)
    assert.equal(result.onyxClubCount, 0)
})

test('computeCommunityTotals: agente com os 12 stats em onyx conta 12 no total e 1 no clube Onyx', () => {
    const rows = [makeRow({stat_values: statsAtMultiple(1)})]
    const result = computeCommunityTotals(rows)
    assert.equal(result.badgeTiersGranted.onyx, 12)
    assert.equal(result.onyxBadgesGranted, 12)
    assert.equal(result.onyxClubCount, 1)
})

test('computeCommunityTotals: agente com 11/12 stats em onyx NÃO entra no clube Onyx', () => {
    const rows = [makeRow({stat_values: statsAtMultipleExceptOne(1)})]
    const result = computeCommunityTotals(rows)
    assert.equal(result.badgeTiersGranted.onyx, 11)
    assert.equal(result.onyxClubCount, 0)
})

test('computeFactionComparison: facção sem nenhum agente devolve zeros, não omite a chave', () => {
    const rows = [makeRow({faction: 'enlightened', lifetime_ap: 1000, overall_score: 40})]
    const result = computeFactionComparison(rows)
    assert.deepEqual(result.resistance, {agentCount: 0, totalAp: 0, avgOverallScore: 0, onyxBadges: 0})
    assert.equal(result.enlightened.agentCount, 1)
})

test('computeFactionComparison: contagem/soma/média batem com cálculo manual (2+ agentes por facção)', () => {
    const rows = [
        makeRow({faction: 'enlightened', lifetime_ap: 1000, overall_score: 40}),
        makeRow({faction: 'enlightened', lifetime_ap: 3000, overall_score: 60}),
        makeRow({faction: 'resistance', lifetime_ap: 500, overall_score: 20}),
    ]
    const result = computeFactionComparison(rows)
    assert.equal(result.enlightened.agentCount, 2)
    assert.equal(result.enlightened.totalAp, 4000)
    assert.equal(result.enlightened.avgOverallScore, 50)
    assert.equal(result.resistance.agentCount, 1)
    assert.equal(result.resistance.totalAp, 500)
    assert.equal(result.resistance.avgOverallScore, 20)
})

test('computeFactionComparison: onyxBadges conta só os 12 stats do radar em onyx dos agentes daquela facção', () => {
    const rows = [
        makeRow({faction: 'enlightened', stat_values: statsAtMultiple(1)}),
        makeRow({faction: 'resistance', stat_values: statsAtMultiple(0)}),
    ]
    const result = computeFactionComparison(rows)
    assert.equal(result.enlightened.onyxBadges, 12)
    assert.equal(result.resistance.onyxBadges, 0)
})
