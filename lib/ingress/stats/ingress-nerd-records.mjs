/**
 * Os "recordes" das estatísticas para nerds — hall da fama, engajamento sazonal
 * e assinatura paga — num formato único, pra que as três visões (Resumo, Cards,
 * Agentes) desenhem a MESMA lista sem cada uma refazer a conta.
 *
 * Tudo aqui é dado puro, sem React e sem `window`: é o que `npm test` cobre.
 * Não importa `ingress-nerd-stats.mjs` (ele arrasta o catálogo, que lê o disco
 * com `node:fs` e quebraria o bundle de um Client Component), só os módulos que
 * o componente já importava.
 *
 * Um item é `{key, label:{pt,en}, unit, value, holder, holderValue, badge,
 * onyxMultiple, reportedCount}`:
 * - `value` é o número de destaque (no sazonal, a SOMA da comunidade);
 * - `holder`/`holderValue` são o agente recordista e o valor dele (no hall
 *   coincidem com `value`; no sazonal `holderValue` é o do recordista, não a soma).
 *   `holder` é `null` nos indicadores da comunidade (ex.: "% com assinatura");
 * - `unit` diz como formatar: `count` | `percent` | `decimal` | `months`.
 */
import {RADAR_AXES} from './ingress-radar.mjs'
import {STAT_COLUMNS} from './ingress-stats.mjs'

/**
 * Mesma lista de `HALL_OF_FAME_EXTRA_KEYS` em `ingress-nerd-stats.mjs` — copiada,
 * não importada, pelo motivo do topo. `ingress-nerd-records.test.mjs` compara as
 * duas, então esquecer de mudar uma das duas quebra o teste.
 */
export const HALL_OF_FAME_EXTRA_KEYS = [
    'portalsCaptured',
    'uniquePortalsCaptured',
    'longestSojournerStreak',
    'oprAgreements',
    'portalScansUploaded',
    'uniquesScoutControlled',
    'maxTimePortalHeldDays',
    'missionDaysAttended',
    'droneHacks',
    'machinaPortalsReclaimed',
    'completedHackstreaks',
]

/**
 * Grupos do hall, na ordem em que aparecem em Cards. `hero` = cartão largo. Um
 * stat novo no radar ou nos extras precisa entrar aqui — o teste reprova se
 * algum ficar de fora, senão ele sumiria de Cards e de Agentes sem aviso.
 */
export const HALL_GROUPS = [
    {id: 'general', title: null, hero: true, keys: ['lifetimeAp', 'recursions']},
    {
        id: 'build',
        title: {pt: 'Construir e capturar', en: 'Build and capture'},
        hero: false,
        keys: [
            'resonatorsDeployed',
            'modsDeployed',
            'linksCreated',
            'controlFieldsCreated',
            'mindUnitsCaptured',
            'portalsCaptured',
            'uniquePortalsCaptured',
        ],
    },
    {
        id: 'destroy',
        title: {pt: 'Destruir e hackear', en: 'Destroy and hack'},
        hero: false,
        keys: [
            'resonatorsDestroyed',
            'portalsNeutralized',
            'hacks',
            'droneHacks',
            'machinaPortalsReclaimed',
            'completedHackstreaks',
        ],
    },
    {
        id: 'explore',
        title: {pt: 'Explorar', en: 'Explore'},
        hero: false,
        keys: [
            'uniquePortalsVisited',
            'distanceWalkedKm',
            'uniqueMissionsCompleted',
            'glyphHackPoints',
            'longestSojournerStreak',
            'maxTimePortalHeldDays',
        ],
    },
    {
        id: 'contribute',
        title: {pt: 'Contribuir', en: 'Contribute'},
        hero: false,
        keys: ['oprAgreements', 'portalScansUploaded', 'uniquesScoutControlled', 'missionDaysAttended'],
    },
]

/** Rótulo pt/en de cada stat do hall: o radar e as colunas extras já os têm (fonte única), só AP e recursões são daqui. */
const HALL_LABELS = {
    lifetimeAp: {pt: 'Maior AP (lifetime)', en: 'Highest AP (lifetime)'},
    recursions: {pt: 'Mais recursões', en: 'Most recursions'},
}
for (const axis of RADAR_AXES) {
    for (const part of axis.parts) HALL_LABELS[part.key] = {pt: part.label, en: part.labelEn}
}
for (const column of STAT_COLUMNS) {
    if (HALL_OF_FAME_EXTRA_KEYS.includes(column.key)) {
        HALL_LABELS[column.key] = {pt: column.label, en: column.labelEn ?? column.label}
    }
}

/** "Simulacrum" — badge de evento único (sem tiers) ligada à primeira recursão do agente. */
const SIMULACRUM_SLUG = 'simulacrum'

/** Rótulo de cada métrica sazonal; a ordem das chaves é a ordem de exibição (= `SEASONAL_ENGAGEMENT_KEYS`). */
export const SEASONAL_LABELS = {
    firstSaturdayEvents: {pt: 'First Saturdays', en: 'First Saturday events'},
    secondSundayEvents: {pt: 'Second Sundays', en: 'Second Sunday events'},
    clearFieldsEvents: {pt: 'Clear Fields', en: 'Clear Fields events'},
    battleBeaconCombatant: {pt: 'Battle Beacon (combatente)', en: 'Battle Beacon combatant'},
    nl1331MeetupsAttended: {pt: 'Meetups NL-1331', en: 'NL-1331 meetups attended'},
    seerPoints: {pt: 'Pontos Seer', en: 'Seer points'},
    xmRecharged: {pt: 'XM recarregado', en: 'XM recharged'},
    agentsRecruited: {pt: 'Agentes recrutados', en: 'Agents recruited'},
}

/** Medalha C.O.R.E. usada no recordista de assinatura — só um ícone, o tier não depende do dado. */
const CORE_SLUG = 'core'

function holderOf(record) {
    return {
        codenameKey: record.codenameKey,
        codename: record.codename,
        faction: record.faction,
        countryCode: record.countryCode ?? null,
    }
}

function makeItem(fields) {
    return {
        holder: null,
        holderValue: null,
        badge: null,
        onyxMultiple: null,
        reportedCount: null,
        unit: 'count',
        ...fields,
    }
}

function recordItem(key, label, record, {badge, onyxMultiple = null}) {
    return makeItem({key, label, value: record.value, holder: holderOf(record), holderValue: record.value, badge, onyxMultiple})
}

/** Recurso da medalha de um recorde do hall: a do próprio stat, Simulacrum pras recursões, nenhuma pro AP. */
function hallBadge(key, record) {
    if (key === 'recursions') return {slug: SIMULACRUM_SLUG, tier: null}
    if (key === 'lifetimeAp' || !record.badgeSlug) return null
    return {slug: record.badgeSlug, tier: record.tier ?? null}
}

/**
 * Hall da fama em seções. Stat sem recorde (nenhum agente informou) é omitido, e
 * um grupo que fica vazio some — em vez de uma linha "—" que não diz nada.
 * @param {{perStat: Record<string, object|null>, lifetimeAp: object|null, recursions: object|null}} hall
 */
export function buildHallSections({perStat, lifetimeAp, recursions}) {
    const records = {...perStat, lifetimeAp, recursions}
    const sections = []
    for (const group of HALL_GROUPS) {
        const items = []
        for (const key of group.keys) {
            const record = records[key]
            if (!record) continue
            items.push(recordItem(key, HALL_LABELS[key], record, {badge: hallBadge(key, record), onyxMultiple: record.onyxMultiple ?? null}))
        }
        if (items.length > 0) sections.push({id: group.id, title: group.title, hero: group.hero, items})
    }
    return sections
}

/**
 * Engajamento sazonal: a soma da comunidade é o destaque e o recordista é o dono.
 * A medalha é sempre Onyx (é a arte mais reconhecível do evento), e não há
 * múltiplo de Onyx — o valor é uma soma de vários agentes, não o feito de um.
 * @param {Record<string, {sum:number, reportedCount:number, badgeSlug:string|null, top:object|null}>} metrics
 */
export function buildSeasonalSections(metrics) {
    const items = []
    for (const key of Object.keys(SEASONAL_LABELS)) {
        const metric = metrics[key]
        if (!metric || !metric.top) continue
        items.push(
            makeItem({
                key,
                label: SEASONAL_LABELS[key],
                value: metric.sum,
                holder: holderOf(metric.top),
                holderValue: metric.top.value,
                badge: metric.badgeSlug ? {slug: metric.badgeSlug, tier: 'onyx'} : null,
                reportedCount: metric.reportedCount,
            })
        )
    }
    return items.length > 0 ? [{id: 'seasonal', title: null, hero: false, items}] : []
}

const SUBSCRIPTION_LABELS = {
    reportedCount: {pt: 'Agentes com esse dado', en: 'Agents with this data'},
    percentSubscribed: {pt: '% da comunidade com assinatura', en: '% of the community with a subscription'},
    avgMonths: {pt: 'Média de meses (entre assinantes)', en: 'Average months (among subscribers)'},
    topMonths: {pt: 'Mais meses de assinatura', en: 'Most months subscribed'},
}

/**
 * Assinatura paga: três indicadores da comunidade (sem dono) e, se houver, o
 * recordista de meses. Sem nenhum agente com o dado, não há seção.
 * @param {{hasData:boolean, reportedCount:number, percentSubscribed:number|null, avgMonthsAmongSubscribed:number|null, top:object|null}} sub
 */
export function buildSubscriptionSections({hasData, reportedCount, percentSubscribed, avgMonthsAmongSubscribed, top}) {
    if (!hasData) return []
    const items = [
        makeItem({key: 'reportedCount', label: SUBSCRIPTION_LABELS.reportedCount, value: reportedCount}),
        makeItem({
            key: 'percentSubscribed',
            label: SUBSCRIPTION_LABELS.percentSubscribed,
            value: Math.round(percentSubscribed ?? 0),
            unit: 'percent',
        }),
    ]
    if (avgMonthsAmongSubscribed !== null && avgMonthsAmongSubscribed !== undefined) {
        items.push(makeItem({key: 'avgMonths', label: SUBSCRIPTION_LABELS.avgMonths, value: avgMonthsAmongSubscribed, unit: 'decimal'}))
    }
    if (top) {
        items.push(
            makeItem({
                key: 'topMonths',
                label: SUBSCRIPTION_LABELS.topMonths,
                value: top.value,
                holder: holderOf(top),
                holderValue: top.value,
                unit: 'months',
                badge: {slug: CORE_SLUG, tier: null},
            })
        )
    }
    return [{id: 'subscription', title: null, hero: false, items}]
}

/**
 * Regrupa as seções por recordista, pra visão "Agentes": quem segura mais
 * recordes vem primeiro (empate: codinome em ordem alfabética, pra a ordem não
 * depender de como os dados chegaram). Itens sem dono — os indicadores da
 * comunidade — vão em `community`, que a visão mostra num cartão à parte.
 * @param {{items: {holder: {codenameKey:string}|null}[]}[]} sections
 */
export function groupByHolder(sections) {
    const byKey = new Map()
    const community = []
    for (const section of sections) {
        for (const item of section.items) {
            if (!item.holder) {
                community.push(item)
                continue
            }
            const entry = byKey.get(item.holder.codenameKey) ?? {holder: item.holder, items: []}
            entry.items.push(item)
            byKey.set(item.holder.codenameKey, entry)
        }
    }
    const agents = [...byKey.values()].sort(
        (a, b) => b.items.length - a.items.length || (a.holder.codenameKey < b.holder.codenameKey ? -1 : a.holder.codenameKey > b.holder.codenameKey ? 1 : 0)
    )
    return {agents, community}
}
