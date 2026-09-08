/**
 * Junta as datas de conquista de tiers (de `profile.medalDates` e de
 * `profile.eventBadges[].dates`) numa lista única ordenada, para a timeline de
 * conquistas. Datas inválidas e slugs fora do catálogo são descartados.
 */

/**
 * @param {{medalDates?: object, eventBadges?: Array}} profile
 * @param {Record<string, {name: string}>} catalog — de `loadCatalog()`
 * @returns {{slug: string, name: string, tier: string, date: string}[]} ordenado por data
 */
export function collectAcquisitions(profile, catalog) {
    const cat = catalog || {}
    const rows = []

    const push = (slug, tier, date) => {
        const entry = cat[slug]
        if (!entry) return
        const ts = Date.parse(date)
        if (!Number.isFinite(ts)) return
        rows.push({slug, name: entry.name, tier, date, ts})
    }

    for (const [slug, tiers] of Object.entries(profile?.medalDates || {})) {
        for (const [tier, date] of Object.entries(tiers || {})) push(slug, tier, date)
    }
    for (const eb of profile?.eventBadges || []) {
        for (const [tier, date] of Object.entries(eb?.dates || {})) push(eb?.slug, tier, date)
    }

    rows.sort((a, b) => a.ts - b.ts)
    return rows.map((r) => ({slug: r.slug, name: r.name, tier: r.tier, date: r.date}))
}
