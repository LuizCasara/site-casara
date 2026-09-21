'use client'

import {useId, useState, type ReactNode} from 'react'
import {useLang} from '@/context/LanguageContext'

const T = {
  pt: {label: 'Ver evolução', hint: 'AP total e o que mudou em cada ponto'},
  en: {label: 'See evolution', hint: 'Total AP and what changed at each point'},
} as const

/**
 * Acordeão "Ver evolução" do painel expandido de uma linha do ranking. Os
 * `children` (o `AgentHistoryChart`) só entram na árvore na primeira abertura —
 * é isso que adia a busca do histórico para o clique, em vez de disparar
 * quando a linha expande. Depois de aberto uma vez continuam montados
 * (só escondidos ao recolher), então reabrir não refaz nenhuma requisição.
 */
export default function AgentEvolutionAccordion({children}: {children: ReactNode}) {
  const {lang} = useLang()
  const t = T[lang]
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  const toggle = () => {
    setOpen((o) => !o)
    setEverOpened(true)
  }

  return (
    <div className="ing-acc">
      <button type="button" className="ing-acc__btn" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        <svg className="ing-acc__chev" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 2.5 9.5 7 5 11.5" />
        </svg>
        <span className="ing-acc__title">{t.label}</span>
        <span className="ing-acc__hint">{t.hint}</span>
      </button>
      <div id={panelId} className="ing-acc__panel" hidden={!open}>
        {everOpened ? children : null}
      </div>
    </div>
  )
}
