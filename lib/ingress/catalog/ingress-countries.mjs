/**
 * Validação/normalização de código de país para o ranking do Ingress. Fonte
 * dos dados: `lib/ingress/catalog/countries.json` (250 códigos ISO 3166-1 alpha-2,
 * gerado por `scripts/ingress/gen-ingress-countries.mjs`).
 */
// Import attributes (`with {type:'json'}`) em vez de `createRequire` — este
// módulo é importado tanto por `node --test` puro quanto pelo bundler do
// Next.js (Turbopack), que não resolve `require()`/`require.resolve()` de
// JSON da mesma forma que o Node puro.
import COUNTRIES from './countries.json' with {type: 'json'}

export {COUNTRIES}

const VALID_CODES = new Set(COUNTRIES.map((c) => c.code))

/** Mesmo padrão de `normalizeCodenameKey`, mas para uppercase (código ISO). */
export function normalizeCountryCode(code) {
    return String(code ?? '').trim().toUpperCase()
}

/** @param {string} code já normalizado (ou não - função tolera qualquer caixa/espaço) */
export function isValidCountryCode(code) {
    return VALID_CODES.has(normalizeCountryCode(code))
}

/** Caminho do SVG da bandeira em `public/ingress/flags/` — mesma convenção usada por `CountryPicker` e `IngressRankingTable`. */
export function flagSrc(code) {
    return `/ingress/flags/${String(code ?? '').toLowerCase()}.svg`
}
