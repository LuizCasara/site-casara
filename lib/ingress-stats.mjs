/**
 * Fonte única do mapeamento coluna-do-export -> chave estável, label pt-BR,
 * grupo e tipo. Consumido pelo CLI (`scripts/ingress.mjs`, via
 * `lib/ingress-profile.mjs`) E pela página (`app/ingress/**`). Mesma ideia de
 * `lib/coisas-da-sala.mjs`: a lista mora num lugar só.
 *
 * O export do app tem 62 colunas na linha de cabeçalho. `kind`:
 *  - `meta`     — colunas de contexto do export (não vão pro perfil)
 *  - `identity` — codinome, facção, nível, recursões, meses (vão pra `agent`)
 *  - `stat`     — as 54 contagens acumuladas (vão pra `stats`)
 */

export const STAT_COLUMNS = [
    // --- meta ---
    {col: 'Time Span', key: 'timeSpan', label: 'Recorte', group: null, kind: 'meta'},
    {col: 'Date (yyyy-mm-dd)', key: 'date', label: 'Data', group: null, kind: 'meta'},
    {col: 'Time (hh:mm:ss)', key: 'time', label: 'Hora', group: null, kind: 'meta'},

    // --- identidade ---
    {col: 'Agent Name', key: 'codename', label: 'Codinome', group: null, kind: 'identity'},
    {col: 'Agent Faction', key: 'faction', label: 'Facção', group: null, kind: 'identity'},
    {col: 'Level', key: 'level', label: 'Nível', group: null, kind: 'identity'},
    {col: 'Recursions', key: 'recursions', label: 'Recursões', group: null, kind: 'identity'},
    {col: 'Months Subscribed', key: 'monthsSubscribed', label: 'Meses de assinatura', group: null, kind: 'identity'},

    // --- AP e XM ---
    {col: 'Lifetime AP', key: 'lifetimeAp', label: 'AP total', group: 'ap', kind: 'stat'},
    {col: 'Current AP', key: 'currentAp', label: 'AP da recursão atual', group: 'ap', kind: 'stat'},
    {col: 'XM Collected', key: 'xmCollected', label: 'XM coletado', group: 'ap', kind: 'stat'},
    {col: 'XM Recharged', key: 'xmRecharged', label: 'XM recarregado', group: 'ap', kind: 'stat'},

    // --- portais ---
    {col: 'Unique Portals Visited', key: 'uniquePortalsVisited', label: 'Portais únicos visitados', group: 'portais', kind: 'stat'},
    {col: 'Portals Captured', key: 'portalsCaptured', label: 'Portais capturados', group: 'portais', kind: 'stat'},
    {col: 'Unique Portals Captured', key: 'uniquePortalsCaptured', label: 'Portais únicos capturados', group: 'portais', kind: 'stat'},
    {col: 'Portals Neutralized', key: 'portalsNeutralized', label: 'Portais neutralizados', group: 'portais', kind: 'stat'},
    {col: 'Resonators Deployed', key: 'resonatorsDeployed', label: 'Ressonadores implantados', group: 'portais', kind: 'stat'},
    {col: 'Resonators Destroyed', key: 'resonatorsDestroyed', label: 'Ressonadores destruídos', group: 'portais', kind: 'stat'},
    {col: 'Mods Deployed', key: 'modsDeployed', label: 'Mods implantados', group: 'portais', kind: 'stat'},

    // --- links e campos ---
    {col: 'Links Created', key: 'linksCreated', label: 'Links criados', group: 'links', kind: 'stat'},
    {col: 'Control Fields Created', key: 'controlFieldsCreated', label: 'Campos de controle criados', group: 'links', kind: 'stat'},
    {col: 'Mind Units Captured', key: 'mindUnitsCaptured', label: 'Mind Units capturadas', group: 'links', kind: 'stat'},
    {col: 'Longest Link Ever Created', key: 'longestLinkKm', label: 'Link mais longo (km)', group: 'links', kind: 'stat'},
    {col: 'Largest Control Field', key: 'largestControlFieldMus', label: 'Maior campo de controle (MUs)', group: 'links', kind: 'stat'},
    {col: 'Enemy Links Destroyed', key: 'enemyLinksDestroyed', label: 'Links inimigos destruídos', group: 'links', kind: 'stat'},
    {col: 'Enemy Fields Destroyed', key: 'enemyFieldsDestroyed', label: 'Campos inimigos destruídos', group: 'links', kind: 'stat'},
    {col: 'Max Time Portal Held', key: 'maxTimePortalHeldDays', label: 'Portal mantido por mais tempo (dias)', group: 'links', kind: 'stat'},
    {col: 'Max Time Link Maintained', key: 'maxTimeLinkMaintainedDays', label: 'Link mantido por mais tempo (dias)', group: 'links', kind: 'stat'},
    {col: 'Max Link Length x Days', key: 'maxLinkLengthTimesDays', label: 'Km-link × dias (máx.)', group: 'links', kind: 'stat'},
    {col: 'Max Time Field Held', key: 'maxTimeFieldHeldDays', label: 'Campo mantido por mais tempo (dias)', group: 'links', kind: 'stat'},
    {col: 'Largest Field MUs x Days', key: 'largestFieldMusTimesDays', label: 'MU × dias (máx.)', group: 'links', kind: 'stat'},

    // --- hacking ---
    {col: 'Hacks', key: 'hacks', label: 'Hacks', group: 'hacking', kind: 'stat'},
    {col: 'Glyph Hack Points', key: 'glyphHackPoints', label: 'Pontos de glyph hack', group: 'hacking', kind: 'stat'},
    {col: 'Completed Hackstreaks', key: 'completedHackstreaks', label: 'Hackstreaks completos', group: 'hacking', kind: 'stat'},
    {col: 'Longest Sojourner Streak', key: 'longestSojournerStreak', label: 'Maior streak Sojourner (dias)', group: 'hacking', kind: 'stat'},

    // --- drones ---
    {col: 'Unique Portals Drone Visited', key: 'uniquePortalsDroneVisited', label: 'Portais únicos visitados por drone', group: 'drones', kind: 'stat'},
    {col: 'Furthest Drone Distance', key: 'furthestDroneDistanceKm', label: 'Distância máxima de drone (km)', group: 'drones', kind: 'stat'},
    {col: 'Drone Hacks', key: 'droneHacks', label: 'Hacks por drone', group: 'drones', kind: 'stat'},
    {col: 'Drones Returned', key: 'dronesReturned', label: 'Drones devolvidos', group: 'drones', kind: 'stat'},
    {col: 'Forced Drone Recalls', key: 'forcedDroneRecalls', label: 'Recalls forçados de drone', group: 'drones', kind: 'stat'},

    // --- Machina ---
    {col: 'Machina Links Destroyed', key: 'machinaLinksDestroyed', label: 'Links da Machina destruídos', group: 'machina', kind: 'stat'},
    {col: 'Machina Resonators Destroyed', key: 'machinaResonatorsDestroyed', label: 'Ressonadores da Machina destruídos', group: 'machina', kind: 'stat'},
    {col: 'Machina Portals Neutralized', key: 'machinaPortalsNeutralized', label: 'Portais da Machina neutralizados', group: 'machina', kind: 'stat'},
    {col: 'Machina Portals Reclaimed', key: 'machinaPortalsReclaimed', label: 'Portais retomados da Machina', group: 'machina', kind: 'stat'},

    // --- exploração e eventos ---
    {col: 'Distance Walked', key: 'distanceWalkedKm', label: 'Distância caminhada (km)', group: 'exploracao', kind: 'stat'},
    {col: 'Kinetic Capsules Completed', key: 'kineticCapsulesCompleted', label: 'Cápsulas cinéticas completas', group: 'exploracao', kind: 'stat'},
    {col: 'Unique Missions Completed', key: 'uniqueMissionsCompleted', label: 'Missões únicas completas', group: 'exploracao', kind: 'stat'},
    {col: 'Research Bounties Completed', key: 'researchBountiesCompleted', label: 'Research Bounties completas', group: 'exploracao', kind: 'stat'},
    {col: 'Research Days Completed', key: 'researchDaysCompleted', label: 'Research Days completos', group: 'exploracao', kind: 'stat'},
    {col: 'Mission Day(s) Attended', key: 'missionDaysAttended', label: 'Mission Days presentes', group: 'exploracao', kind: 'stat'},
    {col: 'NL-1331 Meetup(s) Attended', key: 'nl1331MeetupsAttended', label: 'Meetups NL-1331', group: 'exploracao', kind: 'stat'},
    {col: 'First Saturday Events', key: 'firstSaturdayEvents', label: 'First Saturdays', group: 'exploracao', kind: 'stat'},
    {col: 'Second Sunday Events', key: 'secondSundayEvents', label: 'Second Sundays', group: 'exploracao', kind: 'stat'},
    {col: 'Clear Fields Events', key: 'clearFieldsEvents', label: 'Clear Fields', group: 'exploracao', kind: 'stat'},
    {col: 'Battle Beacon Combatant', key: 'battleBeaconCombatant', label: 'Battle Beacon (combatente)', group: 'exploracao', kind: 'stat'},
    {col: 'Apollo Tokens', key: 'apolloTokens', label: 'Apollo Tokens', group: 'exploracao', kind: 'stat'},
    {col: 'Apollo Mod Battle Points', key: 'apolloModBattlePoints', label: 'Apollo Mod Battle Points', group: 'exploracao', kind: 'stat'},
    {col: 'Agents Recruited', key: 'agentsRecruited', label: 'Agentes recrutados', group: 'exploracao', kind: 'stat'},

    // --- scanner / OPR / Scout ---
    {col: 'Seer Points', key: 'seerPoints', label: 'Pontos Seer', group: 'scanner', kind: 'stat'},
    {col: 'OPR Agreements', key: 'oprAgreements', label: 'Concordâncias OPR', group: 'scanner', kind: 'stat'},
    {col: 'Portal Scans Uploaded', key: 'portalScansUploaded', label: 'Scans de portal enviados', group: 'scanner', kind: 'stat'},
    {col: 'Uniques Scout Controlled', key: 'uniquesScoutControlled', label: 'Portais únicos Scout controlados', group: 'scanner', kind: 'stat'},
];

export const STAT_GROUPS = [
    {id: 'ap', title: 'AP e XM', keys: ['lifetimeAp', 'currentAp', 'xmCollected', 'xmRecharged']},
    {
        id: 'portais', title: 'Portais',
        keys: ['uniquePortalsVisited', 'portalsCaptured', 'uniquePortalsCaptured', 'portalsNeutralized', 'resonatorsDeployed', 'resonatorsDestroyed', 'modsDeployed'],
    },
    {
        id: 'links', title: 'Links e campos',
        keys: ['linksCreated', 'controlFieldsCreated', 'mindUnitsCaptured', 'longestLinkKm', 'largestControlFieldMus', 'enemyLinksDestroyed', 'enemyFieldsDestroyed', 'maxTimePortalHeldDays', 'maxTimeLinkMaintainedDays', 'maxLinkLengthTimesDays', 'maxTimeFieldHeldDays', 'largestFieldMusTimesDays'],
    },
    {id: 'hacking', title: 'Hacking e glyphs', keys: ['hacks', 'glyphHackPoints', 'completedHackstreaks', 'longestSojournerStreak']},
    {
        id: 'drones', title: 'Drones',
        keys: ['uniquePortalsDroneVisited', 'furthestDroneDistanceKm', 'droneHacks', 'dronesReturned', 'forcedDroneRecalls'],
    },
    {
        id: 'machina', title: 'Machina',
        keys: ['machinaLinksDestroyed', 'machinaResonatorsDestroyed', 'machinaPortalsNeutralized', 'machinaPortalsReclaimed'],
    },
    {
        id: 'exploracao', title: 'Exploração e eventos',
        keys: ['distanceWalkedKm', 'kineticCapsulesCompleted', 'uniqueMissionsCompleted', 'researchBountiesCompleted', 'researchDaysCompleted', 'missionDaysAttended', 'nl1331MeetupsAttended', 'firstSaturdayEvents', 'secondSundayEvents', 'clearFieldsEvents', 'battleBeaconCombatant', 'apolloTokens', 'apolloModBattlePoints', 'agentsRecruited'],
    },
    {
        id: 'scanner', title: 'Scanner, OPR e Scout',
        keys: ['seerPoints', 'oprAgreements', 'portalScansUploaded', 'uniquesScoutControlled'],
    },
];

const BY_COL = new Map(STAT_COLUMNS.map((c) => [c.col.toLowerCase(), c]));

/** Contagem é sempre inteiro no export — tira tudo que não é dígito/sinal. */
function toNumber(raw) {
    const cleaned = String(raw).replace(/[^\d-]/g, '');
    if (cleaned === '' || cleaned === '-') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function normalizeFaction(raw) {
    const v = String(raw).trim().toLowerCase();
    if (v === 'enlightened' || v === 'resistance') return v;
    return v || null;
}

/**
 * Converte o texto do export de estatísticas do app (TSV) na base do perfil.
 * Casa colunas POR NOME no cabeçalho, nunca por posição — um export futuro com
 * colunas em ordem/quantidade diferente ainda parseia.
 *
 * @param {string} tsvText
 * @returns {{agent: object, capturedAt: string, stats: Record<string, number>, warnings: string[]}}
 * @throws {Error} se não houver cabeçalho + linha de dados, ou se a linha de
 *   dados tiver contagem de colunas diferente do cabeçalho.
 */
export function parseAppExport(tsvText) {
    const lines = String(tsvText)
        .split(/\r?\n/)
        .map((l) => l.replace(/\t+$/, ''))
        .filter((l) => l.trim() !== '');
    if (lines.length < 2) {
        throw new Error('Export inválido: esperava cabeçalho + ao menos uma linha de dados.');
    }

    const header = lines[0].split('\t').map((h) => h.trim());
    const dataLine =
        lines.slice(1).find((l) => /^all time\b/i.test(l.split('\t')[0].trim())) || lines[1];
    const values = dataLine.split('\t');

    if (values.length !== header.length) {
        throw new Error(
            `Export inválido: o cabeçalho tem ${header.length} colunas mas a linha de dados tem ${values.length}.`,
        );
    }

    const warnings = [];
    const agent = {};
    const stats = {};
    let dateStr = null;
    let timeStr = null;

    header.forEach((colName, i) => {
        const def = BY_COL.get(colName.toLowerCase());
        const raw = (values[i] ?? '').trim();
        if (!def) {
            warnings.push(`Coluna desconhecida ignorada: "${colName}"`);
            return;
        }
        if (def.kind === 'meta') {
            if (def.key === 'date') dateStr = raw;
            if (def.key === 'time') timeStr = raw;
            return;
        }
        if (def.kind === 'identity') {
            if (def.key === 'codename') agent.codename = raw;
            else if (def.key === 'faction') agent.faction = normalizeFaction(raw);
            else agent[def.key] = toNumber(raw) ?? 0;
            return;
        }
        const n = toNumber(raw);
        if (n !== null) stats[def.key] = n;
    });

    const capturedAt = dateStr && timeStr ? `${dateStr}T${timeStr}` : (dateStr ?? null);

    return {agent, capturedAt, stats, warnings};
}
