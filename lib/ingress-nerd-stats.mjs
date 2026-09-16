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
