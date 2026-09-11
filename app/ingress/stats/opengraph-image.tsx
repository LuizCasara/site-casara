import {ImageResponse} from 'next/og'
import {loadProfile} from '@/lib/ingress'
import {computeAxisScores, computeOverallScore, overallTierLabel} from '@/lib/ingress-tier-score.mjs'

export const runtime = 'nodejs'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const GREEN = '#00e676'
const CYAN = '#26b6ff'
const INK = '#eaf5ef'
const DIM = '#93a7a0'

export default function Image() {
  const profile = loadProfile()
  const axisScores = computeAxisScores(profile?.stats ?? {})
  const overallScore = computeOverallScore(axisScores)
  const tier = overallTierLabel(axisScores)

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
          <span style={{color: GREEN, fontSize: 116, fontWeight: 700, lineHeight: 1, marginTop: 12}}>
            {Math.round(overallScore)} pts
          </span>
          <span style={{color: DIM, fontSize: 30, marginTop: 18}}>
            Tier {tier} · Padrão de jogo em 5 eixos + ranking de agentes
          </span>
        </div>

        <div style={{display: 'flex', gap: 22}}>
          {axisScores.map((axis) => (
            <div
              key={axis.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                border: '1px solid rgba(0,230,118,0.2)',
                borderRadius: 16,
                padding: '20px 18px',
                background: 'rgba(0,230,118,0.05)',
              }}
            >
              <span style={{color: INK, fontSize: 40, fontWeight: 700}}>{Math.round(axis.score * 20)}</span>
              <span style={{color: DIM, fontSize: 18, marginTop: 6}}>{axis.label}</span>
            </div>
          ))}
        </div>

        <span style={{color: '#5c706a', fontSize: 20, letterSpacing: '0.2em'}}>
          luizcasara.com/ingress/stats
        </span>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
