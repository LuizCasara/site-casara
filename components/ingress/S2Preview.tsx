import {coverViewport} from '@/lib/ingress-s2.mjs'
import type {Profile} from '@/lib/ingress'
import Panel from './Panel'
import S2ExplorerLoader from './S2ExplorerLoader'

const SPAN = 0.035

/**
 * Preview estático da grade de células S2 da região do agente (calculado no
 * server), com o gatilho "tocar para explorar" por cima. O mapa Leaflet só
 * carrega no toque — ver S2ExplorerLoader / S2Explorer. Server component.
 */
export default function S2Preview({s2}: {s2: Profile['s2']}) {
  const {center, defaultLevel} = s2
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
    <Panel label="Células S2" hint={`nível ${defaultLevel} · ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`}>
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
        <p className="ing-s2__caption">
          As células S2 são a malha hierárquica que o Ingress usa para pontuar regiões e medir
          densidade de portais. Esta é a grade sobre Cascavel.
        </p>
        <S2ExplorerLoader center={center} level={defaultLevel} />
      </div>
    </Panel>
  )
}
