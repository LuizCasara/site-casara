'use client'

import {Fragment, useEffect, useRef, useState} from 'react'
import {FaEye, FaEyeSlash} from 'react-icons/fa'
import Panel from '../Panel'
import {fmtStat} from '@/lib/ingress-format.mjs'
import {RADAR_AXES} from '@/lib/ingress-radar.mjs'
import {useLang, type Lang} from '@/context/LanguageContext'

export type RankingRow = {
  codename_key: string
  codename: string
  faction: 'enlightened' | 'resistance'
  lifetime_ap: number
  overall_score: number
  axis_scores: Record<string, number>
  stat_values: Record<string, number>
  created_at: string
  updated_at: string
}

const FACTION_LABEL: Record<RankingRow['faction'], string> = {
  enlightened: 'Enlightened',
  resistance: 'Resistance',
}
const FACTION_COLOR: Record<RankingRow['faction'], string> = {
  enlightened: 'var(--ing-green)',
  resistance: 'var(--ing-cyan)',
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
    colUpdated: 'Atualizado em',
    colMeasuredSince: 'Medido desde',
    colAp: 'AP total',
    colScore: 'Nota geral',
    colDetails: 'Detalhes',
    hideDetails: (name: string) => `Esconder detalhes de ${name}`,
    showDetails: (name: string) => `Ver detalhes de ${name}`,
  },
  en: {
    panelLabel: 'Agent ranking',
    panelHint: (n: number) => `${n} agent${n > 1 ? 's' : ''} measured`,
    emptyBody: "No one's been measured here yet — paste your export in one of the buttons above to be the ranking's first agent.",
    refreshBtn: 'Refresh',
    refreshingBtn: 'Refreshing…',
    colRank: '#',
    colCodename: 'Codename',
    colUpdated: 'Updated on',
    colMeasuredSince: 'Measured since',
    colAp: 'Total AP',
    colScore: 'Overall score',
    colDetails: 'Details',
    hideDetails: (name: string) => `Hide details for ${name}`,
    showDetails: (name: string) => `Show details for ${name}`,
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
 * — mas o pai (`app/ingress/stats/page.tsx`, T12) precisa continuar Server
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
              <th scope="col">{t.colCodename}</th>
              <th scope="col">{t.colUpdated}</th>
              <th scope="col">{t.colMeasuredSince}</th>
              <th scope="col">{t.colAp}</th>
              <th scope="col">{t.colScore}</th>
              <th scope="col" aria-label={t.colDetails} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isOpen = expanded === row.codename_key
              return (
                <Fragment key={row.codename_key}>
                  <tr>
                    <td>{i + 1}</td>
                    <td>
                      <span
                        aria-hidden="true"
                        style={{color: FACTION_COLOR[row.faction], marginRight: '0.4em'}}
                      >
                        ●
                      </span>
                      {row.codename}
                      <span className="ing-ranking-table__faction"> ({FACTION_LABEL[row.faction]})</span>
                    </td>
                    <td>{fmtDate(row.updated_at, lang)}</td>
                    <td>{fmtDate(row.created_at, lang)}</td>
                    <td>{fmtStat(row.lifetime_ap)}</td>
                    <td>{fmtScore(row.overall_score)}</td>
                    <td>
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
                  {isOpen ? (
                    <tr className="ing-ranking-table__detail-row">
                      <td colSpan={7}>
                        <div className="ing-ranking-table__detail">
                          {RADAR_AXES.map((axis) => (
                            <div key={axis.id} className="ing-ranking-table__detail-axis">
                              <strong>{lang === 'en' ? axis.labelEn : axis.label}</strong>
                              <ul>
                                {axis.parts.map((part) => (
                                  <li key={part.key}>
                                    {lang === 'en' ? part.labelEn : part.label}: {fmtStat(row.stat_values?.[part.key] ?? 0)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
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
    </Panel>
  )
}
