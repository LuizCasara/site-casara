'use client'

import {useLang} from '@/context/LanguageContext'
import {INGRESS_LANG_STORAGE_KEY} from '@/lib/ingress-lang.mjs'
import {trackIngressLanguageToggle} from '@/utils/analytics'

/**
 * Chave PT/EN visível dentro de `/ingress` — o `Header.tsx` genérico do site se
 * esconde nessas rotas (guarda de pathname em `components/Header.tsx`), então
 * esta é a única forma do visitante trocar o idioma aqui (ISTATS-18/19).
 * Estilizada com os tokens do tema Sora/Barlow de `app/ingress/theme.css` via
 * inline style (as CSS custom properties já estão disponíveis em qualquer
 * descendente de `.ingress-prime`), não com as classes Tailwind do `Header`.
 * Não se posiciona sozinha (`position:fixed`) — quem faz isso é `IngressTopBar`,
 * que também decide se mostra o botão de compartilhar ao lado.
 */
export default function IngressLanguageToggle() {
  const {lang, setLang} = useLang()

  return (
    <button
      type="button"
      onClick={() => {
        const next = lang === 'pt' ? 'en' : 'pt'
        trackIngressLanguageToggle(next)
        setLang(next)
        // Escolha explícita: passa a valer sobre o idioma do navegador (ver
        // `IngressLanguageProvider`). Sempre grava, inclusive de volta ao idioma
        // que o navegador já teria escolhido — não existe estado "automático".
        try {
          localStorage.setItem(INGRESS_LANG_STORAGE_KEY, next)
        } catch {
          // localStorage bloqueado — a troca vale só para esta visita
        }
      }}
      aria-label={lang === 'pt' ? 'Switch to English' : 'Mudar para português'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.35rem 0.7rem',
        fontFamily: 'var(--ing-font-body)',
        fontSize: '0.78rem',
        fontWeight: 600,
        background: 'var(--ing-panel-solid)',
        border: '1px solid var(--ing-edge)',
        borderRadius: '999px',
        boxShadow: 'var(--ing-lift)',
        cursor: 'pointer',
      }}
    >
      <span style={{color: lang === 'pt' ? 'var(--ing-green-soft)' : 'var(--ing-text-faint)'}}>PT</span>
      <span style={{color: 'var(--ing-text-faint)'}} aria-hidden="true">
        |
      </span>
      <span style={{color: lang === 'en' ? 'var(--ing-green-soft)' : 'var(--ing-text-faint)'}}>EN</span>
    </button>
  )
}
