import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    computeCommunityTotals,
    computeFactionComparison,
    computeAveragesSection,
    computeHallOfFame,
} from './ingress-nerd-stats.mjs'
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

test('computeAveragesSection: histograma com um agente em cada faixa bate 1:1 com os cortes da spec', () => {
    const rows = [10, 20, 40, 60, 80, 100, 130].map((overall_score) => makeRow({overall_score}))
    const result = computeAveragesSection(rows)
    assert.deepEqual(
        result.overallScoreHistogram.map((b) => b.count),
        [1, 1, 1, 1, 1, 1, 1]
    )
    assert.deepEqual(
        result.overallScoreHistogram.map((b) => b.label),
        ['Abaixo de Bronze', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Onyx', 'Onyx+']
    )
})

test('computeAveragesSection: communityAxisAverage é a média simples de cada eixo entre os agentes', () => {
    const rows = [
        makeRow({axis_scores: {construcao: 2, destruicao: 1, exploracao: 3, hacking: 0, linksCampos: 4}}),
        makeRow({axis_scores: {construcao: 4, destruicao: 3, exploracao: 1, hacking: 2, linksCampos: 2}}),
    ]
    const result = computeAveragesSection(rows)
    assert.deepEqual(result.communityAxisAverage, {
        construcao: 3,
        destruicao: 2,
        exploracao: 2,
        hacking: 1,
        linksCampos: 3,
    })
})

test('computeAveragesSection: avgApPerAgent é total/agentes', () => {
    const rows = [makeRow({lifetime_ap: 1000}), makeRow({lifetime_ap: 3000})]
    const result = computeAveragesSection(rows)
    assert.equal(result.avgApPerAgent, 2000)
})

test('computeAveragesSection: nenhum agente com recursions -> avg/max null, reportedCount 0 (não média sobre zero)', () => {
    const rows = [makeRow({recursions: null}), makeRow({recursions: null})]
    const result = computeAveragesSection(rows)
    assert.deepEqual(result.recursions, {avg: null, max: null, reportedCount: 0})
})

test('computeAveragesSection: recursions ignora agentes sem o campo e calcula só entre quem informou', () => {
    const rows = [makeRow({recursions: 5}), makeRow({recursions: 15}), makeRow({recursions: null})]
    const result = computeAveragesSection(rows)
    assert.deepEqual(result.recursions, {avg: 10, max: 15, reportedCount: 2})
})

test('computeHallOfFame: lista vazia -> tudo null, sem lançar', () => {
    const result = computeHallOfFame([])
    assert.equal(result.lifetimeAp, null)
    assert.equal(result.recursions, null)
    for (const key of Object.values(result.perStat)) assert.equal(key, null)
})

test('computeHallOfFame: empate exato num stat -> agente com created_at mais antigo vence', () => {
    const statKey = RADAR_AXES[0].parts[0].key
    const older = makeRow({
        codename_key: 'mais-velho',
        codename: 'MaisVelho',
        stat_values: {...statsAtMultiple(0), [statKey]: 1000},
        created_at: '2026-01-01T00:00:00Z',
    })
    const newer = makeRow({
        codename_key: 'mais-novo',
        codename: 'MaisNovo',
        stat_values: {...statsAtMultiple(0), [statKey]: 1000},
        created_at: '2026-06-01T00:00:00Z',
    })
    const result = computeHallOfFame([newer, older])
    assert.equal(result.perStat[statKey].codenameKey, 'mais-velho')
    assert.equal(result.perStat[statKey].value, 1000)
})

test('computeHallOfFame: maior lifetime_ap vence e devolve o codinome correspondente', () => {
    const rows = [makeRow({codename_key: 'baixo', lifetime_ap: 1000}), makeRow({codename_key: 'alto', lifetime_ap: 9000})]
    const result = computeHallOfFame(rows)
    assert.equal(result.lifetimeAp.codenameKey, 'alto')
    assert.equal(result.lifetimeAp.value, 9000)
})

test('computeHallOfFame: recursions ignora agentes com recursions null, mesmo que tenham outros valores altos', () => {
    const rows = [
        makeRow({codename_key: 'sem-dado', recursions: null, lifetime_ap: 99999}),
        makeRow({codename_key: 'com-dado', recursions: 7}),
    ]
    const result = computeHallOfFame(rows)
    assert.equal(result.recursions.codenameKey, 'com-dado')
    assert.equal(result.recursions.value, 7)
})

test('computeHallOfFame: chave de stat ausente é tratada como 0, não exclui o agente da disputa', () => {
    const statKey = RADAR_AXES[0].parts[0].key
    const withValue = makeRow({codename_key: 'com-valor', stat_values: {...statsAtMultiple(0), [statKey]: 5}})
    const missingKey = {...statsAtMultiple(0)}
    delete missingKey[statKey]
    const withoutValue = makeRow({codename_key: 'sem-chave', stat_values: missingKey})
    const result = computeHallOfFame([withValue, withoutValue])
    assert.equal(result.perStat[statKey].codenameKey, 'com-valor')
    assert.equal(result.perStat[statKey].value, 5)
})
