import {TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {formatGap} from '@/lib/ingress-timeline.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'

const FMT = new Intl.NumberFormat('pt-BR')
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx'] as const
const RANK: Record<string, number> = {none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, onyx: 5}

/**
 * A escada dos 5 tiers de uma badge de contagem: arte + limiar de cada, o tier
 * atual marcado, a data de conquista e o intervalo desde o tier anterior; nos
 * tiers ainda não alcançados, o % do caminho até o primeiro deles. Server component.
 */
export default function TierLadder({
  slug,
  currentTier,
  tiers,
  dates = {},
  value,
}: {
  slug: string
  currentTier: string
  tiers: number[]
  dates?: Record<string, string>
  value?: number
}) {
  const currentRank = RANK[currentTier] ?? 0
  const firstLocked = value != null ? tiers.findIndex((thr) => value < thr) : -1
  let prevDate: number | null = null

  return (
    <ol className="ing-ladder">
      {TIERS.map((tier, i) => {
        const reached = RANK[tier] <= currentRank
        const isCurrent = tier === currentTier
        const art = medalArt(slug, tier) as string | null
        const date = dates[tier]

        let gap: string | null = null
        if (date) {
          const ts = Date.parse(date)
          if (Number.isFinite(ts)) {
            if (prevDate != null) gap = formatGap(Math.round((ts - prevDate) / 86_400_000))
            prevDate = ts
          }
        }
        const pct =
          value != null && !reached && i === firstLocked
            ? `${Math.round((value / tiers[i]) * 100)}%`
            : null

        return (
          <li
            key={tier}
            className={`ing-ladder__step ing-ladder__step--${tier}${reached ? ' is-reached' : ''}${
              isCurrent ? ' is-current' : ''
            }`}
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
            {gap ? <span className="ing-ladder__gap">+{gap}</span> : null}
            <span className="ing-ladder__date">{date ? fmtDate(date) : pct || '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
