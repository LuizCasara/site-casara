import {test} from 'node:test'
import assert from 'node:assert/strict'
import {RADAR_AXES, computeRadarAxes, compareRadar, scoreAtOnyxMultiple} from './ingress-radar.mjs'
import {computeAxisScores} from './ingress-tier-score.mjs'
import {TIERS} from '../catalog/ingress-tiers.mjs'
import {STAT_COLUMNS} from './ingress-stats.mjs'
import {BADGES} from '../catalog/ingress-badges.mjs'

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

test('RADAR_AXES: todo eixo e toda parte tem labelEn não-vazio (ISTATS-19); a parte com note tem noteEn', () => {
    for (const a of RADAR_AXES) {
        assert.equal(typeof a.labelEn, 'string')
        assert.ok(a.labelEn.length > 0, `eixo ${a.id} sem labelEn`)
        for (const p of a.parts) {
            assert.equal(typeof p.labelEn, 'string')
            assert.ok(p.labelEn.length > 0, `${a.id} -> ${p.key} sem labelEn`)
            if (p.note) {
                assert.equal(typeof p.noteEn, 'string')
                assert.ok(p.noteEn.length > 0, `${a.id} -> ${p.key} tem note mas não noteEn`)
            }
        }
    }
})

test('computeRadarAxes: propaga labelEn/noteEn de RADAR_AXES pros eixos e partes computados', () => {
    const axes = computeRadarAxes({})
    for (const a of axes) {
        const src = RADAR_AXES.find((x) => x.id === a.id)
        assert.equal(a.labelEn, src.labelEn)
        for (const p of a.parts) {
            const srcPart = src.parts.find((x) => x.key === p.key)
            assert.equal(p.labelEn, srcPart.labelEn)
            assert.equal(p.noteEn, srcPart.noteEn ?? null)
        }
    }
})

test('RADAR_AXES: os 5 limiares de cada parte espelham o catálogo de badges (portais neutralizados = Purifier ÷ 8)', () => {
    // O radar roda no navegador e não pode importar o catálogo (fs): ele carrega uma CÓPIA dos limiares.
    // Este teste é o que impede a cópia de divergir do catálogo que o servidor usa pra gravar a nota.
    const purifier = BADGES.find((b) => b.slug === 'purifier')
    for (const a of RADAR_AXES) {
        for (const p of a.parts) {
            const expected = p.badge
                ? TIERS.map((t) => BADGES.find((b) => b.slug === p.badge).tiers[t])
                : TIERS.map((t) => purifier.tiers[t] / 8)
            assert.deepEqual(p.tiers, expected, `${p.key}: limiares divergem do catálogo`)
            assert.equal(p.ref, expected[4], `${p.key}: ref != Onyx`)
        }
    }
})

test('radar (navegador) e tier-score (servidor) dão a MESMA nota de eixo pra qualquer stats', () => {
    // Amostra determinística (LCG) cobrindo abaixo de Bronze, entre tiers, Onyx e centenas de × Onyx.
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    for (let n = 0; n < 200; n += 1) {
        const stats = {}
        for (const a of RADAR_AXES) {
            for (const p of a.parts) stats[p.key] = Math.floor(p.ref * 10 ** (rnd() * 4.5 - 2.5))
        }
        const radar = computeRadarAxes(stats)
        const server = computeAxisScores(stats)
        radar.forEach((axis, i) => {
            assert.equal(axis.id, server[i].id)
            assert.ok(Math.abs(axis.position - server[i].score) < 1e-9, `${axis.id}: ${axis.position} != ${server[i].score}`)
            assert.ok(Math.abs(axis.score - server[i].score * 20) < 1e-9)
        })
    }
})

test('computeRadarAxes: valor no Onyx de cada parte -> nota do eixo 100, posição 5', () => {
    const axis = RADAR_AXES[0]
    const stats = Object.fromEntries(axis.parts.map((p) => [p.key, p.ref]))
    const out = computeRadarAxes(stats).find((a) => a.id === axis.id)
    assert.equal(out.position, 5)
    assert.equal(out.score, 100)
})

test('computeRadarAxes: média das posições, não soma', () => {
    // construção: resonatorsDeployed no Onyx (posição 5), modsDeployed em 0 -> média 2,5 -> nota 50
    const out = computeRadarAxes({resonatorsDeployed: 200000}).find((a) => a.id === 'construcao')
    assert.equal(out.position, 2.5)
    assert.equal(out.score, 50)
})

test('computeRadarAxes: nenhuma parte é travada — 5× Onyx em MU vale 5 + log₂5, e a razão bruta fica visível', () => {
    // links criados no Onyx (posição 5), campos em 0, MU em 5× Onyx (posição 5 + log₂ 5 ≈ 7,32)
    const out = computeRadarAxes({
        linksCreated: 100000,
        mindUnitsCaptured: 4000000 * 5,
    }).find((a) => a.id === 'linksCampos')
    const mu = out.parts.find((p) => p.key === 'mindUnitsCaptured')
    assert.equal(mu.ratio, 5)
    assert.ok(Math.abs(mu.position - (5 + Math.log2(5))) < 1e-12)
    assert.ok(Math.abs(out.position - (5 + 0 + 5 + Math.log2(5)) / 3) < 1e-12)
})

test('computeRadarAxes: uma parte absurda (265× Onyx) sobe ~8 posições e o eixo ~2,7 — não ~264 e ~88', () => {
    const base = computeRadarAxes({linksCreated: 100000, controlFieldsCreated: 40000, mindUnitsCaptured: 4000000})
    const huge = computeRadarAxes({linksCreated: 100000, controlFieldsCreated: 40000, mindUnitsCaptured: 4000000 * 265})
    const dPos = huge.find((a) => a.id === 'linksCampos').position - base.find((a) => a.id === 'linksCampos').position
    assert.ok(Math.abs(dPos - Math.log2(265) / 3) < 1e-9)
})

test('computeRadarAxes: tudo zero -> posição, nota e razão 0, sem NaN', () => {
    for (const a of computeRadarAxes({})) {
        assert.equal(a.position, 0)
        assert.equal(a.score, 0)
        for (const p of a.parts) {
            assert.equal(p.ratio, 0)
            assert.ok(Number.isFinite(p.score))
        }
    }
})

test('computeRadarAxes: statKey ausente conta 0 e não afeta os outros eixos', () => {
    const axes = computeRadarAxes({glyphHackPoints: 25000})
    const hacking = axes.find((a) => a.id === 'hacking')
    // glyph 25000 está entre Platinum (20000) e Onyx (50000): posição 4 + (5000/30000); hacks em 0 -> média
    assert.ok(Math.abs(hacking.position - (4 + 5000 / 30000) / 2) < 1e-12)
    for (const a of axes) assert.ok(Number.isFinite(a.score))
})

test('scoreAtOnyxMultiple: Onyx = 100 e cada dobra soma 20 pontos', () => {
    assert.equal(scoreAtOnyxMultiple(1), 100)
    assert.equal(scoreAtOnyxMultiple(2), 120)
    assert.equal(scoreAtOnyxMultiple(4), 140)
    assert.equal(scoreAtOnyxMultiple(16), 180)
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
    const by = Object.fromEntries(axes.map((a) => [a.id, a.score]))
    assert.ok(by.exploracao > by.construcao)
    assert.ok(by.hacking > by.linksCampos)
    assert.ok(new Set(axes.map((a) => a.score.toFixed(0))).size > 1)
})

test('compareRadar: aponta o líder de cada eixo e casa os rótulos', () => {
    const mine = {hacks: 200000, glyphHackPoints: 50000} // hacking: Onyx nas duas partes, nota 100
    const theirs = {hacks: 0, glyphHackPoints: 0} // hacking: nota 0
    const rows = compareRadar(mine, theirs)
    assert.equal(rows.length, RADAR_AXES.length)
    const hacking = rows.find((r) => r.id === 'hacking')
    assert.equal(hacking.leader, 'mine')
    assert.ok(hacking.mine > hacking.theirs)
    const construcao = rows.find((r) => r.id === 'construcao')
    assert.equal(construcao.leader, 'tie') // 0 x 0
})
