/**
 * Junta as datas de conquista de tiers (de `profile.medalDates` e de
 * `profile.eventBadges[].dates`) numa lista única ordenada, para a linha do
 * tempo de conquistas. Datas inválidas e slugs fora do catálogo são descartados.
 */

/**
 * @param {{medalDates?: object, eventBadges?: Array}} profile
 * @param {Record<string, {name: string, group?: string}>} catalog — de `loadCatalog()`
 * @returns {{slug: string, name: string, group: string, tier: string, date: string}[]} ordenado por data
 */
export function collectAcquisitions(profile, catalog) {
    const cat = catalog || {}
    const rows = []

    const push = (slug, tier, date) => {
        const entry = cat[slug]
        if (!entry) return
        const ts = Date.parse(date)
        if (!Number.isFinite(ts)) return
        rows.push({slug, name: entry.name, group: entry.group ?? 'other', tier, date, ts})
    }

    for (const [slug, tiers] of Object.entries(profile?.medalDates || {})) {
        for (const [tier, date] of Object.entries(tiers || {})) push(slug, tier, date)
    }
    for (const eb of profile?.eventBadges || []) {
        for (const [tier, date] of Object.entries(eb?.dates || {})) push(eb?.slug, tier, date)
    }

    rows.sort((a, b) => a.ts - b.ts)
    return rows.map((r) => ({slug: r.slug, name: r.name, group: r.group, tier: r.tier, date: r.date}))
}

/**
 * Anota cada conquista com o intervalo até a anterior da MESMA raia (mesmo
 * `slug`): `gapDays` (dias) e `prevTier` (o tier anterior daquela raia, para o
 * texto "…depois de Ouro"). `null` na primeira conquista de cada raia. Espera a
 * lista já ordenada por data (como sai de `collectAcquisitions`) — não reordena.
 *
 * @param {{slug: string, date: string}[]} rows
 */
export function annotateLaneGaps(rows) {
    const lastByLane = new Map()
    return (rows || []).map((r) => {
        const prev = lastByLane.get(r.slug)
        lastByLane.set(r.slug, r)
        if (!prev) return {...r, gapDays: null, prevTier: null}
        const ms = Date.parse(r.date) - Date.parse(prev.date)
        const gapDays = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : null
        return {...r, gapDays, prevTier: prev.tier}
    })
}

/**
 * Agrupa as conquistas (já anotadas por `annotateLaneGaps`) numa raia por
 * medalha: os tiers em ordem de data, o maior tier alcançado e a primeira data.
 * As raias saem ordenadas pela primeira conquista (a cronologia da swimlane).
 *
 * @param {{slug:string,name:string,group:string,tier:string,date:string,gapDays?:number|null,prevTier?:string|null}[]} rows
 * @returns {{slug:string,name:string,group:string,latestTier:string,firstDate:string,tiers:{tier:string,date:string,gapDays:number|null,prevTier:string|null}[]}[]}
 */
export function groupLanes(rows) {
    const map = new Map()
    for (const r of rows || []) {
        const lane = map.get(r.slug) || {slug: r.slug, name: r.name, group: r.group, tiers: []}
        lane.tiers.push({
            tier: r.tier,
            date: r.date,
            gapDays: r.gapDays ?? null,
            prevTier: r.prevTier ?? null,
        })
        map.set(r.slug, lane)
    }
    return [...map.values()]
        .map((l) => ({
            ...l,
            latestTier: l.tiers[l.tiers.length - 1].tier,
            firstDate: l.tiers[0].date,
        }))
        .sort((a, b) => Date.parse(a.firstDate) - Date.parse(b.firstDate))
}

/**
 * Duração aproximada e curta a partir de um número de dias: `"12d"`, `"5m"`,
 * `"1a 3m"`. Retorna `null` para `null`/não-finito/≤ 0.
 *
 * @param {number|null|undefined} days
 */
export function formatGap(days) {
    if (days == null || !Number.isFinite(days) || days <= 0) return null
    if (days < 45) return `${days}d`
    const months = Math.round(days / 30.44)
    if (months < 12) return `${months}m`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem ? `${years}a ${rem}m` : `${years}a`
}
