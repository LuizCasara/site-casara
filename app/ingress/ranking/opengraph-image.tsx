import {ImageResponse} from 'next/og'
import sql from '@/lib/db'

export const runtime = 'nodejs'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const GREEN = '#00e676'
const CYAN = '#26b6ff'
const INK = '#eaf5ef'
const DIM = '#93a7a0'

/**
 * Total de agentes medidos, pra dar vida ao card sem apontar pra ninguém em
 * específico. Mesma tolerância a falha de `loadInitialRows` em `page.tsx`:
 * a tabela pode ainda não existir, ou o banco pode estar fora — a imagem
 * nunca pode quebrar por causa disso, só cai pro card sem o contador.
 */
async function countAgents(): Promise<number | null> {
  try {
    const [{count}] = await sql`SELECT COUNT(*)::int AS count FROM casara.ingress_rankings`
    return count
  } catch {
    return null
  }
}

/**
 * OG do `/ingress/ranking` — sobre o ranking em si, não sobre o FencherLC:
 * mesmo eyebrow/heading do `RankingHero`, sem nenhuma nota ou codinome
 * individual em destaque (era o que a versão anterior fazia, direcionando o
 * preview pra "quanto o FencherLC tirou" em vez de "onde você fica").
 */
export default async function Image() {
  const totalAgents = await countAgents()

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
            Agent ranking · Ingress
          </span>
          <span style={{color: GREEN, fontSize: 108, fontWeight: 700, lineHeight: 1, marginTop: 12}}>
            Where do you stand?
          </span>
          <span style={{color: DIM, fontSize: 30, marginTop: 18, maxWidth: 980}}>
            Paste your stats export from the app, compare your play style and see your place in the public ranking.
          </span>
        </div>

        {totalAgents !== null ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'flex-start',
              border: '1px solid rgba(0,230,118,0.2)',
              borderRadius: 16,
              padding: '20px 28px',
              background: 'rgba(0,230,118,0.05)',
            }}
          >
            <span style={{color: INK, fontSize: 48, fontWeight: 700}}>{totalAgents}</span>
            <span style={{color: DIM, fontSize: 20, marginTop: 6}}>
              agent{totalAgents === 1 ? '' : 's'} measured
            </span>
          </div>
        ) : (
          <span />
        )}

        <span style={{color: '#5c706a', fontSize: 20, letterSpacing: '0.2em'}}>
          luizcasara.com/ingress/ranking
        </span>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
