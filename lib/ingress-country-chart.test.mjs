import {test} from 'node:test'
import assert from 'node:assert/strict'
import {rankCountries} from './ingress-country-chart.mjs'

/** País no formato de `computeCountryBreakdown`: `[agentes, AP]` por facção. */
function country(code, [enlAgents, enlAp], [resAgents, resAp] = [0, 0]) {
    return {
        code,
        enlightened: {agentCount: enlAgents, totalAp: enlAp},
        resistance: {agentCount: resAgents, totalAp: resAp},
    }
}

const codes = (ranking) => ranking.rows.map((r) => r.code)

test('rankCountries agents: ordena por nº de agentes; empate desempata por AP e depois pelo código', () => {
    const list = [country('BR', [2, 100]), country('JP', [2, 900]), country('US', [5, 10]), country('AR', [2, 100])]
    const ranking = rankCountries(list, {metric: 'agents', faction: 'all'})
    assert.deepEqual(codes(ranking), ['US', 'JP', 'AR', 'BR'])
})

test('rankCountries ap: ordena por AP somado; empate desempata por nº de agentes', () => {
    const list = [country('BR', [1, 500]), country('JP', [3, 500]), country('US', [1, 900])]
    const ranking = rankCountries(list, {metric: 'ap', faction: 'all'})
    assert.deepEqual(codes(ranking), ['US', 'JP', 'BR'])
})

test('rankCountries all: cada linha traz o valor de cada facção e o total', () => {
    const ranking = rankCountries([country('BR', [2, 100], [1, 50])], {metric: 'agents', faction: 'all'})
    assert.deepEqual(ranking.rows[0], {code: 'BR', enlightened: 2, resistance: 1, value: 3})
    const ap = rankCountries([country('BR', [2, 100], [1, 50])], {metric: 'ap', faction: 'all'})
    assert.deepEqual(ap.rows[0], {code: 'BR', enlightened: 100, resistance: 50, value: 150})
})

test('rankCountries facção: conta só a facção escolhida e descarta país sem nenhum agente dela', () => {
    const list = [country('BR', [1, 100], [4, 900]), country('JP', [3, 300]), country('US', [0, 0], [2, 50])]
    const enl = rankCountries(list, {metric: 'agents', faction: 'enlightened'})
    assert.deepEqual(enl.rows, [
        {code: 'JP', enlightened: 3, resistance: 0, value: 3},
        {code: 'BR', enlightened: 1, resistance: 0, value: 1},
    ])
    const res = rankCountries(list, {metric: 'ap', faction: 'resistance'})
    assert.deepEqual(codes(res), ['BR', 'US'])
    assert.equal(res.rows[0].resistance, 900)
    assert.equal(res.rows[0].enlightened, 0)
})

test('rankCountries: acima do limite, o resto vira "Outros" com contagem de países e soma por facção', () => {
    const list = [
        country('A1', [9, 0]),
        country('A2', [8, 0]),
        country('A3', [7, 0], [1, 0]),
        country('A4', [1, 0], [2, 0]),
        country('A5', [0, 0], [1, 0]),
    ]
    const ranking = rankCountries(list, {metric: 'agents', faction: 'all', limit: 2})
    assert.deepEqual(codes(ranking), ['A1', 'A2'])
    assert.deepEqual(ranking.others, {countryCount: 3, enlightened: 8, resistance: 4, value: 12})
})

test('rankCountries: até o limite não há "Outros" (others é null)', () => {
    const list = [country('BR', [1, 0]), country('JP', [1, 0])]
    assert.equal(rankCountries(list, {metric: 'agents', faction: 'all', limit: 2}).others, null)
})

test('rankCountries: limite padrão é 10', () => {
    const list = Array.from({length: 13}, (_, i) => country(`C${String(i).padStart(2, '0')}`, [13 - i, 0]))
    const ranking = rankCountries(list, {metric: 'agents', faction: 'all'})
    assert.equal(ranking.rows.length, 10)
    assert.equal(ranking.others.countryCount, 3)
})

test('rankCountries: max é o maior valor entre as linhas e "Outros" (escala das barras)', () => {
    const list = [country('A', [5, 0]), country('B', [4, 0]), country('C', [4, 0]), country('D', [4, 0])]
    const ranking = rankCountries(list, {metric: 'agents', faction: 'all', limit: 1})
    assert.equal(ranking.others.value, 12)
    assert.equal(ranking.max, 12)
})

test('rankCountries: lista vazia -> sem linhas, sem "Outros", max 0', () => {
    assert.deepEqual(rankCountries([], {metric: 'agents', faction: 'all'}), {rows: [], others: null, max: 0})
})

test('rankCountries não muta a lista recebida', () => {
    const list = [country('BR', [1, 0]), country('JP', [2, 0])]
    rankCountries(list, {metric: 'agents', faction: 'all'})
    assert.deepEqual(list.map((c) => c.code), ['BR', 'JP'])
})
