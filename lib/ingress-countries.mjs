/**
 * Validação/normalização de código de país para o ranking do Ingress. Fonte
 * dos dados: `lib/ingress/countries.json` (250 códigos ISO 3166-1 alpha-2,
 * gerado por `scripts/gen-ingress-countries.mjs`).
 */
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'

// `createRequire` em vez de `import ... with {type:'json'}` — mesma razão de
// `scripts/gen-ingress-countries.mjs`: compatibilidade com o mínimo de Node
// declarado em `package.json` (engines >= 20.9.0).
const require = createRequire(import.meta.url)
export const COUNTRIES = JSON.parse(readFileSync(require.resolve('./ingress/countries.json'), 'utf8'))

const VALID_CODES = new Set(COUNTRIES.map((c) => c.code))

/** Mesmo padrão de `normalizeCodenameKey`, mas para uppercase (código ISO). */
export function normalizeCountryCode(code) {
    return String(code ?? '').trim().toUpperCase()
}

/** @param {string} code já normalizado (ou não - função tolera qualquer caixa/espaço) */
export function isValidCountryCode(code) {
    return VALID_CODES.has(normalizeCountryCode(code))
}
