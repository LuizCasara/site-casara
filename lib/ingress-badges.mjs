/**
 * Medalhas de contagem do Ingress (29). `BADGES` é derivado do catálogo
 * (`lib/ingress-catalog.mjs` → `data/ingress/badge-catalog.json`, gerado do
 * ingress.plus, com os limiares que o scanner do jogo mostra diferente
 * sobrescritos — ver `TIER_OVERRIDES` em `scripts/ingress-catalog-gen.mjs`).
 * O cálculo de tier é feito no render, não congelado no perfil.
 * `statKey` referencia uma chave de `lib/ingress-stats.mjs`.
 */
import {coreBadges} from './ingress-catalog.mjs'

const ORDER = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

export const TIER_LABELS = {
    none: 'Sem medalha',
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
    onyx: 'Onyx',
}

/** As 26 badges de estatística, na ordem do catálogo. `key === slug`. */
export const BADGES = coreBadges().map((b) => ({
    key: b.slug,
    slug: b.slug,
    name: b.name,
    statKey: b.statKey,
    requirement: b.requirement,
    tiers: {
        bronze: b.tiers[0],
        silver: b.tiers[1],
        gold: b.tiers[2],
        platinum: b.tiers[3],
        onyx: b.tiers[4],
    },
}))

const BADGE_INDEX = new Map(BADGES.map((b, i) => [b.key, i]))

/**
 * @param {{key:string,name:string,statKey:string,tiers:object}} badgeDef
 * @param {number} statValue
 * @returns {{key,name,statKey,value,tier,atMax,pct,next:{tier:string,remaining:number}|null}}
 *   `pct` = progresso 0..1 do tier atual até o próximo (`null` se atMax).
 */
export function computeBadge(badgeDef, statValue) {
    const value = Number.isFinite(Number(statValue)) ? Number(statValue) : 0
    let tier = 'none'
    for (const name of ORDER) {
        if (value >= badgeDef.tiers[name]) tier = name
    }
    const atMax = tier === 'onyx'
    let next = null
    let pct = null
    if (!atMax) {
        const nextTier = tier === 'none' ? ORDER[0] : ORDER[ORDER.indexOf(tier) + 1]
        const prevThreshold = tier === 'none' ? 0 : badgeDef.tiers[tier]
        const nextThreshold = badgeDef.tiers[nextTier]
        next = {tier: nextTier, remaining: nextThreshold - value}
        pct = Math.max(0, Math.min(1, (value - prevThreshold) / (nextThreshold - prevThreshold)))
    }
    return {
        key: badgeDef.key,
        name: badgeDef.name,
        statKey: badgeDef.statKey,
        value,
        tier,
        atMax,
        pct,
        next,
    }
}

/**
 * Todas as 26 badges computadas. Badge cuja estatística não está em `stats`
 * aparece com `tier: 'none'` (não é omitida — ver MED-01).
 */
export function computeAllBadges(stats) {
    const s = stats || {}
    return BADGES.map((b) => computeBadge(b, s[b.statKey] ?? 0))
}

/** Contagem de badges por tier: `{onyx, platinum, gold, silver, bronze, none}`. */
export function tierCounts(badges) {
    const counts = {onyx: 0, platinum: 0, gold: 0, silver: 0, bronze: 0, none: 0}
    for (const b of badges) counts[b.tier] = (counts[b.tier] ?? 0) + 1
    return counts
}

/**
 * A badge não-máxima com maior progresso (`pct`) até o próximo tier.
 * Desempate: ordem do catálogo. `null` se todas estão em Onyx.
 */
export function nextMedal(badges) {
    let best = null
    for (const b of badges) {
        if (b.atMax || b.pct == null) continue
        if (
            best === null ||
            b.pct > best.pct ||
            (b.pct === best.pct && BADGE_INDEX.get(b.key) < BADGE_INDEX.get(best.key))
        ) {
            best = b
        }
    }
    return best
}
