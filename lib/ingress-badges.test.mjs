import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BADGES, computeBadge, computeAllBadges, tierCounts, nextMedal} from './ingress-badges.mjs'
import {STAT_COLUMNS} from './ingress-stats.mjs'

const STAT_KEYS = new Set(STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key))
const byKey = (k) => BADGES.find((b) => b.key === k)
const FENCHERLC = JSON.parse(readFileSync('data/ingress/fencherlc.json', 'utf8')).stats

test('as 29 badges vêm do catálogo, com statKey real e 5 tiers crescentes', () => {
    assert.equal(BADGES.length, 29)
    for (const b of BADGES) {
        assert.equal(b.key, b.slug)
        assert.ok(STAT_KEYS.has(b.statKey), `${b.key} -> statKey inexistente ${b.statKey}`)
        const t = [b.tiers.bronze, b.tiers.silver, b.tiers.gold, b.tiers.platinum, b.tiers.onyx]
        for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], `${b.key}: tiers não crescentes`)
    }
})

test('computeBadge: valor 0 -> tier none, next aponta pro bronze, pct 0', () => {
    const r = computeBadge(byKey('liberator'), 0)
    assert.equal(r.tier, 'none')
    assert.equal(r.atMax, false)
    assert.deepEqual(r.next, {tier: 'bronze', remaining: 100})
    assert.equal(r.pct, 0)
})

test('computeBadge: valor exatamente no limiar conta para aquele tier', () => {
    assert.equal(computeBadge(byKey('liberator'), 5000).tier, 'gold') // Gold = 5000
    assert.equal(computeBadge(byKey('liberator'), 4999).tier, 'silver')
})

test('computeBadge: um a menos que o próximo tier fica no anterior', () => {
    const r = computeBadge(byKey('connector'), 24999) // Platinum = 25000
    assert.equal(r.tier, 'gold')
    assert.deepEqual(r.next, {tier: 'platinum', remaining: 1})
    assert.ok(r.pct > 0.99 && r.pct < 1)
})

test('computeBadge: acima de Onyx -> atMax, next e pct null', () => {
    const r = computeBadge(byKey('trekker'), 99999)
    assert.equal(r.tier, 'onyx')
    assert.equal(r.atMax, true)
    assert.equal(r.next, null)
    assert.equal(r.pct, null)
})

test('computeBadge: valor no limiar exato de Onyx -> atMax', () => {
    assert.equal(computeBadge(byKey('sojourner'), 360).tier, 'onyx')
    assert.equal(computeBadge(byKey('sojourner'), 360).atMax, true)
})

test('computeAllBadges devolve as 26, badge sem a stat vira tier none (não some)', () => {
    const badges = computeAllBadges({portalsCaptured: 20330})
    assert.equal(badges.length, 29)
    assert.equal(badges.find((b) => b.key === 'liberator').tier, 'platinum')
    assert.equal(badges.find((b) => b.key === 'builder').tier, 'none')
})

test('computeAllBadges com stats vazio/nulo -> 26 badges, todas none', () => {
    for (const stats of [{}, null, undefined]) {
        const badges = computeAllBadges(stats)
        assert.equal(badges.length, 29)
        assert.ok(badges.every((b) => b.tier === 'none'))
    }
})

test('tiers do FencherLC conferem com os números reais do snapshot', () => {
    const got = Object.fromEntries(computeAllBadges(FENCHERLC).map((b) => [b.key, b.tier]))
    assert.deepEqual(got, {
        builder: 'platinum', connector: 'gold', 'mind-controller': 'platinum',
        illuminator: 'onyx', liberator: 'platinum', pioneer: 'gold', explorer: 'gold',
        trekker: 'onyx', purifier: 'gold', hacker: 'gold', sojourner: 'onyx',
        recharger: 'onyx', engineer: 'gold', specops: 'onyx', translator: 'onyx',
        recon: 'platinum', scout: 'none', 'scout-controller': 'none', seer: 'gold',
        recruiter: 'bronze', guardian: 'onyx', 'first-saturday': 'platinum',
        'second-sunday': 'bronze', 'mission-day': 'silver', 'nl-1331-meetups': 'bronze',
        'operation-clear-field': 'bronze', maverick: 'silver', reclaimer: 'bronze',
        epoch: 'platinum',
    })
})

test('tierCounts conta por tier', () => {
    assert.deepEqual(tierCounts(computeAllBadges(FENCHERLC)), {
        onyx: 7, platinum: 6, gold: 7, silver: 2, bronze: 5, none: 2,
    })
})

test('nextMedal: maior pct até o próximo tier, desempate por ordem do catálogo', () => {
    // dois badges com o mesmo pct -> vence o de índice menor em BADGES
    const badges = [
        {key: 'connector', atMax: false, pct: 0.5},
        {key: 'builder', atMax: false, pct: 0.5},
        {key: 'trekker', atMax: true, pct: null},
    ]
    assert.equal(nextMedal(badges).key, 'builder') // builder vem antes de connector
    // pct maior vence o desempate
    assert.equal(nextMedal([...badges, {key: 'hacker', atMax: false, pct: 0.9}]).key, 'hacker')
})

test('nextMedal: todas em Onyx -> null', () => {
    assert.equal(nextMedal(BADGES.map((b) => ({key: b.key, atMax: true, pct: null}))), null)
})
