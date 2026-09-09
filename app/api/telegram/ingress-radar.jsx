import {ImageResponse} from 'next/og'
import {computeRadarAxes} from '@/lib/ingress-radar.mjs'

const W = 620
const H = 560
const VB = 240
const CC = VB / 2
const RR = 84
const DRAW = 2 // escala fixa da imagem: 2× Onyx

const GREEN = '#00e676'
const XM = '#c58cff'
const INK = '#eaf5ef'
const DIM = '#93a7a0'
const RING = 'rgba(140,170,165,0.28)'

function poly(axes, radiusOf) {
  return axes.map((a, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length
    const r = radiusOf(a.onyxRatio)
    return `${(CC + r * Math.cos(ang)).toFixed(1)},${(CC + r * Math.sin(ang)).toFixed(1)}`
  })
}

/**
 * Renderiza o radar da comparação (A verde vs B roxo) como PNG.
 * @param {{a:{codename,stats}, b:{codename,stats}}}
 * @returns {Promise<Uint8Array>}
 */
const fmtDay = (iso) => {
  const t = Date.parse(iso)
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC'})
    : ''
}

export async function radarPng({a, b}) {
  const A = computeRadarAxes(a.stats)
  const B = computeRadarAxes(b.stats)
  const n = A.length
  const rOf = (onyx) => RR * Math.max(Math.min(onyx / DRAW, 1), 0.02)

  const self = a.codename === b.codename
  const aLabel = self ? fmtDay(a.capturedAt) || 'agora' : a.codename
  const bLabel = self ? fmtDay(b.capturedAt) || 'antes' : b.codename

  const ringPoly = (frac) =>
    A.map((_, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
      return `${(CC + RR * frac * Math.cos(ang)).toFixed(1)},${(CC + RR * frac * Math.sin(ang)).toFixed(1)}`
    }).join(' ')

  const pct = (r) => `${Math.round(r * 100)}%`

  const res = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 30,
          background: '#0b0f14',
          fontFamily: 'system-ui, sans-serif',
          color: INK,
        }}
      >
        {self ? (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <span style={{fontSize: 30, fontWeight: 700, color: GREEN}}>{a.codename} — evolução</span>
            <span style={{fontSize: 15, color: DIM, marginTop: 2}}>
              <span style={{color: XM}}>● {bLabel}</span>
              <span style={{color: DIM}}>{'  →  '}</span>
              <span style={{color: GREEN}}>● {aLabel}</span>
              <span style={{color: DIM}}>{'   ·   escala 2× Onyx'}</span>
            </span>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
              <span style={{fontSize: 30, fontWeight: 700, color: GREEN}}>{aLabel}</span>
              <span style={{fontSize: 20, color: DIM}}>vs</span>
              <span style={{fontSize: 30, fontWeight: 700, color: XM}}>{bLabel}</span>
            </div>
            <span style={{fontSize: 15, color: DIM, marginTop: 2}}>Padrão de jogo · escala 2× Onyx</span>
          </div>
        )}

        <div style={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={360} height={360} viewBox={`0 0 ${VB} ${VB}`}>
            {[0.25, 0.5, 1].map((f) => (
              <polygon key={f} points={ringPoly(f)} fill="none" stroke={RING} strokeWidth={1} />
            ))}
            {A.map((_, i) => {
              const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
              return (
                <line
                  key={i}
                  x1={CC}
                  y1={CC}
                  x2={CC + RR * Math.cos(ang)}
                  y2={CC + RR * Math.sin(ang)}
                  stroke={RING}
                  strokeWidth={1}
                />
              )
            })}
            <polygon points={poly(A, rOf).join(' ')} fill="rgba(0,230,118,0.16)" stroke={GREEN} strokeWidth={2.5} />
            <polygon points={poly(B, rOf).join(' ')} fill="none" stroke={XM} strokeWidth={2.5} />
            {poly(A, rOf).map((p, i) => {
              const [x, y] = p.split(',')
              return <circle key={`a${i}`} cx={x} cy={y} r={3.5} fill={GREEN} />
            })}
            {poly(B, rOf).map((p, i) => {
              const [x, y] = p.split(',')
              return <circle key={`b${i}`} cx={x} cy={y} r={3.5} fill={XM} />
            })}
          </svg>
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 15}}>
          {A.map((ax, i) => (
            <span key={ax.id} style={{display: 'flex', gap: 5}}>
              <span style={{color: DIM}}>{ax.label}</span>
              <span style={{color: GREEN, fontWeight: 700}}>{pct(ax.onyxRatio)}</span>
              <span style={{color: DIM}}>·</span>
              <span style={{color: XM, fontWeight: 700}}>{pct(B[i].onyxRatio)}</span>
            </span>
          ))}
        </div>
      </div>
    ),
    {width: W, height: H},
  )

  return new Uint8Array(await res.arrayBuffer())
}
