/**
 * O "plus" editorial de cada medalha de estatística: uma frase que explica o que
 * a métrica é, e comparações que reenquadram o número (`data/ingress/medal-lore.json`).
 * A matemática (razão / média por dia) vive aqui, testável; o componente só renderiza.
 */
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

const LORE_PATH = join(process.cwd(), 'data', 'ingress', 'medal-lore.json')

let cache = null

/** O arquivo inteiro `{ slug: { blurb, facts } }`. */
export function loadLore() {
    if (!cache) cache = JSON.parse(readFileSync(LORE_PATH, 'utf8'))
    return cache
}

/**
 * @param {string} slug
 * @param {number} value — o valor atual da estatística
 * @param {number} daysPlaying — dias entre a 1ª conquista e o último export
 * @returns {{blurb: string, facts: {n: number, label: string}[]} | null}
 */
export function medalLore(slug, value, daysPlaying, lore = loadLore()) {
    const entry = lore[slug]
    if (!entry) return null
    const v = Number.isFinite(value) ? value : 0
    const days = Math.max(1, daysPlaying)
    const facts = (entry.facts || [])
        .map((f) => {
            const n = f.rate ? v / days : v / (f.per || 1)
            return {n, label: f.rate || f.label}
        })
        .filter((f) => Number.isFinite(f.n) && f.n > 0)
    return {blurb: entry.blurb, facts}
}

/** Número da comparação em pt-BR: inteiro com milhar acima de 10, senão 1–2 casas. */
export function formatLoreNumber(n) {
    if (!Number.isFinite(n)) return '0'
    if (n >= 10) return new Intl.NumberFormat('pt-BR').format(Math.round(n))
    if (n >= 1) return n.toLocaleString('pt-BR', {maximumFractionDigits: 1})
    return n.toLocaleString('pt-BR', {maximumFractionDigits: 2})
}
