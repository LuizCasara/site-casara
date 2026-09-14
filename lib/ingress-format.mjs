/**
 * Formatadores de exibição compartilhados pela feature Ingress. Fonte única —
 * antes cada componente declarava seu próprio `new Intl.NumberFormat('pt-BR')`
 * (8 cópias) e seu próprio `fmtDate` (3 cópias idênticas).
 */

const NUM_PT = new Intl.NumberFormat('pt-BR')

/** Número inteiro em pt-BR: `1234567` → `"1.234.567"`. */
export function fmtStat(n) {
    return NUM_PT.format(n)
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
