'use client'

import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react'
import Panel from '../Panel'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {COUNTRIES, flagSrc} from '@/lib/ingress-countries.mjs'
import {useLang, type Lang} from '@/context/LanguageContext'

export type ActivityKind = 'novo_agente' | 'atualizacao'

export type ActivityRow = {
  codename_key: string
  codename: string
  faction: 'enlightened' | 'resistance'
  country_code: string | null
  kind: ActivityKind
  lifetime_ap: number
  overall_score: number
  ap_delta: number | null
  score_delta: number | null
  recorded_at: string
}

type Period = 'hoje' | 'semana' | 'mes' | 'tudo'
type KindFilter = 'all' | ActivityKind

const FACTION_LABEL: Record<ActivityRow['faction'], string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}

/** Mesmo logo oficial de facção usado em `IngressRankingTable` (`public/ingress/factions/`). */
const FACTION_ICON: Record<ActivityRow['faction'], string> = {
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

// Espelha o `s-maxage=20` de `GET /api/ingress-rankings/activity` — mesmo
// espírito de `IngressRankingTable` (poll + botão "Atualizar" manual).
const POLL_MS = 20_000

const fmtScore = (n: number) => Math.round(n).toString()

const T = {
  pt: {
    panelLabel: 'Radar de atividade',
    panelHint: (n: number) => `${n} evento${n === 1 ? '' : 's'}`,
    panelHintFiltered: (v: number, n: number) => `${v} de ${n} evento${n === 1 ? '' : 's'}`,
    emptyBody: 'Nenhum evento por aqui ainda — assim que alguém atualizar os dados, aparece aqui.',
    noResultsBody: 'Nenhum evento encontrado com esses filtros.',
    kindGroupLabel: 'Tipo de evento',
    kindAll: 'Tudo',
    kindNew: 'Novos agentes',
    kindUpdate: 'Atualizações',
    periodGroupLabel: 'Período',
    periodToday: 'Hoje',
    periodWeek: 'Semana',
    periodMonth: 'Mês',
    periodAll: 'Tudo',
    refreshBtn: 'Atualizar',
    refreshingBtn: 'Atualizando…',
    tagNew: 'NOVO AGENTE',
    tagUpdate: 'ATUALIZAÇÃO',
    enteredPrefix: 'entrou no radar — nota inicial',
    apSuffix: 'AP',
    updatedPrefix: 'atualizou os dados —',
    scoreWord: 'nota',
  },
  en: {
    panelLabel: 'Activity radar',
    panelHint: (n: number) => `${n} event${n === 1 ? '' : 's'}`,
    panelHintFiltered: (v: number, n: number) => `${v} of ${n} event${n === 1 ? '' : 's'}`,
    emptyBody: 'No events yet — as soon as someone updates their stats, it shows up here.',
    noResultsBody: 'No events found for these filters.',
    kindGroupLabel: 'Event type',
    kindAll: 'All',
    kindNew: 'New agents',
    kindUpdate: 'Updates',
    periodGroupLabel: 'Period',
    periodToday: 'Today',
    periodWeek: 'Week',
    periodMonth: 'Month',
    periodAll: 'All',
    refreshBtn: 'Refresh',
    refreshingBtn: 'Refreshing…',
    tagNew: 'NEW AGENT',
    tagUpdate: 'UPDATE',
    enteredPrefix: 'entered the radar — starting score',
    apSuffix: 'AP',
    updatedPrefix: 'updated their stats —',
    scoreWord: 'score',
  },
} as const

function ageDays(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

function matchesPeriod(iso: string, period: Period): boolean {
  if (period === 'tudo') return true
  const age = ageDays(iso)
  if (period === 'mes') return age < 30
  if (period === 'semana') return age < 7
  return age < 1
}

/**
 * "agora mesmo"/"há Nmin"/"há Nh"/"ontem"/"há N dias"/"há N semanas"/"há N
 * meses" — granularidade fina o bastante pra um feed que começa em minutos,
 * ao contrário do `relativeAge` (só dia/mês) já usado pelo "Estilo de jogo"
 * em `IngressRankingTable`.
 */
function relativeTime(iso: string, lang: Lang): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return lang === 'en' ? 'just now' : 'agora mesmo'
  const min = Math.floor(sec / 60)
  if (min < 60) return lang === 'en' ? `${min}min ago` : `há ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return lang === 'en' ? 'yesterday' : 'ontem'
  if (days < 7) return lang === 'en' ? `${days}d ago` : `há ${days} dias`
  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7))
    return lang === 'en' ? `${weeks}w ago` : `há ${weeks} semana${weeks > 1 ? 's' : ''}`
  }
  const months = Math.max(1, Math.round(days / 30))
  return lang === 'en' ? `${months}mo ago` : `há ${months} ${months > 1 ? 'meses' : 'mês'}`
}

async function fetchEvents(): Promise<ActivityRow[] | null> {
  try {
    const res = await fetch('/api/ingress-rankings/activity')
    if (!res.ok) return null
    const {events} = (await res.json()) as {events: ActivityRow[]}
    return events
  } catch {
    return null
  }
}

const PERIODS: Period[] = ['hoje', 'semana', 'mes', 'tudo']

/**
 * Feed de eventos derivados de `casara.ingress_ranking_history` (ver
 * `GET /api/ingress-rankings/activity`): "novo agente" (primeiro snapshot) e
 * "atualização" (delta de AP/nota contra o snapshot anterior do mesmo
 * agente). Sem "ao vivo" automático por design — poll de 20s (mesma janela do
 * `s-maxage` da rota) + botão "Atualizar" manual, igual a
 * `IngressRankingTable`. Filtro de período é cumulativo (Hoje ⊂ Semana ⊂ Mês
 * ⊂ Tudo), mesmo espírito do `period` (`7d`/`30d`/`all`) de
 * `GET /api/metrics/stats`.
 */
export default function IngressActivityFeed({initialEvents}: {initialEvents: ActivityRow[]}) {
  const {lang} = useLang()
  const t = T[lang]
  const [events, setEvents] = useState(initialEvents)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [period, setPeriod] = useState<Period>('hoje')
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const id = window.setInterval(async () => {
      const fresh = await fetchEvents()
      if (fresh && mounted.current) setEvents(fresh)
    }, POLL_MS)
    return () => {
      mounted.current = false
      window.clearInterval(id)
    }
  }, [])

  const refreshNow = async () => {
    setRefreshing(true)
    const fresh = await fetchEvents()
    if (fresh && mounted.current) setEvents(fresh)
    if (mounted.current) setRefreshing(false)
  }

  const visible = useMemo(
    () => events.filter((e) => (kindFilter === 'all' || e.kind === kindFilter) && matchesPeriod(e.recorded_at, period)),
    [events, kindFilter, period]
  )

  const periodLabel = (p: Period) =>
    p === 'hoje' ? t.periodToday : p === 'semana' ? t.periodWeek : p === 'mes' ? t.periodMonth : t.periodAll

  if (events.length === 0) {
    return (
      <Panel label={t.panelLabel}>
        <p style={{color: 'var(--ing-text-dim)'}}>{t.emptyBody}</p>
      </Panel>
    )
  }

  return (
    <Panel
      label={t.panelLabel}
      hint={visible.length !== events.length ? t.panelHintFiltered(visible.length, events.length) : t.panelHint(events.length)}
    >
      <div className="ing-activity__toolbar">
        <div className="ing-activity__kind-filter" role="group" aria-label={t.kindGroupLabel}>
          <button type="button" className={kindFilter === 'all' ? 'is-active' : undefined} onClick={() => setKindFilter('all')}>
            {t.kindAll}
          </button>
          <button
            type="button"
            className={kindFilter === 'novo_agente' ? 'is-active' : undefined}
            onClick={() => setKindFilter('novo_agente')}
          >
            {t.kindNew}
          </button>
          <button
            type="button"
            className={kindFilter === 'atualizacao' ? 'is-active' : undefined}
            onClick={() => setKindFilter('atualizacao')}
          >
            {t.kindUpdate}
          </button>
        </div>
        <div className="ing-activity__toolbar-right">
          <div className="ing-activity__period" role="group" aria-label={t.periodGroupLabel}>
            {PERIODS.map((p) => (
              <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {periodLabel(p)}
              </button>
            ))}
          </div>
          <button type="button" className="ing-radar__btn" onClick={refreshNow} disabled={refreshing}>
            {refreshing ? t.refreshingBtn : t.refreshBtn}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="ing-activity__empty">{t.noResultsBody}</p>
      ) : (
        <div className="ing-activity__feed">
          {visible.map((ev) => {
            const kindColor = ev.kind === 'novo_agente' ? 'var(--ing-green)' : 'var(--ing-teal)'
            const country = ev.country_code ? (countryName(ev.country_code, lang) ?? ev.country_code) : null
            return (
              <div
                key={`${ev.codename_key}-${ev.recorded_at}`}
                className="ing-activity__entry"
                style={{'--kind-color': kindColor} as CSSProperties}
              >
                <div className="ing-activity__node" aria-hidden="true">
                  {ev.kind === 'novo_agente' ? '✦' : '↑'}
                </div>
                <div className="ing-activity__body">
                  <div className="ing-activity__line1">
                    {ev.country_code ? (
                      <img
                        src={flagSrc(ev.country_code)}
                        alt={country ?? ''}
                        title={country ?? undefined}
                        width={18}
                        height={13}
                        loading="lazy"
                        className="ing-activity__flag"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden'
                        }}
                      />
                    ) : null}
                    <img
                      src={FACTION_ICON[ev.faction]}
                      alt={FACTION_LABEL[ev.faction]}
                      title={FACTION_LABEL[ev.faction]}
                      width={18}
                      height={18}
                      className="ing-activity__fac-icon"
                    />
                    <span className={`ing-activity__codename${ev.faction === 'resistance' ? ' is-resistance' : ''}`}>
                      {ev.codename}
                    </span>
                    <span className="ing-activity__tag">{ev.kind === 'novo_agente' ? t.tagNew : t.tagUpdate}</span>
                  </div>
                  <p className="ing-activity__desc">
                    {ev.kind === 'novo_agente' ? (
                      <>
                        {t.enteredPrefix} <span className="ing-activity__num is-score">{fmtScore(ev.overall_score)}</span> ·{' '}
                        <span className="ing-activity__num is-up">
                          {fmtStat(ev.lifetime_ap)} {t.apSuffix}
                        </span>
                      </>
                    ) : (
                      <>
                        {t.updatedPrefix}{' '}
                        <span className="ing-activity__num is-up">
                          {(ev.ap_delta ?? 0) >= 0 ? '+' : ''}
                          {fmtStat(ev.ap_delta ?? 0)} {t.apSuffix}
                        </span>{' '}
                        · {t.scoreWord}{' '}
                        <span className="ing-activity__num is-score">
                          {fmtScore(ev.overall_score - (ev.score_delta ?? 0))} &rarr; {fmtScore(ev.overall_score)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="ing-activity__time">{relativeTime(ev.recorded_at, lang)}</div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
