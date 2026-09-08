import {ImageResponse} from 'next/og'
import {loadProfile} from '@/lib/ingress'
import {loadCatalog} from '@/lib/ingress-catalog.mjs'
import {collectAcquisitions} from '@/lib/ingress-timeline.mjs'

export const runtime = 'nodejs'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const GREEN = '#00e676'
const CYAN = '#26b6ff'
const DIM = '#93a7a0'

export default function Image() {
  const profile = loadProfile()
  const acquisitions = profile ? collectAcquisitions(profile, loadCatalog()) : []
  const anos = acquisitions.length
    ? [
        new Date(`${acquisitions[0].date}T00:00:00Z`).getUTCFullYear(),
        new Date(`${acquisitions[acquisitions.length - 1].date}T00:00:00Z`).getUTCFullYear(),
      ]
    : [2014, new Date().getUTCFullYear()]

  // curva acumulada simples do total
  const w = 1040
  const h = 240
  const n = Math.max(acquisitions.length, 1)
  const t0 = acquisitions.length ? Date.parse(acquisitions[0].date) : 0
  const t1 = acquisitions.length ? Date.parse(acquisitions[acquisitions.length - 1].date) : 1
  const pts = acquisitions.map((a, i) => {
    const x = ((Date.parse(a.date) - t0) / (t1 - t0 || 1)) * w
    const y = h - (i / n) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#0b0f14',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(60% 50% at 12% 0%, rgba(0,230,118,0.16), transparent 60%), radial-gradient(50% 45% at 100% 100%, rgba(38,182,255,0.12), transparent 60%)',
          }}
        />
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <span style={{color: CYAN, fontSize: 22, letterSpacing: '0.24em', textTransform: 'uppercase'}}>
            FencherLC · Agente Ingress
          </span>
          <span style={{color: GREEN, fontSize: 92, fontWeight: 700, lineHeight: 1, marginTop: 12}}>
            Linha do tempo
          </span>
          <span style={{color: DIM, fontSize: 30, marginTop: 18}}>
            {acquisitions.length} conquistas · {anos[0]}–{anos[1]}
          </span>
        </div>

        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow: 'visible'}}>
          <polyline
            points={pts.join(' ')}
            fill="none"
            stroke={GREEN}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <span style={{color: '#5c706a', fontSize: 20, letterSpacing: '0.2em'}}>luizcasara.com/ingress/linha-do-tempo</span>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
