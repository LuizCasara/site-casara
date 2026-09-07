/**
 * Montagem e merge do objeto `Profile` — a estrutura que vive em
 * `data/ingress/fencherlc.json` e alimenta a página `/ingress`.
 *
 * `buildProfile` parte da saída de `parseAppExport` (`lib/ingress-stats.mjs`).
 * `mergeGdprDump` incorpora as séries temporais e listas de portais do dump
 * GDPR (lidas pelo CLI em `scripts/ingress.mjs`). Ambos são puros e
 * idempotentes — sem `Date.now()`, ordem de chave estável.
 */

export const SCHEMA_VERSION = 1;

/** Placeholder até o Luiz informar a coordenada da cidade dele (ver spec). */
export const FALLBACK_S2_CENTER = {lat: -15.7939, lng: -47.8828}; // Brasília
export const DEFAULT_S2_LEVEL = 12;

function sortedStats(stats) {
    const out = {};
    for (const k of Object.keys(stats || {}).sort()) out[k] = stats[k];
    return out;
}

function computePending(timeSeries, portals) {
    const pending = [];
    if (!timeSeries || !timeSeries.lifetimeAp || timeSeries.lifetimeAp.length === 0) {
        pending.push('apTimeline');
    }
    if (!portals || ((portals.visited?.length ?? 0) === 0 && (portals.submitted?.length ?? 0) === 0)) {
        pending.push('portalMap');
    }
    return pending;
}

/**
 * @param {{agent:object, capturedAt:string, stats:Record<string,number>}} parsedExport
 * @param {{previous?: object}} [opts] — perfil anterior, para preservar seções do dump GDPR
 * @returns {object} Profile
 */
export function buildProfile(parsedExport, opts = {}) {
    const previous = opts.previous || null;
    const {agent, capturedAt, stats} = parsedExport;

    const timeSeries = previous?.timeSeries ?? null;
    const portals = previous?.portals ?? null;

    return {
        schemaVersion: SCHEMA_VERSION,
        agent: {
            codename: agent.codename,
            faction: agent.faction,
            level: agent.level ?? 0,
            recursions: agent.recursions ?? 0,
            monthsSubscribed: agent.monthsSubscribed ?? 0,
        },
        capturedAt,
        sources: {
            appExport: {capturedAt},
            gdprDump: previous?.sources?.gdprDump ?? null,
        },
        stats: sortedStats(stats),
        s2: previous?.s2 ?? {center: {...FALLBACK_S2_CENTER}, defaultLevel: DEFAULT_S2_LEVEL},
        timeSeries,
        portals,
        pending: computePending(timeSeries, portals),
    };
}

/** Mais recente por `capturedAt` (ISO-ish, comparável lexicograficamente). */
function isNewer(a, b) {
    if (!b) return true;
    if (!a) return false;
    return String(a) > String(b);
}

/**
 * @param {object} profile — Profile atual
 * @param {{generatedAt?:string, capturedAt?:string, agent?:object, stats?:object,
 *          timeSeries?:object, portals?:object, warnings?:string[]}} dumpData
 * @returns {object} Profile
 */
export function mergeGdprDump(profile, dumpData) {
    const d = dumpData || {};

    const timeSeries =
        d.timeSeries && Object.keys(d.timeSeries).length > 0
            ? {...(profile.timeSeries || {}), ...d.timeSeries}
            : (profile.timeSeries ?? null);

    const portals =
        d.portals && ((d.portals.visited?.length ?? 0) > 0 || (d.portals.submitted?.length ?? 0) > 0)
            ? d.portals
            : (profile.portals ?? null);

    // agent/stats do dump (profile.txt) só ganham se forem mais recentes
    const dumpWins = d.capturedAt && isNewer(d.capturedAt, profile.capturedAt);
    const agent = dumpWins && d.agent ? {...profile.agent, ...d.agent} : profile.agent;
    const stats = dumpWins && d.stats ? sortedStats({...profile.stats, ...d.stats}) : profile.stats;
    const capturedAt = dumpWins ? d.capturedAt : profile.capturedAt;

    return {
        ...profile,
        schemaVersion: SCHEMA_VERSION,
        agent,
        capturedAt,
        sources: {
            ...profile.sources,
            gdprDump: d.generatedAt ? {generatedAt: d.generatedAt} : (profile.sources?.gdprDump ?? null),
        },
        stats,
        timeSeries,
        portals,
        pending: computePending(timeSeries, portals),
    };
}
