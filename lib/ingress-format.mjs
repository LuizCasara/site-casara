/**
 * Formatadores de exibição compartilhados pela feature Ingress. Fonte única —
 * antes cada componente declarava seu próprio `new Intl.NumberFormat('pt-BR')`
 * (8 cópias) e seu próprio `fmtDate` (3 cópias idênticas).
 */

const NUM_PT = new Intl.NumberFormat('pt-BR')
const NUM_PT_COMPACT = new Intl.NumberFormat('pt-BR', {notation: 'compact', compactDisplay: 'short'})
const NUM_PT_COMPACT_PRECISE = new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumSignificantDigits: 3,
})

/** Número inteiro em pt-BR: `1234567` → `"1.234.567"`. */
export function fmtStat(n) {
    return NUM_PT.format(n)
}

/** Número compacto em pt-BR: `5618904160` → `"5,6 bi"` — pra layouts com pouco espaço horizontal (ex.: barras divergentes por facção), onde um AP na casa dos bilhões por extenso estoura a coluna. */
export function fmtStatCompact(n) {
    return NUM_PT_COMPACT.format(n)
}

/**
 * Como `fmtStatCompact`, mas com 3 algarismos significativos: `10608843806` →
 * `"10,6 bi"` em vez de `"11 bi"`. O padrão do `Intl` arredonda pra 2 e, num
 * número de destaque (o KPI de AP total), perder o "10,6" é perder informação.
 * Fica separado porque numa coluna de tabela "1,39 bi" é largo demais.
 */
export function fmtStatCompactPrecise(n) {
    return NUM_PT_COMPACT_PRECISE.format(n)
}

/** Abaixo disto o número por extenso ainda cabe numa linha de celular; o resumo só entra a partir de milhões. */
const COMPACT_PAIR_MIN = 1_000_000

/**
 * Resumo de um par `antes → depois` pra telas estreitas: `48213500 → 48964000`
 * vira `"48 mi"` / `"49 mi"`. Cai de volta ao número por extenso quando o
 * resumo esconderia a mudança — `1.204.532 → 1.204.542` seria `"1,2 mi" →
 * "1,2 mi"`, e o +10 é justamente a informação — e quando os números são
 * pequenos demais pra precisar de resumo.
 * @returns {{from:string, to:string}}
 */
export function fmtStatCompactPair(from, to) {
    const full = {from: fmtStat(from), to: fmtStat(to)}
    if (Math.max(Math.abs(from), Math.abs(to)) < COMPACT_PAIR_MIN) return full
    const compact = {from: fmtStatCompact(from), to: fmtStatCompact(to)}
    return compact.from === compact.to ? full : compact
}

const SCORE_PT = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})

/** Nota geral com uma casa: `95.84` → `"95,8"`. Arredondar pra inteiro escondia a evolução de "95 → 95,8". */
export function fmtScoreDecimal(n) {
    return SCORE_PT.format(Number(n))
}

// U+0300–U+036F cobre os diacríticos combinantes que `normalize('NFD')` separa
// das letras base (acentos, til, cedilha…) — construído por codepoint em vez
// de um literal de char class pra não depender de como o editor/terminal
// exibe caracteres de combinação invisíveis.
const DIACRITICS_RE = new RegExp(`[${String.fromCodePoint(0x300)}-${String.fromCodePoint(0x36f)}]`, 'g')

/** Remove acentos e baixa a caixa — pra comparar texto livre digitado (busca) com nomes acentuados. */
export function foldText(s) {
    return String(s ?? '').normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase()
}

// Deslocamento entre 'A' (U+0041) e o primeiro "regional indicator symbol"
// (U+1F1E6) — dois desses símbolos em sequência é como o Unicode compõe um
// emoji de bandeira, sem precisar de nenhum arquivo de imagem. Telegram (e
// a maioria dos clientes) já sabe renderizar o par como bandeira.
const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 0x41

/** Código ISO 3166-1 alpha-2 ("BR") → emoji de bandeira ("🇧🇷"). Só aceita A-Z; qualquer outra coisa devolve `''`. */
export function countryFlagEmoji(code) {
    const c = String(code ?? '').trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(c)) return ''
    return String.fromCodePoint(...[...c].map((ch) => ch.codePointAt(0) + REGIONAL_INDICATOR_OFFSET))
}

/**
 * Data de conquista `"YYYY-MM-DD"` → `"dd/mm/aaaa"`, fixada em UTC para a data
 * não "andar" um dia conforme o fuso de quem abre.
 */
export function fmtMedalDate(iso) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
