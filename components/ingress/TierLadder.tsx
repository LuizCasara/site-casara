import {TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'

const FMT = new Intl.NumberFormat('pt-BR')
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx'] as const
const RANK: Record<string, number> = {none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, onyx: 5}

/**
 * A escada dos 5 tiers de uma badge de contagem: arte + limiar de cada, o tier
 * atual marcado, e a data de conquista onde ela existe. Server component.
 */
export default function TierLadder({
  slug,
  currentTier,
  tiers,
  dates = {},
}: {
  slug: string
  currentTier: string
  tiers: number[]
  dates?: Record<string, string>
}) {
  const currentRank = RANK[currentTier] ?? 0

  return (
    <ol className="ing-ladder">
      {TIERS.map((tier, i) => {
        const reached = RANK[tier] <= currentRank
        const isCurrent = tier === currentTier
        const art = medalArt(slug, tier) as string | null
        return (
          <li
            key={tier}
            className={`ing-ladder__step ing-ladder__step--${tier}${
              reached ? ' is-reached' : ''
            }${isCurrent ? ' is-current' : ''}`}
          >
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt="" width={40} height={40} className="ing-ladder__art" />
            ) : (
              <span className="ing-ladder__art ing-ladder__art--placeholder" aria-hidden="true" />
            )}
            <div className="ing-ladder__body">
              <span className="ing-ladder__tier">
                {TIER_LABELS[tier]}
                {isCurrent ? <span className="ing-ladder__badge-atual"> · atual</span> : null}
              </span>
              <span className="ing-ladder__req">{FMT.format(tiers[i])}</span>
            </div>
            <span className="ing-ladder__date">{dates[tier] || '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
