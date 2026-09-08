import {test} from 'node:test'
import assert from 'node:assert/strict'
import {appendSnapshot, ratePerDay, projectNextTier} from './ingress-history.mjs'

const snap = (t, v) => ({t, stats: {portalsCaptured: v}})

test('appendSnapshot adiciona ordenado e não muta o array de entrada', () => {
    const h0 = []
    const h1 = appendSnapshot(h0, snap('2026-09-07T00:00:00', 100))
    const h2 = appendSnapshot(h1, snap('2026-08-01T00:00:00', 50)) // anterior ao primeiro
    assert.equal(h0.length, 0)
    assert.deepEqual(
        h2.map((s) => s.t),
        ['2026-08-01T00:00:00', '2026-09-07T00:00:00'],
    )
})

test('appendSnapshot não duplica quando o t já existe', () => {
    let h = appendSnapshot([], snap('2026-09-07T00:00:00', 100))
    h = appendSnapshot(h, snap('2026-09-07T00:00:00', 999))
    assert.equal(h.length, 1)
    assert.equal(h[0].stats.portalsCaptured, 100)
})

test('ratePerDay: 1 ponto -> null', () => {
    assert.equal(ratePerDay([snap('2026-09-07T00:00:00', 100)], 'portalsCaptured'), null)
    assert.equal(ratePerDay([], 'portalsCaptured'), null)
})

test('ratePerDay: 2 pontos -> unidades por dia', () => {
    const h = [snap('2026-09-01T00:00:00', 1000), snap('2026-09-11T00:00:00', 1100)]
    assert.equal(ratePerDay(h, 'portalsCaptured'), 10) // 100 em 10 dias
})

test('ratePerDay: valor regredindo -> taxa negativa', () => {
    const h = [snap('2026-09-01T00:00:00', 1100), snap('2026-09-11T00:00:00', 1000)]
    assert.equal(ratePerDay(h, 'portalsCaptured'), -10)
})

test('ratePerDay: dois pontos no mesmo instante -> null (não divide por zero)', () => {
    const h = [snap('2026-09-01T00:00:00-03:00', 1000), snap('2026-09-01T03:00:00+00:00', 1100)]
    assert.equal(ratePerDay(h, 'portalsCaptured'), null)
})

test('projectNextTier: 2 pontos + taxa conhecida -> data plausível', () => {
    const def = {statKey: 'portalsCaptured', tiers: {bronze: 100, silver: 1000, gold: 5000, platinum: 15000, onyx: 40000}}
    const h = [snap('2026-09-01T00:00:00', 4900), snap('2026-09-11T00:00:00', 4950)] // 5/dia
    const r = projectNextTier(h, def, 4950) // faltam 50 para gold(5000) -> ~10 dias
    assert.equal(r.tier, 'gold')
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/)
    const days = (Date.parse(r.date) - Date.now()) / 86_400_000
    assert.ok(days > 5 && days < 15, `esperava ~10 dias, deu ${days}`)
})

test('projectNextTier: 1 ponto -> null', () => {
    const def = {statKey: 'portalsCaptured', tiers: {bronze: 100, silver: 1000, gold: 5000, platinum: 15000, onyx: 40000}}
    assert.equal(projectNextTier([snap('2026-09-01T00:00:00', 4900)], def, 4900), null)
})

test('projectNextTier: taxa <= 0 -> {reason: sem-progresso}', () => {
    const def = {statKey: 'portalsCaptured', tiers: {bronze: 100, silver: 1000, gold: 5000, platinum: 15000, onyx: 40000}}
    const h = [snap('2026-09-01T00:00:00', 4950), snap('2026-09-11T00:00:00', 4950)]
    assert.deepEqual(projectNextTier(h, def, 4950), {reason: 'sem-progresso'})
})

test('projectNextTier: já no tier máximo -> null', () => {
    const def = {statKey: 'portalsCaptured', tiers: {bronze: 100, silver: 1000, gold: 5000, platinum: 15000, onyx: 40000}}
    const h = [snap('2026-09-01T00:00:00', 50000), snap('2026-09-11T00:00:00', 50100)]
    assert.equal(projectNextTier(h, def, 50100), null)
})
