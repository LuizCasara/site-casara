import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    computeCommunityTotals,
    computeFactionComparison,
    computeAveragesSection,
    computeHallOfFame,
    computeSeasonalEngagement,
    SEASONAL_ENGAGEMENT_KEYS,
    computeSubscription,
    computeCountryBreakdown,
    computeNerdStats,
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

test('computeHallOfFame: recorde de um stat com badge carrega faction/countryCode/badgeSlug/tier do recordista', () => {
    const statKey = 'resonatorsDeployed' // badge "builder"
    const builder = BADGES.find((b) => b.slug === 'builder')
    const rows = [
        makeRow({
            codename_key: 'campeao',
            codename: 'Campeao',
            faction: 'resistance',
            country_code: 'BR',
            stat_values: {...statsAtMultiple(0), [statKey]: builder.tiers.onyx},
        }),
    ]
    const result = computeHallOfFame(rows)
    assert.equal(result.perStat[statKey].faction, 'resistance')
    assert.equal(result.perStat[statKey].countryCode, 'BR')
    assert.equal(result.perStat[statKey].badgeSlug, 'builder')
    assert.equal(result.perStat[statKey].tier, 'onyx')
})

test('computeHallOfFame: recorde além do Onyx carrega onyxMultiple = floor(valor / limiar de Onyx)', () => {
    const statKey = 'resonatorsDeployed' // badge "builder"
    const builder = BADGES.find((b) => b.slug === 'builder')
    const rows = [makeRow({stat_values: {...statsAtMultiple(0), [statKey]: builder.tiers.onyx * 5 + 1}})]
    const result = computeHallOfFame(rows)
    assert.equal(result.perStat[statKey].onyxMultiple, 5)
})

test('computeHallOfFame: recorde exatamente no Onyx -> onyxMultiple 1; abaixo do Onyx ou sem badge -> null', () => {
    const builder = BADGES.find((b) => b.slug === 'builder')
    const atOnyx = computeHallOfFame([
        makeRow({stat_values: {...statsAtMultiple(0), resonatorsDeployed: builder.tiers.onyx}}),
    ])
    assert.equal(atOnyx.perStat.resonatorsDeployed.onyxMultiple, 1)

    const belowOnyx = computeHallOfFame([
        makeRow({stat_values: {...statsAtMultiple(0), resonatorsDeployed: builder.tiers.onyx - 1}}),
    ])
    assert.equal(belowOnyx.perStat.resonatorsDeployed.onyxMultiple, null)

    const noBadge = computeHallOfFame([makeRow({stat_values: {...statsAtMultiple(0), portalsNeutralized: 999999}})])
    assert.equal(noBadge.perStat.portalsNeutralized.onyxMultiple, null)
})

test('computeHallOfFame: portalsNeutralized não tem badge própria -> badgeSlug/tier null no perStat', () => {
    const rows = [makeRow({stat_values: {...statsAtMultiple(0), portalsNeutralized: 999999}})]
    const result = computeHallOfFame(rows)
    assert.equal(result.perStat.portalsNeutralized.badgeSlug, null)
    assert.equal(result.perStat.portalsNeutralized.tier, null)
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

test('computeSeasonalEngagement: agente sem a chave em extra_stats não conta no sum nem no reportedCount daquela chave', () => {
    const rows = [
        makeRow({extra_stats: {firstSaturdayEvents: 3, secondSundayEvents: 2}}),
        makeRow({extra_stats: {secondSundayEvents: 5}}), // sem firstSaturdayEvents
    ]
    const result = computeSeasonalEngagement(rows)
    assert.equal(result.firstSaturdayEvents.sum, 3)
    assert.equal(result.firstSaturdayEvents.reportedCount, 1)
    assert.equal(result.secondSundayEvents.sum, 7)
    assert.equal(result.secondSundayEvents.reportedCount, 2)
})

test('computeSeasonalEngagement: valor não-numérico é tratado como ausente, nunca coagido ou lançado', () => {
    const rows = [makeRow({extra_stats: {battleBeaconCombatant: 'muitos'}}), makeRow({extra_stats: {battleBeaconCombatant: 10}})]
    const result = computeSeasonalEngagement(rows)
    assert.equal(result.battleBeaconCombatant.sum, 10)
    assert.equal(result.battleBeaconCombatant.reportedCount, 1)
})

test('computeSeasonalEngagement: extra_stats null (agente nunca mandou) não quebra e não conta em nenhuma chave', () => {
    const rows = [makeRow({extra_stats: null})]
    const result = computeSeasonalEngagement(rows)
    for (const key of SEASONAL_ENGAGEMENT_KEYS) {
        assert.equal(result[key].sum, 0)
        assert.equal(result[key].reportedCount, 0)
        assert.equal(result[key].top, null)
    }
})

test('computeSeasonalEngagement: métrica com badge real no catálogo carrega badgeSlug; métrica sem badge fica null', () => {
    const rows = [makeRow({extra_stats: {firstSaturdayEvents: 1, battleBeaconCombatant: 1}})]
    const result = computeSeasonalEngagement(rows)
    assert.equal(result.firstSaturdayEvents.badgeSlug, 'first-saturday')
    assert.equal(result.battleBeaconCombatant.badgeSlug, null)
})

test('computeSeasonalEngagement: top aponta pro maior valor daquela chave entre quem informou, com faction/countryCode', () => {
    const rows = [
        makeRow({codename_key: 'baixo', faction: 'enlightened', country_code: 'BR', extra_stats: {seerPoints: 10}}),
        makeRow({codename_key: 'alto', faction: 'resistance', country_code: 'US', extra_stats: {seerPoints: 90}}),
    ]
    const result = computeSeasonalEngagement(rows)
    assert.equal(result.seerPoints.top.codenameKey, 'alto')
    assert.equal(result.seerPoints.top.value, 90)
    assert.equal(result.seerPoints.top.faction, 'resistance')
    assert.equal(result.seerPoints.top.countryCode, 'US')
})

test('computeSubscription: ninguém com months_subscribed preenchido -> hasData false, sem 0%/média zerada', () => {
    const rows = [makeRow({months_subscribed: null}), makeRow({months_subscribed: null})]
    const result = computeSubscription(rows)
    assert.deepEqual(result, {
        hasData: false,
        reportedCount: 0,
        percentSubscribed: null,
        avgMonthsAmongSubscribed: null,
        top: null,
    })
})

test('computeSubscription: reportedCount conta quem informou (inclui 0, exclui null) e top é quem tem mais meses', () => {
    const rows = [
        makeRow({codename_key: 'nulo', months_subscribed: null}),
        makeRow({codename_key: 'zero', months_subscribed: 0}),
        makeRow({codename_key: 'seis', codename: 'Seis', faction: 'resistance', country_code: 'BR', months_subscribed: 6}),
        makeRow({codename_key: 'doze', months_subscribed: 12}),
    ]
    const result = computeSubscription(rows)
    assert.equal(result.reportedCount, 3)
    assert.equal(result.top.codenameKey, 'doze')
    assert.equal(result.top.value, 12)
})

test('computeSubscription: empate em meses -> agente mais antigo vence; ninguém assinante -> top null', () => {
    const tie = computeSubscription([
        makeRow({codename_key: 'novo', months_subscribed: 8, created_at: '2026-06-01T00:00:00Z'}),
        makeRow({codename_key: 'antigo', months_subscribed: 8, created_at: '2026-02-01T00:00:00Z'}),
    ])
    assert.equal(tie.top.codenameKey, 'antigo')

    const nobody = computeSubscription([makeRow({months_subscribed: 0}), makeRow({months_subscribed: 0})])
    assert.equal(nobody.hasData, true)
    assert.equal(nobody.reportedCount, 2)
    assert.equal(nobody.top, null)
})

test('computeSubscription: percentual e média batem com cálculo manual (mix de null/0/>0)', () => {
    const rows = [
        makeRow({months_subscribed: null}), // não entra no divisor
        makeRow({months_subscribed: 0}), // entra no divisor, não é "assinante"
        makeRow({months_subscribed: 6}),
        makeRow({months_subscribed: 12}),
    ]
    const result = computeSubscription(rows)
    // 2 de 3 com dado preenchido são "assinantes" (months_subscribed > 0) -> 66.67%
    assert.equal(result.hasData, true)
    assert.ok(Math.abs(result.percentSubscribed - (2 / 3) * 100) < 1e-9)
    assert.equal(result.avgMonthsAmongSubscribed, 9)
})

test('computeNerdStats: totalSubmissions (parâmetro) aparece sem alteração no objeto final', () => {
    const result = computeNerdStats([makeRow()], 42)
    assert.equal(result.totals.totalSubmissions, 42)
})

test('computeNerdStats: rows vazio -> todos os totais zerados/null, sem lançar', () => {
    const result = computeNerdStats([], 0)
    assert.equal(result.totals.totalAgents, 0)
    assert.equal(result.totals.totalSubmissions, 0)
    assert.equal(result.totals.onyxClubCount, 0)
    assert.deepEqual(result.byFaction.enlightened, {agentCount: 0, totalAp: 0, avgOverallScore: 0, onyxBadges: 0})
    assert.equal(result.averages.recursions.reportedCount, 0)
    assert.equal(result.hallOfFame.lifetimeAp, null)
    assert.equal(result.subscription.hasData, false)
})

test('computeNerdStats: formato do retorno tem as 7 chaves do design (totals, byFaction, averages, hallOfFame, seasonalEngagement, subscription, byCountry)', () => {
    const result = computeNerdStats([makeRow()], 1)
    assert.deepEqual(
        Object.keys(result).sort(),
        ['averages', 'byCountry', 'byFaction', 'hallOfFame', 'seasonalEngagement', 'subscription', 'totals']
    )
})

test('computeCountryBreakdown: lista vazia -> sem países e sem "sem país", sem lançar', () => {
    assert.deepEqual(computeCountryBreakdown([]), {countries: [], withoutCountryCount: 0})
})

test('computeCountryBreakdown: agrupa por país e separa agentes e AP por facção', () => {
    const rows = [
        makeRow({country_code: 'BR', faction: 'enlightened', lifetime_ap: 1000}),
        makeRow({country_code: 'BR', faction: 'enlightened', lifetime_ap: 500}),
        makeRow({country_code: 'BR', faction: 'resistance', lifetime_ap: 200}),
        makeRow({country_code: 'JP', faction: 'resistance', lifetime_ap: 700}),
    ]
    const {countries} = computeCountryBreakdown(rows)
    assert.deepEqual(countries.find((c) => c.code === 'BR'), {
        code: 'BR',
        enlightened: {agentCount: 2, totalAp: 1500},
        resistance: {agentCount: 1, totalAp: 200},
    })
    assert.deepEqual(countries.find((c) => c.code === 'JP'), {
        code: 'JP',
        enlightened: {agentCount: 0, totalAp: 0},
        resistance: {agentCount: 1, totalAp: 700},
    })
})

test('computeCountryBreakdown: país nulo/vazio não vira um país — só entra em withoutCountryCount', () => {
    const rows = [
        makeRow({country_code: null}),
        makeRow({country_code: undefined}),
        makeRow({country_code: ''}),
        makeRow({country_code: 'BR'}),
    ]
    const result = computeCountryBreakdown(rows)
    assert.equal(result.withoutCountryCount, 3)
    assert.deepEqual(result.countries.map((c) => c.code), ['BR'])
})

test('computeCountryBreakdown: lifetime_ap não numérico conta como 0, nunca NaN', () => {
    const {countries} = computeCountryBreakdown([makeRow({country_code: 'BR', lifetime_ap: 'x'})])
    assert.equal(countries[0].enlightened.totalAp, 0)
})

test('computeNerdStats: expõe byCountry', () => {
    const stats = computeNerdStats([makeRow({country_code: 'BR'})], 1)
    assert.equal(stats.byCountry.countries[0].code, 'BR')
    assert.equal(stats.byCountry.withoutCountryCount, 0)
})
