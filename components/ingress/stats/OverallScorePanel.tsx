'use client'

import Panel from '../shell/Panel'
import {tierLabel} from '@/lib/ingress/catalog/ingress-tiers.mjs'
import {RADAR_AXES} from '@/lib/ingress/stats/ingress-radar.mjs'
import {flagSrc} from '@/lib/ingress/catalog/ingress-countries.mjs'
import {fmtStat} from '@/lib/ingress/ingress-format.mjs'
import {useLang} from '@/components/global/LanguageContext'

/**
 * Mesmo par de caminhos já usado em `IngressRankingTable.tsx` (`FACTION_ICON`)
 * — logos oficiais de facção (hexágono), CC BY-NC-SA 3.0.
 */
const FACTION_ICON: Record<'enlightened' | 'resistance', string> = {
  enlightened: '/ingress/factions/enlightened.svg',
  resistance: '/ingress/factions/resistance.svg',
}
const FACTION_LABEL: Record<'enlightened' | 'resistance', string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}

/** Mesma escada de `lib/ingress/stats/ingress-tier-score.mjs`, reconstruída aqui só pra escolher a cor do selo a partir da nota geral (já na escala 0-100). */
const RANK_TO_TIER_KEY = ['none', 'bronze', 'silver', 'gold', 'platinum', 'onyx'] as const

/** Chave do tier → modificador CSS do selo (`.ing-score-panel__badge--<key>`), que define fundo/borda/texto de cada tier. */
function tierKeyFromScore(overallScore: number): (typeof RANK_TO_TIER_KEY)[number] {
  const floor = Math.floor(overallScore / 20)
  return RANK_TO_TIER_KEY[Math.max(0, Math.min(5, floor))]
}

/**
 * Rótulo bilíngue do selo de tier (ISTATS-19 fix), a partir da nota 0-100+ —
 * mesma matemática de `overallTierLabel()` (`lib/ingress/stats/ingress-tier-score.mjs`),
 * reimplementada aqui em vez de importada: esse módulo arrasta `computeBadge`
 * (`lib/ingress/catalog/ingress-badges.mjs` -> `lib/ingress/catalog/ingress-catalog.mjs`, que lê
 * `badge-catalog.json` via `node:fs` no topo do arquivo) e quebraria o bundle
 * do navegador se importado por este componente client — mesmo motivo pelo
 * qual `tierKeyFromScore` acima já duplicava `RANK_TO_TIER` localmente em
 * vez de importar de lá.
 */
function tierLabelFromScore(overallScore: number, lang: 'pt' | 'en'): string {
  const floor = Math.floor(overallScore / 20)
  const key = RANK_TO_TIER_KEY[Math.max(0, Math.min(5, floor))]
  const label = tierLabel(key, lang)
  const beyond = floor - 5
  return beyond > 0 ? `${label} +${beyond}` : label
}

const fmtScore = (n: number) => Math.round(n).toString()

export type AgentScore = {
  label: string
  overallScore: number
  axisScores: Record<string, number>
  tier: string
  /** Opcionais — só a aba Comparação (T13) os passa; `StatsRadarSection` não usa, sem mudança visual ali. */
  lifetimeAp?: number
  countryCode?: string | null
  faction?: 'enlightened' | 'resistance'
}

const T = {
  pt: {
    panelLabel: 'Nota geral',
    panelHint: 'média dos 5 eixos × 20 — 100 = Onyx em tudo; além do Onyx, cada dobra soma 20 (log₂)',
    overallRow: 'Nota geral',
    tierRow: 'Tier',
    apRow: 'AP total',
  },
  en: {
    panelLabel: 'Overall score',
    panelHint: 'average of the 5 axes × 20 — 100 = Onyx across the board; past Onyx, each doubling adds 20 (log₂)',
    overallRow: 'Overall score',
    tierRow: 'Tier',
    apRow: 'Total AP',
  },
} as const

/**
 * Nota geral + selo de tier + a nota individual de cada um dos 5 eixos, pra 1
 * ou 2 agentes (lado a lado quando há comparação) — é o que permite ler o
 * "formato" do jogo de um agente, não só um número único. Client component
 * (`useLang()`, ISTATS-19 fix) — antes disso já era bundlado como client
 * porque quem o usa (T8, `StatsRadarSection`) é client.
 */
export default function OverallScorePanel({agents}: {agents: AgentScore[]}) {
  const {lang} = useLang()
  const t = T[lang]

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      <div className="ing-score-panel">
        {agents.map((agent) => (
          <div key={agent.label} className="ing-score-panel__row">
            <span className="ing-score-panel__agent">
              {agent.faction ? (
                <img
                  src={FACTION_ICON[agent.faction]}
                  alt={FACTION_LABEL[agent.faction]}
                  title={FACTION_LABEL[agent.faction]}
                  width={18}
                  height={18}
                  className="ing-score-panel__faction-icon"
                />
              ) : null}
              {agent.countryCode ? (
                <img
                  src={flagSrc(agent.countryCode)}
                  alt=""
                  width={18}
                  height={13}
                  className="ing-score-panel__flag"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                />
              ) : null}
              {agent.label}
            </span>
            <span className="ing-score-panel__stat ing-score-panel__stat--overall">
              <span className="ing-score-panel__stat-label">{t.overallRow}</span>
              <span className="ing-score-panel__stat-value">{fmtScore(agent.overallScore)}</span>
            </span>
            {agent.lifetimeAp !== undefined ? (
              <span className="ing-score-panel__stat">
                <span className="ing-score-panel__stat-label">{t.apRow}</span>
                <span className="ing-score-panel__stat-value">{fmtStat(agent.lifetimeAp)}</span>
              </span>
            ) : null}
            <span className="ing-score-panel__stat">
              <span className="ing-score-panel__stat-label">{t.tierRow}</span>
              <span className={`ing-score-panel__badge ing-score-panel__badge--${tierKeyFromScore(agent.overallScore)}`}>
                {tierLabelFromScore(agent.overallScore, lang)}
              </span>
            </span>
            {RADAR_AXES.map((axis) => (
              <span key={axis.id} className="ing-score-panel__stat">
                <span className="ing-score-panel__stat-label">{lang === 'en' ? axis.labelEn : axis.label}</span>
                <span className="ing-score-panel__stat-value">{fmtScore((agent.axisScores[axis.id] ?? 0) * 20)}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  )
}
