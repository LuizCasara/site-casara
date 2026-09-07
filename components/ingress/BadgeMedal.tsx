import {TIER_LABELS} from '@/lib/ingress-badges.mjs'

const FMT = new Intl.NumberFormat('pt-BR')

type Badge = {
  key: string
  name: string
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'onyx'
  atMax: boolean
  next: {tier: string; remaining: number} | null
}

/** Medalha hexagonal com tier e o que falta pro próximo. Server component. */
export default function BadgeMedal({badge}: {badge: Badge}) {
  const tierLabel = (TIER_LABELS as Record<string, string>)[badge.tier] ?? badge.tier
  return (
    <div className={`ing-medal ing-medal--${badge.tier}`}>
      <div className="ing-medal__hex" aria-hidden="true">
        <span className="ing-medal__initial">{badge.name.charAt(0)}</span>
      </div>
      <div className="ing-medal__text">
        <div className="ing-medal__name">{badge.name}</div>
        <div className="ing-medal__tier">{tierLabel}</div>
        {badge.atMax ? (
          <div className="ing-medal__next">tier máximo</div>
        ) : badge.next ? (
          <div className="ing-medal__next">
            faltam {FMT.format(badge.next.remaining)} para{' '}
            {(TIER_LABELS as Record<string, string>)[badge.next.tier] ?? badge.next.tier}
          </div>
        ) : null}
      </div>
    </div>
  )
}
