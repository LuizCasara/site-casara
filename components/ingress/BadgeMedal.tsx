import Link from 'next/link'
import {TIER_LABELS} from '@/lib/ingress-badges.mjs'
import {medalArt} from '@/lib/ingress-medal-art.mjs'

const FMT = new Intl.NumberFormat('pt-BR')

type Badge = {
  key: string
  name: string
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'onyx'
  atMax: boolean
  pct: number | null
  next: {tier: string; remaining: number} | null
  beyond: {label: string; pct: number; remaining: number} | null
}

const pctText = (n: number) => `${Math.round(n * 100)}%`

/**
 * Medalha na grade — link para `/ingress/medalha/<slug>`. Arte real de
 * `public/ingress/medals/` quando existe; senão o hexágono com a inicial.
 * `compact` esconde o texto de "falta para o próximo tier". Server component.
 */
export default function BadgeMedal({badge, compact = false}: {badge: Badge; compact?: boolean}) {
  const tierLabel = (TIER_LABELS as Record<string, string>)[badge.tier] ?? badge.tier
  const art = medalArt(badge.key, badge.tier) as string | null

  return (
    <Link
      href={`/ingress/medalha/${badge.key}`}
      className={`ing-medal ing-medal--${badge.tier}${badge.tier === 'none' ? ' ing-medal--locked' : ''}`}
    >
      {art ? (
        // Ícone local pequeno e fixo — next/image não compensa o peso aqui.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" width={48} height={48} loading="lazy" className="ing-medal__art" />
      ) : (
        <div className="ing-medal__hex" aria-hidden="true">
          <span className="ing-medal__initial">{badge.name.charAt(0)}</span>
        </div>
      )}
      <div className="ing-medal__text">
        <div className="ing-medal__name">{badge.name}</div>
        <div className="ing-medal__tier">{tierLabel}</div>

        {badge.beyond ? (
          <div className="ing-medal__prog">
            <span className="ing-medal__prog-bar">
              <span style={{width: pctText(badge.beyond.pct)}} />
            </span>
            <span className="ing-medal__prog-txt">
              {badge.beyond.label} · {pctText(badge.beyond.pct)}
              {!compact ? ` · faltam ${FMT.format(badge.beyond.remaining)}` : ''}
            </span>
          </div>
        ) : badge.next ? (
          <div className="ing-medal__prog">
            <span className="ing-medal__prog-bar">
              <span style={{width: pctText(badge.pct ?? 0)}} />
            </span>
            <span className="ing-medal__prog-txt">
              {pctText(badge.pct ?? 0)} → {(TIER_LABELS as Record<string, string>)[badge.next.tier] ?? badge.next.tier}
              {!compact ? ` · faltam ${FMT.format(badge.next.remaining)}` : ''}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}
