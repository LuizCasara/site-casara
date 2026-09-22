import {artPath} from '@/lib/ingress-art.mjs'
import {fmtScoreDecimal, fmtStat, fmtStatCompact, fmtStatCompactPair} from '@/lib/ingress-format.mjs'
import {TIER_LABELS, TIER_LABELS_EN} from '@/lib/ingress-tiers.mjs'
import type {Lang} from '@/components/global/LanguageContext'

export type HistoryChange = {
  key: string
  label: string
  labelEn: string
  from: number
  to: number
  delta: number
  badgeSlug: string | null
  tierFrom: string | null
  tierTo: string | null
  onyxMultiple: number | null
  kind: 'new-medal' | 'tier-up' | null
}

type HistoryPoint = {at: string; ap: number; score: number}

/** Resposta de `GET /api/ingress-rankings/[codenameKey]/history/changes`. */
export type HistoryChanges = {
  bucket: string
  period: string
  to: HistoryPoint
  /** `null` = primeiro ponto do agente, sem estado anterior pra comparar. */
  from: HistoryPoint | null
  /** `false` = o estado anterior é de antes de a tabela guardar stats (migration 010). */
  statsAvailable: boolean
  changes: HistoryChange[]
  unchanged: number
}

const T = {
  pt: {
    heading: (period: string) => `O que mudou em ${period}`,
    scoreWord: 'Nota',
    newMedal: (tier: string) => `Nova medalha · ${tier}`,
    unchanged: (n: number) => `${n} stat${n === 1 ? '' : 's'} sem mudança`,
    startPoint: 'Primeiro registro deste agente — é o ponto de partida, não há o que comparar.',
    noStats:
      'Os registros anteriores guardaram só AP e nota, então ainda não dá para comparar stat a stat. A comparação aparece a partir do próximo envio.',
    nothing: 'Só o AP e a nota mudaram neste período — nenhum outro stat variou.',
    loading: 'Carregando…',
    error: 'Não foi possível carregar o que mudou agora. Clique no ponto de novo para tentar outra vez.',
  },
  en: {
    heading: (period: string) => `What changed on ${period}`,
    scoreWord: 'Score',
    newMedal: (tier: string) => `New medal · ${tier}`,
    unchanged: (n: number) => `${n} stat${n === 1 ? '' : 's'} unchanged`,
    startPoint: "This agent's first record — it's the starting point, there is nothing to compare.",
    noStats:
      'Earlier records only kept AP and score, so a stat-by-stat comparison is not possible yet. It starts with the next submission.',
    nothing: 'Only AP and score changed in this period — no other stat moved.',
    loading: 'Loading…',
    error: 'Could not load what changed right now. Click the point again to retry.',
  },
} as const

/**
 * Um número em duas versões, trocadas por CSS (`.ing-num`): por extenso no
 * desktop, resumido ("48 mi") no celular. As duas vão no HTML — nada de JS
 * medindo a tela, então não há descompasso de hidratação entre servidor e
 * navegador. Quando as duas versões são iguais, renderiza uma só.
 */
function DualNum({full, compact}: {full: string; compact: string}) {
  if (full === compact) return <span>{full}</span>
  return (
    <span className="ing-num">
      <span className="ing-num__full">{full}</span>
      <span className="ing-num__compact">{compact}</span>
    </span>
  )
}

/** `+1.204` / `−250` — o menos tipográfico, pra não parecer hífen. Resumo só a partir de milhões. */
function deltaParts(delta: number): {full: string; compact: string} {
  const sign = delta < 0 ? '−' : '+'
  const abs = Math.abs(delta)
  return {full: `${sign}${fmtStat(abs)}`, compact: `${sign}${abs >= 1_000_000 ? fmtStatCompact(abs) : fmtStat(abs)}`}
}

function ChangeRow({change, lang}: {change: HistoryChange; lang: Lang}) {
  const t = T[lang]
  const tiers = lang === 'en' ? TIER_LABELS_EN : TIER_LABELS
  const tierLabel = change.tierTo ? (tiers as Record<string, string>)[change.tierTo] : ''
  const hasIcon = change.badgeSlug && change.tierTo && change.tierTo !== 'none'
  const pair = fmtStatCompactPair(change.from, change.to)
  const delta = deltaParts(change.delta)

  // Onyx dobrado ("Onyx ×3") diz mais que só "Onyx" — o tier já era esse.
  const upLabel = change.tierTo === 'onyx' && (change.onyxMultiple ?? 0) >= 2 ? `Onyx ×${change.onyxMultiple}` : tierLabel

  return (
    <li className={`ing-evo__chg${change.kind ? ` is-${change.kind}` : ''}`}>
      <span className="ing-evo__chg-icon">
        {hasIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artPath(change.badgeSlug, change.tierTo)} alt="" />
        ) : null}
      </span>
      <span className="ing-evo__chg-label">{lang === 'en' ? change.labelEn : change.label}</span>
      {change.kind === 'new-medal' ? <span className="ing-evo__chg-tag is-new">{t.newMedal(tierLabel)}</span> : null}
      {change.kind === 'tier-up' ? <span className="ing-evo__chg-tag">▲ {upLabel}</span> : null}
      <span className="ing-evo__chg-vals">
        <DualNum full={fmtStat(change.from)} compact={pair.from} /> → <b><DualNum full={fmtStat(change.to)} compact={pair.to} /></b>
      </span>
      <span className={`ing-evo__chg-delta${change.delta < 0 ? ' is-down' : ''}`}>
        <DualNum full={delta.full} compact={delta.compact} />
      </span>
    </li>
  )
}

/**
 * Painel "o que mudou" de um ponto do gráfico de evolução (`AgentHistoryChart`).
 * `data === undefined` é "carregando"; `'error'`, falha de rede. O tamanho da
 * lista é limitado pelo número de stats rastreados, não pela quantidade de
 * envios no período — por isso não precisa de paginação.
 */
export default function AgentHistoryChanges({
  data,
  periodLabel,
  lang,
}: {
  data: HistoryChanges | 'error' | undefined
  periodLabel: string
  lang: Lang
}) {
  const t = T[lang]

  if (data === undefined) return <p className="ing-evo__empty">{t.loading}</p>
  if (data === 'error') return <p className="ing-evo__empty">{t.error}</p>

  const {from, to} = data
  return (
    <div className="ing-evo__changes" aria-live="polite">
      <div className="ing-evo__changes-head">
        <strong>{t.heading(periodLabel)}</strong>
        {from ? (
          <>
            <span className="ing-evo__changes-score">
              {t.scoreWord} {fmtScoreDecimal(from.score)} → {fmtScoreDecimal(to.score)}
            </span>
            <span className="ing-evo__changes-ap">{deltaParts(to.ap - from.ap).full} AP</span>
          </>
        ) : (
          <span className="ing-evo__changes-score">
            {t.scoreWord} {fmtScoreDecimal(to.score)}
          </span>
        )}
      </div>

      {!from ? (
        <p className="ing-evo__empty">{t.startPoint}</p>
      ) : !data.statsAvailable ? (
        <p className="ing-evo__empty">{t.noStats}</p>
      ) : data.changes.length === 0 ? (
        <p className="ing-evo__empty">{t.nothing}</p>
      ) : (
        <>
          <ul className="ing-evo__chg-list">
            {data.changes.map((change) => (
              <ChangeRow key={change.key} change={change} lang={lang} />
            ))}
          </ul>
          {data.unchanged > 0 ? <p className="ing-evo__chg-foot">{t.unchanged(data.unchanged)}</p> : null}
        </>
      )}
    </div>
  )
}
