import {test} from 'node:test'
import assert from 'node:assert/strict'
import {collectAcquisitions, annotateLaneGaps, formatGap} from './ingress-timeline.mjs'

const CATALOG = {
    trekker: {name: 'Trekker', group: 'core'},
    liberator: {name: 'Liberator', group: 'core'},
    recursion: {name: 'Recursion', group: 'event'},
}

test('junta medalDates e eventBadges, ordenado por data ascendente', () => {
    const profile = {
        medalDates: {
            trekker: {gold: '2021-08-01', onyx: '2024-03-12'},
            liberator: {platinum: '2023-05-20'},
        },
        eventBadges: [{slug: 'recursion', dates: {single: '2019-07-20'}}],
    }
    const rows = collectAcquisitions(profile, CATALOG)
    assert.deepEqual(
        rows.map((r) => `${r.slug}:${r.tier}`),
        ['recursion:single', 'trekker:gold', 'liberator:platinum', 'trekker:onyx'],
    )
    assert.equal(rows[0].name, 'Recursion')
})

test('data inválida é ignorada sem quebrar', () => {
    const profile = {
        medalDates: {trekker: {gold: 'não sei', onyx: '2024-03-12', silver: ''}},
    }
    const rows = collectAcquisitions(profile, CATALOG)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tier, 'onyx')
})

test('slug fora do catálogo é ignorado', () => {
    const profile = {medalDates: {xpto: {gold: '2020-01-01'}, trekker: {gold: '2021-01-01'}}}
    const rows = collectAcquisitions(profile, CATALOG)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].slug, 'trekker')
})

test('perfil sem datas -> array vazio', () => {
    assert.deepEqual(collectAcquisitions({}, CATALOG), [])
    assert.deepEqual(collectAcquisitions({medalDates: {}, eventBadges: []}, CATALOG), [])
    assert.deepEqual(collectAcquisitions(null, CATALOG), [])
})

test('menos de 2 datas -> devolve o array curto (o componente decide o placeholder)', () => {
    const rows = collectAcquisitions({medalDates: {trekker: {onyx: '2024-03-12'}}}, CATALOG)
    assert.equal(rows.length, 1)
})

test('propaga group do catálogo (core/event), "other" quando ausente', () => {
    const rows = collectAcquisitions(
        {
            medalDates: {trekker: {gold: '2021-08-01'}, semgrupo: {gold: '2022-01-01'}},
            eventBadges: [{slug: 'recursion', dates: {single: '2019-07-20'}}],
        },
        {...CATALOG, semgrupo: {name: 'Sem Grupo'}},
    )
    const byslug = Object.fromEntries(rows.map((r) => [r.slug, r.group]))
    assert.deepEqual(byslug, {recursion: 'event', trekker: 'core', semgrupo: 'other'})
})

test('annotateLaneGaps: gapDays null na 1ª da raia, calculado nas seguintes + prevTier', () => {
    const rows = collectAcquisitions(
        {medalDates: {trekker: {gold: '2021-01-01', onyx: '2021-01-11'}, liberator: {gold: '2021-01-05'}}},
        CATALOG,
    )
    const ann = annotateLaneGaps(rows)
    const trekkerOnyx = ann.find((r) => r.slug === 'trekker' && r.tier === 'onyx')
    const trekkerGold = ann.find((r) => r.slug === 'trekker' && r.tier === 'gold')
    const liberator = ann.find((r) => r.slug === 'liberator')
    assert.equal(trekkerGold.gapDays, null)
    assert.equal(trekkerGold.prevTier, null)
    assert.equal(trekkerOnyx.gapDays, 10)
    assert.equal(trekkerOnyx.prevTier, 'gold')
    assert.equal(liberator.gapDays, null)
})

test('annotateLaneGaps: lista vazia/nula não quebra', () => {
    assert.deepEqual(annotateLaneGaps([]), [])
    assert.deepEqual(annotateLaneGaps(null), [])
})

test('formatGap: dias -> string curta, buckets d/m/a', () => {
    assert.equal(formatGap(null), null)
    assert.equal(formatGap(0), null)
    assert.equal(formatGap(-5), null)
    assert.equal(formatGap(12), '12d')
    assert.equal(formatGap(44), '44d')
    assert.equal(formatGap(60), '2m')
    assert.equal(formatGap(365), '1a')
    assert.equal(formatGap(400), '1a 1m')
})
