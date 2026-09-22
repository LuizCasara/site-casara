'use client'

import {coverViewport} from '@/lib/ingress/map/ingress-s2.mjs'
import type {Profile} from '@/lib/ingress/profile/ingress'
import {useLang} from '@/components/global/LanguageContext'
import Panel from '../shell/Panel'
import S2ExplorerLoader from './S2ExplorerLoader'

const SPAN = 0.035

const T = {
  pt: {
    label: 'Células S2',
    hint: (level: number, lat: number, lng: number) => `nível ${level} · ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    caption:
      'As células S2 são a malha hierárquica que o Ingress usa para pontuar regiões e medir densidade de portais. Esta é a grade sobre Cascavel.',
  },
  en: {
    label: 'S2 cells',
    hint: (level: number, lat: number, lng: number) => `level ${level} · ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    caption:
      'S2 cells are the hierarchical grid Ingress uses to score regions and measure portal density. This is the grid over Cascavel.',
  },
}

/**
 * Preview estático da grade de células S2 da região do agente, com o gatilho
 * "tocar para explorar" por cima. O mapa Leaflet só carrega no toque — ver
 * S2ExplorerLoader / S2Explorer. Client component (ISTATS-19: `useLang()`
 * bilingualiza label/hint/legenda) — `coverViewport` não depende de `node:fs`,
 * então mover o cálculo pro client é seguro (mesma função já usada client-side
 * por `S2Explorer`/`AgentHeader`).
 */
export default function S2Preview({s2}: {s2: Profile['s2']}) {
  const {center, defaultLevel} = s2
  const {lang} = useLang()
  const t = T[lang]
  const cells = coverViewport(
    {
      north: center.lat + SPAN,
      south: center.lat - SPAN,
      east: center.lng + SPAN,
      west: center.lng - SPAN,
    },
    defaultLevel,
    {cap: 160},
  ) as {token: string; ring: [number, number][]}[]

  const x = (lng: number) => ((lng - (center.lng - SPAN)) / (2 * SPAN)) * 100
  const y = (lat: number) => ((center.lat + SPAN - lat) / (2 * SPAN)) * 100

  return (
    <Panel label={t.label} hint={t.hint(defaultLevel, center.lat, center.lng)}>
      <div className="ing-s2">
        <svg className="ing-s2__grid" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {cells.map((c) => (
            <polygon
              key={c.token}
              points={c.ring.map(([lat, lng]) => `${x(lng).toFixed(2)},${y(lat).toFixed(2)}`).join(' ')}
            />
          ))}
          <circle cx={x(center.lng)} cy={y(center.lat)} r={1.4} className="ing-s2__center" />
        </svg>
        <p className="ing-s2__caption">{t.caption}</p>
        <S2ExplorerLoader center={center} level={defaultLevel} />
      </div>
    </Panel>
  )
}
