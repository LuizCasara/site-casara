import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BADGES, computeBadge, computeAllBadges} from './ingress-badges.mjs';
import {STAT_COLUMNS} from './ingress-stats.mjs';

const STAT_KEYS = new Set(STAT_COLUMNS.filter((c) => c.kind === 'stat').map((c) => c.key));
const byKey = (k) => BADGES.find((b) => b.key === k);

test('toda badge referencia uma statKey real e tem 5 tiers crescentes', () => {
    assert.ok(BADGES.length >= 11);
    for (const b of BADGES) {
        assert.ok(STAT_KEYS.has(b.statKey), `${b.key} -> statKey inexistente ${b.statKey}`);
        const t = [b.tiers.bronze, b.tiers.silver, b.tiers.gold, b.tiers.platinum, b.tiers.onyx];
        for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], `${b.key}: tiers não crescentes`);
    }
});

test('computeBadge: valor 0 -> tier none, next aponta pro bronze', () => {
    const r = computeBadge(byKey('liberator'), 0);
    assert.equal(r.tier, 'none');
    assert.equal(r.atMax, false);
    assert.deepEqual(r.next, {tier: 'bronze', remaining: 100});
});

test('computeBadge: valor exatamente no limiar conta para aquele tier', () => {
    // Liberator Gold = 5000
    assert.equal(computeBadge(byKey('liberator'), 5000).tier, 'gold');
    assert.equal(computeBadge(byKey('liberator'), 4999).tier, 'silver');
});

test('computeBadge: um a menos que o próximo tier fica no anterior', () => {
    // Connector Platinum = 25000
    const r = computeBadge(byKey('connector'), 24999);
    assert.equal(r.tier, 'gold');
    assert.deepEqual(r.next, {tier: 'platinum', remaining: 1});
});

test('computeBadge: acima de Onyx -> atMax, next null', () => {
    const r = computeBadge(byKey('trekker'), 99999);
    assert.equal(r.tier, 'onyx');
    assert.equal(r.atMax, true);
    assert.equal(r.next, null);
});

test('computeBadge: valor no limiar exato de Onyx -> atMax', () => {
    const r = computeBadge(byKey('sojourner'), 360);
    assert.equal(r.tier, 'onyx');
    assert.equal(r.atMax, true);
});

test('computeAllBadges: omite badge sem a statKey no stats', () => {
    const badges = computeAllBadges({portalsCaptured: 20330});
    assert.equal(badges.length, 1);
    assert.equal(badges[0].key, 'liberator');
});

test('computeAllBadges com stats vazio/nulo devolve []', () => {
    assert.deepEqual(computeAllBadges({}), []);
    assert.deepEqual(computeAllBadges(null), []);
});

test('tiers do FencherLC conferem com os números reais do snapshot', () => {
    // números de docs/ingress-perfil-fencherlc.md
    const stats = {
        resonatorsDeployed: 105886, linksCreated: 22521, controlFieldsCreated: 11981,
        mindUnitsCaptured: 19150217, portalsCaptured: 20330, uniquePortalsCaptured: 2263,
        uniquePortalsVisited: 3486, distanceWalkedKm: 3977, resonatorsDestroyed: 80783,
        hacks: 55542, longestSojournerStreak: 740, xmRecharged: 96946933,
        modsDeployed: 16244, uniqueMissionsCompleted: 869,
    };
    const got = Object.fromEntries(computeAllBadges(stats).map((b) => [b.key, b.tier]));
    assert.deepEqual(got, {
        builder: 'platinum', connector: 'gold', mindController: 'platinum',
        illuminator: 'onyx', liberator: 'platinum', pioneer: 'gold',
        explorer: 'gold', trekker: 'onyx', purifier: 'gold', hacker: 'gold',
        sojourner: 'onyx', recharger: 'onyx', engineer: 'gold', specops: 'onyx',
    });
});
