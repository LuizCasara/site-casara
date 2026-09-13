/**
 * Regras de negócio puras do ranking do Ingress — normalização de chave e o
 * comparador de desempate do leaderboard. (O codinome do FencherLC não tem
 * mais guarda especial de escrita — ver `app/api/ingress-rankings/route.ts`.)
 */

/** Chave de identidade de um agente: `trim` + `lower-case`. Casing original fica só para exibição. */
export function normalizeCodenameKey(codename) {
    return String(codename ?? '').trim().toLowerCase()
}

/**
 * Comparador pra `Array.sort` — nota geral (desc) -> AP total (desc) -> data
 * da primeira medição (asc, quem se registrou primeiro). Espera os campos com
 * os mesmos nomes das colunas de `casara.ingress_rankings` (`overall_score`,
 * `lifetime_ap`, `created_at`), coagindo pra número/data pra funcionar tanto
 * com linhas vindas do Postgres (numeric/bigint chegam como string) quanto
 * com objetos de teste já numéricos.
 * @param {{overall_score:number|string, lifetime_ap:number|string, created_at:string|Date}} a
 * @param {{overall_score:number|string, lifetime_ap:number|string, created_at:string|Date}} b
 * @returns {number}
 */
export function compareRankingRows(a, b) {
    const scoreDiff = Number(b.overall_score) - Number(a.overall_score)
    if (scoreDiff !== 0) return scoreDiff
    const apDiff = Number(b.lifetime_ap) - Number(a.lifetime_ap)
    if (apDiff !== 0) return apDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}
