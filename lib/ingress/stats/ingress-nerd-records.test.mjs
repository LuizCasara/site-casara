import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    HALL_OF_FAME_EXTRA_KEYS,
    HALL_GROUPS,
    SEASONAL_LABELS,
    buildHallSections,
    buildSeasonalSections,
    buildSubscriptionSections,
    groupByHolder,
} from './ingress-nerd-records.mjs'
import {
    HALL_OF_FAME_EXTRA_KEYS as NERD_STATS_EXTRA_KEYS,
    SEASONAL_ENGAGEMENT_KEYS,
} from './ingress-nerd-stats.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'

/** Um recorde no formato que `computeHallOfFame` devolve. */
function rec(codename, value, extra = {}) {
    return {
        codenameKey: codename.toLowerCase(),
        codename,
        faction: 'resistance',
        countryCode: 'br',
        value,
        badgeSlug: null,
        tier: null,
        onyxMultiple: null,
        ...extra,
    }
}

const RADAR_KEYS = RADAR_AXES.flatMap((a) => a.parts.map((p) => p.key))

/** `perStat` completo: todos os stats do hall preenchidos pelo mesmo agente. */
function fullPerStat(holder = rec('Alfa', 10)) {
    return Object.fromEntries([...RADAR_KEYS, ...HALL_OF_FAME_EXTRA_KEYS].map((k) => [k, holder]))
}

function keysOf(sections) {
    return sections.flatMap((s) => s.items.map((i) => i.key))
}

test('a lista de stats extras é a mesma de ingress-nerd-stats.mjs', () => {
    // O componente não pode importar aquele módulo (ele lê o catálogo do disco),
    // então a lista é duplicada — este teste é o que impede as duas de divergirem.
    assert.deepEqual(HALL_OF_FAME_EXTRA_KEYS, NERD_STATS_EXTRA_KEYS)
})

test('todo stat do hall pertence a exatamente um grupo', () => {
    const grouped = HALL_GROUPS.flatMap((g) => g.keys)
    const expected = ['lifetimeAp', 'recursions', ...RADAR_KEYS, ...HALL_OF_FAME_EXTRA_KEYS]
    assert.deepEqual([...grouped].sort(), [...expected].sort())
})

test('buildHallSections devolve os grupos na ordem fixa, com AP e recursões no primeiro', () => {
    const sections = buildHallSections({
        perStat: fullPerStat(),
        lifetimeAp: rec('Alfa', 1),
        recursions: rec('Alfa', 2),
    })
    assert.deepEqual(sections.map((s) => s.id), ['general', 'build', 'destroy', 'explore', 'contribute'])
    assert.deepEqual(keysOf(sections).slice(0, 2), ['lifetimeAp', 'recursions'])
    assert.equal(sections[0].hero, true)
    assert.equal(sections[1].hero, false)
})

test('buildHallSections cobre os 25 recordes quando todos existem', () => {
    const sections = buildHallSections({perStat: fullPerStat(), lifetimeAp: rec('A', 1), recursions: rec('A', 2)})
    assert.equal(keysOf(sections).length, 25)
})

test('buildHallSections traz rótulo pt/en do radar e das colunas extras', () => {
    const sections = buildHallSections({perStat: fullPerStat(), lifetimeAp: rec('A', 1), recursions: rec('A', 2)})
    const items = Object.fromEntries(sections.flatMap((s) => s.items).map((i) => [i.key, i]))
    assert.deepEqual(items.hacks.label, {pt: 'Hacks', en: 'Hacks'})
    assert.deepEqual(items.resonatorsDeployed.label, {pt: 'Ressonadores implantados', en: 'Resonators deployed'})
    assert.equal(items.droneHacks.label.en.length > 0 && items.droneHacks.label.pt.length > 0, true)
    assert.equal(items.lifetimeAp.label.en, 'Highest AP (lifetime)')
    assert.equal(items.recursions.label.pt, 'Mais recursões')
})

test('buildHallSections carrega dono, valor, medalha e múltiplo de Onyx do recorde', () => {
    const perStat = fullPerStat()
    perStat.hacks = rec('Leon', 844848, {badgeSlug: 'hacker', tier: 'onyx', onyxMultiple: 4, faction: 'enlightened', countryCode: 'br'})
    const sections = buildHallSections({perStat, lifetimeAp: rec('A', 1), recursions: rec('A', 2)})
    const hacks = sections.flatMap((s) => s.items).find((i) => i.key === 'hacks')
    assert.equal(hacks.value, 844848)
    assert.equal(hacks.holderValue, 844848)
    assert.equal(hacks.unit, 'count')
    assert.deepEqual(hacks.badge, {slug: 'hacker', tier: 'onyx'})
    assert.equal(hacks.onyxMultiple, 4)
    assert.deepEqual(hacks.holder, {codenameKey: 'leon', codename: 'Leon', faction: 'enlightened', countryCode: 'br'})
})

test('recursões usam a medalha Simulacrum sem tier, e o AP não tem medalha', () => {
    const sections = buildHallSections({perStat: fullPerStat(), lifetimeAp: rec('A', 1), recursions: rec('A', 2)})
    const items = Object.fromEntries(sections.flatMap((s) => s.items).map((i) => [i.key, i]))
    assert.deepEqual(items.recursions.badge, {slug: 'simulacrum', tier: null})
    assert.equal(items.lifetimeAp.badge, null)
})

test('stat sem recorde é omitido, e um grupo que fica vazio some inteiro', () => {
    const perStat = fullPerStat()
    for (const g of HALL_GROUPS.filter((g) => g.id === 'contribute')) for (const k of g.keys) perStat[k] = null
    perStat.hacks = null
    const sections = buildHallSections({perStat, lifetimeAp: null, recursions: rec('A', 2)})
    assert.equal(sections.some((s) => s.id === 'contribute'), false)
    assert.equal(keysOf(sections).includes('hacks'), false)
    assert.equal(keysOf(sections).includes('lifetimeAp'), false)
    assert.equal(keysOf(sections).includes('recursions'), true)
})

test('buildSeasonalSections usa a soma como valor e o recordista como dono', () => {
    const metrics = {
        firstSaturdayEvents: {sum: 856, reportedCount: 30, badgeSlug: 'first-saturday', top: rec('Oscar', 245)},
    }
    const [section] = buildSeasonalSections(metrics)
    const item = section.items[0]
    assert.equal(item.key, 'firstSaturdayEvents')
    assert.equal(item.value, 856)
    assert.equal(item.holderValue, 245)
    assert.equal(item.reportedCount, 30)
    assert.equal(item.holder.codename, 'Oscar')
    assert.deepEqual(item.badge, {slug: 'first-saturday', tier: 'onyx'})
    assert.equal(item.onyxMultiple, null)
})

test('buildSeasonalSections segue a ordem de SEASONAL_ENGAGEMENT_KEYS e tem rótulo pra todas', () => {
    assert.deepEqual(Object.keys(SEASONAL_LABELS), SEASONAL_ENGAGEMENT_KEYS)
    const metrics = Object.fromEntries(
        SEASONAL_ENGAGEMENT_KEYS.map((k) => [k, {sum: 1, reportedCount: 1, badgeSlug: null, top: rec('A', 1)}])
    )
    const [section] = buildSeasonalSections(metrics)
    assert.deepEqual(section.items.map((i) => i.key), SEASONAL_ENGAGEMENT_KEYS)
})

test('buildSeasonalSections omite métrica que ninguém informou e não inventa medalha', () => {
    const metrics = {
        firstSaturdayEvents: {sum: 0, reportedCount: 0, badgeSlug: 'first-saturday', top: null},
        battleBeaconCombatant: {sum: 9, reportedCount: 2, badgeSlug: null, top: rec('B', 5)},
    }
    const sections = buildSeasonalSections(metrics)
    assert.deepEqual(keysOf(sections), ['battleBeaconCombatant'])
    assert.equal(sections[0].items[0].badge, null)
})

test('buildSeasonalSections devolve nada quando nenhuma métrica tem dado', () => {
    assert.deepEqual(buildSeasonalSections({}), [])
})

const SUB = {hasData: true, reportedCount: 40, percentSubscribed: 42.6, avgMonthsAmongSubscribed: 18.25, top: rec('Ana', 137)}

test('buildSubscriptionSections sem dado não devolve seção', () => {
    assert.deepEqual(buildSubscriptionSections({...SUB, hasData: false}), [])
})

test('buildSubscriptionSections mistura indicadores da comunidade e o recordista', () => {
    const [section] = buildSubscriptionSections(SUB)
    const byKey = Object.fromEntries(section.items.map((i) => [i.key, i]))
    assert.deepEqual(section.items.map((i) => i.key), ['reportedCount', 'percentSubscribed', 'avgMonths', 'topMonths'])
    assert.equal(byKey.reportedCount.value, 40)
    assert.equal(byKey.reportedCount.unit, 'count')
    assert.equal(byKey.percentSubscribed.value, 43)
    assert.equal(byKey.percentSubscribed.unit, 'percent')
    assert.equal(byKey.avgMonths.value, 18.25)
    assert.equal(byKey.avgMonths.unit, 'decimal')
    assert.equal(byKey.reportedCount.holder, null)
    assert.equal(byKey.topMonths.unit, 'months')
    assert.equal(byKey.topMonths.holder.codename, 'Ana')
    assert.equal(byKey.topMonths.value, 137)
    assert.deepEqual(byKey.topMonths.badge, {slug: 'core', tier: null})
})

test('buildSubscriptionSections omite média e recordista quando não existem', () => {
    const [section] = buildSubscriptionSections({...SUB, avgMonthsAmongSubscribed: null, top: null})
    assert.deepEqual(section.items.map((i) => i.key), ['reportedCount', 'percentSubscribed'])
})

/** Um item mínimo, só com o que `groupByHolder` lê. */
function item(key, holder) {
    return {key, holder: holder ? {codenameKey: holder.toLowerCase(), codename: holder, faction: 'enlightened', countryCode: null} : null}
}

test('groupByHolder agrupa por agente e ordena por quantidade de recordes', () => {
    const sections = [{id: 's', items: [item('a', 'Zed'), item('b', 'Ana'), item('c', 'Zed'), item('d', 'Ana'), item('e', 'Zed')]}]
    const {agents} = groupByHolder(sections)
    assert.deepEqual(agents.map((a) => [a.holder.codename, a.items.map((i) => i.key)]), [
        ['Zed', ['a', 'c', 'e']],
        ['Ana', ['b', 'd']],
    ])
})

test('groupByHolder desempata pelo codinome, sem depender da ordem de entrada', () => {
    const sections = [{id: 's', items: [item('a', 'Beto'), item('b', 'Ana')]}]
    const {agents} = groupByHolder(sections)
    assert.deepEqual(agents.map((a) => a.holder.codename), ['Ana', 'Beto'])
})

test('groupByHolder junta itens de seções diferentes e separa os que não têm dono', () => {
    const sections = [
        {id: 'x', items: [item('a', 'Ana'), item('c1', null)]},
        {id: 'y', items: [item('b', 'Ana'), item('c2', null)]},
    ]
    const {agents, community} = groupByHolder(sections)
    assert.deepEqual(agents[0].items.map((i) => i.key), ['a', 'b'])
    assert.deepEqual(community.map((i) => i.key), ['c1', 'c2'])
})

test('groupByHolder sem nada devolve listas vazias', () => {
    assert.deepEqual(groupByHolder([]), {agents: [], community: []})
})
