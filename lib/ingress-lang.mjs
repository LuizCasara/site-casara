/**
 * Regra de idioma do `/ingress`, pura (sem `window`/`localStorage`) para poder
 * ser testada por `node --test`. Quem lê o storage e o `navigator` é
 * `IngressLanguageProvider`; aqui só se decide.
 *
 * O padrão é EN — o `/ingress` é compartilhado em fóruns internacionais, e o
 * HTML estático (o que o visitante e os bots de preview veem antes de qualquer
 * JS) sai em inglês. PT só entra por escolha explícita guardada (o toggle) ou
 * quando a PRIMEIRA preferência do navegador é português. Só a primeira: quem
 * tem `['en-US', 'pt-BR']` pediu inglês antes de português.
 */

export const INGRESS_LANG_STORAGE_KEY = 'ing-lang'

export function isIngressLang(value) {
  return value === 'pt' || value === 'en'
}

export function resolveIngressLang(stored, languages) {
  if (isIngressLang(stored)) return stored
  const first = languages?.[0]
  return typeof first === 'string' && /^pt(-|$)/i.test(first) ? 'pt' : 'en'
}
