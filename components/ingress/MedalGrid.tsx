'use client'

import {useMemo, useState} from 'react'
import {useLang} from '@/context/LanguageContext'
import MedalDetail, {type DetailMedal} from './MedalDetail'
import RecursionMark from './RecursionMark'

export type GridMedal = {
  slug: string
  name: string
  category: string
  art: string
  tier: string
  firstDate: string | null
  detail: DetailMedal
}

type NextMedal = {slug: string; name: string; nextTier: string; pct: number; hint: string}

const CAT_KEYS = ['estatistica', 'anomalias', 'eventos'] as const
const SOON_KEYS = ['colecionaveis', 'personagens'] as const

const T = {
  pt: {
    medals: 'Medalhas',
    chrono: 'Cronologia',
    byCat: 'Categoria',
    nextMedal: 'Próxima medalha',
    soonHint: 'chegam com o dump GDPR',
    cat: {estatistica: 'Estatística', anomalias: 'Anomalias', eventos: 'Eventos & Ops'} as Record<string, string>,
    soon: {colecionaveis: 'Colecionáveis', personagens: 'Personagens'} as Record<string, string>,
  },
  en: {
    medals: 'Medals',
    chrono: 'Timeline',
    byCat: 'Category',
    nextMedal: 'Next medal',
    soonHint: 'arriving with the GDPR dump',
    cat: {estatistica: 'Stats', anomalias: 'Anomalies', eventos: 'Events & Ops'} as Record<string, string>,
    soon: {colecionaveis: 'Collectibles', personagens: 'Characters'} as Record<string, string>,
  },
}

/**
 * Grade de medalhas da home: hexágonos só com a arte, ordenáveis por cronologia
 * ou categoria, toque abre o painel de detalhe compartilhado com a linha do tempo.
 */
export default function MedalGrid({medals, next}: {medals: GridMedal[]; next?: NextMedal | null}) {
  const {lang} = useLang()
  const tr = T[lang]
  const [sortBy, setSortBy] = useState<'crono' | 'cat'>('crono')
  const [selected, setSelected] = useState<GridMedal | null>(null)

  const chrono = useMemo(
    () =>
      [...medals].sort((a, b) => {
        if (a.firstDate && b.firstDate) return Date.parse(a.firstDate) - Date.parse(b.firstDate)
        return a.firstDate ? -1 : b.firstDate ? 1 : 0
      }),
    [medals],
  )
  const byCat = useMemo(() => {
    const m: Record<string, GridMedal[]> = {}
    for (const med of medals) (m[med.category] = m[med.category] || []).push(med)
    return m
  }, [medals])

  const cell = (med: GridMedal) => (
    <button
      key={med.slug}
      type="button"
      className={`ing-mgrid__cell${med.tier === 'none' ? ' is-locked' : ''}${
        selected?.slug === med.slug ? ' is-active' : ''
      }`}
      onClick={() => setSelected((s) => (s?.slug === med.slug ? null : med))}
      title={med.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={med.art}
        alt={med.name}
        width={52}
        height={52}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      <RecursionMark multiple={med.detail.stat?.beyond?.multiple} className="ing-mgrid__recursion" />
    </button>
  )

  return (
    <section className="ing-panel ing-mgrid">
      <div className="ing-panel__head">
        <h2 className="ing-panel__label">{tr.medals}</h2>
        <div className="ing-mgrid__toggle">
          <button type="button" aria-pressed={sortBy === 'crono'} onClick={() => setSortBy('crono')}>
            {tr.chrono}
          </button>
          <button type="button" aria-pressed={sortBy === 'cat'} onClick={() => setSortBy('cat')}>
            {tr.byCat}
          </button>
        </div>
      </div>

      {next ? (
        <a className="ing-mgrid__next" href={`/ingress/medalha/${next.slug}`}>
          <span className="ing-mgrid__next-label">{tr.nextMedal}</span>
          <strong>
            {next.name} → {next.nextTier}
          </strong>
          <span className="ing-mgrid__next-bar">
            <span style={{width: `${Math.round(next.pct * 100)}%`}} />
          </span>
          <span className="ing-mgrid__next-hint">
            {Math.round(next.pct * 100)}% · {next.hint}
          </span>
        </a>
      ) : null}

      {selected ? <MedalDetail medal={selected.detail} onClose={() => setSelected(null)} /> : null}

      {sortBy === 'crono' ? (
        <div className="ing-mgrid__grid">{chrono.map(cell)}</div>
      ) : (
        <>
          {CAT_KEYS.map((k) =>
            byCat[k]?.length ? (
              <div key={k} className="ing-mgrid__group">
                <h3 className="ing-mgrid__group-label">{tr.cat[k]}</h3>
                <div className="ing-mgrid__grid">{byCat[k].map(cell)}</div>
              </div>
            ) : null,
          )}
          {SOON_KEYS.map((k) => (
            <div key={k} className="ing-mgrid__group">
              <h3 className="ing-mgrid__group-label">{tr.soon[k]}</h3>
              <p className="ing-mgrid__soon">{tr.soonHint}</p>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
