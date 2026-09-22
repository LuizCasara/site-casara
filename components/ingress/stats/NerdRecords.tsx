'use client'

import {useLang} from '@/components/global/LanguageContext'
import {useNerdStatsLayout} from '@/lib/global/use-site-preferences'
import NerdRecordAgents from './NerdRecordAgents'
import NerdRecordCards from './NerdRecordCards'
import NerdRecordList from './NerdRecordList'
import type {RecordSection} from './NerdRecordParts'

const T = {
  pt: {empty: 'Sem dados suficientes'},
  en: {empty: 'Not enough data'},
} as const

/**
 * Desenha as seções de recordes no layout que o visitante escolheu
 * (`NerdRecordsLayoutToggle`). A escolha é uma só e vale para o hall da fama, os
 * sazonais e a assinatura — cada um monta as próprias seções e entrega aqui. Sem
 * nenhuma seção (ninguém informou aquele dado) mostra o aviso, em vez de deixar
 * um título sem conteúdo.
 */
export default function NerdRecords({sections}: {sections: RecordSection[]}) {
  const {lang} = useLang()
  const [layout] = useNerdStatsLayout()

  if (sections.length === 0) return <p className="ing-nerd-empty-note">{T[lang].empty}</p>
  if (layout === 'cards') return <NerdRecordCards sections={sections} lang={lang} />
  if (layout === 'agentes') return <NerdRecordAgents sections={sections} lang={lang} />
  return <NerdRecordList sections={sections} lang={lang} />
}
