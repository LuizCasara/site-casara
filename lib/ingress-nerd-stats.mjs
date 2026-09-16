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
import {RADAR_STAT_KEYS} from './ingress-compare-message.mjs'

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
