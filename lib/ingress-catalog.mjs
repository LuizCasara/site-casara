/**
 * Acesso ao catálogo de badges (`data/ingress/badge-catalog.json`, gerado por
 * `scripts/ingress-catalog-gen.mjs`). Consumido pela página, pelo CLI e por
 * `lib/ingress-badges.mjs` (que passa a derivar as badges daqui).
 */
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

export {artPath} from './ingress-art.mjs'

const CATALOG_PATH = join(process.cwd(), 'data', 'ingress', 'badge-catalog.json')

let cache = null

/** O catálogo inteiro `{ slug: entry }`, na ordem do arquivo. */
export function loadCatalog() {
    if (!cache) cache = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
    return cache
}

/** A entrada de um slug (com o `slug` embutido), ou `null`. */
export function catalogEntry(slug) {
    const entry = loadCatalog()[slug]
    return entry ? {slug, ...entry} : null
}

/**
 * Só as badges `group: 'core'` (as de estatística), na ordem do arquivo.
 * `cat` é injetável para teste; por padrão usa o catálogo em disco.
 */
export function coreBadges(cat = loadCatalog()) {
    return Object.entries(cat)
        .filter(([, e]) => e.group === 'core')
        .map(([slug, e]) => ({slug, ...e}))
}

/** O slug da badge core cuja estatística é `statKey`, ou `null`. */
export function slugForStatKey(statKey, cat = loadCatalog()) {
    const hit = coreBadges(cat).find((b) => b.statKey === statKey)
    return hit ? hit.slug : null
}
