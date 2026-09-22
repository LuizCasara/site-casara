/**
 * Neutraliza um valor de origem não confiável (ex: `codename` vindo do body
 * de /api/telegram) para o modo "Markdown" (legado, v1) da API do Telegram.
 *
 * O `` ` `` é trocado por aspas simples em vez de escapado: dentro de um code
 * span (` `code` ` ou ```` ```pre``` ````) o parser do Telegram já não
 * processa escapes, então um backtick cru simplesmente fecharia o bloco antes
 * da hora — a única forma confiável de neutralizá-lo em qualquer contexto é
 * não deixar ele passar. `_`, `*` e `[` aí sim usam o escape com `\` que o
 * modo legado reconhece (diferente do MarkdownV2) — funciona fora de um code
 * span; dentro de um, vira uma barra invertida literal visível, cosmético e
 * raro (nomes de agente do Ingress são tipicamente alfanuméricos).
 *
 * Puro e `.mjs` (não `.ts`) de propósito: importado por
 * `lib/ingress/ranking/ingress-compare-message.mjs`, que precisa continuar rodável direto por
 * `node --test` (ver `lib/ingress/ranking/ingress-compare-message.test.mjs`), sem passar pelo
 * bundler do Next.
 */
export function escapeTelegramMarkdown(value) {
  return String(value ?? '')
    .replace(/`/g, "'")
    .replace(/([_*[])/g, '\\$1')
}
