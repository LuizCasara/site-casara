'use client'

import {useLang} from '@/context/LanguageContext'

/**
 * Chave PT/EN visível dentro de `/ingress` — o `Header.tsx` genérico do site se
 * esconde nessas rotas (guarda de pathname em `components/Header.tsx`), então
 * esta é a única forma do visitante trocar o idioma aqui (ISTATS-18/19).
 * Estilizada com os tokens do tema Sora/Barlow de `app/ingress/theme.css` via
 * inline style (as CSS custom properties já estão disponíveis em qualquer
 * descendente de `.ingress-prime`), não com as classes Tailwind do `Header`.
 */
export default function IngressLanguageToggle() {
  const {lang, toggle} = useLang()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === 'pt' ? 'Switch to English' : 'Mudar para português'}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 20,
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
