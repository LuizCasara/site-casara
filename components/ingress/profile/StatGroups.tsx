'use client'

import {STAT_COLUMNS, STAT_GROUPS} from '@/lib/ingress/stats/ingress-stats.mjs'
import type {Profile} from '@/lib/ingress/profile/ingress'
import {useLang} from '@/components/global/LanguageContext'
import Panel from '../shell/Panel'
import StatValue from './StatValue'

type StatColumn = {key: string; label: string; labelEn?: string}
type StatGroup = {id: string; title: string; titleEn?: string; keys: string[]}
export type StatBadge = {slug: string; name: string; tier: string; tierLabel: string; art: string | null}

const LABELS_PT = new Map<string, string>((STAT_COLUMNS as StatColumn[]).map((c) => [c.key, c.label]))
const LABELS_EN = new Map<string, string>(
  (STAT_COLUMNS as StatColumn[]).map((c) => [c.key, c.labelEn ?? c.label]),
)

const T = {
  pt: {metrics: (n: number) => `${n} métricas`},
  en: {metrics: (n: number) => `${n} metrics`},
}

/**
 * Um `Panel` por grupo de estatísticas. Cada `StatValue` recebe a badge que
 * aquele número alimenta (hover mostra a medalha). Chave ausente é omitida.
 * Client component (ISTATS-19: `useLang()` escolhe título/rótulos em EN,
 * vindos de `lib/ingress/stats/ingress-stats.mjs` — T15).
 *
 * SPEC_DEVIATION: a badge de cada estatística (antes computada aqui via
 * `slugForStatKey`/`medalArt`, ambos dependentes de `node:fs`) agora chega
 * pré-computada via a prop `badges` — o build falha (`UnhandledSchemeError:
 * node:fs`) se este arquivo virar client E importar esses módulos, porque o
 * bundle do navegador não pode carregar `node:fs`. `app/(ingress)/ingress/page.tsx`
 * (Server Component) faz esse cálculo, no mesmo padrão que já usa para
 * `buildMedals`/`MedalGrid`.
 */
export default function StatGroups({
  stats,
  badges,
}: {
  stats: Profile['stats']
  badges: Record<string, StatBadge | null>
}) {
  const {lang} = useLang()
  const t = T[lang]
  const labels = lang === 'en' ? LABELS_EN : LABELS_PT

  return (
    <>
      {(STAT_GROUPS as StatGroup[]).map((group) => {
        const present = group.keys.filter((k) => typeof stats[k] === 'number')
        if (present.length === 0) return null
        const title = lang === 'en' ? group.titleEn ?? group.title : group.title
        return (
          <Panel key={group.id} label={title} hint={t.metrics(present.length)}>
            <div className="ing-grid">
              {present.map((k) => (
                <StatValue
                  key={k}
                  label={labels.get(k) ?? k}
                  value={stats[k]}
                  badge={badges[k] ?? null}
                />
              ))}
            </div>
          </Panel>
        )
      })}
    </>
  )
}
