/**
 * Fonte única do mapeamento coluna-do-export -> chave estável, label pt-BR,
 * grupo e tipo. Consumido pelo CLI (`scripts/ingress/ingress.mjs`, via
 * `lib/ingress/profile/ingress-profile.mjs`) E pela página (`app/ingress/**`). Mesma ideia de
 * `lib/livros/segredos/coisas-da-sala.mjs`: a lista mora num lugar só.
 *
 * O export do app tem 62 colunas na linha de cabeçalho. `kind`:
 *  - `meta`     — colunas de contexto do export (não vão pro perfil)
 *  - `identity` — codinome, facção, nível, recursões, meses (vão pra `agent`)
 *  - `stat`     — as 54 contagens acumuladas (vão pra `stats`)
 */

export const STAT_COLUMNS = [
    // --- meta (só o CLI usa; sem labelEn — não aparece em nenhuma UI) ---
    {col: 'Time Span', key: 'timeSpan', label: 'Recorte', group: null, kind: 'meta'},
    {col: 'Date (yyyy-mm-dd)', key: 'date', label: 'Data', group: null, kind: 'meta'},
    {col: 'Time (hh:mm:ss)', key: 'time', label: 'Hora', group: null, kind: 'meta'},

    // --- identidade ---
    {col: 'Agent Name', key: 'codename', label: 'Codinome', labelEn: 'Codename', group: null, kind: 'identity'},
    {col: 'Agent Faction', key: 'faction', label: 'Facção', labelEn: 'Faction', group: null, kind: 'identity'},
    {col: 'Level', key: 'level', label: 'Nível', labelEn: 'Level', group: null, kind: 'identity'},
    {col: 'Recursions', key: 'recursions', label: 'Recursões', labelEn: 'Recursions', group: null, kind: 'identity'},
    {col: 'Months Subscribed', key: 'monthsSubscribed', label: 'Meses de assinatura', labelEn: 'Months subscribed', group: null, kind: 'identity'},

    // --- AP e XM ---
    {col: 'Lifetime AP', key: 'lifetimeAp', label: 'AP total', labelEn: 'Lifetime AP', group: 'ap', kind: 'stat'},
    {col: 'Current AP', key: 'currentAp', label: 'AP da recursão atual', labelEn: 'Current AP', group: 'ap', kind: 'stat'},
    {col: 'XM Collected', key: 'xmCollected', label: 'XM coletado', labelEn: 'XM collected', group: 'ap', kind: 'stat'},
    {col: 'XM Recharged', key: 'xmRecharged', label: 'XM recarregado', labelEn: 'XM recharged', group: 'ap', kind: 'stat'},

    // --- portais ---
    {col: 'Unique Portals Visited', key: 'uniquePortalsVisited', label: 'Portais únicos visitados', labelEn: 'Unique portals visited', group: 'portais', kind: 'stat'},
    {col: 'Portals Captured', key: 'portalsCaptured', label: 'Portais capturados', labelEn: 'Portals captured', group: 'portais', kind: 'stat'},
    {col: 'Unique Portals Captured', key: 'uniquePortalsCaptured', label: 'Portais únicos capturados', labelEn: 'Unique portals captured', group: 'portais', kind: 'stat'},
    {col: 'Portals Neutralized', key: 'portalsNeutralized', label: 'Portais neutralizados', labelEn: 'Portals neutralized', group: 'portais', kind: 'stat'},
    {col: 'Resonators Deployed', key: 'resonatorsDeployed', label: 'Ressonadores implantados', labelEn: 'Resonators deployed', group: 'portais', kind: 'stat'},
    {col: 'Resonators Destroyed', key: 'resonatorsDestroyed', label: 'Ressonadores destruídos', labelEn: 'Resonators destroyed', group: 'portais', kind: 'stat'},
    {col: 'Mods Deployed', key: 'modsDeployed', label: 'Mods implantados', labelEn: 'Mods deployed', group: 'portais', kind: 'stat'},

    // --- links e campos ---
    {col: 'Links Created', key: 'linksCreated', label: 'Links criados', labelEn: 'Links created', group: 'links', kind: 'stat'},
    {col: 'Control Fields Created', key: 'controlFieldsCreated', label: 'Campos de controle criados', labelEn: 'Control fields created', group: 'links', kind: 'stat'},
    {col: 'Mind Units Captured', key: 'mindUnitsCaptured', label: 'Mind Units capturadas', labelEn: 'Mind Units captured', group: 'links', kind: 'stat'},
    {col: 'Longest Link Ever Created', key: 'longestLinkKm', label: 'Link mais longo (km)', labelEn: 'Longest link ever created (km)', group: 'links', kind: 'stat'},
    {col: 'Largest Control Field', key: 'largestControlFieldMus', label: 'Maior campo de controle (MUs)', labelEn: 'Largest control field (MUs)', group: 'links', kind: 'stat'},
    {col: 'Enemy Links Destroyed', key: 'enemyLinksDestroyed', label: 'Links inimigos destruídos', labelEn: 'Enemy links destroyed', group: 'links', kind: 'stat'},
    {col: 'Enemy Fields Destroyed', key: 'enemyFieldsDestroyed', label: 'Campos inimigos destruídos', labelEn: 'Enemy fields destroyed', group: 'links', kind: 'stat'},
    {col: 'Max Time Portal Held', key: 'maxTimePortalHeldDays', label: 'Portal mantido por mais tempo (dias)', labelEn: 'Longest portal held (days)', group: 'links', kind: 'stat'},
    {col: 'Max Time Link Maintained', key: 'maxTimeLinkMaintainedDays', label: 'Link mantido por mais tempo (dias)', labelEn: 'Longest link maintained (days)', group: 'links', kind: 'stat'},
    {col: 'Max Link Length x Days', key: 'maxLinkLengthTimesDays', label: 'Km-link × dias (máx.)', labelEn: 'Max link-km × days', group: 'links', kind: 'stat'},
    {col: 'Max Time Field Held', key: 'maxTimeFieldHeldDays', label: 'Campo mantido por mais tempo (dias)', labelEn: 'Longest field held (days)', group: 'links', kind: 'stat'},
    {col: 'Largest Field MUs x Days', key: 'largestFieldMusTimesDays', label: 'MU × dias (máx.)', labelEn: 'Max MU × days', group: 'links', kind: 'stat'},

    // --- hacking ---
    {col: 'Hacks', key: 'hacks', label: 'Hacks', labelEn: 'Hacks', group: 'hacking', kind: 'stat'},
    {col: 'Glyph Hack Points', key: 'glyphHackPoints', label: 'Pontos de glyph hack', labelEn: 'Glyph hack points', group: 'hacking', kind: 'stat'},
    {col: 'Completed Hackstreaks', key: 'completedHackstreaks', label: 'Hackstreaks completos', labelEn: 'Completed hackstreaks', group: 'hacking', kind: 'stat'},
    {col: 'Longest Sojourner Streak', key: 'longestSojournerStreak', label: 'Maior streak Sojourner (dias)', labelEn: 'Longest Sojourner streak (days)', group: 'hacking', kind: 'stat'},

    // --- drones ---
    {col: 'Unique Portals Drone Visited', key: 'uniquePortalsDroneVisited', label: 'Portais únicos visitados por drone', labelEn: 'Unique portals visited by drone', group: 'drones', kind: 'stat'},
    {col: 'Furthest Drone Distance', key: 'furthestDroneDistanceKm', label: 'Distância máxima de drone (km)', labelEn: 'Furthest drone distance (km)', group: 'drones', kind: 'stat'},
    {col: 'Drone Hacks', key: 'droneHacks', label: 'Hacks por drone', labelEn: 'Drone hacks', group: 'drones', kind: 'stat'},
    {col: 'Drones Returned', key: 'dronesReturned', label: 'Drones devolvidos', labelEn: 'Drones returned', group: 'drones', kind: 'stat'},
    {col: 'Forced Drone Recalls', key: 'forcedDroneRecalls', label: 'Recalls forçados de drone', labelEn: 'Forced drone recalls', group: 'drones', kind: 'stat'},

    // --- Machina ---
    {col: 'Machina Links Destroyed', key: 'machinaLinksDestroyed', label: 'Links da Machina destruídos', labelEn: 'Machina links destroyed', group: 'machina', kind: 'stat'},
    {col: 'Machina Resonators Destroyed', key: 'machinaResonatorsDestroyed', label: 'Ressonadores da Machina destruídos', labelEn: 'Machina resonators destroyed', group: 'machina', kind: 'stat'},
    {col: 'Machina Portals Neutralized', key: 'machinaPortalsNeutralized', label: 'Portais da Machina neutralizados', labelEn: 'Machina portals neutralized', group: 'machina', kind: 'stat'},
    {col: 'Machina Portals Reclaimed', key: 'machinaPortalsReclaimed', label: 'Portais retomados da Machina', labelEn: 'Machina portals reclaimed', group: 'machina', kind: 'stat'},

    // --- exploração e eventos ---
    {col: 'Distance Walked', key: 'distanceWalkedKm', label: 'Distância caminhada (km)', labelEn: 'Distance walked (km)', group: 'exploracao', kind: 'stat'},
    {col: 'Kinetic Capsules Completed', key: 'kineticCapsulesCompleted', label: 'Cápsulas cinéticas completas', labelEn: 'Kinetic Capsules completed', group: 'exploracao', kind: 'stat'},
    {col: 'Unique Missions Completed', key: 'uniqueMissionsCompleted', label: 'Missões únicas completas', labelEn: 'Unique missions completed', group: 'exploracao', kind: 'stat'},
    {col: 'Research Bounties Completed', key: 'researchBountiesCompleted', label: 'Research Bounties completas', labelEn: 'Research Bounties completed', group: 'exploracao', kind: 'stat'},
    {col: 'Research Days Completed', key: 'researchDaysCompleted', label: 'Research Days completos', labelEn: 'Research Days completed', group: 'exploracao', kind: 'stat'},
    {col: 'Mission Day(s) Attended', key: 'missionDaysAttended', label: 'Mission Days presentes', labelEn: 'Mission Days attended', group: 'exploracao', kind: 'stat'},
    {col: 'NL-1331 Meetup(s) Attended', key: 'nl1331MeetupsAttended', label: 'Meetups NL-1331', labelEn: 'NL-1331 meetups attended', group: 'exploracao', kind: 'stat'},
    {col: 'First Saturday Events', key: 'firstSaturdayEvents', label: 'First Saturdays', labelEn: 'First Saturday events', group: 'exploracao', kind: 'stat'},
    {col: 'Second Sunday Events', key: 'secondSundayEvents', label: 'Second Sundays', labelEn: 'Second Sunday events', group: 'exploracao', kind: 'stat'},
    {col: 'Clear Fields Events', key: 'clearFieldsEvents', label: 'Clear Fields', labelEn: 'Clear Fields events', group: 'exploracao', kind: 'stat'},
    {col: 'Battle Beacon Combatant', key: 'battleBeaconCombatant', label: 'Battle Beacon (combatente)', labelEn: 'Battle Beacon combatant', group: 'exploracao', kind: 'stat'},
    {col: 'Apollo Tokens', key: 'apolloTokens', label: 'Apollo Tokens', labelEn: 'Apollo Tokens', group: 'exploracao', kind: 'stat'},
    {col: 'Apollo Mod Battle Points', key: 'apolloModBattlePoints', label: 'Apollo Mod Battle Points', labelEn: 'Apollo Mod Battle Points', group: 'exploracao', kind: 'stat'},
    {col: 'Agents Recruited', key: 'agentsRecruited', label: 'Agentes recrutados', labelEn: 'Agents recruited', group: 'exploracao', kind: 'stat'},

    // --- scanner / OPR / Scout ---
    {col: 'Seer Points', key: 'seerPoints', label: 'Pontos Seer', labelEn: 'Seer points', group: 'scanner', kind: 'stat'},
    {col: 'OPR Agreements', key: 'oprAgreements', label: 'Concordâncias OPR', labelEn: 'OPR agreements', group: 'scanner', kind: 'stat'},
    {col: 'Portal Scans Uploaded', key: 'portalScansUploaded', label: 'Scans de portal enviados', labelEn: 'Portal scans uploaded', group: 'scanner', kind: 'stat'},
    {col: 'Uniques Scout Controlled', key: 'uniquesScoutControlled', label: 'Portais únicos Scout controlados', labelEn: 'Unique Scout-controlled portals', group: 'scanner', kind: 'stat'},
];

export const STAT_GROUPS = [
    {id: 'ap', title: 'AP e XM', titleEn: 'AP & XM', keys: ['lifetimeAp', 'currentAp', 'xmCollected', 'xmRecharged']},
    {
        id: 'portais', title: 'Portais', titleEn: 'Portals',
        keys: ['uniquePortalsVisited', 'portalsCaptured', 'uniquePortalsCaptured', 'portalsNeutralized', 'resonatorsDeployed', 'resonatorsDestroyed', 'modsDeployed'],
    },
    {
        id: 'links', title: 'Links e campos', titleEn: 'Links and fields',
        keys: ['linksCreated', 'controlFieldsCreated', 'mindUnitsCaptured', 'longestLinkKm', 'largestControlFieldMus', 'enemyLinksDestroyed', 'enemyFieldsDestroyed', 'maxTimePortalHeldDays', 'maxTimeLinkMaintainedDays', 'maxLinkLengthTimesDays', 'maxTimeFieldHeldDays', 'largestFieldMusTimesDays'],
    },
    {id: 'hacking', title: 'Hacking e glyphs', titleEn: 'Hacking and glyphs', keys: ['hacks', 'glyphHackPoints', 'completedHackstreaks', 'longestSojournerStreak']},
    {
        id: 'drones', title: 'Drones', titleEn: 'Drones',
        keys: ['uniquePortalsDroneVisited', 'furthestDroneDistanceKm', 'droneHacks', 'dronesReturned', 'forcedDroneRecalls'],
    },
    {
        id: 'machina', title: 'Machina', titleEn: 'Machina',
        keys: ['machinaLinksDestroyed', 'machinaResonatorsDestroyed', 'machinaPortalsNeutralized', 'machinaPortalsReclaimed'],
    },
    {
        id: 'exploracao', title: 'Exploração e eventos', titleEn: 'Exploration and events',
        keys: ['distanceWalkedKm', 'kineticCapsulesCompleted', 'uniqueMissionsCompleted', 'researchBountiesCompleted', 'researchDaysCompleted', 'missionDaysAttended', 'nl1331MeetupsAttended', 'firstSaturdayEvents', 'secondSundayEvents', 'clearFieldsEvents', 'battleBeaconCombatant', 'apolloTokens', 'apolloModBattlePoints', 'agentsRecruited'],
    },
    {
        id: 'scanner', title: 'Scanner, OPR e Scout', titleEn: 'Scanner, OPR and Scout',
        keys: ['seerPoints', 'oprAgreements', 'portalScansUploaded', 'uniquesScoutControlled'],
    },
];

const BY_COL = new Map(STAT_COLUMNS.map((c) => [c.col.toLowerCase(), c]));

// Nomes de coluna conhecidos, como listas de palavras, do mais longo pro mais
// curto — usado para reconstruir o cabeçalho quando o TSV perde os tabs no
// copiar/colar (vira separado por espaço).
const KNOWN_COL_WORDS = STAT_COLUMNS.map((c) => c.col.split(/\s+/)).sort((a, b) => b.length - a.length);

function knownColAt(words, i) {
    for (const parts of KNOWN_COL_WORDS) {
        if (parts.every((p, k) => words[i + k] === p)) return parts;
    }
    return null;
}

/** Reconstrói a lista de colunas de um cabeçalho separado por espaço. */
function tokenizeHeaderLoose(header) {
    const words = header.trim().split(/\s+/);
    const cols = [];
    let i = 0;
    while (i < words.length) {
        const hit = knownColAt(words, i);
        if (hit) {
            cols.push(hit.join(' '));
            i += hit.length;
            continue;
        }
        // coluna desconhecida: junta as palavras até a próxima coluna conhecida
        const run = [words[i]];
        i += 1;
        while (i < words.length && !knownColAt(words, i)) {
            run.push(words[i]);
            i += 1;
        }
        cols.push(run.join(' '));
    }
    return cols;
}

/**
 * Se o texto não tem nenhum tab (colar perdeu os tabs), reconstrói o TSV: o
 * cabeçalho pelas colunas conhecidas, a linha de dados juntando o "ALL TIME"
 * inicial e separando o resto por espaço (codinome/facção/data/hora/números são
 * sempre um token só).
 */
function normalizeExportDelimiters(text) {
    const lines = String(text)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== '');
    if (lines.length < 2 || lines.some((l) => l.includes('\t'))) return text;

    const headerCols = tokenizeHeaderLoose(lines[0]);
    const dataLine = lines.slice(1).find((l) => /^all[ _]time\b/i.test(l)) || lines[1];
    let vals = dataLine.split(/\s+/);
    if (/^all$/i.test(vals[0]) && /^time$/i.test(vals[1])) vals = ['ALL TIME', ...vals.slice(2)];
    return [headerCols.join('\t'), vals.join('\t')].join('\n');
}

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
    const lines = String(normalizeExportDelimiters(tsvText))
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

    if (!agent.codename) {
        throw new Error(
            'Não parece um export de estatísticas do app: nenhuma coluna reconhecida (falta "Agent Name").',
        );
    }

    return {agent, capturedAt, stats, warnings};
}
