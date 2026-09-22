'use client'

import {useLang} from '@/components/global/LanguageContext'
import {useNerdStatsLayout, type NerdStatsLayout} from '@/lib/global/use-site-preferences'

const LAYOUTS: NerdStatsLayout[] = ['resumo', 'cards', 'agentes']

const T = {
  pt: {aria: 'Layout dos recordes', resumo: 'Resumo', cards: 'Cards', agentes: 'Agentes'},
  en: {aria: 'Records layout', resumo: 'Summary', cards: 'Cards', agentes: 'Agents'},
} as const

/**
 * Alternador do layout dos recordes — mesmo controle segmentado (`aria-pressed`)
 * do filtro de facção em "Países". Fica no cabeçalho do hall da fama, mas a
 * escolha vale também para os sazonais e a assinatura, e é lembrada no navegador.
 */
export default function NerdRecordsLayoutToggle() {
  const {lang} = useLang()
  const t = T[lang]
  const [layout, setLayout] = useNerdStatsLayout()

  return (
    <div className="ing-radar__scale" role="group" aria-label={t.aria}>
      {LAYOUTS.map((l) => (
        <button key={l} type="button" aria-pressed={layout === l} onClick={() => setLayout(l)}>
          {t[l]}
        </button>
      ))}
    </div>
  )
}
