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
