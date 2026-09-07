import {STAT_COLUMNS, STAT_GROUPS} from '@/lib/ingress-stats.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'
import StatValue from './StatValue'

const LABELS = new Map<string, string>(
  (STAT_COLUMNS as {key: string; label: string}[]).map((c) => [c.key, c.label]),
)

/**
 * Um `Panel` por grupo de estatísticas (`STAT_GROUPS`), cada um com a grade de
 * `StatValue` das chaves presentes em `profile.stats`. Chave ausente é omitida
 * sem quebrar o grupo. Server component.
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
                <StatValue key={k} label={LABELS.get(k) ?? k} value={stats[k]} />
              ))}
            </div>
          </Panel>
        )
      })}
    </>
  )
}
