import {TIER_LABELS} from '@/lib/ingress-badges.mjs'
import Panel from './Panel'

const W = 320
const H = 128
const PAD = {left: 10, right: 10, top: 20, bottom: 22}
const TIER_COLOR: Record<string, string> = {
  bronze: '#d08a4e',
  silver: '#cfdad4',
  gold: '#ffd24a',
  platinum: '#7fe9ff',
  onyx: '#00e676',
  single: '#26b6ff',
}

type Acq = {slug: string; name: string; tier: string; date: string}

/**
 * Linha do tempo das conquistas — um marcador por (badge, tier) na data. `< 2`
 * datas → placeholder (a timeline cresce conforme as datas são transcritas dos
 * prints ou vem o dump). Server component; tooltip via `<title>` nativo.
 */
export default function AchievementTimeline({acquisitions}: {acquisitions: Acq[]}) {
  if (!acquisitions || acquisitions.length < 2) {
    return (
      <Panel label="Linha do tempo" hint="quando cada medalha caiu">
        <p className="ing-pending">
          <span className="ing-pending__dot" aria-hidden="true" />
          A linha do tempo aparece com 2 ou mais datas de conquista. Ela cresce conforme o Luiz
          transcreve as datas dos prints do scanner (ou quando o dump GDPR chega).
        </p>
      </Panel>
    )
  }

  const ts = acquisitions.map((a) => Date.parse(a.date))
  const min = Math.min(...ts)
  const max = Math.max(...ts)
  const x = (t: number) => PAD.left + ((t - min) / (max - min || 1)) * (W - PAD.left - PAD.right)

  const years = Array.from(new Set(acquisitions.map((a) => new Date(a.date).getUTCFullYear())))

  return (
    <Panel label="Linha do tempo" hint={`${acquisitions.length} conquistas`}>
      <svg
        className="ing-achv-timeline"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Linha do tempo das conquistas"
      >
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          className="ing-achv-timeline__axis"
        />
        {years.map((yr) => {
          const t = Date.UTC(yr, 0, 1)
          if (t < min || t > max) return null
          return (
            <text
              key={yr}
              x={x(t)}
              y={H - 6}
              textAnchor="middle"
              className="ing-achv-timeline__year"
            >
              {yr}
            </text>
          )
        })}
        {acquisitions.map((a, i) => {
          const cx = x(ts[i])
          // espalha verticalmente por um hash do slug — dezenas de datas no mesmo
          // mês deixariam de se sobrepor por completo
          const band = H - PAD.top - PAD.bottom - 6
          const cy =
            PAD.top + 3 + ((a.slug.charCodeAt(0) * 7 + a.slug.length * 13 + i * 5) % band)
          return (
            <g key={`${a.slug}-${a.tier}-${a.date}`}>
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={H - PAD.bottom}
                className="ing-achv-timeline__stem"
              />
              <circle cx={cx} cy={cy} r={2.4} fill={TIER_COLOR[a.tier] ?? '#26b6ff'}>
                <title>
                  {a.name}
                  {a.tier !== 'single' ? ` — ${TIER_LABELS[a.tier] ?? a.tier}` : ''} · {a.date}
                </title>
              </circle>
            </g>
          )
        })}
      </svg>
    </Panel>
  )
}
