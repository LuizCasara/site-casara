'use client'

import {useEffect, useEffectEvent, useRef} from 'react'

/**
 * Janela mínima entre dois fetches automáticos do ranking/feed. Espelha o
 * `s-maxage=60, stale-while-revalidate=120` das rotas `GET /api/ingress-rankings*`:
 * pedir antes disso devolveria o mesmo JSON da CDN.
 */
export const INGRESS_STALE_MS = 120_000

/**
 * Substitui o antigo poll de 20s do ranking e do radar de atividade. Não há
 * mais `setInterval`: o dado chega na SSR, no botão "Atualizar" e, por este
 * hook, quando a aba volta a ficar visível com o último fetch mais velho que
 * `staleMs`.
 *
 * O motivo é o Neon: o compute só suspende após 5 min sem query, e cada poll
 * que passava pela CDN acordava o banco. Uma aba esquecida (ou o PWA do
 * Ingress, que fica aberto indefinidamente) mantinha o compute acordado o mês
 * inteiro. Com a aba oculta este hook não faz nada; com a aba visível e parada
 * também não. Só um gesto (voltar à aba, clicar) busca dado novo.
 *
 * Devolve `markFetched`, que o componente chama depois de qualquer fetch
 * próprio (troca de página/filtro, botão) para o relógio não disparar um
 * refresh redundante logo em seguida.
 */
export function useRefreshOnReturn(refresh: () => void, staleMs = INGRESS_STALE_MS): () => void {
  // A SSR acabou de entregar o dado: conta como o primeiro fetch.
  const lastFetchRef = useRef<number | null>(null)
  const onVisible = useEffectEvent(() => {
    const last = lastFetchRef.current
    if (last !== null && Date.now() - last < staleMs) return
    lastFetchRef.current = Date.now()
    refresh()
  })

  useEffect(() => {
    lastFetchRef.current = Date.now()
    const handler = () => {
      if (!document.hidden) onVisible()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return () => {
    lastFetchRef.current = Date.now()
  }
}
