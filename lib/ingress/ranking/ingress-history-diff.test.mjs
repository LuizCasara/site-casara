import {test} from 'node:test'
import assert from 'node:assert/strict'
import {diffSnapshots, pickHistoryStats, snapshotStats} from './ingress-history-diff.mjs'
import {RADAR_STAT_KEYS} from './ingress-compare-message.mjs'
import {BADGES} from '../catalog/ingress-badges.mjs'

const badge = (slug) => BADGES.find((b) => b.slug === slug)
const purifier = badge('purifier') // statKey resonatorsDestroyed
const hacker = badge('hacker') // statKey hacks

test('snapshotStats: junta stat_values e extra_stats numa mão só; o radar vence em caso de colisão', () => {
    const merged = snapshotStats({stat_values: {hacks: 10, linksCreated: 5}, extra_stats: {hacks: 999, level: 14}})
    assert.deepEqual(merged, {hacks: 10, linksCreated: 5, level: 14})
})

test('snapshotStats: snapshot antigo (sem stat_values nem extra_stats) -> null, não objeto vazio', () => {
    assert.equal(snapshotStats({stat_values: null, extra_stats: null}), null)
    assert.equal(snapshotStats({}), null)
})

test('diffSnapshots: sem snapshot anterior não há o que comparar -> null', () => {
    assert.equal(diffSnapshots(null, {hacks: 10}), null)
    assert.equal(diffSnapshots({hacks: 10}, null), null)
})

test('diffSnapshots: devolve rótulo pt/en, valores e delta do que mudou', () => {
    const {changes} = diffSnapshots({xmCollected: 1000}, {xmCollected: 1510})
    assert.equal(changes.length, 1)
    assert.equal(changes[0].key, 'xmCollected')
    assert.equal(changes[0].label, 'XM coletado')
    assert.equal(changes[0].labelEn, 'XM collected')
    assert.equal(changes[0].from, 1000)
    assert.equal(changes[0].to, 1510)
    assert.equal(changes[0].delta, 510)
})

test('diffSnapshots: stat igual nos dois lados não vira mudança, só entra na contagem de "sem mudança"', () => {
    const result = diffSnapshots({hacks: 50, enemyLinksDestroyed: 7}, {hacks: 60, enemyLinksDestroyed: 7})
    assert.deepEqual(
        result.changes.map((c) => c.key),
        ['hacks']
    )
    assert.equal(result.unchanged, 1)
})

test('diffSnapshots: chave que só existe de um lado (stat novo no export) é ignorada, nunca vira 0 -> N', () => {
    const result = diffSnapshots({hacks: 50}, {hacks: 50, enemyLinksDestroyed: 900})
    assert.equal(result.changes.length, 0)
    assert.equal(result.unchanged, 1)
})

test('diffSnapshots: lifetimeAp e chaves desconhecidas ficam de fora (o AP já tem o gráfico)', () => {
    const result = diffSnapshots({lifetimeAp: 1, ninguemConhece: 1}, {lifetimeAp: 2, ninguemConhece: 2})
    assert.deepEqual(result, {changes: [], unchanged: 0})
})

test('diffSnapshots: sair de abaixo do Bronze para o Bronze é "nova medalha"', () => {
    const {changes} = diffSnapshots({resonatorsDestroyed: 0}, {resonatorsDestroyed: purifier.tiers.bronze})
    assert.equal(changes[0].kind, 'new-medal')
    assert.equal(changes[0].tierFrom, 'none')
    assert.equal(changes[0].tierTo, 'bronze')
    assert.equal(changes[0].badgeSlug, 'purifier')
})

test('diffSnapshots: Bronze -> Prata é "subida de tier"', () => {
    const {changes} = diffSnapshots(
        {resonatorsDestroyed: purifier.tiers.bronze},
        {resonatorsDestroyed: purifier.tiers.silver}
    )
    assert.equal(changes[0].kind, 'tier-up')
    assert.equal(changes[0].tierFrom, 'bronze')
    assert.equal(changes[0].tierTo, 'silver')
})

test('diffSnapshots: dobrar o Onyx (×2 -> ×3) também conta como subida, e devolve o novo múltiplo', () => {
    const onyx = purifier.tiers.onyx
    const {changes} = diffSnapshots({resonatorsDestroyed: onyx * 2}, {resonatorsDestroyed: onyx * 3})
    assert.equal(changes[0].kind, 'tier-up')
    assert.equal(changes[0].tierTo, 'onyx')
    assert.equal(changes[0].onyxMultiple, 3)
})

test('diffSnapshots: mudança dentro do mesmo tier não é destaque', () => {
    const {changes} = diffSnapshots(
        {resonatorsDestroyed: purifier.tiers.silver},
        {resonatorsDestroyed: purifier.tiers.silver + 5}
    )
    assert.equal(changes[0].kind, null)
})

test('diffSnapshots: stat sem medalha no catálogo não tem badge nem tier', () => {
    const {changes} = diffSnapshots({xmCollected: 1}, {xmCollected: 2})
    assert.equal(changes[0].badgeSlug, null)
    assert.equal(changes[0].tierTo, null)
    assert.equal(changes[0].kind, null)
})

test('diffSnapshots: ordem — nova medalha, depois subida de tier, depois o resto por delta decrescente', () => {
    const prev = {
        xmCollected: 0, // sem medalha, delta grande
        enemyLinksDestroyed: 100, // sem mudança de tier, delta pequeno
        resonatorsDestroyed: purifier.tiers.bronze, // vai subir de tier
        hacks: 0, // vai ganhar a primeira medalha
    }
    const next = {
        xmCollected: 5000,
        enemyLinksDestroyed: 110,
        resonatorsDestroyed: purifier.tiers.silver,
        hacks: hacker.tiers.bronze,
    }
    const {changes} = diffSnapshots(prev, next)
    assert.deepEqual(
        changes.map((c) => c.key),
        ['hacks', 'resonatorsDestroyed', 'xmCollected', 'enemyLinksDestroyed']
    )
})

test('diffSnapshots: queda também aparece (ex.: AP da recursão zera) com delta negativo, sem destaque', () => {
    const {changes} = diffSnapshots({currentAp: 900000}, {currentAp: 12})
    assert.equal(changes[0].delta, 900000 * -1 + 12)
    assert.equal(changes[0].kind, null)
})

test('pickHistoryStats: guarda só chaves conhecidas e numéricas — payload solto do cliente não vai inteiro pro histórico', () => {
    const picked = pickHistoryStats({hacks: 10, level: 14, lixo: 'x'.repeat(5000), aninhado: {a: 1}, xmRecharged: '5', currentAp: NaN})
    assert.deepEqual(picked, {hacks: 10, level: 14})
})

test('pickHistoryStats: entrada que não é objeto plano, ou sem nenhuma chave conhecida, vira null', () => {
    assert.equal(pickHistoryStats(null), null)
    assert.equal(pickHistoryStats([1, 2]), null)
    assert.equal(pickHistoryStats('texto'), null)
    assert.equal(pickHistoryStats({ninguemConhece: 1}), null)
})

test('pickHistoryStats: os 12 stats do radar sobrevivem ao filtro (senão o diff perderia o essencial)', () => {
    const radar = Object.fromEntries(RADAR_STAT_KEYS.filter((k) => k !== 'lifetimeAp').map((k) => [k, 1]))
    assert.deepEqual(Object.keys(pickHistoryStats(radar)).sort(), Object.keys(radar).sort())
})
