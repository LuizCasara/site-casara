'use client'

import type {Profile} from '@/lib/ingress'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'
import Panel from './Panel'

// Uma família coesa: o que o agente construiu vs. o que derrubou.
const ROWS: {key: string; label: {pt: string; en: string}}[] = [
  {key: 'resonatorsDeployed', label: {pt: 'Ressonadores implantados', en: 'Resonators deployed'}},
  {key: 'resonatorsDestroyed', label: {pt: 'Ressonadores destruídos', en: 'Resonators destroyed'}},
  {key: 'linksCreated', label: {pt: 'Links criados', en: 'Links created'}},
  {key: 'enemyLinksDestroyed', label: {pt: 'Links inimigos destruídos', en: 'Enemy links destroyed'}},
  {key: 'portalsCaptured', label: {pt: 'Portais capturados', en: 'Portals captured'}},
  {key: 'portalsNeutralized', label: {pt: 'Portais neutralizados', en: 'Portals neutralized'}},
]

const T = {
  pt: {panelLabel: 'Construir e derrubar', panelHint: 'ações acumuladas'},
  en: {panelLabel: 'Build and tear down', panelHint: 'accumulated actions'},
}

/**
 * Distribuição de ações — comparação de magnitude, barras horizontais de série
 * única (a categoria é o rótulo, não a cor). Client component (ISTATS-19:
 * `useLang()` bilingualiza rótulos). Contagem ausente é omitida.
 */
export default function ActionsBreakdown({stats}: {stats: Profile['stats']}) {
  const {lang} = useLang()
  const t = T[lang]
  const rows = ROWS.filter((r) => typeof stats[r.key] === 'number').map((r) => ({
    ...r,
    value: stats[r.key],
  }))
  if (rows.length === 0) return null
  // `|| 1`: agente novo com todas as ações em 0 daria `width: NaN%`.
  const max = Math.max(...rows.map((r) => r.value)) || 1

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      <ul className="ing-bars">
        {rows.map((r) => (
          <li key={r.key} className="ing-bar">
            <div className="ing-bar__top">
              <span className="ing-bar__label">{r.label[lang]}</span>
              <span className="ing-bar__value">{fmtStat(r.value)}</span>
            </div>
            <div className="ing-bar__track">
              <div className="ing-bar__fill" style={{width: `${(r.value / max) * 100}%`}} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
