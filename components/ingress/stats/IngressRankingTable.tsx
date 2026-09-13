'use client'

import {useEffect, useRef, useState} from 'react'
import {FaEye, FaEyeSlash} from 'react-icons/fa'
import Panel from '../Panel'
import AgentHistoryChart from './AgentHistoryChart'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {RADAR_AXES, computeRadarAxes} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {TIER_COLOR} from '@/lib/ingress-tiers.mjs'
import {COUNTRIES} from '@/lib/ingress-countries.mjs'
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
  country_code: string | null
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

type CountryOption = {code: string; namePt: string; nameEn: string}
const COUNTRY_BY_CODE = new Map((COUNTRIES as CountryOption[]).map((c) => [c.code, c]))
function countryName(code: string, lang: Lang): string | null {
  const c = COUNTRY_BY_CODE.get(code)
  if (!c) return null
  return lang === 'en' ? c.nameEn : c.namePt
}
const flagSrc = (code: string) => `/ingress/flags/${code.toLowerCase()}.svg`

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

const SHAPE_SIZE = 150
const SHAPE_C = SHAPE_SIZE / 2
const SHAPE_R = 58
function shapePoint(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [SHAPE_C + radius * Math.cos(angle), SHAPE_C + radius * Math.sin(angle)]
}

/**
 * Radar estático "Forma" (normalizado pelo próprio eixo mais forte do
 * agente, igual à escala "Forma" do `ProfileRadar` grande) — sem escala/
 * comparação/hover, é só um preview visual do formato de jogo daquele
 * agente dentro do painel expandido. Reaproveita `computeRadarAxes` (puro,
 * client-safe) e as mesmas classes CSS do radar grande.
 */
function MiniShapeRadar({
  stats,
  ariaLabel,
  faction,
}: {
  stats: Record<string, number>
  ariaLabel: string
  faction: RankingRow['faction']
}) {
  const axes = computeRadarAxes(stats) as {id: string; onyxRatio: number}[]
  const n = axes.length
  const maxRatio = Math.max(...axes.map((a) => a.onyxRatio), 0.01)
  const radiusIn = (ratio: number) => SHAPE_R * Math.max(Math.min(ratio / maxRatio, 1), 0.02)
  const shape = axes.map((a, i) => shapePoint(i, n, radiusIn(a.onyxRatio)).join(',')).join(' ')

  return (
    <svg
      viewBox={`0 0 ${SHAPE_SIZE} ${SHAPE_SIZE}`}
      width={SHAPE_SIZE}
      height={SHAPE_SIZE}
      role="img"
      aria-label={ariaLabel}
      className={faction === 'resistance' ? 'ing-mini-radar--resistance' : undefined}
    >
      {[0.34, 0.67, 1].map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => shapePoint(i, n, SHAPE_R * f).join(',')).join(' ')}
          className={`ing-radar__ring${f === 1 ? ' ing-radar__ring--edge' : ''}`}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = shapePoint(i, n, SHAPE_R)
        return <line key={a.id} x1={SHAPE_C} y1={SHAPE_C} x2={x} y2={y} className="ing-radar__spoke" />
      })}
      <polygon points={shape} className="ing-radar__shape" />
    </svg>
  )
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
    colFaction: 'Facção',
    colCountry: 'País',
    colCodename: 'Codinome',
    colDates: 'Datas',
    datesTooltip: (updated: string, measured: string) => `Atualizado em ${updated} · Medido desde ${measured}`,
    colAp: 'AP total',
    colScore: 'Nota geral',
    colDetails: 'Detalhes',
    hideDetails: (name: string) => `Esconder detalhes de ${name}`,
    showDetails: (name: string) => `Ver detalhes de ${name}`,
    shapeLabel: 'Forma',
    shapeAria: (name: string) => `Formato de jogo de ${name} (radar normalizado pelo eixo mais forte)`,
    logoCredit: 'Logos de facção: cr0ybot/ingress-logos (CC BY-NC-SA 3.0)',
  },
  en: {
    panelLabel: 'Agent ranking',
    panelHint: (n: number) => `${n} agent${n > 1 ? 's' : ''} measured`,
    emptyBody: "No one's been measured here yet — paste your export in one of the buttons above to be the ranking's first agent.",
    refreshBtn: 'Refresh',
    refreshingBtn: 'Refreshing…',
    colRank: '#',
    colFaction: 'Faction',
    colCountry: 'Country',
    colCodename: 'Codename',
    colDates: 'Dates',
    datesTooltip: (updated: string, measured: string) => `Updated on ${updated} · Measured since ${measured}`,
    colAp: 'Total AP',
    colScore: 'Overall score',
    colDetails: 'Details',
    hideDetails: (name: string) => `Hide details for ${name}`,
    showDetails: (name: string) => `Show details for ${name}`,
    shapeLabel: 'Shape',
    shapeAria: (name: string) => `${name}'s play shape (radar normalized by its strongest axis)`,
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
              <th scope="col" data-col="rank">{t.colRank}</th>
              <th scope="col" data-col="score">{t.colScore}</th>
              <th scope="col" data-col="faction" aria-label={t.colFaction} />
              <th scope="col" data-col="country" aria-label={t.colCountry} />
              <th scope="col" data-col="codename">{t.colCodename}</th>
              <th scope="col" data-col="dates">{t.colDates}</th>
              <th scope="col" data-col="ap">{t.colAp}</th>
              <th scope="col" data-col="details" aria-label={t.colDetails} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isOpen = expanded === row.codename_key
              return (
                  <tr key={row.codename_key} className={isOpen ? 'is-expanded' : undefined}>
                    <td data-col="rank">{i + 1}</td>
                    <td data-col="score">{fmtScore(row.overall_score)}</td>
                    <td data-col="faction">
                      <img
                        src={FACTION_ICON[row.faction]}
                        alt={FACTION_LABEL[row.faction]}
                        title={FACTION_LABEL[row.faction]}
                        width={18}
                        height={18}
                        className="ing-ranking-table__faction-icon"
                      />
                    </td>
                    <td data-col="country">
                      {row.country_code ? (
                        <img
                          src={flagSrc(row.country_code)}
                          alt={countryName(row.country_code, lang) ?? row.country_code}
                          title={countryName(row.country_code, lang) ?? row.country_code}
                          width={20}
                          height={15}
                          className="ing-ranking-table__country-flag"
                        />
                      ) : null}
                    </td>
                    <td data-col="codename">
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
          <div className="ing-ranking-table__detail-shape">
            <span className="ing-ranking-table__detail-shape-label">{t.shapeLabel}</span>
            <MiniShapeRadar stats={expandedRow.stat_values} ariaLabel={t.shapeAria(expandedRow.codename)} faction={expandedRow.faction} />
          </div>
        </div>
      ) : null}

      {expandedRow ? (
        <AgentHistoryChart codenameKey={expandedRow.codename_key} agentName={expandedRow.codename} faction={expandedRow.faction} />
      ) : null}

      <p className="ing-ranking-table__credit">{t.logoCredit}</p>
    </Panel>
  )
}
