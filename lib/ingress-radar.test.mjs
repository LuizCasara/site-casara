import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RADAR_AXES, computeRadarAxes} from './ingress-radar.mjs';
import {STAT_COLUMNS} from './ingress-stats.mjs';

const STAT_KEYS = new Set(STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key));

test('RADAR_AXES: >=5 eixos, statKeys reais, reference positiva', () => {
    assert.ok(RADAR_AXES.length >= 5);
    for (const a of RADAR_AXES) {
        assert.ok(a.statKeys.length >= 1);
        for (const k of a.statKeys) assert.ok(STAT_KEYS.has(k), `${a.id} -> ${k}`);
        assert.ok(a.reference > 0);
    }
});

test('computeRadarAxes satura em 1 para valores muito altos', () => {
    const huge = Object.fromEntries([...STAT_KEYS].map((k) => [k, 1e9]));
    for (const axis of computeRadarAxes(huge)) assert.equal(axis.value, 1);
});

test('computeRadarAxes: tudo zero -> value 0', () => {
    for (const axis of computeRadarAxes({})) {
        assert.equal(axis.value, 0);
        assert.equal(axis.raw, 0);
    }
});

test('computeRadarAxes: statKey ausente conta 0 e não afeta os outros eixos', () => {
    // só uma das duas chaves de "hacking"
    const axes = computeRadarAxes({glyphHackPoints: 75000});
    const hacking = axes.find((a) => a.id === 'hacking');
    assert.equal(hacking.raw, 75000);
    assert.equal(hacking.value, 0.5); // 75000 / 150000
    // os outros eixos seguem em 0, não NaN
    for (const a of axes) assert.ok(Number.isFinite(a.value));
});

test('computeRadarAxes soma múltiplas stats no mesmo eixo', () => {
    const axes = computeRadarAxes({resonatorsDeployed: 100000, modsDeployed: 50000});
    const construcao = axes.find((a) => a.id === 'construcao');
    assert.equal(construcao.raw, 150000);
    assert.equal(construcao.value, 1);
});

test('perfil real do FencherLC: valores variados entre 0 e 1', () => {
    const stats = {
        resonatorsDeployed: 105886, modsDeployed: 16244, resonatorsDestroyed: 80783,
        enemyLinksDestroyed: 16340, enemyFieldsDestroyed: 9788, uniquePortalsVisited: 3486,
        distanceWalkedKm: 3977, uniqueMissionsCompleted: 869, hacks: 55542,
        glyphHackPoints: 80953, linksCreated: 22521, controlFieldsCreated: 11981,
    };
    const axes = computeRadarAxes(stats);
    for (const a of axes) {
        assert.ok(a.value > 0 && a.value < 1, `${a.id}=${a.value} deveria estar em (0,1)`);
    }
    const values = axes.map((a) => a.value);
    assert.ok(new Set(values.map((v) => v.toFixed(2))).size > 1, 'os eixos não podem ser todos iguais');
});
