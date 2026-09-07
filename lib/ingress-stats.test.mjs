import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAT_COLUMNS, STAT_GROUPS, parseAppExport} from './ingress-stats.mjs';

// Export real do FencherLC copiado em 2026-09-07 16:21:02 — ver
// docs/ingress-perfil-fencherlc.md.
const HEADER =
    'Time Span\tAgent Name\tAgent Faction\tDate (yyyy-mm-dd)\tTime (hh:mm:ss)\tLevel\tLifetime AP\tCurrent AP\tUnique Portals Visited\tUnique Portals Drone Visited\tFurthest Drone Distance\tSeer Points\tXM Collected\tOPR Agreements\tPortal Scans Uploaded\tUniques Scout Controlled\tResonators Deployed\tLinks Created\tControl Fields Created\tMind Units Captured\tLongest Link Ever Created\tLargest Control Field\tXM Recharged\tPortals Captured\tUnique Portals Captured\tMods Deployed\tHacks\tDrone Hacks\tGlyph Hack Points\tCompleted Hackstreaks\tLongest Sojourner Streak\tResonators Destroyed\tPortals Neutralized\tEnemy Links Destroyed\tEnemy Fields Destroyed\tBattle Beacon Combatant\tDrones Returned\tMachina Links Destroyed\tMachina Resonators Destroyed\tMachina Portals Neutralized\tMachina Portals Reclaimed\tMax Time Portal Held\tMax Time Link Maintained\tMax Link Length x Days\tMax Time Field Held\tLargest Field MUs x Days\tForced Drone Recalls\tDistance Walked\tKinetic Capsules Completed\tUnique Missions Completed\tResearch Bounties Completed\tResearch Days Completed\tMission Day(s) Attended\tNL-1331 Meetup(s) Attended\tFirst Saturday Events\tSecond Sunday Events\tClear Fields Events\tApollo Tokens\tApollo Mod Battle Points\tAgents Recruited\tRecursions\tMonths Subscribed';
const ROW =
    'ALL TIME\tFencherLC\tEnlightened\t2026-09-07\t16:21:02\t13\t94990303\t13835748\t3486\t362\t6\t225\t180207686\t6775\t18\t22\t105886\t22521\t11981\t19150217\t347\t894825\t96946933\t20330\t2263\t16244\t55542\t1047\t80953\t35\t740\t80783\t12550\t16340\t9788\t1\t5\t1793\t12430\t1365\t765\t281\t128\t7700\t78\t3330600\t38\t3977\t151\t869\t712\t150\t4\t2\t24\t5\t2\t8930\t789\t3\t2\t5';
const REAL_EXPORT = `${HEADER}\n${ROW}\n`;

test('STAT_COLUMNS cobre as 62 colunas do cabeçalho, com chaves únicas', () => {
    const headerCols = HEADER.split('\t');
    assert.equal(headerCols.length, 62);
    assert.equal(STAT_COLUMNS.length, 62);
    // toda coluna do cabeçalho tem uma entrada
    const known = new Set(STAT_COLUMNS.map((c) => c.col));
    for (const col of headerCols) assert.ok(known.has(col), `sem entrada para "${col}"`);
    // chaves únicas
    const keys = STAT_COLUMNS.map((c) => c.key);
    assert.equal(new Set(keys).size, keys.length);
    // kinds válidos
    for (const c of STAT_COLUMNS) assert.ok(['meta', 'identity', 'stat'].includes(c.kind));
});

test('STAT_GROUPS particiona exatamente as 54 stats', () => {
    const statKeys = STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key);
    assert.equal(statKeys.length, 54);
    const grouped = STAT_GROUPS.flatMap((g) => g.keys);
    // toda stat está em exatamente um grupo
    assert.deepEqual([...grouped].sort(), [...statKeys].sort());
    assert.equal(new Set(grouped).size, grouped.length);
    // nenhum grupo referencia chave que não é stat
    const statSet = new Set(statKeys);
    for (const g of STAT_GROUPS) for (const k of g.keys) assert.ok(statSet.has(k), `${g.id} -> ${k}`);
});

test('parseAppExport lê o export real do FencherLC', () => {
    const {agent, capturedAt, stats, warnings} = parseAppExport(REAL_EXPORT);
    assert.equal(agent.codename, 'FencherLC');
    assert.equal(agent.faction, 'enlightened');
    assert.equal(agent.level, 13);
    assert.equal(agent.recursions, 2);
    assert.equal(agent.monthsSubscribed, 5);
    assert.equal(capturedAt, '2026-09-07T16:21:02');
    assert.equal(stats.lifetimeAp, 94990303);
    assert.equal(stats.currentAp, 13835748);
    assert.equal(stats.xmCollected, 180207686);
    assert.equal(stats.distanceWalkedKm, 3977);
    assert.equal(stats.apolloTokens, 8930);
    assert.equal(stats.machinaResonatorsDestroyed, 12430);
    assert.equal(stats.seerPoints, 225);
    assert.equal(Object.keys(stats).length, 54);
    assert.deepEqual(warnings, []);
});

test('parseAppExport aborta se a contagem de colunas diverge', () => {
    const badRow = ROW.split('\t').slice(0, 60).join('\t');
    assert.throws(() => parseAppExport(`${HEADER}\n${badRow}\n`), /60/);
});

test('parseAppExport aborta se não há linha de dados', () => {
    assert.throws(() => parseAppExport(`${HEADER}\n`), /cabeçalho \+ ao menos uma linha/);
});

test('parseAppExport normaliza número com separador de milhar e aspas', () => {
    const row = ROW.replace('\t94990303\t', '\t"94.990.303"\t');
    const {stats} = parseAppExport(`${HEADER}\n${row}\n`);
    assert.equal(stats.lifetimeAp, 94990303);
});

test('parseAppExport casa por nome — cabeçalho reordenado ainda mapeia certo', () => {
    // troca a ordem de "Lifetime AP" (idx 6) e "Current AP" (idx 7) no header E na linha
    const h = HEADER.split('\t');
    const r = ROW.split('\t');
    [h[6], h[7]] = [h[7], h[6]];
    [r[6], r[7]] = [r[7], r[6]];
    const {stats} = parseAppExport(`${h.join('\t')}\n${r.join('\t')}\n`);
    assert.equal(stats.lifetimeAp, 94990303);
    assert.equal(stats.currentAp, 13835748);
});

test('parseAppExport reporta coluna desconhecida como warning, não erro', () => {
    const h = `${HEADER}\tXpto Nova Coluna`;
    const r = `${ROW}\t42`;
    const {stats, warnings} = parseAppExport(`${h}\n${r}\n`);
    assert.equal(stats.lifetimeAp, 94990303);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Xpto Nova Coluna/);
});

test('parseAppExport escolhe a linha ALL TIME entre vários recortes', () => {
    const nowRow = ROW.replace('ALL TIME', 'NOW').replace('\t94990303\t', '\t100\t');
    const {stats} = parseAppExport(`${HEADER}\n${nowRow}\n${ROW}\n`);
    assert.equal(stats.lifetimeAp, 94990303);
});
