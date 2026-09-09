import {test} from 'node:test'
import assert from 'node:assert/strict'
import {RADAR_AXES, RADAR_DRAW_MAX, computeRadarAxes} from './ingress-radar.mjs'
import {STAT_COLUMNS} from './ingress-stats.mjs'
import {BADGES} from './ingress-badges.mjs'

const STAT_KEYS = new Set(STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key))
const ONYX = Object.fromEntries(BADGES.map((b) => [b.slug, b.tiers.onyx]))

test('RADAR_AXES: >=5 eixos, cada parte com statKey real e ref positiva', () => {
    assert.ok(RADAR_AXES.length >= 5)
    for (const a of RADAR_AXES) {
        assert.ok(a.parts.length >= 1)
        for (const p of a.parts) {
            assert.ok(STAT_KEYS.has(p.key), `${a.id} -> ${p.key}`)
            assert.ok(p.ref > 0)
        }
    }
})

test('RADAR_AXES: parte com `badge` usa o limiar de Onyx daquela medalha', () => {
    for (const a of RADAR_AXES) {
        for (const p of a.parts) {
            if (!p.badge) continue
            assert.equal(p.ref, ONYX[p.badge], `${p.key}: ref ${p.ref} != Onyx de ${p.badge} (${ONYX[p.badge]})`)
        }
    }
})

test('computeRadarAxes: valor no Onyx de cada parte -> onyxRatio 1, raio 1/DRAW_MAX', () => {
    const axis = RADAR_AXES[0]
    const stats = Object.fromEntries(axis.parts.map((p) => [p.key, p.ref]))
    const out = computeRadarAxes(stats).find((a) => a.id === axis.id)
    assert.equal(out.onyxRatio, 1)
    assert.ok(Math.abs(out.value - 1 / RADAR_DRAW_MAX) < 1e-9)
})

test('computeRadarAxes: média das razões, não soma', () => {
    // construção: resonatorsDeployed no Onyx (razão 1), modsDeployed em 0 -> média 0,5
    const out = computeRadarAxes({resonatorsDeployed: 200000}).find((a) => a.id === 'construcao')
    assert.equal(out.onyxRatio, 0.5)
})

test('computeRadarAxes: satura o RAIO em 1 acima de DRAW_MAX, mas onyxRatio segue real', () => {
    const huge = Object.fromEntries([...STAT_KEYS].map((k) => [k, 1e12]))
    for (const a of computeRadarAxes(huge)) {
        assert.equal(a.value, 1)
        assert.ok(a.onyxRatio > RADAR_DRAW_MAX)
    }
})

test('computeRadarAxes: tudo zero -> onyxRatio e value 0, sem NaN', () => {
    for (const a of computeRadarAxes({})) {
        assert.equal(a.value, 0)
        assert.equal(a.onyxRatio, 0)
        assert.ok(Number.isFinite(a.value))
    }
})

test('computeRadarAxes: statKey ausente conta 0 e não afeta os outros eixos', () => {
    const axes = computeRadarAxes({glyphHackPoints: 25000})
    const hacking = axes.find((a) => a.id === 'hacking')
    // glyph em 25000/50000 = 0,5 ; hacks em 0 -> média 0,25
    assert.equal(hacking.onyxRatio, 0.25)
    for (const a of axes) assert.ok(Number.isFinite(a.value))
})

test('perfil real do FencherLC: eixos com formatos diferentes, exploração e hacking na frente', () => {
    const stats = {
        resonatorsDeployed: 105886,
        modsDeployed: 16244,
        resonatorsDestroyed: 80783,
        enemyLinksDestroyed: 16340,
        enemyFieldsDestroyed: 9788,
        uniquePortalsVisited: 3486,
        distanceWalkedKm: 3977,
        uniqueMissionsCompleted: 869,
        hacks: 55542,
        glyphHackPoints: 80953,
        linksCreated: 22521,
        controlFieldsCreated: 11981,
    }
    const axes = computeRadarAxes(stats)
    const by = Object.fromEntries(axes.map((a) => [a.id, a.onyxRatio]))
    assert.ok(by.exploracao > by.construcao)
    assert.ok(by.hacking > by.linksCampos)
    assert.ok(new Set(axes.map((a) => a.value.toFixed(2))).size > 1)
})
