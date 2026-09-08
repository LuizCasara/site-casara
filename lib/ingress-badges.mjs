/**
 * Medalhas do Ingress derivadas de uma estatística de contagem, com os limiares
 * OFICIAIS por tier. Derivado no render (não é congelado no JSON) — corrigir um
 * limiar não deve exigir re-ingestão do perfil.
 *
 * Fontes dos limiares: ingress.plus (fonte viva, `tier_values` da API, conferida
 * em 2026-09 e bateu com o Fev Games em 13 das 14 badges). A exceção é o bronze
 * do Illuminator: ingress.plus diz 2000, Fev Games diz 5000 — fica com o
 * ingress.plus.
 * `statKey` referencia uma chave de `lib/ingress-stats.mjs`.
 */

const ORDER = ['bronze', 'silver', 'gold', 'platinum', 'onyx'];

export const TIER_LABELS = {
    none: 'Sem medalha',
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
    onyx: 'Onyx',
};

export const BADGES = [
    {key: 'builder', name: 'Builder', statKey: 'resonatorsDeployed',
        tiers: {bronze: 2000, silver: 10000, gold: 30000, platinum: 100000, onyx: 200000}},
    {key: 'connector', name: 'Connector', statKey: 'linksCreated',
        tiers: {bronze: 50, silver: 1000, gold: 5000, platinum: 25000, onyx: 100000}},
    {key: 'mindController', name: 'Mind Controller', statKey: 'controlFieldsCreated',
        tiers: {bronze: 100, silver: 500, gold: 2000, platinum: 10000, onyx: 40000}},
    {key: 'illuminator', name: 'Illuminator', statKey: 'mindUnitsCaptured',
        tiers: {bronze: 2000, silver: 50000, gold: 250000, platinum: 1000000, onyx: 4000000}},
    {key: 'liberator', name: 'Liberator', statKey: 'portalsCaptured',
        tiers: {bronze: 100, silver: 1000, gold: 5000, platinum: 15000, onyx: 40000}},
    {key: 'pioneer', name: 'Pioneer', statKey: 'uniquePortalsCaptured',
        tiers: {bronze: 20, silver: 200, gold: 1000, platinum: 5000, onyx: 20000}},
    {key: 'explorer', name: 'Explorer', statKey: 'uniquePortalsVisited',
        tiers: {bronze: 100, silver: 1000, gold: 2000, platinum: 10000, onyx: 30000}},
    {key: 'trekker', name: 'Trekker', statKey: 'distanceWalkedKm',
        tiers: {bronze: 10, silver: 100, gold: 300, platinum: 1000, onyx: 2500}},
    {key: 'purifier', name: 'Purifier', statKey: 'resonatorsDestroyed',
        tiers: {bronze: 2000, silver: 10000, gold: 30000, platinum: 100000, onyx: 300000}},
    {key: 'hacker', name: 'Hacker', statKey: 'hacks',
        tiers: {bronze: 2000, silver: 10000, gold: 30000, platinum: 100000, onyx: 200000}},
    {key: 'sojourner', name: 'Sojourner', statKey: 'longestSojournerStreak',
        tiers: {bronze: 15, silver: 30, gold: 60, platinum: 180, onyx: 360}},
    {key: 'recharger', name: 'Recharger', statKey: 'xmRecharged',
        tiers: {bronze: 100000, silver: 1000000, gold: 3000000, platinum: 10000000, onyx: 25000000}},
    {key: 'engineer', name: 'Engineer', statKey: 'modsDeployed',
        tiers: {bronze: 150, silver: 1500, gold: 5000, platinum: 20000, onyx: 50000}},
    {key: 'specops', name: 'SpecOps', statKey: 'uniqueMissionsCompleted',
        tiers: {bronze: 5, silver: 25, gold: 100, platinum: 200, onyx: 500}},
];

/**
 * @param {{key:string,name:string,statKey:string,tiers:object}} badgeDef
 * @param {number} statValue
 * @returns {{key,name,statKey,value,tier,atMax,next:{tier:string,remaining:number}|null}}
 */
export function computeBadge(badgeDef, statValue) {
    const value = Number.isFinite(Number(statValue)) ? Number(statValue) : 0;
    let tier = 'none';
    for (const name of ORDER) {
        if (value >= badgeDef.tiers[name]) tier = name;
    }
    const atMax = tier === 'onyx';
    let next = null;
    if (!atMax) {
        const nextTier = tier === 'none' ? ORDER[0] : ORDER[ORDER.indexOf(tier) + 1];
        next = {tier: nextTier, remaining: badgeDef.tiers[nextTier] - value};
    }
    return {key: badgeDef.key, name: badgeDef.name, statKey: badgeDef.statKey, value, tier, atMax, next};
}

/** Omite badge cuja estatística de origem não está em `stats`. */
export function computeAllBadges(stats) {
    if (!stats) return [];
    return BADGES.filter((b) => Object.prototype.hasOwnProperty.call(stats, b.statKey)).map((b) =>
        computeBadge(b, stats[b.statKey]),
    );
}
