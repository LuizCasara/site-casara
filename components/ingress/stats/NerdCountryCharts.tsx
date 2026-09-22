'use client'

import {useState} from 'react'
import {COUNTRIES, flagSrc} from '@/lib/ingress-countries.mjs'
import {fmtStat, fmtStatCompact} from '@/lib/ingress-format.mjs'
import {rankCountries} from '@/lib/ingress-country-chart.mjs'
import {useLang} from '@/components/global/LanguageContext'

type FactionTotals = {agentCount: number; totalAp: number}
export type CountryBreakdownRow = {code: string; enlightened: FactionTotals; resistance: FactionTotals}
export type CountryBreakdown = {countries: CountryBreakdownRow[]; withoutCountryCount: number}

type FactionFilter = 'all' | 'enlightened' | 'resistance'

const FILTERS: FactionFilter[] = ['all', 'enlightened', 'resistance']

const NAMES: Record<'pt' | 'en', Map<string, string>> = {
  pt: new Map((COUNTRIES as {code: string; namePt: string}[]).map((c) => [c.code, c.namePt])),
  en: new Map((COUNTRIES as {code: string; nameEn: string}[]).map((c) => [c.code, c.nameEn])),
}

const T = {
  pt: {
    filterAria: 'Filtrar por facção',
    all: 'Todas',
    enlightened: 'Enlightened',
    resistance: 'Resistance',
    agentsTitle: 'Agentes por país',
    apTitle: 'AP somado por país',
    others: (n: number) => `Outros (${n} ${n === 1 ? 'país' : 'países'})`,
    empty: 'Nenhum agente com país informado nesta seleção.',
    withoutCountry: (n: number) =>
      `${fmtStat(n)} ${n === 1 ? 'agente sem país informado não aparece' : 'agentes sem país informado não aparecem'} nos gráficos.`,
  },
  en: {
    filterAria: 'Filter by faction',
    all: 'All',
    enlightened: 'Enlightened',
    resistance: 'Resistance',
    agentsTitle: 'Agents per country',
    apTitle: 'Total AP per country',
    others: (n: number) => `Others (${n} ${n === 1 ? 'country' : 'countries'})`,
    empty: 'No agents with a country in this selection.',
    withoutCountry: (n: number) =>
      `${fmtStat(n)} ${n === 1 ? 'agent without a country is' : 'agents without a country are'} not shown in the charts.`,
  },
} as const

type Ranking = ReturnType<typeof rankCountries>
type Row = {key: string; code: string | null; label: string; enlightened: number; resistance: number; value: number}

/** Uma barra empilhada: verde (Enlightened) + ciano (Resistance), sobre o mesmo `max` de escala do gráfico — mesma convenção de cor do resto do site. */
function CountryChart({
  title,
  ranking,
  rows,
  fmt,
  full,
  emptyText,
  factionLabels,
}: {
  title: string
  ranking: Ranking
  rows: Row[]
  fmt: (n: number) => string
  full: (n: number) => string
  emptyText: string
  factionLabels: {enlightened: string; resistance: string}
}) {
  // `max` é 0 quando todo país visível soma 0 (ex.: facção só com AP 0) — sem o guard, 0/0 vira "NaN%".
  const pct = (n: number) => (ranking.max > 0 ? (n / ranking.max) * 100 : 0)

  return (
    <div>
      <h3 className="ing-nerd-subhead">{title}</h3>
      {rows.length === 0 ? (
        <p className="ing-nerd-empty-note">{emptyText}</p>
      ) : (
        <ol className="ing-nerd-country-list">
          {rows.map((row) => (
            <li
              key={row.key}
              className={`ing-nerd-country-row${row.code ? '' : ' ing-nerd-country-row--others'}`}
              title={`${row.label} — ${factionLabels.enlightened}: ${full(row.enlightened)} · ${factionLabels.resistance}: ${full(row.resistance)}`}
            >
              <span className="ing-nerd-country-name">
                {row.code ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={flagSrc(row.code)} alt="" className="ing-nerd-agent-flag" />
                ) : null}
                <span>{row.label}</span>
              </span>
              <div className="ing-nerd-histogram-track" aria-hidden="true">
                <div className="ing-nerd-country-bar">
                  <span
                    className="ing-nerd-country-seg ing-nerd-country-seg--enlightened"
                    style={{width: `${pct(row.enlightened)}%`}}
                  />
                  <span
                    className="ing-nerd-country-seg ing-nerd-country-seg--resistance"
                    style={{width: `${pct(row.resistance)}%`}}
                  />
                </div>
              </div>
              <span className="ing-nerd-histogram-count" title={full(row.value)}>
                {fmt(row.value)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Linhas do gráfico: os países do ranking mais, se houver, a linha agregada "Outros (N países)". */
function toRows(ranking: Ranking, names: Map<string, string>, othersLabel: (n: number) => string): Row[] {
  const rows: Row[] = ranking.rows.map((r) => ({...r, key: r.code, label: names.get(r.code) ?? r.code}))
  if (ranking.others) {
    rows.push({key: '__others', code: null, label: othersLabel(ranking.others.countryCount), ...ranking.others})
  }
  return rows
}

/**
 * P7 — agentes e AP por país, com filtro Enlightened/Resistance que vale para
 * os dois gráficos. Cada gráfico mostra os 10 maiores países pela própria
 * métrica e agrega o resto em "Outros"; em "Todas" a barra é empilhada por
 * facção, e ao filtrar sobra só a cor da facção escolhida.
 */
export default function NerdCountryCharts({data}: {data: CountryBreakdown}) {
  const {lang} = useLang()
  const t = T[lang]
  const [faction, setFaction] = useState<FactionFilter>('all')

  const agents = rankCountries(data.countries, {metric: 'agents', faction})
  const ap = rankCountries(data.countries, {metric: 'ap', faction})
  const factionLabels = {enlightened: t.enlightened, resistance: t.resistance}

  return (
    <div className="ing-nerd-countries">
      <div className="ing-radar__scale" role="group" aria-label={t.filterAria}>
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={faction === f} onClick={() => setFaction(f)}>
            {t[f]}
          </button>
        ))}
      </div>

      <div className="ing-nerd-countries-charts">
        <CountryChart
          title={t.agentsTitle}
          ranking={agents}
          rows={toRows(agents, NAMES[lang], t.others)}
          fmt={fmtStat}
          full={fmtStat}
          emptyText={t.empty}
          factionLabels={factionLabels}
        />
        <CountryChart
          title={t.apTitle}
          ranking={ap}
          rows={toRows(ap, NAMES[lang], t.others)}
          fmt={fmtStatCompact}
          full={fmtStat}
          emptyText={t.empty}
          factionLabels={factionLabels}
        />
      </div>

      {data.withoutCountryCount > 0 ? (
        <p className="ing-nerd-empty-note">{t.withoutCountry(data.withoutCountryCount)}</p>
      ) : null}
    </div>
  )
}
