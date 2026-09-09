import {test} from 'node:test'
import assert from 'node:assert/strict'
import {compareMessages, compareHash, RADAR_STAT_KEYS} from './ingress-compare-message.mjs'

const A = {
    codename: 'FencherLC',
    stats: {
        resonatorsDeployed: 105886,
        modsDeployed: 16244,
        resonatorsDestroyed: 80783,
        portalsNeutralized: 12550,
        uniquePortalsVisited: 3486,
        distanceWalkedKm: 3977,
        uniqueMissionsCompleted: 869,
        hacks: 55542,
        glyphHackPoints: 80953,
        linksCreated: 22521,
        controlFieldsCreated: 11981,
        mindUnitsCaptured: 19150217,
    },
}
const B = {codename: 'zezextreme12cr', stats: {hacks: 1043, distanceWalkedKm: 607}}

test('RADAR_STAT_KEYS: chaves do radar, sem repetição', () => {
    assert.ok(RADAR_STAT_KEYS.includes('distanceWalkedKm'))
    assert.ok(RADAR_STAT_KEYS.includes('mindUnitsCaptured'))
    assert.equal(new Set(RADAR_STAT_KEYS).size, RADAR_STAT_KEYS.length)
})

test('compareMessages: caption tem os dois codinomes, a tabela de eixos e o placar', () => {
    const {caption, table} = compareMessages({a: A, b: B, vsOwner: true, when: '2026-09-09T14:32:00-03:00'})
    assert.match(caption, /FencherLC/)
    assert.match(caption, /zezextreme12cr/)
    assert.match(caption, /Padrão de jogo/)
    assert.match(caption, /Exploração\s+\d+%\s+\d+%/)
    assert.match(caption, /Placar por eixo/)
    assert.match(caption, /09\/09\/2026 14:32/)
    // A (perfil completo) ganha todos os eixos de B (quase zerado)
    assert.match(caption, /FencherLC 5 × 0/)

    assert.match(table, /Valores/)
    assert.match(table, /Mind Units capturadas/)
    assert.match(table, /Distância a pé \(km\)/)
})

test('compareMessages: vsOwner muda o texto', () => {
    assert.match(compareMessages({a: A, b: B, vsOwner: true}).caption, /comparado com o seu perfil/)
    assert.match(compareMessages({a: A, b: B, vsOwner: false}).caption, /comparação entre dois agentes/)
})

test('compareMessages: mesmo codinome dos dois lados -> mensagem de evolução', () => {
    const antes = {codename: 'FencherLC', capturedAt: '2026-02-01T10:00:00', stats: {...A.stats, hacks: 40000, distanceWalkedKm: 3000}}
    const agora = {codename: 'FencherLC', capturedAt: '2026-09-07T16:21:02', stats: A.stats}
    const {caption, table} = compareMessages({a: agora, b: antes, vsOwner: true})
    assert.match(caption, /Sua evolução — FencherLC/)
    assert.match(caption, /01\/02\/2026 → 07\/09\/2026/)
    assert.match(caption, /meses depois/)
    assert.match(caption, /antes\s+agora\s+Δ/)
    assert.match(caption, /Cresceu em \*\d de 5\* eixos/)
    assert.match(table, /antes -> agora/)
    assert.match(table, /-> 55\.542\s+\(\+15\.542\)/) // hacks 40000 -> 55542
})

test('compareHash: estável para a mesma entrada, muda quando uma stat muda', () => {
    const h1 = compareHash({a: A, b: B})
    const h2 = compareHash({a: A, b: B})
    assert.equal(h1, h2)
    const h3 = compareHash({a: A, b: {...B, stats: {...B.stats, hacks: 1044}}})
    assert.notEqual(h1, h3)
    // troca a ordem A/B -> hash diferente (são comparações diferentes)
    assert.notEqual(compareHash({a: B, b: A}), h1)
})
