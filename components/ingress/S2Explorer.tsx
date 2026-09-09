'use client'

import {useEffect, useState} from 'react'
import {MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {coverViewport, LEVEL_RANGE} from '@/lib/ingress-s2.mjs'

type Cell = {token: string; ring: [number, number][]}

function levelToZoom(level: number) {
  return Math.max(2, Math.min(18, Math.round(level - 1)))
}

/** Recalcula a grade S2 a cada movimento/zoom e quando o nível muda. */
function S2Layer({level}: {level: number}) {
  const map = useMap()
  const [cells, setCells] = useState<Cell[]>([])

  const recompute = () => {
    const b = map.getBounds()
    setCells(
      coverViewport(
        {north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest()},
        level,
        {cap: 300},
      ) as Cell[],
    )
  }

  useMapEvents({moveend: recompute, zoomend: recompute})
  useEffect(recompute, [level]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {cells.map((c) => (
        <Polygon
          key={c.token}
          positions={c.ring}
          pathOptions={{color: '#00e676', weight: 1, fillColor: '#00e676', fillOpacity: 0.04}}
        />
      ))}
    </>
  )
}

/** Mapa Leaflet + slider de nível. Carregado por `dynamic(ssr:false)` no toque. */
export default function S2Explorer({
  center,
  level: initialLevel,
}: {
  center: {lat: number; lng: number}
  level: number
}) {
  const [level, setLevel] = useState(initialLevel)

  return (
    <div className="ing-s2__explorer">
      <label className="ing-s2__slider">
        <span>
          Nível da célula: <strong>{level}</strong>
        </span>
        <input
          type="range"
          min={LEVEL_RANGE.min}
          max={LEVEL_RANGE.max}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        />
      </label>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={levelToZoom(initialLevel)}
        scrollWheelZoom={false}
        className="ing-s2__map"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <CircleMarker center={[center.lat, center.lng]} radius={5} pathOptions={{color: '#26b6ff'}} />
        <S2Layer level={level} />
      </MapContainer>
    </div>
  )
}
