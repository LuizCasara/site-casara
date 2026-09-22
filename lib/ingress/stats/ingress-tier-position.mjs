/**
 * Posição contínua de um stat na escada de tier — a ÚNICA fórmula do "Padrão de
 * jogo". Pura (sem I/O, sem catálogo): o servidor (`lib/ingress/stats/ingress-tier-score.mjs`,
 * que grava a nota do ranking) e o navegador (`lib/ingress/stats/ingress-radar.mjs`, que
 * desenha o radar) chamam esta mesma função, então o número que o agente vê na
 * tela é o número que foi gravado no banco. Decisão e motivos em
 * `docs/adr/0005-escala-logaritmica-alem-do-onyx.md`.
 *
 *   valor < Onyx  → interpolação LINEAR entre os limiares
 *                    (0 = nada, 1 = Bronze, 2 = Silver, 3 = Gold,
 *                     4 = Platinum, 5 = Onyx)
 *   valor ≥ Onyx  → 5 + log₂(valor / Onyx)
 *                    (cada vez que o valor DOBRA em relação ao Onyx, +1 posição:
 *                     Onyx ×2 = 6, ×4 = 7, ×8 = 8, ×16 = 9 ...)
 *
 * Antes desta escala o trecho além do Onyx era linear (×2 = 6, ×3 = 7, ×148 =
 * 152), e uma única medalha com valor centenas de vezes o Onyx (Mind Units)
 * decidia sozinha a nota geral. No log₂ a estatística continua sempre somando,
 * mas cada dobra vale o mesmo: dobrar de 4M para 8M de MU rende o mesmo que
 * dobrar de 300M para 600M. As duas pontas se encontram: em ×1 e em ×2 o log₂
 * dá exatamente o mesmo número que a escala linear antiga.
 *
 * O trecho abaixo do Onyx NÃO é log: os limiares de tier já são a régua do
 * jogo, e é neles que o agente enxerga o próprio progresso.
 */

/** Posição do Onyx na escada (Bronze = 1 ... Onyx = 5). */
export const ONYX_POSITION = 5

/**
 * @param {number} value valor bruto do stat (negativo/NaN contam como 0)
 * @param {readonly number[]} tiers os 5 limiares em ordem `[bronze, silver, gold, platinum, onyx]`
 * @returns {number} 0 … 5 abaixo do Onyx; 5 + log₂(valor/Onyx) a partir dele
 */
export function tierPositionFromTiers(value, tiers) {
    const n = Number(value)
    const v = Number.isFinite(n) && n > 0 ? n : 0
    const onyx = tiers[tiers.length - 1]
    if (v >= onyx) return ONYX_POSITION + Math.log2(v / onyx)

    let reached = 0
    for (let i = 0; i < tiers.length; i += 1) {
        if (v >= tiers[i]) reached = i + 1
    }
    const prev = reached === 0 ? 0 : tiers[reached - 1]
    const next = tiers[reached]
    return reached + Math.max(0, Math.min(1, (v - prev) / (next - prev)))
}

/** Pontos de nota por posição de tier: 5 posições (Onyx) × 20 = 100. */
export const POINTS_PER_POSITION = 20
