import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeCodenameKey, isFencherLcCodename, compareRankingRows} from './ingress-rankings.mjs'

test('normalizeCodenameKey: trim + lower-case, casing e espaços variados', () => {
    assert.equal(normalizeCodenameKey('FencherLC'), 'fencherlc')
    assert.equal(normalizeCodenameKey('  FencherLC  '), 'fencherlc')
    assert.equal(normalizeCodenameKey('AgEnT-42'), 'agent-42')
})

test('normalizeCodenameKey: entrada vazia/ausente -> string vazia', () => {
    assert.equal(normalizeCodenameKey(''), '')
    assert.equal(normalizeCodenameKey('   '), '')
    assert.equal(normalizeCodenameKey(undefined), '')
})

test('isFencherLcCodename: reconhece o FencherLC independente de espaço/caixa', () => {
    assert.equal(isFencherLcCodename(normalizeCodenameKey('FencherLC'), 'FencherLC'), true)
    assert.equal(isFencherLcCodename(normalizeCodenameKey('  fencherlc  '), 'FencherLC'), true)
    assert.equal(isFencherLcCodename(normalizeCodenameKey('FENCHERLC'), 'FencherLC'), true)
})

test('isFencherLcCodename: qualquer outro codinome não casa', () => {
    assert.equal(isFencherLcCodename(normalizeCodenameKey('outroagente'), 'FencherLC'), false)
    assert.equal(isFencherLcCodename(normalizeCodenameKey('fencherlc2'), 'FencherLC'), false)
})

test('compareRankingRows: ordena por nota geral desc -> AP total desc -> created_at asc', () => {
    // d: nota mais alta -> 1º. c/a/b: mesma nota (90) -> desempate por AP (c > a==b) ->
    // a e b empatam em nota E AP -> desempate por data (a é mais antigo que b).
    const d = {codename_key: 'd', overall_score: 95, lifetime_ap: 500, created_at: '2026-01-01T00:00:00Z'}
    const c = {codename_key: 'c', overall_score: 90, lifetime_ap: 2000, created_at: '2026-03-01T00:00:00Z'}
    const a = {codename_key: 'a', overall_score: 90, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const b = {codename_key: 'b', overall_score: 90, lifetime_ap: 1000, created_at: '2026-02-01T00:00:00Z'}

    const sorted = [b, a, d, c].sort(compareRankingRows).map((r) => r.codename_key)
    assert.deepEqual(sorted, ['d', 'c', 'a', 'b'])
})

test('compareRankingRows: nota igual -> desempata por AP total', () => {
    const higherAp = {overall_score: 80, lifetime_ap: 2000, created_at: '2026-01-01T00:00:00Z'}
    const lowerAp = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    assert.ok(compareRankingRows(higherAp, lowerAp) < 0)
    assert.ok(compareRankingRows(lowerAp, higherAp) > 0)
})

test('compareRankingRows: nota e AP iguais -> desempata por created_at (mais antigo primeiro)', () => {
    const older = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const newer = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-06-01T00:00:00Z'}
    assert.ok(compareRankingRows(older, newer) < 0)
    assert.ok(compareRankingRows(newer, older) > 0)
})

test('compareRankingRows: empate total -> 0 (nenhuma preferência de ordem)', () => {
    const x = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const y = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    assert.equal(compareRankingRows(x, y), 0)
})

test('compareRankingRows: valores numéricos vindos como string (driver do Postgres) ainda comparam certo', () => {
    const moreAp = {overall_score: '80.00', lifetime_ap: '2000', created_at: '2026-01-01T00:00:00Z'}
    const lessAp = {overall_score: '80.00', lifetime_ap: '1000', created_at: '2026-01-01T00:00:00Z'}
    assert.ok(compareRankingRows(moreAp, lessAp) < 0)
})
