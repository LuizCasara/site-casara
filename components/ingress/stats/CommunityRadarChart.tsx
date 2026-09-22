'use client'

import {RADAR_AXES} from '@/lib/ingress/stats/ingress-radar.mjs'
import {useLang} from '@/components/global/LanguageContext'

const SIZE = 220
const C = SIZE / 2
const R = 80
const PAD_X = 40

/**
 * Posição de tier em que o polígono toca a borda externa (1 = limiar de
 * Bronze, 5 = limiar de Onyx) — mesma escala de `computeAxisScores`
 * (`lib/ingress-tier-score.mjs`), que é o que `axis_scores`/`communityAxisAverage`
 * já armazenam. Um agente médio recursado pode passar de 5; a borda
 * representa Onyx, não um teto absoluto.
 */
const EDGE_POSITION = 5

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

/**
 * Radar médio da comunidade (P3, NERD-16) — SVG presentational-only, sem
 * paste/comparação. Reaproveita as classes `ing-radar__*` de `ProfileRadar`
 * pra paridade visual, sem importar esse componente (ver design.md, Risco 1).
 */
export default function CommunityRadarChart({axisAverage}: {axisAverage: Record<string, number>}) {
  const {lang} = useLang()
  const n = RADAR_AXES.length
  const shape = RADAR_AXES.map((axis, i) => {
    const value = Math.min(Math.max(axisAverage[axis.id] ?? 0, 0), EDGE_POSITION) / EDGE_POSITION
    return point(i, n, R * value).join(',')
  }).join(' ')
  const ariaLabel = lang === 'en' ? "Community's average play pattern" : 'Padrão de jogo médio da comunidade'

  return (
    <div className="ing-radar">
      <svg viewBox={`${-PAD_X} 0 ${SIZE + PAD_X * 2} ${SIZE + 6}`} role="img" aria-label={ariaLabel}>
        {[0.34, 0.67, 1].map((f) => (
          <polygon
            key={f}
            points={RADAR_AXES.map((_, i) => point(i, n, R * f).join(',')).join(' ')}
            className={`ing-radar__ring${f === 1 ? ' ing-radar__ring--edge' : ''}`}
          />
        ))}
        {RADAR_AXES.map((axis, i) => {
          const [x, y] = point(i, n, R)
          return <line key={axis.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
        })}
        {RADAR_AXES.map((axis, i) => {
          const [lx, ly] = point(i, n, R + 14)
          const anchor = lx < C - 8 ? 'end' : lx > C + 8 ? 'start' : 'middle'
          return (
            <text key={axis.id} x={lx} y={ly} className="ing-radar__label" textAnchor={anchor}>
              {lang === 'en' ? axis.labelEn : axis.label}
            </text>
          )
        })}
        <polygon points={shape} className="ing-radar__shape" />
      </svg>
    </div>
  )
}
