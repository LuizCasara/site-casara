import {ImageResponse} from 'next/og'
import {loadProfile} from '@/lib/ingress'
import {BADGES, computeBadge, TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {catalogEntry, coreBadges} from '@/lib/ingress-catalog.mjs'

export const runtime = 'nodejs'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

export function generateStaticParams() {
  return (coreBadges() as {slug: string}[]).map((b) => ({slug: b.slug}))
}

const GREEN = '#00e676'
const INK = '#eaf5ef'
const DIM = '#93a7a0'
const FMT = new Intl.NumberFormat('pt-BR')

export default async function Image({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const entry = catalogEntry(slug) as {name: string} | null
  const def = (
    BADGES as {key: string; name: string; statKey: string; tiers: Record<string, number>}[]
  ).find((b) => b.key === slug)
  const name = entry?.name ?? 'Medalha'
  const value = def ? (loadProfile()?.stats?.[def.statKey] ?? 0) : 0
  const badge = def ? computeBadge(def, value) : {tier: 'none'}
  const tierLabel = (TIER_LABELS as Record<string, string>)[badge.tier] ?? badge.tier

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#0b0f14',
          fontFamily: 'system-ui, sans-serif',
          backgroundImage:
            'radial-gradient(55% 50% at 12% 0%, rgba(0,230,118,0.18), transparent 60%)',
        }}
      >
        <span style={{color: DIM, fontSize: 24, letterSpacing: '0.2em', textTransform: 'uppercase'}}>
          Medalha de FencherLC
        </span>
        <span style={{color: GREEN, fontSize: 104, fontWeight: 700, lineHeight: 1.05, marginTop: 16}}>
          {name}
        </span>
        <span style={{color: INK, fontSize: 40, marginTop: 22}}>
          {tierLabel}
          {badge.tier !== 'none' ? ` · ${FMT.format(value)}` : ''}
        </span>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
