'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
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

/**
 * Colunas compactas de nota por eixo (pedido do Luiz: "C D E H LF" em vez do
 * nome inteiro, pra caber na tabela) — a abreviação é a mesma em pt/en porque
 * as 5 iniciais batem nos dois idiomas (Construção/Construction -> C, etc.),
 * então não precisa de par pt/en como o resto de `T`. O rótulo completo por
 * idioma vem de `RADAR_AXES` via `axisLabel`, usado no `title`/aria-label.
 */
type AxisId = 'construcao' | 'destruicao' | 'exploracao' | 'hacking' | 'linksCampos'
const AXIS_COLUMNS: {id: AxisId; short: string}[] = [
  {id: 'construcao', short: 'C'},
  {id: 'destruicao', short: 'D'},
  {id: 'exploracao', short: 'E'},
  {id: 'hacking', short: 'H'},
  {id: 'linksCampos', short: 'LF'},
]
function axisLabel(id: AxisId, lang: Lang): string {
  const axis = (RADAR_AXES as {id: string; label: string; labelEn: string}[]).find((a) => a.id === id)
  if (!axis) return id
  return lang === 'en' ? axis.labelEn : axis.label
}

type SortableKey = 'score' | 'ap' | 'country' | AxisId
type SortDir = 'asc' | 'desc'
const SORT_DEFAULT_DIR: Record<SortableKey, SortDir> = {
  score: 'desc',
  ap: 'desc',
  country: 'asc',
  construcao: 'desc',
  destruicao: 'desc',
  exploracao: 'desc',
  hacking: 'desc',
  linksCampos: 'desc',
}

const DIACRITICS_RE = new RegExp(`[${String.fromCodePoint(0x300)}-${String.fromCodePoint(0x36f)}]`, 'g')
function normalizeText(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase()
}

/** Desempate padrão (mesma ordem que a tabela tinha antes de existir sort por coluna): nota geral desc -> AP desc -> mais antigo primeiro. */
function baseTieBreak(a: RankingRow, b: RankingRow): number {
  if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score
  if (b.lifetime_ap !== a.lifetime_ap) return b.lifetime_ap - a.lifetime_ap
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

function numericSortValue(row: RankingRow, key: Exclude<SortableKey, 'country'>): number {
  if (key === 'score') return row.overall_score
  if (key === 'ap') return row.lifetime_ap
  return row.axis_scores?.[key] ?? 0
}

/** País ordena pelo nome exibido (localizado); sem país sempre vai pro fim, nas duas direções. */
function compareRows(a: RankingRow, b: RankingRow, key: SortableKey, dir: SortDir, lang: Lang): number {
  if (key === 'country') {
    const an = a.country_code ? countryName(a.country_code, lang) ?? a.country_code : null
    const bn = b.country_code ? countryName(b.country_code, lang) ?? b.country_code : null
    if (an === null && bn === null) return baseTieBreak(a, b)
    if (an === null) return 1
    if (bn === null) return -1
    const cmp = an.localeCompare(bn, lang === 'en' ? 'en' : 'pt-BR')
    return cmp !== 0 ? (dir === 'asc' ? cmp : -cmp) : baseTieBreak(a, b)
  }
  const av = numericSortValue(a, key)
  const bv = numericSortValue(b, key)
  return av !== bv ? (dir === 'asc' ? av - bv : bv - av) : baseTieBreak(a, b)
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
    panelHintFiltered: (v: number, n: number) => `${v} de ${n} agente${n > 1 ? 's' : ''} medido${n > 1 ? 's' : ''}`,
    emptyBody: 'Ainda ninguém foi medido por aqui — cole seu export num dos botões acima pra ser o primeiro agente do ranking.',
    noResultsBody: 'Nenhum agente encontrado com esses filtros.',
    searchPlaceholder: 'Buscar codinome…',
    factionAll: 'Todas',
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
    panelHintFiltered: (v: number, n: number) => `${v} of ${n} agent${n > 1 ? 's' : ''} measured`,
    emptyBody: "No one's been measured here yet — paste your export in one of the buttons above to be the ranking's first agent.",
    noResultsBody: 'No agents found for these filters.',
    searchPlaceholder: 'Search codename…',
    factionAll: 'All',
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
  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState<'all' | RankingRow['faction']>('all')
  const [sortKey, setSortKey] = useState<SortableKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const mounted = useRef(true)

  const handleSort = (key: SortableKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(SORT_DEFAULT_DIR[key])
    }
  }

  const sortArrow = (key: SortableKey) =>
    sortKey === key ? (
      <span className="ing-ranking-table__sort-arrow" aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
    ) : null

  const ariaSort = (key: SortableKey): 'ascending' | 'descending' | 'none' =>
    sortKey !== key ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'

  const visibleRows = useMemo(() => {
    const q = normalizeText(search.trim())
    const filtered = rows.filter(
      (r) => (factionFilter === 'all' || r.faction === factionFilter) && (!q || normalizeText(r.codename).includes(q))
    )
    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir, lang))
  }, [rows, search, factionFilter, sortKey, sortDir, lang])

  // `rows` chega do servidor já na ordem canônica (overall_score desc ->
  // lifetime_ap desc -> created_at asc — mesma de compareRankingRows), então
  // o índice aqui É a posição real no ranking geral. A coluna "#" usa isso,
  // nunca o índice de `visibleRows` (que muda com filtro/busca/ordenação
  // local e pararia de refletir o rank de verdade).
  const rankByKey = useMemo(() => new Map(rows.map((r, i) => [r.codename_key, i + 1])), [rows])

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

  // Baseado em `visibleRows`, não `rows`: se um filtro esconder a linha
  // expandida, o detalhe fecha sozinho em vez de mostrar dado de uma linha
  // que não está mais na tabela visível.
  const expandedRow = visibleRows.find((r) => r.codename_key === expanded) ?? null

  if (rows.length === 0) {
    return (
      <Panel label={t.panelLabel}>
        <p style={{color: 'var(--ing-text-dim)'}}>{t.emptyBody}</p>
      </Panel>
    )
  }

  return (
    <Panel
      label={t.panelLabel}
      hint={visibleRows.length !== rows.length ? t.panelHintFiltered(visibleRows.length, rows.length) : t.panelHint(rows.length)}
    >
      <div className="ing-ranking-table__toolbar">
        <div className="ing-ranking-table__filters">
          <input
            type="search"
            className="ing-ranking-table__search"
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ing-ranking-table__faction-filter" role="group" aria-label={t.colFaction}>
            <button
              type="button"
              className={factionFilter === 'all' ? 'is-active' : undefined}
              onClick={() => setFactionFilter('all')}
            >
              {t.factionAll}
            </button>
            {(['enlightened', 'resistance'] as const).map((faction) => (
              <button
                key={faction}
                type="button"
                className={factionFilter === faction ? 'is-active' : undefined}
                onClick={() => setFactionFilter(faction)}
              >
                <img src={FACTION_ICON[faction]} alt="" width={16} height={16} />
                {FACTION_LABEL[faction]}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="ing-radar__btn" onClick={refreshNow} disabled={refreshing}>
          {refreshing ? t.refreshingBtn : t.refreshBtn}
        </button>
      </div>

      {visibleRows.length === 0 ? (
        <p className="ing-ranking-table__no-results">{t.noResultsBody}</p>
      ) : (
      <div className="ing-ranking-table__wrap">
        <table className="ing-ranking-table">
          <thead>
            <tr>
              <th scope="col" data-col="rank">{t.colRank}</th>
              <th scope="col" data-col="score" aria-sort={ariaSort('score')}>
                <button type="button" className="ing-ranking-table__sort-btn" onClick={() => handleSort('score')}>
                  {t.colScore}{sortArrow('score')}
                </button>
              </th>
              <th scope="col" data-col="faction" aria-label={t.colFaction} />
              <th scope="col" data-col="country" aria-sort={ariaSort('country')}>
                <button type="button" className="ing-ranking-table__sort-btn" onClick={() => handleSort('country')}>
                  {t.colCountry}{sortArrow('country')}
                </button>
              </th>
              <th scope="col" data-col="codename">{t.colCodename}</th>
              <th scope="col" data-col="dates">{t.colDates}</th>
              <th scope="col" data-col="ap" aria-sort={ariaSort('ap')}>
                <button type="button" className="ing-ranking-table__sort-btn" onClick={() => handleSort('ap')}>
                  {t.colAp}{sortArrow('ap')}
                </button>
              </th>
              {AXIS_COLUMNS.map((col) => (
                <th key={col.id} scope="col" data-col={col.id} title={axisLabel(col.id, lang)} aria-sort={ariaSort(col.id)}>
                  <button
                    type="button"
                    className="ing-ranking-table__sort-btn"
                    aria-label={axisLabel(col.id, lang)}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.short}{sortArrow(col.id)}
                  </button>
                </th>
              ))}
              <th scope="col" data-col="details" aria-label={t.colDetails} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isOpen = expanded === row.codename_key
              return (
                  <tr key={row.codename_key} className={isOpen ? 'is-expanded' : undefined}>
                    <td data-col="rank">{rankByKey.get(row.codename_key)}</td>
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
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
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
                    {AXIS_COLUMNS.map((col) => (
                      <td key={col.id} data-col={col.id}>{fmtScore(row.axis_scores?.[col.id] ?? 0)}</td>
                    ))}
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
      )}

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
