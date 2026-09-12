'use client'

import {useEffect, useRef, useState} from 'react'
import {FaEye, FaEyeSlash} from 'react-icons/fa'
import Panel from '../Panel'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {TIER_COLOR} from '@/lib/ingress-tiers.mjs'
import {useLang, type Lang} from '@/context/LanguageContext'

export type StatTier = {tier: string; badgeSlug: string | null}

export type RankingRow = {
  codename_key: string
  codename: string
  faction: 'enlightened' | 'resistance'
  lifetime_ap: number
  overall_score: number
  axis_scores: Record<string, number>
  stat_values: Record<string, number>
  stat_tiers?: Record<string, StatTier>
  created_at: string
  updated_at: string
}

const FACTION_LABEL: Record<RankingRow['faction'], string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}

/**
 * Logo oficial de facção (hexágono), baixado de github.com/cr0ybot/ingress-logos
 * (`enlightened_hexagon`/`resistance_hexagon`, `.svg`) — CC BY-NC-SA 3.0,
 * uso pessoal/não-comercial com atribuição. Salvo em `public/ingress/factions/`.
 */
const FACTION_ICON: Record<RankingRow['faction'], string> = {
  enlightened: '/ingress/factions/enlightened.svg',
  resistance: '/ingress/factions/resistance.svg',
}

/** Cor do selo de tier por medalha — `TIER_COLOR` não cobre `'none'` (medalha ainda não alcançada). */
const NONE_TIER_COLOR = 'var(--ing-text-faint)'
function tierColor(tier: string): string {
  return (TIER_COLOR as Record<string, string>)[tier] ?? NONE_TIER_COLOR
}

/**
 * "Ressonadores" -> "Res." só neste chip (largura fixa, pedido do Luiz) —
 * as outras exibições do mesmo stat (breakdown do `ProfileRadar`, painéis de
 * `/ingress`) continuam com o nome completo; `RADAR_AXES` não muda.
 */
const CHIP_LABEL_OVERRIDE: Record<string, {pt: string; en: string}> = {
  resonatorsDeployed: {pt: 'Res. implantados', en: 'Res. deployed'},
  resonatorsDestroyed: {pt: 'Res. destruídos', en: 'Res. destroyed'},
}
function chipLabel(part: {key: string; label: string; labelEn: string}, lang: Lang): string {
  const override = CHIP_LABEL_OVERRIDE[part.key]
  if (override) return override[lang]
  return lang === 'en' ? part.labelEn : part.label
}

// Espelha o `s-maxage=20` do `GET /api/ingress-rankings` (ver route.ts) — não
// tem por que o cliente pedir dado mais fresco do que o próprio cache permite.
const POLL_MS = 20_000

const fmtScore = (n: number) => Math.round(n).toString()
const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})

/** Textos bilíngues (ISTATS-19 fix) — a branch `pt` reproduz o texto que já existia. */
const T = {
  pt: {
    panelLabel: 'Ranking de agentes',
    panelHint: (n: number) => `${n} agente${n > 1 ? 's' : ''} medido${n > 1 ? 's' : ''}`,
    emptyBody: 'Ainda ninguém foi medido por aqui — cole seu export num dos botões acima pra ser o primeiro agente do ranking.',
    refreshBtn: 'Atualizar',
    refreshingBtn: 'Atualizando…',
    colRank: '#',
    colCodename: 'Codinome',
    colDates: 'Datas',
    datesTooltip: (updated: string, measured: string) => `Atualizado em ${updated} · Medido desde ${measured}`,
    colAp: 'AP total',
    colScore: 'Nota geral',
    colDetails: 'Detalhes',
    hideDetails: (name: string) => `Esconder detalhes de ${name}`,
    showDetails: (name: string) => `Ver detalhes de ${name}`,
    logoCredit: 'Logos de facção: cr0ybot/ingress-logos (CC BY-NC-SA 3.0)',
  },
  en: {
    panelLabel: 'Agent ranking',
    panelHint: (n: number) => `${n} agent${n > 1 ? 's' : ''} measured`,
    emptyBody: "No one's been measured here yet — paste your export in one of the buttons above to be the ranking's first agent.",
    refreshBtn: 'Refresh',
    refreshingBtn: 'Refreshing…',
    colRank: '#',
    colCodename: 'Codename',
    colDates: 'Dates',
    datesTooltip: (updated: string, measured: string) => `Updated on ${updated} · Measured since ${measured}`,
    colAp: 'Total AP',
    colScore: 'Overall score',
    colDetails: 'Details',
    hideDetails: (name: string) => `Hide details for ${name}`,
    showDetails: (name: string) => `Show details for ${name}`,
    logoCredit: 'Faction logos: cr0ybot/ingress-logos (CC BY-NC-SA 3.0)',
  },
} as const

async function fetchRows(): Promise<RankingRow[] | null> {
  try {
    const res = await fetch('/api/ingress-rankings')
    if (!res.ok) return null
    const {rows} = (await res.json()) as {rows: RankingRow[]}
    return rows
  } catch {
    return null
  }
}

/**
 * Tabela completa do ranking (ISTATS-15/16/29) — posição, codinome+facção,
 * atualizado em, medido desde, AP total, nota geral, e um ícone "olho" por
 * linha que expande os 12 valores brutos agrupados pelos 5 eixos do radar.
 *
 * SPEC_DEVIATION: o design previa `IngressRankingTable` refazendo o GET
 * "quando sinalizado por StatsRadarSection" via um callback prop. Isso exige
 * um estado compartilhado entre dois Client Components irmãos sob o mesmo pai
 * — mas o pai (`app/ingress/ranking/page.tsx`, T12) precisa continuar Server
 * Component (seu próprio "Done when"), e uma função não pode atravessar a
 * fronteira Server->Client como prop. Reason: em vez de um arquivo extra só
 * pra guardar esse estado-ponte, esta tabela se atualiza sozinha — poll a
 * cada 20s (mesma janela do `s-maxage` da rota) mais um botão "Atualizar"
 * manual, o mesmo padrão de poll já usado por nuvem-de-palavras/quiz-ao-vivo
 * neste projeto. O efeito visível (ranking fresco pouco depois de um envio) é
 * o mesmo; só o mecanismo muda.
 */
export default function IngressRankingTable({initialRows}: {initialRows: RankingRow[]}) {
  const {lang} = useLang()
  const t = T[lang]
  const [rows, setRows] = useState(initialRows)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const id = window.setInterval(async () => {
      const fresh = await fetchRows()
      if (fresh && mounted.current) setRows(fresh)
    }, POLL_MS)
    return () => {
      mounted.current = false
      window.clearInterval(id)
    }
  }, [])

  const refreshNow = async () => {
    setRefreshing(true)
    const fresh = await fetchRows()
    if (fresh && mounted.current) setRows(fresh)
    if (mounted.current) setRefreshing(false)
  }

  const expandedRow = rows.find((r) => r.codename_key === expanded) ?? null

  if (rows.length === 0) {
    return (
      <Panel label={t.panelLabel}>
        <p style={{color: 'var(--ing-text-dim)'}}>{t.emptyBody}</p>
      </Panel>
    )
  }

  return (
    <Panel label={t.panelLabel} hint={t.panelHint(rows.length)}>
      <div className="ing-ranking-table__actions">
        <button type="button" className="ing-radar__btn" onClick={refreshNow} disabled={refreshing}>
          {refreshing ? t.refreshingBtn : t.refreshBtn}
        </button>
      </div>
      <div className="ing-ranking-table__wrap">
        <table className="ing-ranking-table">
          <thead>
            <tr>
              <th scope="col">{t.colRank}</th>
              <th scope="col">{t.colScore}</th>
              <th scope="col">{t.colCodename}</th>
              <th scope="col">{t.colDates}</th>
              <th scope="col">{t.colAp}</th>
              <th scope="col" aria-label={t.colDetails} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isOpen = expanded === row.codename_key
              return (
                  <tr key={row.codename_key} className={isOpen ? 'is-expanded' : undefined}>
                    <td data-col="rank">{i + 1}</td>
                    <td data-col="score">{fmtScore(row.overall_score)}</td>
                    <td data-col="codename">
                      <img
                        src={FACTION_ICON[row.faction]}
                        alt={FACTION_LABEL[row.faction]}
                        title={FACTION_LABEL[row.faction]}
                        width={18}
                        height={18}
                        className="ing-ranking-table__faction-icon"
                      />
                      <span className="ing-ranking-table__codename">{row.codename}</span>
                    </td>
                    <td data-col="dates" title={t.datesTooltip(fmtDate(row.updated_at, lang), fmtDate(row.created_at, lang))}>
                      {fmtDate(row.updated_at, lang)}
                    </td>
                    <td data-col="ap">{fmtStat(row.lifetime_ap)}</td>
                    <td data-col="details">
                      <button
                        type="button"
                        className="ing-ranking-table__eye"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? t.hideDetails(row.codename) : t.showDetails(row.codename)}
                        onClick={() => setExpanded(isOpen ? null : row.codename_key)}
                      >
                        {isOpen ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                      </button>
                    </td>
                  </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {expandedRow ? (
        <div className="ing-ranking-table__detail">
          {RADAR_AXES.map((axis) => (
            <div key={axis.id} className="ing-ranking-table__detail-axis">
              <strong>{lang === 'en' ? axis.labelEn : axis.label}</strong>
              <div className="ing-ranking-table__chips">
                {axis.parts.map((part) => {
                  const info = expandedRow.stat_tiers?.[part.key]
                  const tier = info?.tier ?? 'none'
                  const iconTier = tier === 'none' ? 'bronze' : tier
                  const iconSrc = info?.badgeSlug ? artPath(info.badgeSlug, iconTier) : null
                  return (
                    <div
                      key={part.key}
                      className={`ing-ranking-table__chip${tier === 'none' ? ' is-none' : ''}`}
                      style={{borderColor: tierColor(tier)}}
                      title={tier}
                    >
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt=""
                          width={32}
                          height={32}
                          className="ing-ranking-table__chip-icon"
                        />
                      ) : null}
                      <span className="ing-ranking-table__chip-text">
                        <span className="ing-ranking-table__chip-label">{chipLabel(part, lang)}</span>
                        <span className="ing-ranking-table__chip-value">
                          {fmtStat(expandedRow.stat_values?.[part.key] ?? 0)}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="ing-ranking-table__credit">{t.logoCredit}</p>
    </Panel>
  )
}
