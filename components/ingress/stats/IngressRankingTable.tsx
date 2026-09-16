'use client'

import {Fragment, useEffect, useMemo, useRef, useState} from 'react'
import {FaShareAlt} from 'react-icons/fa'
import {toast} from 'sonner'
import Panel from '../Panel'
import AgentHistoryChart from './AgentHistoryChart'
import {fmtStat, foldText} from '@/lib/ingress-format.mjs'
import {RADAR_AXES, computeRadarAxes} from '@/lib/ingress-radar.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {TIER_COLOR} from '@/lib/ingress-tiers.mjs'
import {COUNTRIES, flagSrc} from '@/lib/ingress-countries.mjs'
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
  const axes = computeRadarAxes(stats) as {id: string; label: string; labelEn: string; onyxRatio: number}[]
  const n = axes.length
  const maxRatio = Math.max(...axes.map((a) => a.onyxRatio), 0.01)
  const radiusIn = (ratio: number) => PLAYSTYLE_R * Math.max(Math.min(ratio / maxRatio, 1), 0.02)
  const shape = axes.map((a, i) => playStylePoint(i, n, radiusIn(a.onyxRatio)).join(',')).join(' ')

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
    colShare: 'Compartilhar',
    shareAgentAria: (name: string) => `Compartilhar o link de ${name}`,
    shareAgentTitle: (name: string) => `${name} — Ranking de Agentes Ingress`,
    shareAgentText: (name: string) => `Veja a posição de ${name} no ranking de agentes do Ingress!`,
    linkCopied: 'Link copiado!',
    playStyleLabel: 'Estilo de jogo',
    playStyleAria: (name: string) => `Estilo de jogo de ${name} (radar normalizado pelo eixo mais forte)`,
    recursionsAria: (n: number) => `${n} ${n === 1 ? 'recursão' : 'recursões'}`,
    recursionsUnknown: 'Exporte novamente seus dados para atualizarmos este campo — não salvávamos ele antes.',
    lastUpdateLabel: 'Última atualização',
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
    colShare: 'Share',
    shareAgentAria: (name: string) => `Share ${name}'s link`,
    shareAgentTitle: (name: string) => `${name} — Ingress Agent Ranking`,
    shareAgentText: (name: string) => `Check out ${name}'s spot in the Ingress agent ranking!`,
    linkCopied: 'Link copied!',
    playStyleLabel: 'Play style',
    playStyleAria: (name: string) => `${name}'s play style (radar normalized by its strongest axis)`,
    recursionsAria: (n: number) => `${n} recursion${n === 1 ? '' : 's'}`,
    recursionsUnknown: "Re-export your stats so we can fill this in — we weren't saving it before.",
    lastUpdateLabel: 'Last updated',
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
  // Realça/rola até a linha de `?destaque=<codename_key>` — o link que o
  // alerta de novo registro no Telegram manda (ver `notifyTelegramNewEntry`
  // em `api/ingress-rankings/route.ts`). Lido direto de `window.location`
  // num efeito (não `useSearchParams`) pra não exigir um `<Suspense>` só por
  // causa de um parâmetro opcional que só importa depois da hidratação.
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
    const q = foldText(search.trim())
    const filtered = rows.filter(
      (r) => (factionFilter === 'all' || r.faction === factionFilter) && (!q || foldText(r.codename).includes(q))
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

  // Se um filtro esconder a linha expandida, ela some de `visibleRows` — o
  // `.find` dentro do `.map` abaixo simplesmente não a encontra mais, então
  // a sub-linha de detalhe fecha sozinha sem precisar de um efeito dedicado.

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
            {visibleRows.map((row) => {
              const isOpen = expanded === row.codename_key
              const rank = rankByKey.get(row.codename_key)
              const toggle = () => setExpanded(isOpen ? null : row.codename_key)
              const rowClass =
                [
                  isOpen ? 'is-expanded' : null,
                  rank === 1 ? 'is-top1' : rank === 2 ? 'is-top2' : rank === 3 ? 'is-top3' : null,
                  row.codename_key === highlightKey ? 'is-highlighted' : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              return (
                <Fragment key={row.codename_key}>
                  <tr
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
                        className="ing-ranking-table__share"
                        aria-label={t.shareAgentAria(row.codename)}
                        onClick={(e) => {
                          e.stopPropagation()
                          void shareAgent(row)
                        }}
                      >
                        <FaShareAlt aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
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
                                    ver theme.css) — é onde a coluna de compartilhar some da
                                    linha da tabela pra sobrar espaço pro codinome; aqui dentro
                                    do detalhe tem espaço de sobra e o agente já está com o
                                    nome na tela, então o botão fica ao lado dele.
                                  */}
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

      <p className="ing-ranking-table__credit">{t.logoCredit}</p>
    </Panel>
  )
}
