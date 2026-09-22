'use client'

import {FaShareAlt} from 'react-icons/fa'
import {toast} from 'sonner'
import {useLang} from '@/components/global/LanguageContext'
import {trackIngressRankingShared} from '@/lib/global/analytics'

const T = {
  pt: {
    aria: 'Compartilhar o ranking de agentes',
    title: 'Ranking de Agentes — Ingress',
    text: 'Veja o ranking de agentes do Ingress e compare o seu padrão de jogo!',
    copied: 'Link copiado!',
  },
  en: {
    aria: 'Share the agent ranking',
    title: 'Agent Ranking — Ingress',
    text: 'Check out the Ingress agent ranking and compare your play pattern!',
    copied: 'Link copied!',
  },
} as const

/**
 * Ícone de compartilhar ao lado do toggle PT/EN, só em `/ingress/ranking`
 * (ver `IngressTopBar`). Mesmo padrão de `components/livros/acervo/BotaoCompartilhar.tsx`:
 * Web Share API quando existe (abre a folha nativa do celular), cai para
 * copiar o link no desktop. Usa `sonner` pro toast de confirmação, já que o
 * layout do Ingress monta um `<Toaster/>` (ISTATS-19: mesmo mecanismo do
 * toast de posição no ranking).
 */
export default function IngressShareButton() {
  const {lang} = useLang()
  const t = T[lang]

  const share = async () => {
    const url = `${window.location.origin}/ingress/ranking`

    if (navigator.share) {
      try {
        await navigator.share({title: t.title, text: t.text, url})
        trackIngressRankingShared('share')
        return
      } catch (err) {
        // Fechar a folha sem escolher nada rejeita com AbortError — é
        // desistência, não falha: não cai pro clipboard nesse caso.
        if ((err as Error)?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success(t.copied)
      trackIngressRankingShared('clipboard')
    } catch {
      // Clipboard bloqueado — sem toast, a URL da barra de endereços já é o link.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t.aria}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2.1rem',
        height: '2.1rem',
        color: 'var(--ing-text-faint)',
        background: 'var(--ing-panel-solid)',
        border: '1px solid var(--ing-edge)',
        borderRadius: '999px',
        boxShadow: 'var(--ing-lift)',
        cursor: 'pointer',
      }}
    >
      <FaShareAlt aria-hidden="true" size={14} />
    </button>
  )
}
