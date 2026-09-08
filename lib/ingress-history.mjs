/**
 * Histórico de snapshots do perfil (`profile.history`). Cada `build` de um export
 * novo adiciona um `{t, stats}`; o dump GDPR pode inserir pontos antigos. Daqui
 * saem a taxa de cada estatística e a projeção de quando um tier é batido.
 */

/**
 * Adiciona `snap` ({t, stats}) a `history`, sem duplicar por `t`, mantendo
 * ordenado por `t` ascendente. Não muta o array de entrada.
 */
export function appendSnapshot(history, snap) {
    const h = Array.isArray(history) ? history.map((s) => ({...s})) : []
    if (!snap || !snap.t) return h
    if (h.some((s) => s.t === snap.t)) return h
    h.push({t: snap.t, stats: {...(snap.stats || {})}})
    h.sort((a, b) => String(a.t).localeCompare(String(b.t)))
    return h
}

/**
 * Taxa (unidades por dia) de `statKey` entre o primeiro e o último snapshot com
 * valor válido. `null` se há menos de 2 pontos utilizáveis. Pode ser 0 ou
 * negativa (regressão / sem progresso).
 */
export function ratePerDay(history, statKey) {
    if (!Array.isArray(history) || history.length < 2) return null
    const points = history
        .map((s) => ({t: Date.parse(s.t), v: Number(s.stats?.[statKey])}))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .sort((a, b) => a.t - b.t)
    if (points.length < 2) return null
    const first = points[0]
    const last = points[points.length - 1]
    const days = (last.t - first.t) / 86_400_000
    if (days <= 0) return null
    return (last.v - first.v) / days
}

/**
 * @returns {{tier: string, date: string}}  estimativa da data (YYYY-MM-DD) do próximo tier
 *        | {reason: 'sem-progresso'}        taxa ≤ 0
 *        | null                             menos de 2 snapshots, ou já no tier máximo
 */
export function projectNextTier(history, badgeDef, currentValue) {
    const rate = ratePerDay(history, badgeDef.statKey)
    if (rate === null) return null

    const entries = Object.entries(badgeDef.tiers).sort((a, b) => a[1] - b[1])
    const nextEntry = entries.find(([, v]) => v > currentValue)
    if (!nextEntry) return null // já no tier máximo

    if (rate <= 0) return {reason: 'sem-progresso'}

    const daysToGo = (nextEntry[1] - currentValue) / rate
    const date = new Date(Date.now() + daysToGo * 86_400_000).toISOString().slice(0, 10)
    return {tier: nextEntry[0], date}
}
