import {STAT_COLUMNS, STAT_GROUPS} from '@/lib/ingress-stats.mjs'
import {BADGES, computeBadge, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {slugForStatKey} from '@/lib/ingress-catalog.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'
import StatValue from './StatValue'

const LABELS = new Map<string, string>(
  (STAT_COLUMNS as {key: string; label: string}[]).map((c) => [c.key, c.label]),
)
const BADGE_BY_KEY = new Map(
  (BADGES as {key: string; statKey: string; tiers: Record<string, number>; name: string}[]).map((b) => [
    b.key,
    b,
  ]),
)

/** A badge que a estatística `statKey` alimenta, já computada, ou `null`. */
function badgeForStat(statKey: string, value: number) {
  const slug = slugForStatKey(statKey) as string | null
  if (!slug) return null
  const def = BADGE_BY_KEY.get(slug)
  if (!def) return null
  const b = computeBadge(def, value)
  return {
    slug,
    name: def.name,
    tier: b.tier as string,
    tierLabel: (TIER_LABELS as Record<string, string>)[b.tier] ?? b.tier,
    art: medalArt(slug, b.tier) as string | null,
  }
}

/**
 * Um `Panel` por grupo de estatísticas. Cada `StatValue` recebe a badge que
 * aquele número alimenta (hover mostra a medalha). Chave ausente é omitida.
 * Server component.
 */
export default function StatGroups({stats}: {stats: Profile['stats']}) {
  return (
    <>
      {(STAT_GROUPS as {id: string; title: string; keys: string[]}[]).map((group) => {
        const present = group.keys.filter((k) => typeof stats[k] === 'number')
        if (present.length === 0) return null
        return (
          <Panel key={group.id} label={group.title} hint={`${present.length} métricas`}>
            <div className="ing-grid">
              {present.map((k) => (
                <StatValue
                  key={k}
                  label={LABELS.get(k) ?? k}
                  value={stats[k]}
                  badge={badgeForStat(k, stats[k])}
                />
              ))}
            </div>
          </Panel>
        )
      })}
    </>
  )
}
