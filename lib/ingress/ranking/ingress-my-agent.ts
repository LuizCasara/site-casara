import {getSitePrefs, setSitePref} from '@/lib/global/use-site-preferences'

/**
 * "Meu agente": o `codename_key` do último envio bem-sucedido em
 * `/ingress/ranking`, usado pra pré-preencher o Agente A da aba Comparação (CTA
 * "Comparar meu status"). Mora no objeto único do site (`ingress.myAgent` em
 * `casara.site` — ver `lib/site-preferences.mjs`); estas duas funções seguem
 * sendo os únicos pontos de leitura e escrita, e nunca lançam: `localStorage`
 * bloqueado só significa que nada é lembrado.
 */

export function saveMyAgent(codenameKey: string): void {
  setSitePref('ingress', 'myAgent', codenameKey)
}

export function loadMyAgent(): string | null {
  return (getSitePrefs().ingress.myAgent as string | null) ?? null
}
