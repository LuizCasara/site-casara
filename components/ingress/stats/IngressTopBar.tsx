'use client'

import {usePathname} from 'next/navigation'
import IngressLanguageToggle from './IngressLanguageToggle'
import IngressShareButton from './IngressShareButton'

/**
 * Container fixo no canto superior direito de toda `/ingress` — sempre o
 * toggle PT/EN, e o ícone de compartilhar só em `/ingress/ranking` (é a
 * página que faz sentido mandar pra alguém comparar; `/ingress` é o perfil
 * de um dono só). Fica num só componente, montado uma vez no layout, pra não
 * duplicar a lógica de posicionamento fixa entre os dois botões.
 */
export default function IngressTopBar() {
  const pathname = usePathname()
  const isRanking = pathname === '/ingress/ranking'

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {isRanking ? <IngressShareButton /> : null}
      <IngressLanguageToggle />
    </div>
  )
}
