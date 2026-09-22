/**
 * Nota geral do "Padrão de jogo" — server-only (arrasta `computeBadge`, que
 * por sua vez lê `badge-catalog.json` via `lib/ingress-catalog.mjs`, `fs`-based).
 *
 * Os limiares vêm do catálogo de badges (fonte da verdade) e a posição de tier
 * de cada stat vem de `lib/ingress-tier-position.mjs`: linear até o Onyx, e
 * 5 + log₂(valor/Onyx) depois dele — cada dobra do Onyx soma 1 posição. Este
 * módulo agrega as posições pelos 5 eixos de `lib/ingress-radar.mjs` e tira a
 * nota geral. É o que grava `overall_score` no ranking; o navegador chega ao
 * mesmo número por `computeRadarAxes` (mesma função de posição, limiares
 * espelhados e travados por teste). Decisão e motivos: ADR-0005.
 */
import {BADGES, computeBadge} from '../catalog/ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {TIERS, tierLabel} from '../catalog/ingress-tiers.mjs'
import {POINTS_PER_POSITION, tierPositionFromTiers} from './ingress-tier-position.mjs'

/** Ordem de `TIER_RANK` invertida, pra converter posição -> chave de tier. */
const RANK_TO_TIER = ['none', 'bronze', 'silver', 'gold', 'platinum', 'onyx']

const PORTALS_NEUTRALIZED_DIVISOR = 8

/**
 * Posição contínua de `value` na escada de `badgeDef` (0 = nada, 1 = Bronze, 5 =
 * Onyx; além do Onyx, 5 + log₂(valor/Onyx)). Ver `lib/ingress-tier-position.mjs`.
 * @param {{tiers: Record<string, number>}} badgeDef
 * @param {number} value
 * @returns {number}
 */
export function tierPosition(badgeDef, value) {
    return tierPositionFromTiers(
        value,
        TIERS.map((tier) => badgeDef.tiers[tier]),
    )
}

/** `badgeDef` sintético pra `portalsNeutralized` (sem badge própria): limiares do Purifier ÷ 8. */
function portalsNeutralizedBadgeDef() {
    const purifier = BADGES.find((b) => b.slug === 'purifier')
    const div = (v) => v / PORTALS_NEUTRALIZED_DIVISOR
    return {
        key: 'portals-neutralized-synthetic',
        name: 'Portais neutralizados',
        statKey: 'portalsNeutralized',
        tiers: {
            bronze: div(purifier.tiers.bronze),
            silver: div(purifier.tiers.silver),
            gold: div(purifier.tiers.gold),
            platinum: div(purifier.tiers.platinum),
            onyx: div(purifier.tiers.onyx),
        },
    }
}

function resolveBadgeDef(part) {
    if (part.badge) {
        const def = BADGES.find((b) => b.slug === part.badge)
        if (!def) throw new Error(`lib/ingress-tier-score: badge inexistente "${part.badge}"`)
        return def
    }
    return portalsNeutralizedBadgeDef()
}

/**
 * Nota de cada um dos 5 eixos do radar — média das `tierPosition` das partes
 * do eixo, pode passar de 5 (agente além do Onyx em algum lugar; nesse trecho
 * o crescimento é logarítmico, +1 por dobra).
 * @param {Record<string, number>} stats
 * @returns {{id: string, label: string, score: number}[]}
 */
export function computeAxisScores(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const positions = axis.parts.map((part) => {
            const badgeDef = resolveBadgeDef(part)
            const value = Number(s[part.key]) || 0
            return tierPosition(badgeDef, value)
        })
        const score = positions.reduce((sum, p) => sum + p, 0) / positions.length
        return {id: axis.id, label: axis.label, score}
    })
}

/**
 * Tier atingido em cada um dos 12 stats do radar — pro ícone de medalha (na
 * cor/nível certo) na tabela de ranking. `portalsNeutralized` não tem badge
 * própria (é sintética, ver `portalsNeutralizedBadgeDef`) — `badgeSlug` vem
 * `null` nesse caso; quem consome trata a ausência de arte (só o valor, sem
 * ícone).
 * @param {Record<string, number>} stats
 * @returns {Record<string, {tier: string, badgeSlug: string|null}>}
 */
export function computeStatTiers(stats) {
    const s = stats || {}
    const out = {}
    for (const axis of RADAR_AXES) {
        for (const part of axis.parts) {
            const badgeDef = resolveBadgeDef(part)
            const value = Number(s[part.key]) || 0
            const result = computeBadge(badgeDef, value)
            out[part.key] = {tier: result.tier, badgeSlug: part.badge ?? null}
        }
    }
    return out
}

/**
 * Nota geral 0-100+ (100 = Onyx em todos os 5 eixos): média das 5 notas de
 * eixo × 20.
 * @param {{id: string, label: string, score: number}[]} axisScores
 * @returns {number}
 */
export function computeOverallScore(axisScores) {
    const avg = axisScores.reduce((sum, a) => sum + a.score, 0) / axisScores.length
    return avg * POINTS_PER_POSITION
}

/**
 * Selo de tier geral (Bronze..Onyx, ou "Onyx +N" além do Onyx) — piso da
 * média das posições dos 5 eixos. `lang` (ISTATS-19) roteia pro `tierLabel()`
 * bilíngue de `lib/ingress-tiers.mjs`; default `'pt'` preserva o comportamento
 * anterior (nenhum call site existente precisa passar o parâmetro).
 * @param {{id: string, label: string, score: number}[]} axisScores
 * @param {'pt'|'en'} [lang]
 * @returns {string}
 */
export function overallTierLabel(axisScores, lang = 'pt') {
    const avg = axisScores.reduce((sum, a) => sum + a.score, 0) / axisScores.length
    const floor = Math.floor(avg)
    const tierKey = RANK_TO_TIER[Math.max(0, Math.min(5, floor))]
    const label = tierLabel(tierKey, lang)
    const beyond = floor - 5
    return beyond > 0 ? `${label} +${beyond}` : label
}
