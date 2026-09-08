import Link from 'next/link'
import {TIER_LABELS, tierCounts, nextMedal} from '@/lib/ingress-badges.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'
import Panel from './Panel'
import BadgeMedal from './BadgeMedal'

type Badge = Parameters<typeof BadgeMedal>[0]['badge'] & {pct: number | null}

const TIER_RANK: Record<string, number> = {onyx: 5, platinum: 4, gold: 3, silver: 2, bronze: 1, none: 0}
const SUMMARY_ORDER = ['onyx', 'platinum', 'gold', 'silver', 'bronze', 'none'] as const
const FMT = new Intl.NumberFormat('pt-BR')

/** Prateleira das 26 badges — resumo de tiers, próxima medalha, grade. `badges` de `computeAllBadges`. Server. */
export default function BadgeShelf({badges}: {badges: Badge[]}) {
  if (badges.length === 0) return null

  const counts = tierCounts(badges) as Record<string, number>
  const summary = SUMMARY_ORDER.filter((t) => counts[t] > 0).map(
    (t) => `${counts[t]} ${t === 'none' ? 'a começar' : TIER_LABELS[t]}`,
  )

  const sorted = [...badges].sort(
    (a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || badges.indexOf(a) - badges.indexOf(b),
  )

  const next = nextMedal(badges) as Badge | null

  return (
    <Panel label="Medalhas" hint={summary.join(' · ')}>
      {next ? (
        <Link href={`/ingress/medalha/${next.key}`} className="ing-next-medal">
          {medalArt(next.key, next.tier) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={medalArt(next.key, next.tier) as string} alt="" width={40} height={40} className="ing-next-medal__art" />
          ) : null}
          <div className="ing-next-medal__body">
            <span className="ing-next-medal__label">Próxima medalha</span>
            <strong className="ing-next-medal__name">
              {next.name} → {TIER_LABELS[next.next!.tier] ?? next.next!.tier}
            </strong>
            <div className="ing-next-medal__bar">
              <div className="ing-next-medal__fill" style={{width: `${Math.round((next.pct ?? 0) * 100)}%`}} />
            </div>
            <span className="ing-next-medal__hint">
              faltam {FMT.format(next.next!.remaining)} · {Math.round((next.pct ?? 0) * 100)}%
            </span>
          </div>
        </Link>
      ) : null}

      <div className="ing-medals">
        {sorted.map((b) => (
          <BadgeMedal key={b.key} badge={b} compact />
        ))}
      </div>
    </Panel>
  )
}
