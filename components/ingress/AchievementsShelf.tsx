import {loadCatalog} from '@/lib/ingress-catalog.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import type {EventBadge} from '@/lib/ingress'
import Panel from './Panel'

const GROUP_LABELS: Record<string, string> = {
  anomaly: 'Anomalias',
  event: 'Eventos',
  character: 'Personagens',
  collectible: 'Colecionáveis',
  prestige: 'Prestígio',
  other: 'Outras',
}
const GROUP_ORDER = ['anomaly', 'event', 'prestige', 'character', 'collectible', 'other']

/**
 * Badges de evento/anomalia/colecionável do perfil (`profile.eventBadges`),
 * agrupadas por categoria do catálogo. Slug fora do catálogo é omitido. Sem
 * nenhuma → convite para `scripts/ingress.mjs badges`. Server component.
 */
export default function AchievementsShelf({eventBadges}: {eventBadges: EventBadge[]}) {
  const catalog = loadCatalog() as Record<string, {name: string; group: string}>

  const resolved = (eventBadges || [])
    .map((eb) => ({eb, entry: catalog[eb.slug]}))
    .filter((x) => x.entry)

  if (resolved.length === 0) {
    return (
      <Panel label="Conquistas" hint="anomalias · eventos · colecionáveis">
        <p className="ing-pending">
          <span className="ing-pending__dot" aria-hidden="true" />
          Ainda não há conquistas registradas. Elas entram por{' '}
          <code>node scripts/ingress.mjs badges add &lt;slug&gt;</code> — o Luiz transcreve dos
          prints do scanner (que mostram a arte e a data de cada tier).
        </p>
      </Panel>
    )
  }

  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    items: resolved.filter((x) => x.entry.group === g),
  })).filter((grp) => grp.items.length > 0)

  return (
    <Panel label="Conquistas" hint={`${resolved.length}`}>
      {groups.map(({group, items}) => (
        <div key={group} className="ing-achv-group">
          <h3 className="ing-achv-group__label">{GROUP_LABELS[group] ?? group}</h3>
          <ul className="ing-achv">
            {items.map(({eb, entry}) => {
              const art = medalArt(eb.slug, eb.tier ?? null) as string | null
              return (
                <li key={eb.slug} className="ing-achv__item">
                  {art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art} alt="" width={44} height={44} className="ing-achv__art" />
                  ) : (
                    <span className="ing-achv__art ing-achv__art--placeholder" aria-hidden="true">
                      {entry.name.charAt(0)}
                    </span>
                  )}
                  <span className="ing-achv__name">
                    {entry.name}
                    {eb.count ? <span className="ing-achv__count"> ×{eb.count}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </Panel>
  )
}
