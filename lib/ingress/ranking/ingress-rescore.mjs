/**
 * Planejamento PURO do recálculo da nota do ranking (ADR-0005: escala log₂ além
 * do Onyx). Não fala com o banco — `scripts/ingress/ingress-rescore.mjs` lê as linhas,
 * chama isto pra decidir o que gravar, mostra o resultado e só então escreve.
 * Separado em `lib/` pra ser testado: um erro aqui vira dado permanente errado
 * no ranking de produção.
 *
 * A nota é sempre recalculada a partir de `stat_values` (o dado bruto que o
 * agente enviou), nunca "convertida" da nota antiga — a nota antiga não guarda
 * quais stats passaram do Onyx.
 */
import {compareRankingRows} from './ingress-rankings.mjs'

/** `overall_score` é NUMERIC(7,2): duas casas. Diferenças menores que isto são arredondamento, não mudança. */
export const SCORE_EPSILON = 0.005

const round2 = (n) => Math.round(n * 100) / 100

/** Posição (1-based) de cada `codename_key`, na mesma ordenação do ranking (nota desc → AP desc → mais antigo). */
export function rankByKey(rows, scoreOf) {
    const sorted = [...rows].sort((a, b) => compareRankingRows({...a, overall_score: scoreOf(a)}, {...b, overall_score: scoreOf(b)}))
    return new Map(sorted.map((r, i) => [r.codename_key, i + 1]))
}

/**
 * @param {{
 *   rankings: {codename_key:string, codename:string, lifetime_ap:number|string, overall_score:number|string,
 *              axis_scores:object, stat_values:Record<string,number>, created_at:string|Date}[],
 *   latestHistory: Map<string, {id:number|string, lifetime_ap:number|string, overall_score:number|string, snapshots:number}>,
 *   computeAxisScores: (stats: Record<string, number>) => {id:string, score:number}[],
 *   computeOverallScore: (axisScores: {id:string, score:number}[]) => number,
 * }} input
 * @returns {{
 *   plans: {codenameKey:string, codename:string, statValues:object, oldScore:number, newScore:number,
 *           axisScores:Record<string, number>, oldRank:number, newRank:number, changed:boolean,
 *           history: {action:'update'|'skip'|'none', id?:number|string, reason?:string, olderSnapshots:number}}[],
 *   summary: {agents:number, changed:number, unchanged:number, rankChanged:number,
 *             historyUpdates:number, historySkipped:number, olderSnapshots:number}
 * }}
 */
export function planRescore({rankings, latestHistory, computeAxisScores, computeOverallScore}) {
    const computed = new Map()
    for (const r of rankings) {
        const axisScores = computeAxisScores(r.stat_values)
        computed.set(r.codename_key, {
            axisScores: Object.fromEntries(axisScores.map((a) => [a.id, a.score])),
            score: round2(computeOverallScore(axisScores)),
        })
    }

    const oldRank = rankByKey(rankings, (r) => Number(r.overall_score))
    const newRank = rankByKey(rankings, (r) => computed.get(r.codename_key).score)

    const plans = rankings.map((r) => {
        const next = computed.get(r.codename_key)
        const oldScore = Number(r.overall_score)
        const oldAxis = r.axis_scores || {}
        const axisChanged = Object.entries(next.axisScores).some(([id, score]) => !(Math.abs(Number(oldAxis[id]) - score) < 1e-6))
        const changed = Math.abs(next.score - oldScore) >= SCORE_EPSILON || axisChanged

        // O snapshot mais recente do histórico só é o "retrato" da linha atual se AP e nota batem — por construção
        // do `POST /api/ingress-rankings` (grava as duas tabelas juntas). Se não bater, alguém escreveu no meio e
        // reescrever esse snapshot com a nota nova seria inventar um retrato que nunca existiu.
        const h = latestHistory.get(r.codename_key)
        let history
        if (!h) {
            history = {action: 'none', olderSnapshots: 0}
        } else if (Number(h.lifetime_ap) === Number(r.lifetime_ap) && Math.abs(Number(h.overall_score) - oldScore) < SCORE_EPSILON) {
            history = {action: 'update', id: h.id, olderSnapshots: Number(h.snapshots) - 1}
        } else {
            history = {
                action: 'skip',
                id: h.id,
                reason: 'último snapshot não bate com a linha atual (AP ou nota diferentes)',
                olderSnapshots: Number(h.snapshots) - 1,
            }
        }

        return {
            codenameKey: r.codename_key,
            codename: r.codename,
            statValues: r.stat_values,
            oldScore,
            newScore: next.score,
            axisScores: next.axisScores,
            oldRank: oldRank.get(r.codename_key),
            newRank: newRank.get(r.codename_key),
            changed,
            history,
        }
    })

    const summary = {
        agents: plans.length,
        changed: plans.filter((p) => p.changed).length,
        unchanged: plans.filter((p) => !p.changed).length,
        rankChanged: plans.filter((p) => p.oldRank !== p.newRank).length,
        historyUpdates: plans.filter((p) => p.history.action === 'update').length,
        historySkipped: plans.filter((p) => p.history.action === 'skip').length,
        olderSnapshots: plans.reduce((sum, p) => sum + p.history.olderSnapshots, 0),
    }
    return {plans, summary}
}
