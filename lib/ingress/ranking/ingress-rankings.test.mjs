import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    normalizeCodenameKey,
    compareRankingRows,
    isValidHistoryBucket,
    isValidPageSize,
    isValidSortKey,
    isValidSortDir,
    isValidFactionFilter,
    defaultSortDir,
    buildRankingPageQuery,
    buildAgentOptionsQuery,
    RANKING_PAGE_SIZES,
    RANKING_SORT_KEYS,
    AGENT_SELECT_PAGE_SIZE,
} from './ingress-rankings.mjs'

test('normalizeCodenameKey: trim + lower-case, casing e espaços variados', () => {
    assert.equal(normalizeCodenameKey('FencherLC'), 'fencherlc')
    assert.equal(normalizeCodenameKey('  FencherLC  '), 'fencherlc')
    assert.equal(normalizeCodenameKey('AgEnT-42'), 'agent-42')
})

test('normalizeCodenameKey: entrada vazia/ausente -> string vazia', () => {
    assert.equal(normalizeCodenameKey(''), '')
    assert.equal(normalizeCodenameKey('   '), '')
    assert.equal(normalizeCodenameKey(undefined), '')
})

test('compareRankingRows: ordena por nota geral desc -> AP total desc -> created_at asc', () => {
    // d: nota mais alta -> 1º. c/a/b: mesma nota (90) -> desempate por AP (c > a==b) ->
    // a e b empatam em nota E AP -> desempate por data (a é mais antigo que b).
    const d = {codename_key: 'd', overall_score: 95, lifetime_ap: 500, created_at: '2026-01-01T00:00:00Z'}
    const c = {codename_key: 'c', overall_score: 90, lifetime_ap: 2000, created_at: '2026-03-01T00:00:00Z'}
    const a = {codename_key: 'a', overall_score: 90, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const b = {codename_key: 'b', overall_score: 90, lifetime_ap: 1000, created_at: '2026-02-01T00:00:00Z'}

    const sorted = [b, a, d, c].sort(compareRankingRows).map((r) => r.codename_key)
    assert.deepEqual(sorted, ['d', 'c', 'a', 'b'])
})

test('compareRankingRows: nota igual -> desempata por AP total', () => {
    const higherAp = {overall_score: 80, lifetime_ap: 2000, created_at: '2026-01-01T00:00:00Z'}
    const lowerAp = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    assert.ok(compareRankingRows(higherAp, lowerAp) < 0)
    assert.ok(compareRankingRows(lowerAp, higherAp) > 0)
})

test('compareRankingRows: nota e AP iguais -> desempata por created_at (mais antigo primeiro)', () => {
    const older = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const newer = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-06-01T00:00:00Z'}
    assert.ok(compareRankingRows(older, newer) < 0)
    assert.ok(compareRankingRows(newer, older) > 0)
})

test('compareRankingRows: empate total -> 0 (nenhuma preferência de ordem)', () => {
    const x = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    const y = {overall_score: 80, lifetime_ap: 1000, created_at: '2026-01-01T00:00:00Z'}
    assert.equal(compareRankingRows(x, y), 0)
})

test('compareRankingRows: valores numéricos vindos como string (driver do Postgres) ainda comparam certo', () => {
    const moreAp = {overall_score: '80.00', lifetime_ap: '2000', created_at: '2026-01-01T00:00:00Z'}
    const lessAp = {overall_score: '80.00', lifetime_ap: '1000', created_at: '2026-01-01T00:00:00Z'}
    assert.ok(compareRankingRows(moreAp, lessAp) < 0)
})

test('isValidHistoryBucket: aceita só day/month/year', () => {
    assert.equal(isValidHistoryBucket('day'), true)
    assert.equal(isValidHistoryBucket('month'), true)
    assert.equal(isValidHistoryBucket('year'), true)
    assert.equal(isValidHistoryBucket('week'), false)
    assert.equal(isValidHistoryBucket(''), false)
    assert.equal(isValidHistoryBucket(undefined), false)
})

// ─── IRCMP-16/17: allow-list de paginação da tabela principal ─────────────

test('isValidPageSize: só aceita 20/50/100 (IRCMP-17)', () => {
    assert.deepEqual(RANKING_PAGE_SIZES, [20, 50, 100])
    assert.equal(isValidPageSize(20), true)
    assert.equal(isValidPageSize(50), true)
    assert.equal(isValidPageSize(100), true)
    assert.equal(isValidPageSize(10), false)
    assert.equal(isValidPageSize(1000), false)
    assert.equal(isValidPageSize(undefined), false)
})

test('isValidSortKey: só aceita as 8 chaves de ordenação conhecidas (nota, AP, país, 5 eixos)', () => {
    assert.deepEqual(RANKING_SORT_KEYS, [
        'score',
        'ap',
        'country',
        'construcao',
        'destruicao',
        'exploracao',
        'hacking',
        'linksCampos',
    ])
    for (const key of RANKING_SORT_KEYS) assert.equal(isValidSortKey(key), true)
    assert.equal(isValidSortKey('overall_score'), false)
    assert.equal(isValidSortKey('score; DROP TABLE casara.ingress_rankings; --'), false)
    assert.equal(isValidSortKey(''), false)
})

test('isValidSortDir/isValidFactionFilter: allow-lists fechadas', () => {
    assert.equal(isValidSortDir('asc'), true)
    assert.equal(isValidSortDir('desc'), true)
    assert.equal(isValidSortDir('ASC'), false)
    assert.equal(isValidSortDir(''), false)
    assert.equal(isValidFactionFilter('all'), true)
    assert.equal(isValidFactionFilter('enlightened'), true)
    assert.equal(isValidFactionFilter('resistance'), true)
    assert.equal(isValidFactionFilter('shadow'), false)
})

test('defaultSortDir: nota/AP/eixos descem por padrão, país sobe', () => {
    assert.equal(defaultSortDir('score'), 'desc')
    assert.equal(defaultSortDir('ap'), 'desc')
    assert.equal(defaultSortDir('construcao'), 'desc')
    assert.equal(defaultSortDir('country'), 'asc')
})

// ─── IRCMP-16/18/19/20/21/22: query da tabela principal ───────────────────

test('buildRankingPageQuery: sem busca/filtro, calcula offset pela página e usa a coluna default (score)', () => {
    const {text, values} = buildRankingPageQuery({page: 3, pageSize: 20})
    // página 3 de 20 -> offset 40; sem busca/facção, os 2 últimos values são limit/offset.
    assert.deepEqual(values, [20, 40])
    assert.match(text, /ROW_NUMBER\(\) OVER \(ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC\) AS rank/)
    assert.match(text, /ORDER BY overall_score DESC NULLS LAST, rank ASC/)
    assert.match(text, /LIMIT \$1 OFFSET \$2/)
})

test('buildRankingPageQuery: rank vem de uma CTE calculada ANTES do WHERE de busca/filtro (IRCMP-18)', () => {
    const {text} = buildRankingPageQuery({search: 'agent', faction: 'resistance'})
    const rankedIdx = text.indexOf('ranked AS')
    const whereIdx = text.indexOf('WHERE')
    assert.ok(rankedIdx >= 0 && whereIdx >= 0 && rankedIdx < whereIdx, 'a CTE "ranked" precisa vir antes do WHERE')
})

test('buildRankingPageQuery: busca e facção nunca são interpoladas como texto SQL — só como $n', () => {
    const {text, values} = buildRankingPageQuery({search: "x' OR '1'='1", faction: 'enlightened', page: 1, pageSize: 50})
    assert.ok(!text.includes("x' OR '1'='1"), 'o termo de busca não pode aparecer literalmente no texto da query')
    assert.ok(!text.includes('enlightened'), 'a facção não pode aparecer literalmente no texto da query')
    assert.deepEqual(values, [`%x' OR '1'='1%`, 'enlightened', 50, 0])
    assert.match(text, /codename ILIKE \$1/)
    assert.match(text, /faction = \$2/)
})

test('buildRankingPageQuery: sortKey inválido cai pro default (score) em vez de quebrar a query', () => {
    const {text} = buildRankingPageQuery({sortKey: 'codename; --'})
    assert.match(text, /ORDER BY overall_score DESC NULLS LAST, rank ASC/)
})

test('buildRankingPageQuery: coluna de eixo usa a expressão JSONB fixa, nunca o texto do parâmetro', () => {
    const {text} = buildRankingPageQuery({sortKey: 'hacking', sortDir: 'asc'})
    assert.match(text, /ORDER BY \(axis_scores->>'hacking'\)::numeric ASC NULLS LAST, rank ASC/)
})

test('buildRankingPageQuery: pageSize inválido cai pro default (20)', () => {
    const {values} = buildRankingPageQuery({page: 1, pageSize: 999})
    assert.equal(values[0], 20)
})

// ─── IRCMP-06 a 15: query do seletor de agentes (keyset + busca) ──────────

test('buildAgentOptionsQuery: sem cursor nem busca, pede uma página + 1 (detectar hasMore sem 2ª query)', () => {
    const {text, values} = buildAgentOptionsQuery()
    assert.equal(AGENT_SELECT_PAGE_SIZE, 100)
    assert.deepEqual(values, [101])
    assert.match(text, /ORDER BY codename_key ASC LIMIT \$1/)
    assert.ok(!text.includes('WHERE'))
})

test('buildAgentOptionsQuery: com cursor, filtra codename_key > cursor (keyset)', () => {
    const {text, values} = buildAgentOptionsQuery({cursor: 'fencherlc'})
    assert.deepEqual(values, ['fencherlc', 101])
    assert.match(text, /WHERE codename_key > \$1/)
})

test('buildAgentOptionsQuery: com busca, ignora cursor e substitui por ILIKE sem paginação/cursor', () => {
    const {text, values} = buildAgentOptionsQuery({cursor: 'fencherlc', search: 'nl-1331'})
    assert.deepEqual(values, ['%nl-1331%', 100])
    assert.match(text, /WHERE codename ILIKE \$1/)
    assert.ok(!text.includes('codename_key >'), 'busca não deve combinar com o cursor')
})
