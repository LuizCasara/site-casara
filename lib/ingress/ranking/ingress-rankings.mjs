/**
 * Regras de negócio puras do ranking do Ingress — normalização de chave e o
 * comparador de desempate do leaderboard. (O codinome do FencherLC não tem
 * mais guarda especial de escrita — ver `app/(ingress)/api/ingress-rankings/route.ts`.)
 */

/** Chave de identidade de um agente: `trim` + `lower-case`. Casing original fica só para exibição. */
export function normalizeCodenameKey(codename) {
    return String(codename ?? '').trim().toLowerCase()
}

/**
 * Comparador pra `Array.sort` — nota geral (desc) -> AP total (desc) -> data
 * da primeira medição (asc, quem se registrou primeiro). Espera os campos com
 * os mesmos nomes das colunas de `casara.ingress_rankings` (`overall_score`,
 * `lifetime_ap`, `created_at`), coagindo pra número/data pra funcionar tanto
 * com linhas vindas do Postgres (numeric/bigint chegam como string) quanto
 * com objetos de teste já numéricos.
 * @param {{overall_score:number|string, lifetime_ap:number|string, created_at:string|Date}} a
 * @param {{overall_score:number|string, lifetime_ap:number|string, created_at:string|Date}} b
 * @returns {number}
 */
export function compareRankingRows(a, b) {
    const scoreDiff = Number(b.overall_score) - Number(a.overall_score)
    if (scoreDiff !== 0) return scoreDiff
    const apDiff = Number(b.lifetime_ap) - Number(a.lifetime_ap)
    if (apDiff !== 0) return apDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

/** Granularidades aceitas por `GET /api/ingress-rankings/[codenameKey]/history` — mesmos valores de `date_trunc`. */
export const HISTORY_BUCKETS = ['day', 'month', 'year']

/** @param {string} bucket @returns {bucket is 'day'|'month'|'year'} */
export function isValidHistoryBucket(bucket) {
    return HISTORY_BUCKETS.includes(bucket)
}

/**
 * Paginação/ordenação/busca da tabela principal do ranking (feature
 * ingress-ranking-comparison) — allow-lists e construtores de query
 * parametrizada pra `sql.query(text, values)`. Puro, sem `fs`/DB: importado
 * tanto por rotas de API/SSR (server) quanto por `IngressRankingTable.tsx`
 * (client, só pelas allow-lists de validação local).
 */
export const RANKING_PAGE_SIZES = [20, 50, 100]

/** @param {number} n @returns {boolean} */
export function isValidPageSize(n) {
    return RANKING_PAGE_SIZES.includes(n)
}

export const RANKING_SORT_KEYS = [
    'score',
    'ap',
    'country',
    'construcao',
    'destruicao',
    'exploracao',
    'hacking',
    'linksCampos',
]

/** @param {string} key @returns {boolean} */
export function isValidSortKey(key) {
    return RANKING_SORT_KEYS.includes(key)
}

/** @param {string} dir @returns {dir is 'asc'|'desc'} */
export function isValidSortDir(dir) {
    return dir === 'asc' || dir === 'desc'
}

export const RANKING_FACTION_FILTERS = ['all', 'enlightened', 'resistance']

/** @param {string} faction @returns {boolean} */
export function isValidFactionFilter(faction) {
    return RANKING_FACTION_FILTERS.includes(faction)
}

/**
 * Coluna SQL (fixa, nunca vinda do input) por chave de ordenação — a única
 * fonte de texto de ORDER BY dinâmico. `sortKey` sempre passa por
 * `isValidSortKey` (allow-list) antes de chegar aqui; o valor devolvido é
 * sempre uma destas 8 strings fixas, nunca o parâmetro cru do visitante.
 */
const SORT_COLUMN_EXPR = {
    score: 'overall_score',
    ap: 'lifetime_ap',
    country: 'country_code',
    construcao: "(axis_scores->>'construcao')::numeric",
    destruicao: "(axis_scores->>'destruicao')::numeric",
    exploracao: "(axis_scores->>'exploracao')::numeric",
    hacking: "(axis_scores->>'hacking')::numeric",
    linksCampos: "(axis_scores->>'linksCampos')::numeric",
}

const SORT_DEFAULT_DIR = {
    score: 'desc',
    ap: 'desc',
    country: 'asc',
    construcao: 'desc',
    destruicao: 'desc',
    exploracao: 'desc',
    hacking: 'desc',
    linksCampos: 'desc',
}

/** @param {string} key @returns {'asc'|'desc'} */
export function defaultSortDir(key) {
    return SORT_DEFAULT_DIR[key] ?? 'desc'
}

/**
 * Monta a query da tabela principal paginada: rank canônico (nota geral desc
 * -> AP desc -> criado asc) calculado numa CTE ANTES de busca/filtro, pra
 * nunca mentir a colocação real mesmo com filtro/busca/ordenação de exibição
 * aplicados (ver spec IRCMP-18). `search`/`faction` sempre viram parâmetro
 * `$n`; a única coisa que vira texto SQL literal é a coluna de ORDER BY, e só
 * depois de `sortKey` passar pela allow-list de `isValidSortKey`.
 * @param {{page?: number, pageSize?: number, sortKey?: string, sortDir?: string, search?: string, faction?: string}} opts
 * @returns {{text: string, values: unknown[]}}
 */
export function buildRankingPageQuery({
    page = 1,
    pageSize = 20,
    sortKey = 'score',
    sortDir,
    search = '',
    faction = 'all',
} = {}) {
    const key = isValidSortKey(sortKey) ? sortKey : 'score'
    const dir = isValidSortDir(sortDir) ? sortDir : defaultSortDir(key)
    const column = SORT_COLUMN_EXPR[key]
    const size = isValidPageSize(pageSize) ? pageSize : 20
    const offset = (Math.max(1, page) - 1) * size

    const values = []
    const conditions = []
    const trimmedSearch = String(search ?? '').trim()
    if (trimmedSearch) {
        values.push(`%${trimmedSearch}%`)
        conditions.push(`codename ILIKE $${values.length}`)
    }
    if (faction === 'enlightened' || faction === 'resistance') {
        values.push(faction)
        conditions.push(`faction = $${values.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    values.push(size)
    const limitIdx = values.length
    values.push(offset)
    const offsetIdx = values.length

    const text = `
    WITH ranked AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC) AS rank
      FROM casara.ingress_rankings
    ), filtered AS (
      SELECT * FROM ranked ${where}
    )
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY ${column} ${dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, rank ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `
    return {text, values}
}

export const AGENT_SELECT_PAGE_SIZE = 100

/**
 * Monta a query do seletor de agentes (comparação): sem `search`, keyset por
 * `codename_key` (já é chave primária E já é `normalizeCodenameKey(codename)`
 * — ordenar por ela reproduz ordem alfabética case-insensitive do nickname
 * sem precisar de índice/coluna nova); com `search`, substitui a paginação
 * por uma busca de substring (sem cursor, como a spec pede).
 * @param {{cursor?: string|null, search?: string}} opts
 * @returns {{text: string, values: unknown[]}}
 */
export function buildAgentOptionsQuery({cursor = null, search = ''} = {}) {
    const trimmedSearch = String(search ?? '').trim()
    const base =
        'SELECT codename_key, codename, faction, lifetime_ap, country_code FROM casara.ingress_rankings'

    if (trimmedSearch) {
        return {
            text: `${base} WHERE codename ILIKE $1 ORDER BY codename_key ASC LIMIT $2`,
            values: [`%${trimmedSearch}%`, AGENT_SELECT_PAGE_SIZE],
        }
    }

    const values = []
    let where = ''
    if (cursor) {
        values.push(cursor)
        where = `WHERE codename_key > $${values.length}`
    }
    // Pede 1 a mais do que uma página inteira pra descobrir se há próxima
    // página sem uma 2ª query (COUNT à parte) — a rota corta o item extra.
    values.push(AGENT_SELECT_PAGE_SIZE + 1)
    return {
        text: `${base} ${where} ORDER BY codename_key ASC LIMIT $${values.length}`,
        values,
    }
}
