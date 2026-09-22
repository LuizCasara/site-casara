import NerdAgentTag from './NerdAgentTag'
import {
  OnyxMultiple,
  RECORD_T,
  RecordIcon,
  RecordValue,
  type RecordItem,
  type RecordLang,
  type RecordSection,
} from './NerdRecordParts'

function RecordCard({item, lang, hero}: {item: RecordItem; lang: RecordLang; hero: boolean}) {
  const t = RECORD_T[lang]
  const tone = item.holder?.faction ?? 'community'

  return (
    <div className={`ing-nerd-card ing-nerd-card--${tone}${hero ? ' ing-nerd-card--hero' : ''}`}>
      <span className="ing-nerd-card__medal">
        <RecordIcon badge={item.badge} />
      </span>
      <span className="ing-nerd-card__label">{item.label[lang]}</span>
      <span className="ing-nerd-card__figure">
        <span className="ing-nerd-card__value" title={item.reportedCount !== null ? t.total : undefined}>
          <RecordValue unit={item.unit} value={item.value} lang={lang} />
        </span>
        <OnyxMultiple multiple={item.onyxMultiple} lang={lang} />
      </span>
      {item.reportedCount !== null ? <span className="ing-nerd-card__meta">{t.reported(item.reportedCount)}</span> : null}
      {item.holder ? (
        <span className="ing-nerd-card__foot">
          <NerdAgentTag codename={item.holder.codename} faction={item.holder.faction} countryCode={item.holder.countryCode} />
        </span>
      ) : null}
    </div>
  )
}

/**
 * Visão "Cards": a medalha vira protagonista, com um halo na cor da facção do
 * recordista. Cada grupo do hall tem seu subtítulo; os cartões "hero" (AP e
 * recursões) ocupam metade da largura cada. Até 34rem tudo vira uma coluna, com
 * o cartão deitado (medalha à esquerda) — o número por extenso não cabe em dois
 * cartões lado a lado num celular.
 */
export default function NerdRecordCards({sections, lang}: {sections: RecordSection[]; lang: RecordLang}) {
  return (
    <div className="ing-nerd-cards">
      {sections.map((section) => (
        <div className="ing-nerd-cards__section" key={section.id}>
          {section.title ? (
            <h4 className="ing-nerd-subhead">
              {section.title[lang]}
              <span className="ing-nerd-count">{section.items.length}</span>
            </h4>
          ) : null}
          <div className={`ing-nerd-cards__grid${section.hero ? ' ing-nerd-cards__grid--hero' : ''}`}>
            {section.items.map((item) => (
              <RecordCard key={item.key} item={item} lang={lang} hero={section.hero} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
