'use client'

import {Fragment, useEffect, useRef, useState} from 'react'
import {motion, useReducedMotion} from 'framer-motion'
import {FaBalanceScale, FaShareAlt} from 'react-icons/fa'
import {toast} from 'sonner'
import {TextScramble} from '@/components/ui/text-scramble'
import Panel from '../Panel'
import AgentHistoryChart from './AgentHistoryChart'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {RADAR_AXES, computeRadarAxes} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {TIER_COLOR} from '@/lib/ingress-tiers.mjs'
import {COUNTRIES, flagSrc} from '@/lib/ingress-countries.mjs'
import {RANKING_PAGE_SIZES, defaultSortDir} from '@/lib/ingress-rankings.mjs'
import {useLang, type Lang} from '@/context/LanguageContext'
import {trackIngressAgentShared} from '@/utils/analytics'

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
  recursions: number | null
  created_at: string
  updated_at: string
  /** Posição canônica global (nota geral desc -> AP desc -> criado asc) — vem pronta do servidor, nunca recalculada no cliente (IRCMP-18). */
  rank: number
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

// rank, score, faction, country, codename, dates, ap, details (8) + os 5 eixos.
const TOTAL_COLUMNS = 8 + AXIS_COLUMNS.length

type SortableKey = 'score' | 'ap' | 'country' | AxisId
type SortDir = 'asc' | 'desc'

/** Cor do selo de tier por medalha — `TIER_COLOR` não cobre `'none'` (medalha ainda não alcançada). */
const NONE_TIER_COLOR = 'var(--ing-text-faint)'
function tierColor(tier: string): string {
  return (TIER_COLOR as Record<string, string>)[tier] ?? NONE_TIER_COLOR
}

/**
 * "Ressonadores" -> "Res." só neste chip (largura fixa, pedido do Luiz) —
 * as outras exibições do mesmo stat (breakdown do `ProfileRadar`, painéis de
 * `/ingress/fencherlc`) continuam com o nome completo; `RADAR_AXES` não muda.
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

const PLAYSTYLE_SIZE = 150
const PLAYSTYLE_C = PLAYSTYLE_SIZE / 2
const PLAYSTYLE_R = 58
// Folga do viewBox pra caber o texto de cada ponta (pedido do Luiz: nome do
// eixo, não só o desenho) sem cortar nas bordas — mesma lógica do `PAD_X` do
// `ProfileRadar` grande, só escalada pro tamanho mini.
const PLAYSTYLE_PAD_X = 42
const PLAYSTYLE_PAD_TOP = 12
const PLAYSTYLE_PAD_BOTTOM = 14
function playStylePoint(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [PLAYSTYLE_C + radius * Math.cos(angle), PLAYSTYLE_C + radius * Math.sin(angle)]
}

/**
 * Radar estático "Estilo de jogo" (normalizado pelo próprio eixo mais forte
 * do agente, igual à escala "Estilo" do `ProfileRadar` grande) — sem escala/
 * comparação/hover, é só um preview visual do formato de jogo daquele
 * agente dentro do painel expandido. Reaproveita `computeRadarAxes` (puro,
 * client-safe) e as mesmas classes CSS do radar grande.
 */
function MiniPlayStyleRadar({
  stats,
  ariaLabel,
  faction,
  lang,
}: {
  stats: Record<string, number>
  ariaLabel: string
  faction: RankingRow['faction']
  lang: Lang
}) {
  const axes = computeRadarAxes(stats) as {id: string; label: string; labelEn: string; score: number}[]
  const n = axes.length
  const maxScore = Math.max(...axes.map((a) => a.score), 1)
  const radiusIn = (score: number) => PLAYSTYLE_R * Math.max(Math.min(score / maxScore, 1), 0.02)
  const shape = axes.map((a, i) => playStylePoint(i, n, radiusIn(a.score)).join(',')).join(' ')

  return (
    <svg
      viewBox={`${-PLAYSTYLE_PAD_X} ${-PLAYSTYLE_PAD_TOP} ${PLAYSTYLE_SIZE + PLAYSTYLE_PAD_X * 2} ${PLAYSTYLE_SIZE + PLAYSTYLE_PAD_TOP + PLAYSTYLE_PAD_BOTTOM}`}
      width={PLAYSTYLE_SIZE + PLAYSTYLE_PAD_X * 2}
      height={PLAYSTYLE_SIZE + PLAYSTYLE_PAD_TOP + PLAYSTYLE_PAD_BOTTOM}
      role="img"
      aria-label={ariaLabel}
      className={faction === 'resistance' ? 'ing-mini-radar--resistance' : undefined}
    >
      {[0.34, 0.67, 1].map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => playStylePoint(i, n, PLAYSTYLE_R * f).join(',')).join(' ')}
          className={`ing-radar__ring${f === 1 ? ' ing-radar__ring--edge' : ''}`}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = playStylePoint(i, n, PLAYSTYLE_R)
        return <line key={a.id} x1={PLAYSTYLE_C} y1={PLAYSTYLE_C} x2={x} y2={y} className="ing-radar__spoke" />
      })}
      <polygon points={shape} className="ing-radar__shape" />
      {axes.map((a, i) => {
        const [lx, ly] = playStylePoint(i, n, PLAYSTYLE_R + 16)
        const anchor = lx < PLAYSTYLE_C - 8 ? 'end' : lx > PLAYSTYLE_C + 8 ? 'start' : 'middle'
        return (
          <text
            key={`label-${a.id}`}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="ing-mini-radar__label"
          >
            {lang === 'en' ? a.labelEn : a.label}
          </text>
        )
      })}
    </svg>
  )
}

// Espelha o `s-maxage=20` do `GET /api/ingress-rankings` (ver route.ts) — não
// tem por que o cliente pedir dado mais fresco do que o próprio cache permite.
const POLL_MS = 20_000
const SEARCH_DEBOUNCE_MS = 300

/** Mola das linhas que trocam de lugar (ordenação, ou o poll de 20s reposicionando alguém). */
const ROW_LAYOUT_TRANSITION = {type: 'spring', stiffness: 420, damping: 40} as const

const fmtScore = (n: number) => Math.round(n).toString()
const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})

/** "há N dias"/"há N meses" (pedido do Luiz pro lado direito do "Estilo de jogo") — texto solto, não `Intl.RelativeTimeFormat`, pra controlar a troca dia->mês em 30 igual ao desenho. */
function relativeAge(iso: string, lang: Lang): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
  if (days < 1) return lang === 'en' ? 'today' : 'hoje'
  if (days < 30) return lang === 'en' ? `${days}d ago` : `há ${days} dia${days > 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  return lang === 'en' ? `${months}mo ago` : `há ${months} ${months > 1 ? 'meses' : 'mês'}`
}

/** Textos bilíngues (ISTATS-19 fix) — a branch `pt` reproduz o texto que já existia, mais os novos de paginação/comparação (T15). */
const T = {
  pt: {
    panelLabel: 'Ranking de agentes',
    panelHint: (n: number) => `${n} agente${n === 1 ? '' : 's'} medido${n === 1 ? '' : 's'}`,
    panelHintFiltered: (n: number) => `${n} resultado${n === 1 ? '' : 's'} encontrado${n === 1 ? '' : 's'}`,
    emptyBody: 'Ainda ninguém foi medido por aqui — cole seu export num dos botões acima pra ser o primeiro agente do ranking.',
    noResultsBody: 'Nenhum agente encontrado com esses filtros.',
    errorBody: 'Não foi possível carregar o ranking.',
    retryBtn: 'Tentar de novo',
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
    colShare: 'Compartilhar',
    shareAgentAria: (name: string) => `Compartilhar o link de ${name}`,
    shareAgentTitle: (name: string) => `${name} — Ranking de Agentes Ingress`,
    shareAgentText: (name: string) => `Veja a posição de ${name} no ranking de agentes do Ingress!`,
    linkCopied: 'Link copiado!',
    compareAgentAria: (name: string) => `Comparar com ${name}`,
    compareBtn: 'Comparar',
    playStyleLabel: 'Estilo de jogo',
    playStyleAria: (name: string) => `Estilo de jogo de ${name} (radar normalizado pelo eixo mais forte)`,
    recursionsAria: (n: number) => `${n} ${n === 1 ? 'recursão' : 'recursões'}`,
    recursionsUnknown: 'Exporte novamente seus dados para atualizarmos este campo — não salvávamos ele antes.',
    lastUpdateLabel: 'Última atualização',
    logoCredit: 'Logos de facção: cr0ybot/ingress-logos (CC BY-NC-SA 3.0)',
    pageSizeAria: 'Agentes por página',
    prevPage: 'Anterior',
    nextPage: 'Próxima',
    pageIndicator: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
  },
  en: {
    panelLabel: 'Agent ranking',
    panelHint: (n: number) => `${n} agent${n === 1 ? '' : 's'} measured`,
    panelHintFiltered: (n: number) => `${n} result${n === 1 ? '' : 's'} found`,
    emptyBody: "No one's been measured here yet — paste your export in one of the buttons above to be the ranking's first agent.",
    noResultsBody: 'No agents found for these filters.',
    errorBody: 'Could not load the ranking.',
    retryBtn: 'Try again',
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
    colShare: 'Share',
    shareAgentAria: (name: string) => `Share ${name}'s link`,
    shareAgentTitle: (name: string) => `${name} — Ingress Agent Ranking`,
    shareAgentText: (name: string) => `Check out ${name}'s spot in the Ingress agent ranking!`,
    linkCopied: 'Link copied!',
    compareAgentAria: (name: string) => `Compare with ${name}`,
    compareBtn: 'Compare',
    playStyleLabel: 'Play style',
    playStyleAria: (name: string) => `${name}'s play style (radar normalized by its strongest axis)`,
    recursionsAria: (n: number) => `${n} recursion${n === 1 ? '' : 's'}`,
    recursionsUnknown: "Re-export your stats so we can fill this in — we weren't saving it before.",
    lastUpdateLabel: 'Last updated',
    logoCredit: 'Faction logos: cr0ybot/ingress-logos (CC BY-NC-SA 3.0)',
    pageSizeAria: 'Agents per page',
    prevPage: 'Previous',
    nextPage: 'Next',
    pageIndicator: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
} as const

type FetchParams = {
  page: number
  pageSize: number
  sortKey: SortableKey
  sortDir: SortDir
  search: string
  faction: 'all' | RankingRow['faction']
}

async function fetchPage(params: FetchParams): Promise<{rows: RankingRow[]; total: number} | null> {
  try {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      sort: params.sortKey,
      dir: params.sortDir,
      faction: params.faction,
    })
    if (params.search) qs.set('search', params.search)
    const res = await fetch(`/api/ingress-rankings?${qs.toString()}`)
    if (!res.ok) return null
    const data = (await res.json()) as {rows: RankingRow[]; total: number}
    return {rows: data.rows, total: data.total}
  } catch {
    return null
  }
}

/**
 * Tabela completa do ranking (ISTATS-15/16/29; server-paginada desde T15,
 * ingress-ranking-comparison) — posição canônica, codinome+facção, atualizado
 * em, medido desde, AP total, nota geral, e um ícone "olho" por linha que
 * expande os 12 valores brutos agrupados pelos 5 eixos do radar.
 *
 * `page`/`pageSize`/`sortKey`/`sortDir`/`search`/`factionFilter` viram
 * parâmetros de uma busca ao servidor (`GET /api/ingress-rankings`) — o
 * cliente não guarda mais o ranking inteiro em memória. `rank` chega pronto
 * em cada linha (rank canônico, calculado no servidor antes de
 * busca/filtro/ordenação de exibição — IRCMP-18), então não há mais cálculo
 * de posição no cliente. O componente busca a página 1 default no mount
 * (mesmos parâmetros da SSR) pra descobrir `total` — `page.tsx` não passa
 * mais esse número por prop (ver SPEC_DEVIATION em T7/tasks.md).
 */
export default function IngressRankingTable({
  initialRows,
  onCompareRow,
  pendingCompareKey,
}: {
  initialRows: RankingRow[]
  /** Atalho "Comparar" por linha (P2, IRCMP-31/32) — 1º clique marca, 2º clique (em `IngressRankingTabs`) preenche Agente A/B e troca a aba. */
  onCompareRow: (codenameKey: string) => void
  /** Agente já marcado pelo 1º clique, esperando o segundo — a linha dele fica destacada. */
  pendingCompareKey: string | null
}) {
  const {lang} = useLang()
  const t = T[lang]
  // O scramble é JS (timers), então nem o CSS nem o `MotionConfig` o alcançam.
  const reduceMotion = useReducedMotion()
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState<'all' | RankingRow['faction']>('all')
  const [sortKey, setSortKey] = useState<SortableKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const mounted = useRef(true)
  // Realça/rola até a linha de `?destaque=<codename_key>` — o link que o
  // alerta de novo registro no Telegram manda (ver `notifyTelegramNewEntry`
  // em `api/ingress-rankings/route.ts`). Lido direto de `window.location`
  // num efeito (não `useSearchParams`) pra não exigir um `<Suspense>` só por
  // causa de um parâmetro opcional que só importa depois da hidratação.
  // SPEC_DEVIATION (T15): se o agente destacado não estiver carregado na
  // página/ordenação/filtro atual, o highlight simplesmente não acontece —
  // não busca a página onde ele estaria (exigiria um endpoint novo "em que
  // página está X", fora do pedido da spec). Já era o comportamento de fato
  // sempre que a linha saía do array em memória; agora só fica mais comum.
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  // Garante que o auto-abrir + rolar só aconteça uma vez — sem isso, cada
  // poll de 20s (`rows` ganha uma referência nova) repetiria o scroll pra
  // sempre, inclusive depois do agente já ter fechado o detalhe na mão.
  const highlightHandledRef = useRef(false)

  useEffect(() => {
    // `window.location` não existe no SSR — a regra normalmente sugeriria
    // "calcule isso no render", mas aqui não dá: o servidor não tem a query
    // string do browser, a única leitura possível é pós-hidratação.
    const destaque = new URLSearchParams(window.location.search).get('destaque')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (destaque) setHighlightKey(destaque)
  }, [])

  useEffect(() => {
    if (!highlightKey || highlightHandledRef.current) return
    const el = rowRefs.current.get(highlightKey)
    if (!el) return
    highlightHandledRef.current = true
    setExpanded(highlightKey)
    el.scrollIntoView({behavior: 'smooth', block: 'center'})
  }, [highlightKey, rows])

  // Busca ao servidor sempre que página/tamanho/ordenação/busca/facção
  // mudam — inclui o mount (mesmos parâmetros default da SSR), o que dá ao
  // componente o `total` real que `page.tsx` não passa mais por prop.
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(false)
    fetchPage({page, pageSize, sortKey, sortDir, search, faction: factionFilter}).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result) {
        setError(true)
        return
      }
      setRows(result.rows)
      setTotal(result.total)
    })
    return () => {
      cancelled = true
    }
  }, [page, pageSize, sortKey, sortDir, search, factionFilter])

  // Poll (20s) refaz a MESMA página/filtro/ordenação atuais — nunca mais um
  // "top 100" fixo como antes de T15.
  useEffect(() => {
    mounted.current = true
    // `cancelled` é por execução do efeito: `mounted.current` volta a `true` assim que o efeito re-executa (mudou
    // ordenação/página/filtro), então sozinho ele deixava uma resposta do poll ANTIGO ainda em voo sobrescrever
    // `rows` com a ordenação anterior.
    let cancelled = false
    const id = window.setInterval(async () => {
      const fresh = await fetchPage({page, pageSize, sortKey, sortDir, search, faction: factionFilter})
      if (fresh && mounted.current && !cancelled) {
        setRows(fresh.rows)
        setTotal(fresh.total)
      }
    }, POLL_MS)
    return () => {
      cancelled = true
      mounted.current = false
      window.clearInterval(id)
    }
  }, [page, pageSize, sortKey, sortDir, search, factionFilter])

  // Busca por texto: debounce de 300ms antes de virar parâmetro de servidor;
  // qualquer mudança de busca reinicia a paginação na página 1 (IRCMP-19).
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const handleSort = (key: SortableKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(defaultSortDir(key) as SortDir)
    }
    setPage(1)
  }

  const handleFactionFilter = (f: 'all' | RankingRow['faction']) => {
    setFactionFilter(f)
    setPage(1)
  }

  const handlePageSizeChange = (n: number) => {
    setPageSize(n)
    setPage(1)
  }

  const sortArrow = (key: SortableKey) =>
    sortKey === key ? (
      <span className="ing-ranking-table__sort-arrow" aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
    ) : null

  const ariaSort = (key: SortableKey): 'ascending' | 'descending' | 'none' =>
    sortKey !== key ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'

  const refreshNow = async () => {
    setRefreshing(true)
    const fresh = await fetchPage({page, pageSize, sortKey, sortDir, search, faction: factionFilter})
    if (fresh && mounted.current) {
      setRows(fresh.rows)
      setTotal(fresh.total)
    }
    if (mounted.current) setRefreshing(false)
  }

  /**
   * Link direto pra um agente — `?destaque=` faz esta mesma tabela rolar até
   * a linha e abrir o detalhe sozinha (ver os dois efeitos de `highlightKey`
   * acima). Mesmo padrão de `IngressShareButton` (Web Share API no celular,
   * clipboard no desktop) — só que por linha, não pro ranking inteiro.
   */
  const shareAgent = async (row: RankingRow) => {
    const url = `${window.location.origin}/ingress/ranking?destaque=${encodeURIComponent(row.codename_key)}`

    if (navigator.share) {
      try {
        await navigator.share({title: t.shareAgentTitle(row.codename), text: t.shareAgentText(row.codename), url})
        trackIngressAgentShared('share')
        return
      } catch (err) {
        // Fechar a folha sem escolher nada rejeita com AbortError — é
        // desistência, não falha: não cai pro clipboard nesse caso.
        if ((err as Error)?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success(t.linkCopied)
      trackIngressAgentShared('clipboard')
    } catch {
      // Clipboard bloqueado — sem toast, a URL da barra de endereços já é o link.
    }
  }

  const hasActiveFilter = search !== '' || factionFilter !== 'all'
  // Antes do 1º fetch resolver, `total` é `null` — usa `initialRows` (SSR,
  // mesmos parâmetros default) como sinal provisório de "ranking vazio".
  const trulyEmpty = total !== null ? total === 0 : initialRows.length === 0

  if (trulyEmpty && !hasActiveFilter) {
    return (
      <Panel label={t.panelLabel}>
        <p style={{color: 'var(--ing-text-dim)'}}>{t.emptyBody}</p>
      </Panel>
    )
  }

  const totalPages = total !== null ? Math.max(1, Math.ceil(total / pageSize)) : 1

  return (
    <Panel
      label={t.panelLabel}
      hint={total !== null ? (hasActiveFilter ? t.panelHintFiltered(total) : t.panelHint(total)) : undefined}
    >
      <div className="ing-ranking-table__toolbar">
        <div className="ing-ranking-table__filters">
          <input
            type="search"
            className="ing-ranking-table__search"
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="ing-ranking-table__faction-filter" role="group" aria-label={t.colFaction}>
            <button
              type="button"
              className={factionFilter === 'all' ? 'is-active' : undefined}
              onClick={() => handleFactionFilter('all')}
            >
              {t.factionAll}
            </button>
            {(['enlightened', 'resistance'] as const).map((faction) => (
              <button
                key={faction}
                type="button"
                className={factionFilter === faction ? 'is-active' : undefined}
                onClick={() => handleFactionFilter(faction)}
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

      {error ? (
        <p className="ing-ranking-table__no-results">
          {t.errorBody}{' '}
          <button
            type="button"
            className="ing-radar__btn"
            onClick={() => fetchPage({page, pageSize, sortKey, sortDir, search, faction: factionFilter}).then((r) => {
              if (r) {
                setRows(r.rows)
                setTotal(r.total)
                setError(false)
              }
            })}
          >
            {t.retryBtn}
          </button>
        </p>
      ) : rows.length === 0 && !loading ? (
        <p className="ing-ranking-table__no-results">{t.noResultsBody}</p>
      ) : (
      <div className="ing-ranking-table__wrap">
        <table className="ing-ranking-table">
          {/*
            table-layout: fixed (ver theme.css) + larguras por coluna é o que
            garante que a sub-linha de detalhe NUNCA alarga a tabela: com
            colunas de largura fixa, o conteúdo de qualquer célula (mesmo um
            colSpan cobrindo todas) só pode quebrar linha ou ser cortado —
            nunca estufar o <table>. `codename` é a única sem largura, então
            é ela quem recebe o espaço restante (inclusive o que os
            breakpoints mobile liberam ao esconder coluna).

            As larguras em si viraram CSS (`col[data-col=…]` em theme.css) em
            vez de inline style: inline style tem especificidade maior que
            qualquer regra de classe/atributo, então um `@media` não
            conseguiria sobrescrever a largura pra comprimir/esconder coluna
            no celular. `data-col` aqui espelha o mesmo atributo usado nos
            `th`/`td` de cada coluna.
          */}
          <colgroup>
            <col data-col="rank" />
            <col data-col="score" />
            <col data-col="faction" />
            <col data-col="country" />
            <col data-col="codename" />
            <col data-col="dates" />
            <col data-col="ap" />
            <col data-col="construcao" />
            <col data-col="destruicao" />
            <col data-col="exploracao" />
            <col data-col="hacking" />
            <col data-col="linksCampos" />
            <col data-col="details" />
          </colgroup>
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
              <th scope="col" data-col="details" aria-label={t.colShare} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isOpen = expanded === row.codename_key
              const isCompareMarked = pendingCompareKey === row.codename_key
              const rank = row.rank
              const toggle = () => setExpanded(isOpen ? null : row.codename_key)
              const rowClass =
                [
                  isOpen ? 'is-expanded' : null,
                  rank === 1 ? 'is-top1' : rank === 2 ? 'is-top2' : rank === 3 ? 'is-top3' : null,
                  row.codename_key === highlightKey ? 'is-highlighted' : null,
                  isCompareMarked ? 'is-compare-pick' : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              return (
                <Fragment key={row.codename_key}>
                  {/*
                    `layout="position"` só anima a troca de lugar, sem esticar a linha.
                    `layoutDependency={index}` é o que segura o resto: sem ele o Framer mede
                    as linhas a cada render (cada tecla na busca), e ao abrir um detalhe as
                    de baixo deslizariam por cima da sub-linha, que aparece instantânea.
                    Com o índice como dependência, só quem de fato mudou de posição na lista
                    anima. Aberto/fechado não muda o índice de ninguém.
                  */}
                  <motion.tr
                    layout="position"
                    layoutDependency={index}
                    transition={ROW_LAYOUT_TRANSITION}
                    className={rowClass}
                    onClick={toggle}
                    ref={(el) => {
                      if (el) rowRefs.current.set(row.codename_key, el)
                      else rowRefs.current.delete(row.codename_key)
                    }}
                  >
                    <td data-col="rank">{rank}</td>
                    <td
                      data-col="score"
                      className={row.faction === 'resistance' ? 'ing-ranking-table__score--resistance' : undefined}
                    >
                      {fmtScore(row.overall_score)}
                    </td>
                    <td data-col="faction">
                      <span
                        className={`ing-ranking-table__faction-badge${row.faction === 'resistance' ? ' is-resistance' : ''}`}
                      >
                        <img
                          src={FACTION_ICON[row.faction]}
                          alt={FACTION_LABEL[row.faction]}
                          title={FACTION_LABEL[row.faction]}
                          width={20}
                          height={20}
                          className="ing-ranking-table__faction-icon"
                        />
                      </span>
                    </td>
                    <td data-col="country">
                      {row.country_code ? (
                        <img
                          src={flagSrc(row.country_code)}
                          alt={countryName(row.country_code, lang) ?? row.country_code}
                          title={countryName(row.country_code, lang) ?? row.country_code}
                          width={20}
                          height={15}
                          loading="lazy"
                          className="ing-ranking-table__country-flag"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                      ) : null}
                    </td>
                    <td data-col="codename">
                      {/*
                        O nome se "decodifica" (mesmo efeito do nome na home) quando a linha
                        monta: no 1º carregamento e ao entrar numa página/filtro novo. O SSR
                        já manda o nome inteiro (o estado inicial do componente é o próprio
                        texto), então sem JS e pra buscadores nada muda. As linhas têm `key`
                        estável, então poll, ordenação e abrir o detalhe NÃO refazem o efeito.
                      */}
                      <TextScramble
                        as="span"
                        className="ing-ranking-table__codename"
                        duration={0.6}
                        speed={0.04}
                        trigger={!reduceMotion}
                      >
                        {row.codename}
                      </TextScramble>
                    </td>
                    <td data-col="dates" title={t.datesTooltip(fmtDate(row.updated_at, lang), fmtDate(row.created_at, lang))}>
                      {fmtDate(row.updated_at, lang)}
                    </td>
                    <td data-col="ap">{fmtStat(row.lifetime_ap)}</td>
                    {AXIS_COLUMNS.map((col) => (
                      <td key={col.id} data-col={col.id}>{fmtScore(row.axis_scores?.[col.id] ?? 0)}</td>
                    ))}
                    <td data-col="details">
                      {/* O flex mora neste div, não no `td`: um `td` com `display: flex` deixa de ser célula de tabela e a borda dele cai 1px fora das vizinhas em linhas de altura fracionada. */}
                      <div className="ing-ranking-table__actions">
                        <button
                          type="button"
                          className="ing-ranking-table__compare"
                          aria-label={t.compareAgentAria(row.codename)}
                          aria-pressed={isCompareMarked}
                          title={t.compareBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCompareRow(row.codename_key)
                          }}
                        >
                          <FaBalanceScale aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ing-ranking-table__share"
                          aria-label={t.shareAgentAria(row.codename)}
                          onClick={(e) => {
                            e.stopPropagation()
                            void shareAgent(row)
                          }}
                        >
                          <FaShareAlt aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  {isOpen ? (
                    <tr className="ing-ranking-table__detail-row">
                      <td className="ing-ranking-table__detail-cell" colSpan={TOTAL_COLUMNS}>
                        <div className="ing-ranking-table__detail-inner">
                          <div
                            className={`ing-ranking-table__detail${row.faction === 'resistance' ? ' is-resistance' : ''}`}
                          >
                            <div className="ing-ranking-table__detail-playstyle">
                              <div className="ing-ranking-table__detail-playstyle-side ing-ranking-table__detail-playstyle-side--left">
                                <span className="ing-ranking-table__detail-playstyle-name-row">
                                  <span className="ing-ranking-table__detail-playstyle-name">{row.codename}</span>
                                  {/*
                                    Só aparece no celular (`.ing-ranking-table__detail-share`,
                                    ver theme.css) — é onde a coluna de compartilhar/comparar
                                    some da linha da tabela pra sobrar espaço pro codinome;
                                    aqui dentro do detalhe tem espaço de sobra e o agente já
                                    está com o nome na tela, então os botões ficam ao lado dele.
                                  */}
                                  <button
                                    type="button"
                                    className="ing-ranking-table__compare ing-ranking-table__detail-share"
                                    aria-label={t.compareAgentAria(row.codename)}
                                    aria-pressed={isCompareMarked}
                                    title={t.compareBtn}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onCompareRow(row.codename_key)
                                    }}
                                  >
                                    <FaBalanceScale aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="ing-ranking-table__share ing-ranking-table__detail-share"
                                    aria-label={t.shareAgentAria(row.codename)}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void shareAgent(row)
                                    }}
                                  >
                                    <FaShareAlt aria-hidden="true" />
                                  </button>
                                </span>
                                <span
                                  className={`ing-ranking-table__detail-playstyle-recursion${row.recursions === null ? ' is-unknown' : ''}`}
                                  title={row.recursions !== null ? t.recursionsAria(row.recursions) : t.recursionsUnknown}
                                  aria-label={row.recursions !== null ? t.recursionsAria(row.recursions) : t.recursionsUnknown}
                                >
                                  <img src={artPath('simulacrum', null)} alt="" width={20} height={20} />
                                  ×{row.recursions !== null ? row.recursions : '?'}
                                </span>
                              </div>
                              <div className="ing-ranking-table__detail-playstyle-center">
                                <span className="ing-ranking-table__detail-playstyle-label">{t.playStyleLabel}</span>
                                <MiniPlayStyleRadar
                                  stats={row.stat_values}
                                  ariaLabel={t.playStyleAria(row.codename)}
                                  faction={row.faction}
                                  lang={lang}
                                />
                              </div>
                              <div className="ing-ranking-table__detail-playstyle-side ing-ranking-table__detail-playstyle-side--right">
                                <span className="ing-ranking-table__detail-playstyle-updated-label">{t.lastUpdateLabel}</span>
                                <span className="ing-ranking-table__detail-playstyle-updated-value">
                                  {relativeAge(row.updated_at, lang)}
                                </span>
                              </div>
                            </div>
                            {RADAR_AXES.map((axis) => (
                              <div key={axis.id} className="ing-ranking-table__detail-axis">
                                <strong>{lang === 'en' ? axis.labelEn : axis.label}</strong>
                                <div className="ing-ranking-table__chips">
                                  {axis.parts.map((part) => {
                                    const info = row.stat_tiers?.[part.key]
                                    const tier = info?.tier ?? 'none'
                                    const iconTier = tier === 'none' ? 'bronze' : tier
                                    const iconSrc = info?.badgeSlug ? artPath(info.badgeSlug, iconTier) : null
                                    const value = row.stat_values?.[part.key] ?? 0
                                    // Quantas vezes o valor já passou do limiar de Onyx daquela
                                    // parte (pedido do Luiz: um "×24" no cantinho do chip) — só a
                                    // partir de ×2 (×1 é só "completou uma vez", o próprio chip
                                    // colorido já diz isso, o número seria redundante).
                                    const onyxRatio = part.ref > 0 ? value / part.ref : 0
                                    const onyxTimes = Math.round(onyxRatio)
                                    return (
                                      <div
                                        key={part.key}
                                        className={`ing-ranking-table__chip${tier === 'none' ? ' is-none' : ''}`}
                                        style={{borderColor: tierColor(tier)}}
                                        title={tier}
                                      >
                                        {onyxTimes >= 2 ? (
                                          <span className="ing-ranking-table__chip-times">×{onyxTimes}</span>
                                        ) : null}
                                        {iconSrc ? (
                                          <img
                                            src={iconSrc}
                                            alt=""
                                            width={26}
                                            height={26}
                                            className="ing-ranking-table__chip-icon"
                                          />
                                        ) : null}
                                        <span className="ing-ranking-table__chip-text">
                                          <span className="ing-ranking-table__chip-label">{chipLabel(part, lang)}</span>
                                          <span className="ing-ranking-table__chip-value">{fmtStat(value)}</span>
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <AgentHistoryChart codenameKey={row.codename_key} agentName={row.codename} faction={row.faction} />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {!error && rows.length > 0 ? (
        <div className="ing-ranking-table__pagination">
          <div className="ing-ranking-table__page-size" role="group" aria-label={t.pageSizeAria}>
            {RANKING_PAGE_SIZES.map((size: number) => (
              <button
                key={size}
                type="button"
                className={pageSize === size ? 'is-active' : undefined}
                onClick={() => handlePageSizeChange(size)}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="ing-ranking-table__page-nav">
            <button type="button" className="ing-radar__btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              {t.prevPage}
            </button>
            <span>{t.pageIndicator(page, totalPages)}</span>
            <button
              type="button"
              className="ing-radar__btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t.nextPage}
            </button>
          </div>
        </div>
      ) : null}

      <p className="ing-ranking-table__credit">{t.logoCredit}</p>
    </Panel>
  )
}
