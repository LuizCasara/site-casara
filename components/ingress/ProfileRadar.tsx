'use client'

import {Fragment, useState} from 'react'
import {FaPaste} from 'react-icons/fa'
import {toast} from 'sonner'
import {computeRadarAxes, compareRadar, RADAR_DRAW_MAX} from '@/lib/ingress-radar.mjs'
import {parseAppExport} from '@/lib/ingress-stats.mjs'
import {compareHash, RADAR_STAT_KEYS} from '@/lib/ingress-compare-message.mjs'
import type {Profile} from '@/lib/ingress'
import {useLang} from '@/context/LanguageContext'
import Panel from './Panel'
import CountryPicker from './CountryPicker'
import {fmtStat} from '@/lib/ingress-format.mjs'

const SIZE = 260
const C = SIZE / 2
const R = 90
const PAD_X = 48 // folga lateral no viewBox para os rótulos dos eixos não cortarem

type Scale = number | 'fit'
const SCALES: {v: Scale; label: string}[] = [
  {v: 0.5, label: '½×'},
  {v: 1, label: 'Onyx'},
  {v: RADAR_DRAW_MAX, label: `${RADAR_DRAW_MAX}×`},
  {v: 'fit', label: 'Estilo'},
]

type Part = {
  key: string
  label: string
  labelEn: string
  value: number
  ref: number
  ratio: number
  note: string | null
  noteEn: string | null
}
type Axis = {id: string; label: string; labelEn: string; onyxRatio: number; value: number; parts: Part[]}
export type Agent = {
  codename: string
  faction?: string
  stats: Record<string, number>
  capturedAt?: string
  countryCode?: string
  recursions?: number
  level?: number
  monthsSubscribed?: number
}

/**
 * Textos bilíngues do componente (ISTATS-19 fix). A branch `pt` reproduz
 * literalmente o texto que existia antes deste componente ganhar `useLang()`
 * - não pode regredir o uso existente em `/ingress` (variant `default`).
 */
const T = {
  pt: {
    radarAria: 'Radar do padrão de jogo',
    panelLabel: 'Padrão de jogo',
    panelHint: 'cada eixo = média das stats vs. o Onyx da medalha',
    scaleAria: 'Escala do radar',
    scaleStyle: 'Estilo',
    fitNote: 'Cada ficha normalizada pelo próprio eixo mais forte — compara o estilo de jogo, não o tamanho.',
    ofOnyxLevel: 'do nível Onyx',
    breakdownFootMulti: (n: number) => `média das ${n} razões`,
    breakdownFootSingle: 'razão contra o limiar de Onyx',
    breakdownFootCapped: (pct: number) => ` · o que passa de ${pct}% entra travado`,
    hoverHint: 'Passe o mouse ou toque num eixo para ver o cálculo.',
    blankHint: 'Cole seu export de estatísticas abaixo para ver o seu padrão de jogo.',
    whatToCompareAria: 'O que comparar',
    modeVsMe: (name: string, ranking: boolean) => (ranking ? `Comparar com ${name}` : `Contra ${name}`),
    modeTwo: (ranking: boolean) => (ranking ? 'Comparar com outro agente' : 'Dois agentes'),
    modeSolo: 'Entrar no ranking',
    labelTwoA: 'Export do agente A (verde):',
    labelTwoB: 'Export do agente B (roxo):',
    labelSolo: 'Cole seu export de estatísticas do app:',
    labelVsMe: 'Cole o export de estatísticas do app do outro agente:',
    sentNote: '✓ comparação enviada',
    compareBtn: 'Comparar',
    submitBtn: 'Enviar',
    clearBtn: 'Limpar',
    openCompareBtn: 'Comparar com outro agente',
    parseErrorNoAgent: 'Export sem "Agent Name".',
    parseErrorGeneric: 'Não deu pra ler esse texto.',
    countryRequiredError: 'Escolha o país antes de continuar.',
    pasteBtn: 'Colar',
    pasteFallback: 'Não foi possível colar automaticamente. Toque e segure o campo para colar.',
  },
  en: {
    radarAria: 'Play-pattern radar',
    panelLabel: 'Play pattern',
    panelHint: "each axis = average of stats vs. the badge's Onyx threshold",
    scaleAria: 'Radar scale',
    scaleStyle: 'Style',
    fitNote: 'Each card normalized by its own strongest axis — compares play style, not size.',
    ofOnyxLevel: 'of Onyx level',
    breakdownFootMulti: (n: number) => `average of ${n} ratios`,
    breakdownFootSingle: 'ratio against the Onyx threshold',
    breakdownFootCapped: (pct: number) => ` · anything past ${pct}% is capped`,
    hoverHint: 'Hover or tap an axis to see the math.',
    blankHint: "Paste your stats export below to see your play pattern.",
    whatToCompareAria: 'What to compare',
    modeVsMe: (name: string, ranking: boolean) => (ranking ? `Compare with ${name}` : `Against ${name}`),
    modeTwo: (ranking: boolean) => (ranking ? 'Compare with another agent' : 'Two agents'),
    modeSolo: 'Just join the ranking',
    labelTwoA: 'Agent A export (green):',
    labelTwoB: 'Agent B export (purple):',
    labelSolo: 'Paste your app stats export:',
    labelVsMe: "Paste the other agent's app stats export:",
    sentNote: '✓ comparison sent',
    compareBtn: 'Compare',
    submitBtn: 'Submit',
    clearBtn: 'Clear',
    openCompareBtn: 'Compare with another agent',
    parseErrorNoAgent: 'Export missing "Agent Name".',
    parseErrorGeneric: "Couldn't read that text.",
    countryRequiredError: 'Choose a country before continuing.',
    pasteBtn: 'Paste',
    pasteFallback: "Couldn't paste automatically. Tap and hold the field to paste.",
  },
} as const

function point(i: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)]
}

const pct = (r: number) => `${Math.round(r * 100)}%`

function toAgent(text: string, noAgentMsg: string): Agent {
  const p = parseAppExport(text)
  if (!p.agent?.codename) throw new Error(noAgentMsg)
  return {
    codename: p.agent.codename,
    faction: p.agent.faction ?? undefined,
    stats: p.stats,
    capturedAt: p.capturedAt ?? undefined,
    recursions: typeof p.agent.recursions === 'number' ? p.agent.recursions : undefined,
    level: typeof p.agent.level === 'number' ? p.agent.level : undefined,
    monthsSubscribed: typeof p.agent.monthsSubscribed === 'number' ? p.agent.monthsSubscribed : undefined,
  }
}

/** Estado vazio do radar em `variant="ranking"`, antes de qualquer submissão. */
const BLANK_AGENT: Agent = {codename: '', stats: {}}

const DEDUPE_MS = 10 * 60 * 1000
const SENT_KEY = 'ing-cmp-sent'

/** Só as stats que o radar usa — é isso que vai pro servidor/Telegram. */
function radarStats(stats: Record<string, number>) {
  const out: Record<string, number> = {}
  for (const k of RADAR_STAT_KEYS as string[]) out[k] = Number(stats[k]) || 0
  return out
}

/** Manda a comparação pro Telegram do Luiz, no máximo uma vez por par a cada 10 min. */
function notifyTelegram(a: Agent, b: Agent, vsOwner: boolean, onSent: () => void) {
  // só em produção — dev/preview não spamma o Telegram a cada teste
  if (process.env.NODE_ENV !== 'production') return
  const payload = {
    a: {codename: a.codename, stats: radarStats(a.stats), capturedAt: a.capturedAt},
    b: {codename: b.codename, stats: radarStats(b.stats), capturedAt: b.capturedAt},
    vsOwner,
  }
  let sent: Record<string, number> = {}
  try {
    sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}')
  } catch {
    sent = {}
  }
  const hash = compareHash(payload)
  const now = Date.now()
  if (sent[hash] && now - sent[hash] < DEDUPE_MS) return
  try {
    const pruned: Record<string, number> = {}
    for (const [k, t] of Object.entries(sent)) if (now - t < DEDUPE_MS) pruned[k] = t
    pruned[hash] = now
    localStorage.setItem(SENT_KEY, JSON.stringify(pruned))
  } catch {
    // localStorage bloqueado — segue sem dedupe
  }
  fetch('/api/telegram', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'ingress-compare', ...payload}),
  })
    .then(onSent)
    .catch(() => {})
}

/** Anéis em múltiplos do Onyx que cabem dentro da escala escolhida. */
function ringStops(drawMax: number) {
  const cands = drawMax <= 0.5 ? [0.25, 0.5] : drawMax <= 1 ? [0.5, 1] : [0.5, 1, 2]
  return cands.filter((o) => o <= drawMax + 1e-9)
}

/**
 * Radar do padrão de jogo. Cada eixo é a média das razões das suas estatísticas
 * contra o limiar de Onyx da medalha correspondente. Escala do desenho ajustável
 * (½× / Onyx / 2× / Estilo). "Comparar" sobrepõe outro agente: contra o dono do
 * perfil, ou dois exports colados um contra o outro. Leaf client component.
 * Bilíngue via `useLang()` (ISTATS-19 fix) nas duas variants (`default` e
 * `ranking`) - a branch `pt` reproduz o texto anterior sem regressão.
 */
export default function ProfileRadar({
  stats,
  agentName = 'Você',
  capturedAt,
  variant = 'default',
  onCompare,
}: {
  stats: Profile['stats']
  agentName?: string
  capturedAt?: string
  variant?: 'default' | 'ranking'
  onCompare?: (agents: {a: Agent; b?: Agent}, mode: 'vs-me' | 'two' | 'solo') => void
}) {
  const {lang} = useLang()
  const t = T[lang]
  const axisLabel = (a: Axis) => (lang === 'en' ? a.labelEn : a.label)
  const partLabel = (p: Part) => (lang === 'en' ? p.labelEn : p.label)
  const partNote = (p: Part) => (lang === 'en' ? p.noteEn : p.note)

  const [active, setActive] = useState<number | null>(null)
  const [scale, setScale] = useState<Scale>(RADAR_DRAW_MAX)
  const [open, setOpen] = useState(variant === 'ranking')
  // Em `ranking`, "só entrar" é o caminho principal (comparação é secundária)
  // — por isso também é o modo padrão nessa variant; em `default` (uso
  // dentro de /ingress) não existe modo "solo", então o padrão continua vs-me.
  const [mode, setMode] = useState<'vs-me' | 'two' | 'solo'>(variant === 'ranking' ? 'solo' : 'vs-me')
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  // País por textarea — só usado em variant="ranking" (a única variante que
  // grava no ranking; ver renderização condicional abaixo).
  const [countryA, setCountryA] = useState<string | null>(null)
  const [countryB, setCountryB] = useState<string | null>(null)
  const [cmp, setCmp] = useState<{a: Agent; b?: Agent} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sentNote, setSentNote] = useState(false)

  const me: Agent = {codename: agentName, stats: stats as Record<string, number>, capturedAt}
  // No modo ranking, o radar nasce em branco — não pré-carrega o padrão do
  // FencherLC (isso é exclusivo do uso em /ingress). `me` continua disponível
  // pro modo "vs-me" comparar contra o FencherLC real quando o visitante cola algo.
  const isBlank = variant === 'ranking' && !cmp
  const agentA = cmp ? cmp.a : isBlank ? BLANK_AGENT : me
  const agentB = cmp ? cmp.b : null

  const aAxes = computeRadarAxes(agentA.stats) as Axis[]
  const bAxes = agentB ? (computeRadarAxes(agentB.stats) as Axis[]) : null
  const n = aAxes.length
  const rows = agentB ? compareRadar(agentA.stats, agentB.stats) : null

  const sel = active != null && !isBlank ? aAxes[active] : null
  const selB = active != null && bAxes ? bAxes[active] : null

  // quando os dois lados são o mesmo agente (você agora vs. um export antigo),
  // desambigua os rótulos pela data do snapshot
  const selfCmp = !!agentB && agentA.codename === agentB.codename
  const dmy = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
  const labelA = selfCmp && agentA.capturedAt ? `${agentA.codename} · ${dmy(agentA.capturedAt)}` : agentA.codename
  const labelB = selfCmp && agentB?.capturedAt ? `${agentB.codename} · ${dmy(agentB.capturedAt)}` : (agentB?.codename ?? '')

  const fit = scale === 'fit'
  const maxOf = (as: Axis[]) => (fit ? Math.max(...as.map((a) => a.onyxRatio), 0.01) : (scale as number))
  const radiusIn = (onyxRatio: number, as: Axis[]) => R * Math.max(Math.min(onyxRatio / maxOf(as), 1), 0.02)
  const shape = (as: Axis[]) => as.map((a, i) => point(i, n, radiusIn(a.onyxRatio, as)).join(',')).join(' ')
  const stops = fit ? [] : ringStops(scale as number)
  const edge = stops[stops.length - 1]

  const flagSent = () => {
    setSentNote(true)
    window.setTimeout(() => setSentNote(false), 4000)
  }

  const runCompare = () => {
    // País obrigatório só em variant="ranking" (única variante que grava no
    // ranking) — bloqueia antes do parse, sem chamar onCompare, reaproveitando
    // o mesmo mecanismo de erro dos parses malformados.
    if (variant === 'ranking') {
      const missingA = countryA === null
      const missingB = mode === 'two' && countryB === null
      if (missingA || missingB) {
        setError(t.countryRequiredError)
        return
      }
    }
    try {
      const a =
        mode === 'vs-me' ? me : {...toAgent(textA, t.parseErrorNoAgent), countryCode: countryA ?? undefined}
      const b =
        mode === 'solo'
          ? undefined
          : mode === 'two'
            ? {...toAgent(textB, t.parseErrorNoAgent), countryCode: countryB ?? undefined}
            : {...toAgent(textA, t.parseErrorNoAgent), countryCode: countryA ?? undefined}
      setCmp(b ? {a, b} : {a})
      setError(null)
      setActive(null)
      if (variant === 'ranking') {
        onCompare?.({a, b}, mode)
      } else if (b) {
        notifyTelegram(a, b, mode === 'vs-me', flagSent)
      }
    } catch (e) {
      setCmp(null)
      setError(e instanceof Error ? e.message : t.parseErrorGeneric)
    }
  }
  const clear = () => {
    setCmp(null)
    setTextA('')
    setTextB('')
    setCountryA(null)
    setCountryB(null)
    setError(null)
    setSentNote(false)
    setOpen(variant === 'ranking')
  }
  const canCompare = mode === 'two' ? textA.trim() !== '' && textB.trim() !== '' : textA.trim() !== ''

  /**
   * Botão "Colar" (principalmente pra mobile: evita o
   * selecionar-e-achar-"Colar"-no-menu). Só preenche o campo — quem decide
   * disparar a comparação continua sendo o clique em "Comparar", então um
   * clipboard com lixo não tem efeito colateral. `readText` exige gesto do
   * usuário e contexto seguro (ok, o site é https); se a API não existir ou
   * a permissão for negada, cai no mesmo fallback gracioso do resto do
   * Ingress (toast + foco no campo pra colar manualmente).
   */
  const pasteInto = async (setter: (v: string) => void, textareaId: string) => {
    try {
      const text = await navigator.clipboard?.readText?.()
      if (text) {
        setter(text)
        return
      }
    } catch {
      // permissão negada ou API indisponível — cai no fallback abaixo
    }
    toast.error(t.pasteFallback)
    document.getElementById(textareaId)?.focus()
  }

  const svg = (
    <div className="ing-radar">
      <svg viewBox={`${-PAD_X} 0 ${SIZE + PAD_X * 2} ${SIZE + 6}`} role="img" aria-label={t.radarAria}>
        {fit
          ? [0.34, 0.67, 1].map((f) => (
              <polygon
                key={f}
                points={aAxes.map((_, i) => point(i, n, R * f).join(',')).join(' ')}
                className={`ing-radar__ring${f === 1 ? ' ing-radar__ring--edge' : ''}`}
              />
            ))
          : stops.map((o) => {
              const rr = R * Math.min(o / (scale as number), 1)
              const isOnyx = Math.abs(o - 1) < 1e-9
              return (
                <g key={o}>
                  <polygon
                    points={aAxes.map((_, i) => point(i, n, rr).join(',')).join(' ')}
                    className={`ing-radar__ring${isOnyx ? ' ing-radar__ring--onyx' : ''}${o === edge ? ' ing-radar__ring--edge' : ''}`}
                  />
                  <text x={C + 3} y={C - rr - 3} className="ing-radar__ring-label">
                    {isOnyx ? 'Onyx' : o === 0.5 ? '½×' : `${o}×`}
                  </text>
                </g>
              )
            })}
        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, R)
          return <line key={a.id} x1={C} y1={C} x2={x} y2={y} className="ing-radar__spoke" />
        })}

        <polygon points={shape(aAxes)} className={`ing-radar__shape${bAxes ? ' ing-radar__shape--muted' : ''}`} />
        {bAxes ? <polygon points={shape(bAxes)} className="ing-radar__shape ing-radar__shape--them" /> : null}

        {bAxes
          ? bAxes.map((a, i) => {
              const [x, y] = point(i, n, radiusIn(a.onyxRatio, bAxes))
              return <circle key={a.id} cx={x} cy={y} r={4.5} className="ing-radar__dot ing-radar__dot--them" />
            })
          : null}

        {aAxes.map((a, i) => {
          const [x, y] = point(i, n, radiusIn(a.onyxRatio, aAxes))
          const [lx, ly] = point(i, n, R + 14)
          const anchor = lx < C - 8 ? 'end' : lx > C + 8 ? 'start' : 'middle'
          return (
            <g
              key={a.id}
              className="ing-radar__axis"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive((cur) => (cur === i ? null : i))}
            >
              <circle cx={x} cy={y} r={active === i ? 6 : 4} className={`ing-radar__dot${active === i ? ' is-active' : ''}`}>
                <title>{`${axisLabel(a)}: ${pct(a.onyxRatio)} ${t.ofOnyxLevel}`}</title>
              </circle>
              <text x={lx} y={ly - 5} textAnchor={anchor} className="ing-radar__label">
                {axisLabel(a)}
              </text>
              {isBlank ? null : (
                <text x={lx} y={ly + 6} textAnchor={anchor} className="ing-radar__pct">
                  {pct(a.onyxRatio)}
                  {bAxes ? <tspan className="ing-radar__pct-them"> · {pct(bAxes[i].onyxRatio)}</tspan> : null}
                </text>
              )}
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          )
        })}
      </svg>
    </div>
  )

  return (
    <Panel label={t.panelLabel} hint={t.panelHint}>
      <div className="ing-radar__topbar">
        {agentB ? (
          <p className="ing-radar__legend">
            <span className="ing-radar__legend-me">● {labelA}</span>
            <span className="ing-radar__legend-them">● {labelB}</span>
          </p>
        ) : (
          <span />
        )}
        <div className="ing-radar__scale" role="group" aria-label={t.scaleAria}>
          {SCALES.map((s) => (
            <button key={String(s.v)} type="button" aria-pressed={scale === s.v} onClick={() => setScale(s.v)}>
              {s.v === 'fit' ? t.scaleStyle : s.label}
            </button>
          ))}
        </div>
      </div>

      {fit ? <p className="ing-radar__scale-note">{t.fitNote}</p> : null}

      <div className={agentB ? 'ing-radar__cmp-layout' : undefined}>
        {svg}
        {agentB && bAxes && rows ? (
          <div className="ing-radar__cmp-table-wrap">
            <table className="ing-radar__cmp-table">
              <thead>
                <tr>
                  <th />
                  <th className="ing-radar__cmp-me">{labelA}</th>
                  <th className="ing-radar__cmp-them">{labelB}</th>
                </tr>
              </thead>
              <tbody>
                {aAxes.map((a, i) => (
                  <Fragment key={a.id}>
                    <tr className="is-axis">
                      <th>{axisLabel(a)}</th>
                      <td className={rows[i].leader === 'mine' ? 'is-lead' : undefined}>{pct(a.onyxRatio)}</td>
                      <td className={rows[i].leader === 'theirs' ? 'is-lead-them' : undefined}>
                        {pct(bAxes[i].onyxRatio)}
                      </td>
                    </tr>
                    {a.parts.map((p, pi) => (
                      <tr key={p.key} className="is-part">
                        <td>{partLabel(p)}</td>
                        <td>
                          {fmtStat(p.value)} <small>{pct(p.ratio)}</small>
                        </td>
                        <td>
                          {fmtStat(bAxes[i].parts[pi].value)} <small>{pct(bAxes[i].parts[pi].ratio)}</small>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {sel ? (
        <div className="ing-radar__breakdown">
          <p className="ing-radar__bd-head">
            <b>{axisLabel(sel)}</b> — {pct(sel.onyxRatio)} {t.ofOnyxLevel}
            {selB ? (
              <span className="ing-radar__bd-vs">
                {' '}
                · {agentB?.codename}: {pct(selB.onyxRatio)}
              </span>
            ) : null}
          </p>
          <ul>
            {sel.parts.map((p, pi) => (
              <li key={p.key} className={p.ratio > RADAR_DRAW_MAX ? 'is-capped' : undefined}>
                <span className="ing-radar__bd-label">
                  {partLabel(p)}
                  {partNote(p) ? <em className="ing-radar__bd-note"> · {partNote(p)}</em> : null}
                </span>
                <span className="ing-radar__bd-calc">
                  {fmtStat(p.value)} / {fmtStat(p.ref)}
                </span>
                <span className="ing-radar__bd-ratio">
                  {pct(p.ratio)}
                  {selB ? <span className="ing-radar__bd-ratio-them"> · {pct(selB.parts[pi].ratio)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="ing-radar__bd-foot">
            {sel.parts.length > 1 ? t.breakdownFootMulti(sel.parts.length) : t.breakdownFootSingle}
            {sel.parts.some((p) => p.ratio > RADAR_DRAW_MAX) ? t.breakdownFootCapped(RADAR_DRAW_MAX * 100) : ''}
          </p>
        </div>
      ) : !agentB ? (
        <p className="ing-radar__hint">{isBlank ? t.blankHint : t.hoverHint}</p>
      ) : null}

      {open ? (
        <div className="ing-radar__compare-box">
          <div className="ing-radar__cmp-mode" role="group" aria-label={t.whatToCompareAria}>
            {variant === 'ranking' ? (
              // "Só entrar" é o caminho principal em /ingress/ranking — vem
              // primeiro, comparações (vs-me/two) são secundárias aqui.
              <button type="button" aria-pressed={mode === 'solo'} onClick={() => setMode('solo')}>
                {t.modeSolo}
              </button>
            ) : null}
            <button type="button" aria-pressed={mode === 'vs-me'} onClick={() => setMode('vs-me')}>
              {t.modeVsMe(agentName, variant === 'ranking')}
            </button>
            <button type="button" aria-pressed={mode === 'two'} onClick={() => setMode('two')}>
              {t.modeTwo(variant === 'ranking')}
            </button>
          </div>

          <div className="ing-radar__label-row">
            <label htmlFor="ing-radar-a" className="ing-radar__compare-label">
              {mode === 'two' ? t.labelTwoA : mode === 'solo' ? t.labelSolo : t.labelVsMe}
            </label>
            <button
              type="button"
              className="ing-radar__btn ing-radar__btn--paste"
              onClick={() => pasteInto(setTextA, 'ing-radar-a')}
            >
              <FaPaste aria-hidden="true" />
              {t.pasteBtn}
            </button>
          </div>
          <textarea
            id="ing-radar-a"
            className="ing-radar__textarea"
            rows={3}
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Time Span	Agent Name	Agent Faction	Date…	…"
          />
          {variant === 'ranking' ? (
            <CountryPicker
              id="ing-radar-a-country"
              value={countryA}
              onChange={setCountryA}
              invalid={error === t.countryRequiredError && countryA === null}
            />
          ) : null}
          {mode === 'two' ? (
            <>
              <div className="ing-radar__label-row">
                <label htmlFor="ing-radar-b" className="ing-radar__compare-label">
                  {t.labelTwoB}
                </label>
                <button
                  type="button"
                  className="ing-radar__btn ing-radar__btn--paste"
                  onClick={() => pasteInto(setTextB, 'ing-radar-b')}
                >
                  <FaPaste aria-hidden="true" />
                  {t.pasteBtn}
                </button>
              </div>
              <textarea
                id="ing-radar-b"
                className="ing-radar__textarea"
                rows={3}
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Time Span	Agent Name	Agent Faction	Date…	…"
              />
              {variant === 'ranking' ? (
                <CountryPicker
                  id="ing-radar-b-country"
                  value={countryB}
                  onChange={setCountryB}
                  invalid={error === t.countryRequiredError && countryB === null}
                />
              ) : null}
            </>
          ) : null}

          {error ? <p className="ing-radar__compare-error">{error}</p> : null}
          {sentNote ? <p className="ing-radar__compare-sent">{t.sentNote}</p> : null}
          <div className="ing-radar__compare-actions">
            <button
              type="button"
              className="ing-radar__btn ing-radar__btn--primary"
              onClick={runCompare}
              disabled={!canCompare}
            >
              {mode === 'solo' ? t.submitBtn : t.compareBtn}
            </button>
            <button type="button" className="ing-radar__btn" onClick={clear}>
              {t.clearBtn}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ing-radar__btn ing-radar__compare-open" onClick={() => setOpen(true)}>
          {t.openCompareBtn}
        </button>
      )}
    </Panel>
  )
}
