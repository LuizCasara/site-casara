import {test} from 'node:test'
import assert from 'node:assert/strict'
import {collectAcquisitions} from './ingress-timeline.mjs'

const CATALOG = {
    trekker: {name: 'Trekker'},
    liberator: {name: 'Liberator'},
    recursion: {name: 'Recursion'},
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
