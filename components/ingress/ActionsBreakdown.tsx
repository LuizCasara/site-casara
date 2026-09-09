import type {Profile} from '@/lib/ingress'
import {fmtStat} from '@/lib/ingress-format.mjs'
import Panel from './Panel'

// Uma família coesa: o que o agente construiu vs. o que derrubou.
const ROWS: {key: string; label: string}[] = [
  {key: 'resonatorsDeployed', label: 'Ressonadores implantados'},
  {key: 'resonatorsDestroyed', label: 'Ressonadores destruídos'},
  {key: 'linksCreated', label: 'Links criados'},
  {key: 'enemyLinksDestroyed', label: 'Links inimigos destruídos'},
  {key: 'portalsCaptured', label: 'Portais capturados'},
  {key: 'portalsNeutralized', label: 'Portais neutralizados'},
]

/**
 * Distribuição de ações — comparação de magnitude, barras horizontais de série
 * única (a categoria é o rótulo, não a cor). Server component. Contagem ausente
 * é omitida.
 */
export default function ActionsBreakdown({stats}: {stats: Profile['stats']}) {
  const rows = ROWS.filter((r) => typeof stats[r.key] === 'number').map((r) => ({
    ...r,
    value: stats[r.key],
  }))
  if (rows.length === 0) return null
  // `|| 1`: agente novo com todas as ações em 0 daria `width: NaN%`.
  const max = Math.max(...rows.map((r) => r.value)) || 1

  return (
    <Panel label="Construir e derrubar" hint="ações acumuladas">
      <ul className="ing-bars">
        {rows.map((r) => (
          <li key={r.key} className="ing-bar">
            <div className="ing-bar__top">
              <span className="ing-bar__label">{r.label}</span>
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
