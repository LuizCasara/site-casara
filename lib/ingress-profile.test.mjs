import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildProfile, mergeGdprDump, SCHEMA_VERSION} from './ingress-profile.mjs';

const PARSED = {
    agent: {codename: 'FencherLC', faction: 'enlightened', level: 13, recursions: 2, monthsSubscribed: 5},
    capturedAt: '2026-09-07T16:21:02',
    stats: {lifetimeAp: 94990303, portalsCaptured: 20330, hacks: 55542},
};

test('buildProfile produz o Profile completo', () => {
    const p = buildProfile(PARSED);
    assert.equal(p.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(p.agent, {codename: 'FencherLC', faction: 'enlightened', level: 13, recursions: 2, monthsSubscribed: 5});
    assert.equal(p.capturedAt, '2026-09-07T16:21:02');
    assert.deepEqual(p.sources.appExport, {capturedAt: '2026-09-07T16:21:02'});
    assert.equal(p.sources.gdprDump, null);
    assert.equal(p.timeSeries, null);
    assert.equal(p.portals, null);
    assert.deepEqual(p.pending, ['apTimeline', 'portalMap']);
    assert.ok(p.s2.center && typeof p.s2.center.lat === 'number');
    assert.equal(p.stats.lifetimeAp, 94990303);
});

test('buildProfile é idempotente (mesmo export -> objetos idênticos)', () => {
    const a = buildProfile(PARSED);
    const b = buildProfile(PARSED);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('buildProfile ordena as chaves de stats de forma estável', () => {
    const scrambled = {agent: PARSED.agent, capturedAt: PARSED.capturedAt, stats: {hacks: 1, aardvark: 2, lifetimeAp: 3}};
    const p = buildProfile(scrambled);
    assert.deepEqual(Object.keys(p.stats), ['aardvark', 'hacks', 'lifetimeAp']);
});

test('buildProfile preserva timeSeries/portals de um perfil anterior e limpa pending', () => {
    const previous = {
        s2: {center: {lat: -25.4, lng: -49.2}, defaultLevel: 13},
        sources: {gdprDump: {generatedAt: '2026-10-01'}},
        timeSeries: {lifetimeAp: [{t: '2025-01-01', v: 1000}]},
        portals: {visited: [{lat: 1, lng: 2}], submitted: []},
    };
    const p = buildProfile(PARSED, {previous});
    assert.deepEqual(p.timeSeries, previous.timeSeries);
    assert.deepEqual(p.portals, previous.portals);
    assert.deepEqual(p.s2, previous.s2);
    assert.deepEqual(p.sources.gdprDump, {generatedAt: '2026-10-01'});
    assert.deepEqual(p.pending, []); // nada pendente: ambas as seções têm dado
});

test('mergeGdprDump adiciona séries temporais e portais, limpa pending', () => {
    const base = buildProfile(PARSED);
    const merged = mergeGdprDump(base, {
        generatedAt: '2026-10-05',
        timeSeries: {lifetimeAp: [{t: '2024-01-01', v: 500}, {t: '2025-01-01', v: 2000}]},
        portals: {visited: [{lat: -25.4, lng: -49.2, name: 'Portal X'}], submitted: []},
    });
    assert.equal(merged.timeSeries.lifetimeAp.length, 2);
    assert.equal(merged.portals.visited.length, 1);
    assert.deepEqual(merged.sources.gdprDump, {generatedAt: '2026-10-05'});
    assert.deepEqual(merged.pending, []);
    // não regride agent/stats quando o dump não traz capturedAt mais novo
    assert.deepEqual(merged.agent, base.agent);
    assert.equal(merged.stats.lifetimeAp, 94990303);
});

test('mergeGdprDump com fixture parcial (só timeSeries) mantém portalMap pendente', () => {
    const base = buildProfile(PARSED);
    const merged = mergeGdprDump(base, {timeSeries: {lifetimeAp: [{t: '2025-01-01', v: 10}]}});
    assert.deepEqual(merged.pending, ['portalMap']);
    assert.equal(merged.portals, null);
});

test('mergeGdprDump: capturedAt do dump mais antigo NÃO sobrescreve stats novas', () => {
    const base = buildProfile(PARSED);
    const merged = mergeGdprDump(base, {
        capturedAt: '2025-01-01T00:00:00',
        agent: {level: 8},
        stats: {lifetimeAp: 1},
    });
    assert.equal(merged.agent.level, 13);
    assert.equal(merged.stats.lifetimeAp, 94990303);
    assert.equal(merged.capturedAt, '2026-09-07T16:21:02');
});

test('mergeGdprDump: capturedAt do dump mais novo sobrescreve', () => {
    const base = buildProfile(PARSED);
    const merged = mergeGdprDump(base, {
        capturedAt: '2026-12-01T00:00:00',
        stats: {lifetimeAp: 99999999},
    });
    assert.equal(merged.stats.lifetimeAp, 99999999);
    assert.equal(merged.capturedAt, '2026-12-01T00:00:00');
});

test('mergeGdprDump com dumpData vazio é um no-op seguro', () => {
    const base = buildProfile(PARSED);
    const merged = mergeGdprDump(base, {});
    assert.deepEqual(merged.pending, ['apTimeline', 'portalMap']);
    assert.deepEqual(merged.agent, base.agent);
});
