'use client'

import {fmtStat} from '@/lib/ingress-format.mjs'
import {artPath} from '@/lib/ingress-art.mjs'
import {useLang} from '@/context/LanguageContext'
import CommunityRadarChart from './CommunityRadarChart'
import NerdAgentTag from './NerdAgentTag'
import type {HallOfFameRecord} from './NerdHallOfFame'

export type OverallScoreBand = {label: string; min: number; max: number | null; count: number}
export type RecursionsSummary = {avg: number | null; max: number | null; reportedCount: number}

/** "Simulacrum" — badge de evento único (grupo `event` no catálogo) ligada à primeira recursão do agente; não tem tiers, é sempre a mesma arte. */
const SIMULACRUM_ART = artPath('simulacrum', null)

const T = {
  pt: {
    avgAp: 'AP médio por agente',
    histogramTitle: 'Distribuição da nota geral',
    radarTitle: 'Padrão de jogo médio',
    recursionsTitle: 'Recursões',
    recursionsAvg: 'Média',
    recursionsMax: 'Maior registrada',
    recursionsReported: 'Agentes que informaram',
    recursionsEmpty: 'Sem dados suficientes',
  },
  en: {
    avgAp: 'Average AP per agent',
    histogramTitle: 'Overall score distribution',
    radarTitle: 'Average play pattern',
    recursionsTitle: 'Recursions',
    recursionsAvg: 'Average',
    recursionsMax: 'Highest recorded',
    recursionsReported: 'Agents who reported',
    recursionsEmpty: 'Not enough data',
  },
} as const

/** P3 — médias, histograma de nota geral e radar consolidado da comunidade (NERD-14..19). */
export default function NerdAverages({
  avgApPerAgent,
  overallScoreHistogram,
  communityAxisAverage,
  recursions,
  recursionsHolder,
}: {
  avgApPerAgent: number
  overallScoreHistogram: OverallScoreBand[]
  communityAxisAverage: Record<string, number>
  recursions: RecursionsSummary
  recursionsHolder: HallOfFameRecord
}) {
  const {lang} = useLang()
  const t = T[lang]
  const maxCount = Math.max(...overallScoreHistogram.map((b) => b.count), 1)

  return (
    <div className="ing-nerd-averages">
      <div className="ing-stat">
        <div className="ing-stat__value">{fmtStat(Math.round(avgApPerAgent))}</div>
        <div className="ing-stat__label">{t.avgAp}</div>
      </div>

      <div className="ing-nerd-histogram">
        <h3 className="ing-nerd-subhead">{t.histogramTitle}</h3>
        {overallScoreHistogram.map((band) => (
          <div className="ing-nerd-histogram-row" key={band.label}>
            <span className="ing-nerd-histogram-label">{band.label}</span>
            <div className="ing-nerd-histogram-track">
              <div className="ing-nerd-histogram-bar" style={{width: `${(band.count / maxCount) * 100}%`}} />
            </div>
            <span className="ing-nerd-histogram-count">{fmtStat(band.count)}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="ing-nerd-subhead">{t.radarTitle}</h3>
        <CommunityRadarChart axisAverage={communityAxisAverage} />
      </div>

      <div>
        <h3 className="ing-nerd-subhead ing-nerd-subhead--icon">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIMULACRUM_ART} alt="" className="ing-nerd-subhead-icon" />
          {t.recursionsTitle}
        </h3>
        {recursions.reportedCount === 0 ? (
          <p className="ing-nerd-empty-note">{t.recursionsEmpty}</p>
        ) : (
          <div className="ing-grid">
            <div className="ing-stat">
              <div className="ing-stat__value">{fmtStat(Math.round(recursions.avg ?? 0))}</div>
              <div className="ing-stat__label">{t.recursionsAvg}</div>
            </div>
            <div className="ing-stat ing-stat--corner">
              {recursionsHolder ? (
                <NerdAgentTag
                  codename={recursionsHolder.codename}
                  faction={recursionsHolder.faction}
                  countryCode={recursionsHolder.countryCode}
                />
              ) : null}
              <div className="ing-stat__value">{fmtStat(recursions.max ?? 0)}</div>
              <div className="ing-stat__label">{t.recursionsMax}</div>
            </div>
            <div className="ing-stat">
              <div className="ing-stat__value">{fmtStat(recursions.reportedCount)}</div>
              <div className="ing-stat__label">{t.recursionsReported}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
