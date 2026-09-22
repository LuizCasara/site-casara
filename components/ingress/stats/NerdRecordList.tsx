import NerdAgentTag from './NerdAgentTag'
import {
  OnyxMultiple,
  RECORD_T,
  RecordIcon,
  RecordValue,
  type RecordLang,
  type RecordSection,
} from './NerdRecordParts'

/**
 * Visão "Resumo": uma linha por recorde, sem cabeçalhos de grupo — a mais
 * compacta. Duas colunas a partir de 48rem; no celular uma só, com o rótulo
 * podendo quebrar linha (o número por extenso não cabe ao lado de um rótulo longo).
 */
export default function NerdRecordList({sections, lang}: {sections: RecordSection[]; lang: RecordLang}) {
  const t = RECORD_T[lang]

  return (
    <div className="ing-nerd-rec-list">
      {sections.flatMap((section) =>
        section.items.map((item) => (
          <div className="ing-nerd-rec-row" key={`${section.id}:${item.key}`}>
            <span className="ing-nerd-rec-icon">
              <RecordIcon badge={item.badge} />
            </span>
            <span className="ing-nerd-rec-mid">
              <span className="ing-nerd-rec-label">{item.label[lang]}</span>
              {item.holder ? (
                <NerdAgentTag codename={item.holder.codename} faction={item.holder.faction} countryCode={item.holder.countryCode} />
              ) : null}
            </span>
            <span className="ing-nerd-rec-figure">
              <span className="ing-nerd-rec-main">
                <span className="ing-nerd-rec-value" title={item.reportedCount !== null ? t.total : undefined}>
                  <RecordValue unit={item.unit} value={item.value} lang={lang} />
                </span>
                <OnyxMultiple multiple={item.onyxMultiple} lang={lang} />
              </span>
              {item.reportedCount !== null ? <span className="ing-nerd-rec-meta">{t.reported(item.reportedCount)}</span> : null}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
