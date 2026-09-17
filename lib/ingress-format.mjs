/**
 * Formatadores de exibição compartilhados pela feature Ingress. Fonte única —
 * antes cada componente declarava seu próprio `new Intl.NumberFormat('pt-BR')`
 * (8 cópias) e seu próprio `fmtDate` (3 cópias idênticas).
 */

const NUM_PT = new Intl.NumberFormat('pt-BR')
const NUM_PT_COMPACT = new Intl.NumberFormat('pt-BR', {notation: 'compact', compactDisplay: 'short'})

/** Número inteiro em pt-BR: `1234567` → `"1.234.567"`. */
export function fmtStat(n) {
    return NUM_PT.format(n)
}

/** Número compacto em pt-BR: `5618904160` → `"5,6 bi"` — pra layouts com pouco espaço horizontal (ex.: barras divergentes por facção), onde um AP na casa dos bilhões por extenso estoura a coluna. */
export function fmtStatCompact(n) {
    return NUM_PT_COMPACT.format(n)
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
