/**
 * Núcleo puro do "o que mudou entre dois envios" do painel de evolução do
 * ranking do Ingress (`GET /api/ingress-rankings/[codenameKey]/history/changes`).
 * Sem I/O — recebe dois mapas `chave -> valor` já lidos do banco e devolve a
 * lista de stats que mudaram, com o que o gráfico precisa pra destacar
 * medalha nova e subida de tier. Roda no servidor (a rota) porque enxerga o
 * catálogo de badges, que lê do disco: nada aqui pode ser importado por um
 * componente client.
 */
import {STAT_COLUMNS} from '../stats/ingress-stats.mjs'
import {BADGES, computeBadge} from '../catalog/ingress-badges.mjs'
import {TIER_RANK} from '../catalog/ingress-tiers.mjs'

/** Do bloco de identidade do export, só estes dois mudam com o tempo e interessam a alguém. */
const IDENTITY_KEYS_SHOWN = new Set(['level', 'monthsSubscribed'])

/**
 * Tudo que pode aparecer numa linha de mudança: as contagens acumuladas do
 * export, mais nível e meses de assinatura. `lifetimeAp` fica de fora — o AP
 * já é o gráfico em cima, repetir aqui seria ruído.
 */
const SHOWN_COLUMNS = STAT_COLUMNS.filter(
    (c) => c.key !== 'lifetimeAp' && (c.kind === 'stat' || IDENTITY_KEYS_SHOWN.has(c.key))
)

const BADGE_BY_STAT_KEY = Object.fromEntries(BADGES.map((b) => [b.statKey, b]))

/** Ordem dos destaques: primeira medalha, depois subida de tier, depois o resto. */
const KIND_ORDER = {'new-medal': 0, 'tier-up': 1}

const SHOWN_KEYS = SHOWN_COLUMNS.map((c) => c.key)

/**
 * Filtro de gravação: do payload que o cliente mandou, só as chaves que o
 * painel de evolução sabe exibir, e só valores numéricos. O histórico é
 * append-only (uma linha nova por envio, nunca podada), e `extra` chega sem
 * validação de formato — sem este filtro, um envio com blob gigante viraria
 * uma linha gigante permanente. Itera as chaves CONHECIDAS, não as do
 * payload, então o custo e o tamanho do resultado são limitados pela lista,
 * qualquer que seja a entrada.
 * @param {unknown} source
 * @returns {Record<string, number>|null} `null` se não é objeto plano ou não sobrou nada.
 */
export function pickHistoryStats(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null
    const out = {}
    for (const key of SHOWN_KEYS) {
        const value = source[key]
        if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    }
    return Object.keys(out).length > 0 ? out : null
}

/**
 * Junta o que um snapshot guardou (`stat_values` = os 12 stats do radar,
 * `extra_stats` = o resto do export) num mapa só. Em caso de colisão vale o
 * radar, que é o valor validado pela API. `null` quando o snapshot é de antes
 * de a tabela guardar stats — "não sei" não pode virar um mapa vazio, senão
 * o diff trataria todo stat como se tivesse sumido.
 * @param {{stat_values?: Record<string, unknown>|null, extra_stats?: Record<string, unknown>|null}} row
 * @returns {Record<string, unknown>|null}
 */
export function snapshotStats(row) {
    const radar = row?.stat_values ?? null
    const extra = row?.extra_stats ?? null
    if (!radar && !extra) return null
    return {...extra, ...radar}
}

/** Tier e múltiplo de Onyx de `value` para `statKey`, ou `null` se o stat não tem medalha no catálogo. */
function badgeState(statKey, value) {
    const def = BADGE_BY_STAT_KEY[statKey]
    if (!def) return null
    const badge = computeBadge(def, value)
    return {badgeSlug: def.slug, tier: badge.tier, onyxMultiple: badge.beyond?.multiple ?? null}
}

/** `'new-medal'` (saiu de abaixo do Bronze), `'tier-up'` (subiu de tier ou dobrou o Onyx) ou `null`. */
function highlightKind(from, to) {
    if (!from || !to) return null
    if (from.tier === 'none' && to.tier !== 'none') return 'new-medal'
    if (TIER_RANK[to.tier] > TIER_RANK[from.tier]) return 'tier-up'
    if (from.tier === 'onyx' && to.tier === 'onyx' && to.onyxMultiple > from.onyxMultiple) return 'tier-up'
    return null
}

/**
 * Compara dois snapshots (mapas de `snapshotStats`) e devolve os stats que
 * mudaram, já na ordem de exibição, mais quantos ficaram iguais. Só compara
 * chave presente e numérica nos DOIS lados: um stat que o export passou a
 * trazer não pode virar "0 → N" (não é evolução, é o dado que apareceu).
 * `null` se qualquer lado é `null` — não há baseline pra comparar.
 * @param {Record<string, unknown>|null} prev
 * @param {Record<string, unknown>|null} next
 * @returns {{changes: object[], unchanged: number}|null}
 */
export function diffSnapshots(prev, next) {
    if (!prev || !next) return null

    const changes = []
    let unchanged = 0
    for (const col of SHOWN_COLUMNS) {
        const from = Number(prev[col.key])
        const to = Number(next[col.key])
        if (prev[col.key] == null || next[col.key] == null || !Number.isFinite(from) || !Number.isFinite(to)) continue
        if (from === to) {
            unchanged += 1
            continue
        }
        const fromBadge = badgeState(col.key, from)
        const toBadge = badgeState(col.key, to)
        changes.push({
            key: col.key,
            label: col.label,
            labelEn: col.labelEn ?? col.label,
            from,
            to,
            delta: to - from,
            badgeSlug: toBadge?.badgeSlug ?? null,
            tierFrom: fromBadge?.tier ?? null,
            tierTo: toBadge?.tier ?? null,
            onyxMultiple: toBadge?.onyxMultiple ?? null,
            kind: highlightKind(fromBadge, toBadge),
        })
    }

    changes.sort((a, b) => {
        const byKind = (KIND_ORDER[a.kind] ?? 2) - (KIND_ORDER[b.kind] ?? 2)
        return byKind !== 0 ? byKind : b.delta - a.delta
    })
    return {changes, unchanged}
}
