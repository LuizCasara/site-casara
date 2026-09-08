/**
 * Mini gráfico: os tiers de uma medalha nas datas reais em que caíram, dentro do
 * vão de tempo dela. Sem estado — serve tanto o painel da linha do tempo quanto
 * a página da medalha.
 */

const TIER_COLOR: Record<string, string> = {
  bronze: '#d08a4e',
  silver: '#9aa4ac',
  gold: '#ffd24a',
  platinum: '#8d949d',
  onyx: '#0c0f14',
  single: '#26b6ff',
}

const W = 220
const H = 54
const PAD = 12
const CY = 22

export default function MedalSpark({tiers}: {tiers: {tier: string; date: string}[]}) {
  const pts = tiers
    .map((t) => ({...t, ts: Date.parse(t.date)}))
    .filter((t) => Number.isFinite(t.ts))
    .sort((a, b) => a.ts - b.ts)
  if (!pts.length) return null

  const min = pts[0].ts
  const max = pts[pts.length - 1].ts
  const x = (ts: number) => PAD + (max === min ? 0.5 : (ts - min) / (max - min)) * (W - 2 * PAD)
  const yr = (ts: number) => new Date(ts).getUTCFullYear()

  return (
    <svg className="ing-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progressão dos tiers no tempo">
      <line x1={PAD} y1={CY} x2={W - PAD} y2={CY} className="ing-spark__track" />
      {pts.length > 1 ? (
        <polyline className="ing-spark__line" points={pts.map((p) => `${x(p.ts)},${CY}`).join(' ')} />
      ) : null}
      {pts.map((p) => (
        <circle
          key={p.tier}
          cx={x(p.ts)}
          cy={CY}
          r={4.5}
          fill={TIER_COLOR[p.tier] ?? '#26b6ff'}
          className={p.tier === 'onyx' ? 'ing-spark__dot ing-spark__dot--onyx' : 'ing-spark__dot'}
        />
      ))}
      <text x={PAD} y={H - 5} textAnchor="start" className="ing-spark__yr">
        {yr(min)}
      </text>
      {pts.length > 1 ? (
        <text x={W - PAD} y={H - 5} textAnchor="end" className="ing-spark__yr">
          {yr(max)}
        </text>
      ) : null}
    </svg>
  )
}
