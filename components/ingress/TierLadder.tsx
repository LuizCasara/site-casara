'use client'

import {TIERS, TIER_RANK, tierLabel} from '@/lib/ingress-tiers.mjs'
import {formatGap} from '@/lib/ingress-timeline.mjs'
import {fmtMedalDate, fmtStat} from '@/lib/ingress-format.mjs'
import {useLang} from '@/context/LanguageContext'

const CURRENT_SUFFIX = {pt: ' · atual', en: ' · current'}

/**
 * A escada dos 5 tiers de uma badge de contagem: arte + limiar de cada, o tier
 * atual marcado, a data de conquista e o intervalo desde o tier anterior; nos
 * tiers ainda não alcançados, o % do caminho até o primeiro deles. Client
 * component (ISTATS-19: `useLang()` bilingualiza o sufixo e os labels de tier,
 * vindos de `tierLabel` — T14).
 *
 * SPEC_DEVIATION: `medalArt` (a arte de cada tier) dependia de `node:fs`, que
 * não pode ser bundlado para o navegador depois deste arquivo virar client —
 * mesmo problema e mesma resolução de `StatGroups`/T21. A arte agora chega
 * pré-computada via a prop `arts` (chave = tier); o cálculo migrou para o
 * único call site, `app/ingress/medalha/[slug]/page.tsx`.
 */
export default function TierLadder({
  currentTier,
  tiers,
  dates = {},
  value,
  arts = {},
}: {
  currentTier: string
  tiers: number[]
  dates?: Record<string, string>
  value?: number
  arts?: Record<string, string | null>
}) {
  const {lang} = useLang()
  const currentRank = TIER_RANK[currentTier] ?? 0
  const firstLocked = value != null ? tiers.findIndex((thr) => value < thr) : -1
  let prevDate: number | null = null

  return (
    <ol className="ing-ladder">
      {TIERS.map((tier, i) => {
        const reached = TIER_RANK[tier] <= currentRank
        const isCurrent = tier === currentTier
        const art = arts[tier] ?? null
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
                {tierLabel(tier, lang)}
                {isCurrent ? <span className="ing-ladder__badge-atual">{CURRENT_SUFFIX[lang]}</span> : null}
              </span>
              <span className="ing-ladder__req">{fmtStat(tiers[i])}</span>
            </div>
            {gap ? <span className="ing-ladder__gap">+{gap}</span> : null}
            <span className="ing-ladder__date">{date ? fmtMedalDate(date) : pct || '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
