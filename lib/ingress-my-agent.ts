/**
 * Única fonte da chave de `localStorage` usada para "meu agente" — o
 * `codename_key` do último envio bem-sucedido em `/ingress/ranking`, usado
 * pra pré-preencher o Agente A da aba Comparação (CTA "Comparar meu status").
 * Chave própria, distinta de `ing-cmp-sent` (dedupe do alerta do Telegram já
 * existente em `ProfileRadar.tsx`). `try/catch` silencioso, mesmo espírito do
 * resto do projeto: `localStorage` bloqueado/indisponível nunca deve quebrar
 * a página.
 */
export const MY_AGENT_STORAGE_KEY = 'ing-cmp-my-agent'

export function saveMyAgent(codenameKey: string): void {
  try {
    localStorage.setItem(MY_AGENT_STORAGE_KEY, codenameKey)
  } catch {
    // localStorage bloqueado — segue sem salvar
  }
}

export function loadMyAgent(): string | null {
  try {
    return localStorage.getItem(MY_AGENT_STORAGE_KEY)
  } catch {
    return null
  }
}
