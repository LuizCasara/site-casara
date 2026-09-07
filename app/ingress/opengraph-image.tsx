import {ImageResponse} from 'next/og'
import {loadProfile} from '@/lib/ingress'

export const runtime = 'edge'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const GREEN = '#00e676'
const CYAN = '#26b6ff'
const INK = '#eaf5ef'
const DIM = '#93a7a0'

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function Image() {
  const p = loadProfile()
  const agent = p?.agent ?? {codename: 'Agente', faction: 'enlightened', level: 0}
  const s = p?.stats ?? {}

  const highlights: {label: string; value: string}[] = [
    {label: 'AP total', value: compact(s.lifetimeAp ?? 0)},
    {label: 'Portais capturados', value: compact(s.portalsCaptured ?? 0)},
    {label: 'Km caminhados', value: compact(s.distanceWalkedKm ?? 0)},
    {label: 'Links criados', value: compact(s.linksCreated ?? 0)},
  ]

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
            Agente de campo
          </span>
          <span style={{color: GREEN, fontSize: 116, fontWeight: 700, lineHeight: 1, marginTop: 12}}>
            {agent.codename}
          </span>
          <span style={{color: DIM, fontSize: 30, marginTop: 18}}>
            {agent.faction === 'enlightened' ? 'Enlightened' : 'Resistance'} · Nível {agent.level}
          </span>
        </div>

        <div style={{display: 'flex', gap: 28}}>
          {highlights.map((h) => (
            <div
              key={h.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                border: '1px solid rgba(0,230,118,0.2)',
                borderRadius: 16,
                padding: '20px 22px',
                background: 'rgba(0,230,118,0.05)',
              }}
            >
              <span style={{color: INK, fontSize: 48, fontWeight: 700}}>{h.value}</span>
              <span style={{color: DIM, fontSize: 20, marginTop: 6}}>{h.label}</span>
            </div>
          ))}
        </div>

        <span style={{color: '#5c706a', fontSize: 20, letterSpacing: '0.2em'}}>
          luizcasara.com/ingress
        </span>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
