/**
 * Nota geral do "Padrão de jogo" — server-only (arrasta `computeBadge`, que
 * por sua vez lê `badge-catalog.json` via `lib/ingress-catalog.mjs`, `fs`-based).
 *
 * Não recalcula tiers do zero: `computeBadge()` (`lib/ingress-badges.mjs`) já
 * interpola tier/progresso/overflow-pós-Onyx; este módulo só converte essa
 * saída num número contínuo de "posição de tier" (1 = Bronze, 5 = Onyx, e além
 * disso quando o agente passou do Onyx) e agrega pelos 5 eixos de
 * `lib/ingress-radar.mjs`.
 */
import {BADGES, computeBadge} from './ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {TIER_RANK, tierLabel} from './ingress-tiers.mjs'

/** Ordem de `TIER_RANK` invertida, pra converter posição -> chave de tier. */
const RANK_TO_TIER = ['none', 'bronze', 'silver', 'gold', 'platinum', 'onyx']

const PORTALS_NEUTRALIZED_DIVISOR = 8

/**
 * Posição contínua de um stat na escada de tier (1 = limiar de Bronze, 5 =
 * limiar de Onyx). Abaixo de Bronze fica entre 0 e 1; além de Onyx estende
 * linearmente por "dobra" (Onyx ×2 = posição 6, ×3 = posição 7, ...).
 * @param {ReturnType<computeBadge>} badgeResult
 * @returns {number}
 */
export function tierPosition(badgeResult) {
    if (!badgeResult.atMax) {
        return TIER_RANK[badgeResult.tier] + (badgeResult.pct ?? 0)
    }
    return 5 + (badgeResult.beyond.multiple - 1) + badgeResult.beyond.pct
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
 * do eixo, pode passar de 5 (agente além do Onyx em algum lugar).
 * @param {Record<string, number>} stats
 * @returns {{id: string, label: string, score: number}[]}
 */
export function computeAxisScores(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const positions = axis.parts.map((part) => {
            const badgeDef = resolveBadgeDef(part)
            const value = Number(s[part.key]) || 0
            return tierPosition(computeBadge(badgeDef, value))
        })
        const score = positions.reduce((sum, p) => sum + p, 0) / positions.length
        return {id: axis.id, label: axis.label, score}
    })
}

/**
 * Nota geral 0-100+ (100 = Onyx em todos os 5 eixos): média das 5 notas de
 * eixo × 20.
 * @param {{id: string, label: string, score: number}[]} axisScores
 * @returns {number}
 */
export function computeOverallScore(axisScores) {
    const avg = axisScores.reduce((sum, a) => sum + a.score, 0) / axisScores.length
    return avg * 20
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
