import {groupByHolder} from '@/lib/ingress-nerd-records.mjs'
import NerdAgentTag from './NerdAgentTag'
import {
  OnyxMultiple,
  RECORD_T,
  RecordIcon,
  formatRecordValue,
  type RecordItem,
  type RecordLang,
  type RecordSection,
} from './NerdRecordParts'

/** Um recorde como "pastilha": medalha, nome, valor, ×N. `value` é passado de fora porque, no sazonal, o que se mostra aqui é o valor do agente, não a soma. */
function Chip({item, value, title, lang}: {item: RecordItem; value: number; title?: string; lang: RecordLang}) {
  return (
    <span className="ing-nerd-chip" title={title}>
      <span className="ing-nerd-chip__icon">
        <RecordIcon badge={item.badge} />
      </span>
      <span className="ing-nerd-chip__label">{item.label[lang]}</span>
      <b className="ing-nerd-chip__value">{formatRecordValue(item.unit, value, lang)}</b>
      <OnyxMultiple multiple={item.onyxMultiple} lang={lang} />
    </span>
  )
}

/**
 * Visão "Agentes": os mesmos recordes, agora agrupados por quem os segura — quem
 * tem mais vem primeiro. Indicadores sem dono (os da assinatura) vão num cartão
 * "Comunidade" no topo, pra nenhum dado desaparecer só por trocar de visão.
 */
export default function NerdRecordAgents({sections, lang}: {sections: RecordSection[]; lang: RecordLang}) {
  const t = RECORD_T[lang]
  const {agents, community} = groupByHolder(sections) as {
    agents: {holder: NonNullable<RecordItem['holder']>; items: RecordItem[]}[]
    community: RecordItem[]
  }

  return (
    <div className="ing-nerd-ags">
      {community.length > 0 ? (
        <div className="ing-nerd-ag ing-nerd-ag--community">
          <div className="ing-nerd-ag__id">
            <span className="ing-nerd-ag__who">
              <span className="ing-nerd-ag__community">{t.community}</span>
            </span>
          </div>
          <div className="ing-nerd-ag__chips">
            {community.map((item) => (
              <Chip key={item.key} item={item} value={item.value} lang={lang} />
            ))}
          </div>
        </div>
      ) : null}
      {agents.map((agent, index) => (
        <div className={`ing-nerd-ag${index === 0 ? ' ing-nerd-ag--lead' : ''}`} key={agent.holder.codenameKey}>
          <div className="ing-nerd-ag__id">
            <span className="ing-nerd-ag__rank">{index + 1}</span>
            <span className="ing-nerd-ag__who">
              <NerdAgentTag codename={agent.holder.codename} faction={agent.holder.faction} countryCode={agent.holder.countryCode} />
              <span className="ing-nerd-ag__count">
                <b>{agent.items.length}</b> {t.records(agent.items.length)}
              </span>
            </span>
          </div>
          <div className="ing-nerd-ag__chips">
            {agent.items.map((item) => (
              <Chip
                key={item.key}
                item={item}
                value={item.holderValue ?? item.value}
                title={item.reportedCount !== null ? `${t.total}: ${formatRecordValue(item.unit, item.value, lang)}` : undefined}
                lang={lang}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
