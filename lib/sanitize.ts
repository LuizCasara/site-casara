/**
 * Escapes para texto de origem não confiável (input de request) que é
 * interpolado fora do React — que já escapa por padrão — em dois destinos:
 * o HTML bruto do e-mail de notificação e o Markdown legado das mensagens do
 * Telegram. Sem isso, qualquer campo de um POST público (name, codename, …)
 * vira HTML/Markdown executado no lado de quem lê a notificação.
 */

/** Escapa as 5 entidades HTML básicas. Usado nos campos interpolados no HTML
 * do e-mail de resultado do teste — nodemailer manda o HTML como está, sem
 * nenhum escaping automático como o JSX faz. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A versão para Telegram é `.mjs` puro (ver lib/telegram-markdown.mjs) porque
// também é importada por lib/ingress-compare-message.mjs, que precisa rodar
// direto por `node --test`, sem bundler. Reexportada aqui só por
// conveniência de quem já está em código TS.
export { escapeTelegramMarkdown } from "./telegram-markdown.mjs";
