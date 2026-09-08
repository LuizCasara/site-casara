import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadCatalog, catalogEntry, coreBadges, slugForStatKey, artPath} from './ingress-catalog.mjs'
import {STAT_COLUMNS} from './ingress-stats.mjs'

const STAT_KEYS = new Set(STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key))

test('loadCatalog traz as 29 badges core, cada uma com statKey válido e 5 tiers crescentes', () => {
    const core = coreBadges()
    assert.equal(core.length, 29)
    for (const b of core) {
        assert.equal(b.group, 'core')
        assert.ok(STAT_KEYS.has(b.statKey), `${b.slug} -> ${b.statKey}`)
        assert.equal(b.tiers.length, 5)
        for (let i = 1; i < 5; i++) assert.ok(b.tiers[i] > b.tiers[i - 1])
        assert.equal(typeof b.name, 'string')
    }
})

test('coreBadges preserva a ordem do arquivo', () => {
    const slugs = coreBadges().map((b) => b.slug)
    assert.equal(slugs[0], 'builder')
    assert.deepEqual(slugs.slice(0, 3), ['builder', 'connector', 'mind-controller'])
})

test('catalogEntry devolve a entrada com o slug embutido, ou null', () => {
    const e = catalogEntry('trekker')
    assert.equal(e.slug, 'trekker')
    assert.deepEqual(e.tiers, [10, 100, 300, 1000, 2500])
    assert.equal(catalogEntry('xpto-nao-existe'), null)
})

test('slugForStatKey é a inversa de catalogEntry(...).statKey para as core', () => {
    for (const b of coreBadges()) {
        assert.equal(slugForStatKey(b.statKey), b.slug)
    }
    assert.equal(slugForStatKey('chaveInexistente'), null)
})

test('coreBadges filtra por group: catálogo misto só devolve os core', () => {
    const mixed = {
        builder: {group: 'core', statKey: 'resonatorsDeployed', tiers: [1, 2, 3, 4, 5]},
        recursion: {group: 'anomaly', ipArt: ['x.png']},
        'darsana-prime': {group: 'anomaly', ipArt: ['y.png']},
    }
    assert.deepEqual(
        coreBadges(mixed).map((b) => b.slug),
        ['builder'],
    )
    assert.equal(slugForStatKey('resonatorsDeployed', mixed), 'builder')
})

test('artPath monta o caminho por slug e tier', () => {
    assert.equal(artPath('trekker', 'onyx'), '/ingress/medals/trekker-onyx.png')
    assert.equal(artPath('recursion', null), '/ingress/medals/recursion.png')
    assert.equal(artPath('recursion', 'single'), '/ingress/medals/recursion.png')
    assert.equal(artPath('builder', 'none'), '/ingress/medals/builder.png')
})

test('loadCatalog usa cache (mesma referência entre chamadas)', () => {
    assert.equal(loadCatalog(), loadCatalog())
})
