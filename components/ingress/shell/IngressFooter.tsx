'use client'

import {FaTelegramPlane} from 'react-icons/fa'
import {useLang} from '@/components/global/LanguageContext'

const YEAR = new Date().getFullYear()

const T = {
  pt: {
    disclaimer: `© ${YEAR} — este site não é oficialmente afiliado ao Ingress ou à Niantic Labs.`,
    contact: 'Contato:',
  },
  en: {
    disclaimer: `© ${YEAR} — this site is not officially affiliated with Ingress or Niantic Labs.`,
    contact: 'Contact:',
  },
}

/**
 * Rodapé de toda `/ingress/**` (montado uma vez em `app/ingress/layout.tsx`,
 * como o `IngressTopBar`) — o mesmo disclaimer que qualquer fan site de
 * Ingress carrega, mais o contato pessoal no Telegram. Client leaf só por
 * causa do `useLang()`.
 */
export default function IngressFooter() {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <footer className="ing-footer">
      <p>
        {t.disclaimer} {t.contact}{' '}
        <a href="https://t.me/FencherLC" target="_blank" rel="noopener noreferrer">
          <FaTelegramPlane aria-hidden="true" />
          @FencherLC
        </a>
      </p>
    </footer>
  )
}
