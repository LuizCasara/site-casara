'use client'

import {useState} from 'react'
import {FaPaste} from 'react-icons/fa'
import {toast} from 'sonner'
import {parseAppExport} from '@/lib/ingress-stats.mjs'
import {compareHash, RADAR_STAT_KEYS} from '@/lib/ingress-compare-message.mjs'
import type {Profile} from '@/lib/ingress'
import {useLang} from '@/context/LanguageContext'
import {getSitePrefs, setSitePref} from '@/lib/use-site-preferences'
import Panel from './Panel'
import CountryPicker from './CountryPicker'
import RadarOverlay from './RadarOverlay'

export type Agent = {
  codename: string
  faction?: string
  stats: Record<string, number>
  capturedAt?: string
  countryCode?: string
  recursions?: number
  level?: number
  monthsSubscribed?: number
  /** Só a aba Comparação preenche (agentes que estão no ranking) — a legenda do radar mostra nota geral e posição quando presentes. */
  overallScore?: number
  rank?: number
  totalAgents?: number
}

/**
 * Textos bilíngues do componente (ISTATS-19 fix). A branch `pt` reproduz
 * literalmente o texto que existia antes deste componente ganhar `useLang()`
 * - não pode regredir o uso existente em `/ingress/fencherlc` (variant `default`).
 */
const T = {
  pt: {
    panelLabel: 'Padrão de jogo',
    panelLabelRanking: 'Exporte seus status',
    panelHint: 'cada eixo = média das stats em pontos — 100 = Onyx, e além dele a escala é logarítmica',
    whatToCompareAria: 'O que comparar',
    modeVsMe: (name: string) => `Contra ${name}`,
    modeTwo: 'Dois agentes',
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
    panelLabel: 'Play pattern',
    panelLabelRanking: 'Export your stats',
    panelHint: 'each axis = average of stats in points — 100 = Onyx, and past it the scale is logarithmic',
    whatToCompareAria: 'What to compare',
    modeVsMe: (name: string) => `Against ${name}`,
    modeTwo: 'Two agents',
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

const DEDUPE_MS = 10 * 60 * 1000

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
  // Mora em `casara.site` (`ingress.compareAlertSent`); storage bloqueado só significa "sem dedupe".
  const sent = getSitePrefs().ingress.compareAlertSent as Record<string, number>
  const hash = compareHash(payload)
  const now = Date.now()
  if (sent[hash] && now - sent[hash] < DEDUPE_MS) return
  const pruned: Record<string, number> = {}
  for (const [k, t] of Object.entries(sent)) if (now - t < DEDUPE_MS) pruned[k] = t
  pruned[hash] = now
  setSitePref('ingress', 'compareAlertSent', pruned)
  fetch('/api/telegram', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'ingress-compare', ...payload}),
  })
    .then(onSent)
    .catch(() => {})
}

/**
 * Radar do padrão de jogo. O desenho (SVG + tabela de comparação + breakdown)
 * mora em `RadarOverlay` (extraído em T8, ingress-ranking-comparison) — este
 * componente cuida só do formulário (colar export, país, modos de
 * comparação) e monta os `Agent`s que `RadarOverlay` desenha. "Comparar"
 * sobrepõe outro agente: contra o dono do perfil, ou dois exports colados um
 * contra o outro. Leaf client component. Bilíngue via `useLang()`
 * (ISTATS-19 fix) nas duas variants (`default` e `ranking`) - a branch `pt`
 * reproduz o texto anterior sem regressão.
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
  /** Só chamado em `variant="ranking"`, onde o único fluxo é "colar + enviar" (mode sempre 'solo', nunca há `b`). */
  onCompare?: (agent: Agent) => void
}) {
  const {lang} = useLang()
  const t = T[lang]

  const [open, setOpen] = useState(variant === 'ranking')
  // Em `ranking`, "só entrar" é o caminho principal (comparação é secundária)
  // — por isso também é o modo padrão nessa variant; em `default` (uso
  // dentro de /ingress/fencherlc) não existe modo "solo", então o padrão continua vs-me.
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
  // No modo ranking, o radar nem aparece até o visitante enviar um export —
  // antes disso só ficam o formulário (export + país) e os botões, e o painel
  // não pré-carrega o padrão do FencherLC (isso é exclusivo do uso em
  // /ingress/fencherlc). `me` continua disponível pro modo "vs-me" comparar
  // contra o FencherLC real quando o visitante cola algo.
  const chartHidden = variant === 'ranking' && !cmp
  const agentA = cmp ? cmp.a : me
  const agentB = cmp ? cmp.b : undefined

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
      if (variant === 'ranking') {
        onCompare?.(a)
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

  const panelLabel = variant === 'ranking' ? t.panelLabelRanking : t.panelLabel

  const chartBlock = chartHidden ? null : <RadarOverlay agentA={agentA} agentB={agentB} />

  const formBlock = open ? (
    <div className="ing-radar__compare-box">
      {variant === 'ranking' ? null : (
        // Só a variant `default` (/ingress/fencherlc) ainda troca de modo —
        // em `ranking`, o único fluxo é "colar export + país + enviar"
        // (mode fica travado em 'solo', sem UI pra trocar; ver IRCMP-28/29).
        <div className="ing-radar__cmp-mode" role="group" aria-label={t.whatToCompareAria}>
          <button type="button" aria-pressed={mode === 'vs-me'} onClick={() => setMode('vs-me')}>
            {t.modeVsMe(agentName)}
          </button>
          <button type="button" aria-pressed={mode === 'two'} onClick={() => setMode('two')}>
            {t.modeTwo}
          </button>
        </div>
      )}

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
  )

  return (
    // O hint ("cada eixo = média das stats em pontos...") explica o gráfico — sem gráfico, sem hint.
    <Panel label={panelLabel} hint={chartHidden ? undefined : t.panelHint}>
      {variant === 'ranking' ? (
        <>
          {formBlock}
          {chartBlock}
        </>
      ) : (
        <>
          {chartBlock}
          {formBlock}
        </>
      )}
    </Panel>
  )
}
