/**
 * Núcleo puro da aba "Estatísticas para Nerds" de `/ingress/ranking` — recebe
 * TODAS as linhas de `casara.ingress_rankings` (sem `LIMIT`, ao contrário da
 * tabela principal) e agrega tudo em Node, reaproveitando `computeStatTiers`/
 * `RADAR_AXES` já existentes em vez de duplicar limiares de tier em SQL. Sem
 * I/O — chamado por `app/ingress/ranking/page.tsx` (SSR), testado aqui via
 * `node --test`.
 *
 * Formato de linha esperado (mesmas colunas de `casara.ingress_rankings`,
 * snake_case — mesma convenção de `RankingRow` em `IngressRankingTable.tsx`):
 * `{codename_key, codename, faction, lifetime_ap, overall_score, axis_scores,
 * stat_values, recursions, extra_stats, months_subscribed, created_at}`.
 */
import {computeStatTiers} from './ingress-tier-score.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {RADAR_STAT_KEYS} from './ingress-compare-message.mjs'

/**
 * Bandas do histograma de `overall_score` — 6 faixas de 20 pontos (`max` fixo)
 * mais uma faixa aberta "Onyx+" pra quem passou de 120 (agente recursado,
 * `tierPosition` pode estender indefinidamente além do Onyx). Meio-aberto
 * `[min, max)`, exceto a última (`max: null`, sem teto).
 */
const OVERALL_SCORE_BANDS = [
    {label: 'Abaixo de Bronze', min: 0, max: 20},
    {label: 'Bronze', min: 20, max: 40},
    {label: 'Silver', min: 40, max: 60},
    {label: 'Gold', min: 60, max: 80},
    {label: 'Platinum', min: 80, max: 100},
    {label: 'Onyx', min: 100, max: 120},
    {label: 'Onyx+', min: 120, max: null},
]

const TIER_KEYS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']
const FACTIONS = ['enlightened', 'resistance']

/**
 * P1 — totais da comunidade. `badgeTiersGranted` soma os tiers atingidos nos
 * 12 stats do radar entre todos os agentes, excluindo `'none'` (MED-01: uma
 * badge sem tier existe, mas não é "medalha concedida"). `onyxClubCount` só
 * conta agente com os 12/12 stats em onyx simultaneamente.
 * @param {Record<string, unknown>[]} rows
 * @returns {{totalAgents:number, totalLifetimeAp:number, badgeTiersGranted:Record<string,number>, onyxBadgesGranted:number, onyxClubCount:number}}
 */
export function computeCommunityTotals(rows) {
    const totalAgents = rows.length
    let totalLifetimeAp = 0
    const badgeTiersGranted = Object.fromEntries(TIER_KEYS.map((t) => [t, 0]))
    let onyxClubCount = 0

    for (const row of rows) {
        totalLifetimeAp += Number(row.lifetime_ap) || 0

        const tiers = computeStatTiers(row.stat_values)
        let onyxCountForAgent = 0
        for (const key of RADAR_STAT_KEYS) {
            const tier = tiers[key]?.tier
            if (tier && tier !== 'none') {
                badgeTiersGranted[tier] += 1
                if (tier === 'onyx') onyxCountForAgent += 1
            }
        }
        if (onyxCountForAgent === RADAR_STAT_KEYS.length) onyxClubCount += 1
    }

    return {
        totalAgents,
        totalLifetimeAp,
        badgeTiersGranted,
        onyxBadgesGranted: badgeTiersGranted.onyx,
        onyxClubCount,
    }
}

/** Conta agentes de `rows` com os 12 stats do radar em tier onyx entre `agents` — reaproveitado por `computeFactionComparison`. */
function countOnyxBadges(agents) {
    let onyxBadges = 0
    for (const row of agents) {
        const tiers = computeStatTiers(row.stat_values)
        for (const key of RADAR_STAT_KEYS) {
            if (tiers[key]?.tier === 'onyx') onyxBadges += 1
        }
    }
    return onyxBadges
}

/**
 * P2 — comparativo por facção. Facção sem nenhum agente devolve zeros, nunca
 * omite a chave (o comparativo divergente precisa das duas linhas mesmo
 * zeradas — ver NERD-13).
 * @param {Record<string, unknown>[]} rows
 * @returns {Record<'enlightened'|'resistance', {agentCount:number, totalAp:number, avgOverallScore:number, onyxBadges:number}>}
 */
export function computeFactionComparison(rows) {
    const result = {}
    for (const faction of FACTIONS) {
        const agents = rows.filter((r) => r.faction === faction)
        const agentCount = agents.length
        const totalAp = agents.reduce((sum, r) => sum + (Number(r.lifetime_ap) || 0), 0)
        const avgOverallScore =
            agentCount === 0 ? 0 : agents.reduce((sum, r) => sum + (Number(r.overall_score) || 0), 0) / agentCount
        result[faction] = {agentCount, totalAp, avgOverallScore, onyxBadges: countOnyxBadges(agents)}
    }
    return result
}

/**
 * P3 — médias, distribuição de `overall_score` e ficha média da comunidade.
 * `recursions` só entre agentes com o campo preenchido (`IS NOT NULL`) —
 * ausência nunca vira 0 na média/máximo.
 * @param {Record<string, unknown>[]} rows
 * @returns {{avgApPerAgent:number, overallScoreHistogram:{label:string,min:number,max:number|null,count:number}[], communityAxisAverage:Record<string,number>, recursions:{avg:number|null,max:number|null,reportedCount:number}}}
 */
export function computeAveragesSection(rows) {
    const totalAgents = rows.length
    const totalAp = rows.reduce((sum, r) => sum + (Number(r.lifetime_ap) || 0), 0)
    const avgApPerAgent = totalAgents === 0 ? 0 : totalAp / totalAgents

    const overallScoreHistogram = OVERALL_SCORE_BANDS.map((band) => ({
        ...band,
        count: rows.filter((r) => {
            const score = Number(r.overall_score) || 0
            return score >= band.min && (band.max === null || score < band.max)
        }).length,
    }))

    const communityAxisAverage = {}
    for (const axis of RADAR_AXES) {
        const values = rows.map((r) => Number(r.axis_scores?.[axis.id]) || 0)
        communityAxisAverage[axis.id] = values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
    }

    const withRecursions = rows.filter((r) => r.recursions !== null && r.recursions !== undefined)
    const recursions = {
        avg:
            withRecursions.length === 0
                ? null
                : withRecursions.reduce((sum, r) => sum + Number(r.recursions), 0) / withRecursions.length,
        max: withRecursions.length === 0 ? null : Math.max(...withRecursions.map((r) => Number(r.recursions))),
        reportedCount: withRecursions.length,
    }

    return {avgApPerAgent, overallScoreHistogram, communityAxisAverage, recursions}
}

/** `true` se `a` é mais antigo que `b` (desempate por `created_at`, mesmo critério de `compareRankingRows`). */
function isOlder(a, b) {
    return new Date(a.created_at).getTime() < new Date(b.created_at).getTime()
}

/**
 * Recorde entre `rows` pelo valor de `getValue`, tratando chave ausente/não
 * numérica como 0 (mesmo comportamento de `computeStatTiers`/`computeBadge` —
 * nunca exclui o agente da disputa). Usado para os 12 stats do radar e AP.
 */
function pickRecordCoerceZero(rows, getValue) {
    let best = null
    for (const row of rows) {
        const value = Number(getValue(row)) || 0
        if (best === null || value > best.value || (value === best.value && isOlder(row, best.row))) {
            best = {row, value}
        }
    }
    return best ? {codenameKey: best.row.codename_key, codename: best.row.codename, value: best.value} : null
}

/**
 * Recorde entre `rows` pelo valor de `getValue`, EXCLUINDO agentes com valor
 * ausente/não numérico da disputa (nunca vira 0) — usado para `recursions`,
 * campo genuinamente "não informado" quando `null`.
 */
function pickRecordExcludeMissing(rows, getValue) {
    let best = null
    for (const row of rows) {
        const raw = getValue(row)
        if (raw === null || raw === undefined) continue
        const value = Number(raw)
        if (!Number.isFinite(value)) continue
        if (best === null || value > best.value || (value === best.value && isOlder(row, best.row))) {
            best = {row, value}
        }
    }
    return best ? {codenameKey: best.row.codename_key, codename: best.row.codename, value: best.value} : null
}

/**
 * P4 — hall da fama. Maior valor vence; empate exato resolvido pelo agente
 * com `created_at` mais antigo (mesmo critério de desempate do ranking
 * principal, `compareRankingRows`).
 * @param {Record<string, unknown>[]} rows
 * @returns {{perStat:Record<string,{codenameKey:string,codename:string,value:number}|null>, lifetimeAp:{codenameKey:string,codename:string,value:number}|null, recursions:{codenameKey:string,codename:string,value:number}|null}}
 */
export function computeHallOfFame(rows) {
    const perStat = {}
    for (const key of RADAR_STAT_KEYS) {
        perStat[key] = pickRecordCoerceZero(rows, (r) => r.stat_values?.[key])
    }
    const lifetimeAp = pickRecordCoerceZero(rows, (r) => r.lifetime_ap)
    const recursions = pickRecordExcludeMissing(rows, (r) => r.recursions)
    return {perStat, lifetimeAp, recursions}
}
