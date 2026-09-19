/**
 * Monta as mensagens do Telegram para uma comparação de fichas do radar, e o
 * hash usado no cliente para não reenviar a mesma comparação por 10 min.
 *
 * Trata dois casos:
 *  - dois agentes diferentes → "quem ganha cada eixo"
 *  - o mesmo codinome nos dois lados (você agora vs. um export seu antigo) →
 *    "sua evolução": antes → agora, com Δ e o intervalo de tempo.
 *
 * Lógica pura — testada, sem dependência de Next.
 */
import {computeRadarAxes, compareRadar, RADAR_AXES} from './ingress-radar.mjs'
import {fmtStat} from './ingress-format.mjs'
import {escapeTelegramMarkdown} from './telegram-markdown.mjs'

/** As chaves de stat que o radar usa (ordem dos eixos e das partes). */
export const RADAR_STAT_KEYS = RADAR_AXES.flatMap((ax) => ax.parts.map((p) => p.key))

const pct = (r) => `${Math.round(r * 100)}%`
/** Nota do eixo (100 = Onyx, log₂ além dele — ADR-0005), inteira. */
const pts = (score) => String(Math.round(score))
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
// Trunca ANTES de escapar (por comprimento do texto exibido, não do texto com
// barras de escape) e só então neutraliza `_*`[` — um codinome vindo do body
// de /api/telegram não pode fechar um bloco de código ou virar um link
// dentro da mensagem.
const safeClip = (s, n) => escapeTelegramMarkdown(clip(s, n))
const padL = (s, n) => String(s).padStart(n)
const padR = (s, n) => String(s).padEnd(n)
const signed = (n) => (n > 0 ? `+${fmtStat(n)}` : n < 0 ? `-${fmtStat(-n)}` : '0')

function fmtWhen(when) {
    return new Date(when)
        .toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        })
        .replace(',', '')
}

function fmtDay(iso) {
    const t = Date.parse(iso)
    return Number.isFinite(t)
        ? new Date(t).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'})
        : '?'
}

/** Intervalo humano entre duas datas: "5 dias depois", "3 semanas depois", … */
function timeGap(fromIso, toIso) {
    const a = Date.parse(fromIso)
    const b = Date.parse(toIso)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null
    const days = Math.round(Math.abs(b - a) / 86_400_000)
    if (days === 0) return 'no mesmo dia'
    if (days < 14) return `${days} dia${days > 1 ? 's' : ''} depois`
    if (days < 60) return `${Math.round(days / 7)} semanas depois`
    if (days < 730) return `${Math.round(days / 30.44)} meses depois`
    const y = Math.floor(days / 365.25)
    return `${y} ano${y > 1 ? 's' : ''} depois`
}

function selfEvolution(a, b, when) {
    // antes = snapshot mais antigo, agora = mais novo
    const ta = Date.parse(a.capturedAt ?? '')
    const tb = Date.parse(b.capturedAt ?? '')
    const [before, after] = Number.isFinite(ta) && Number.isFinite(tb) && ta > tb ? [b, a] : [a, b]

    const beAxes = computeRadarAxes(before.stats)
    const afAxes = computeRadarAxes(after.stats)
    const grew = afAxes.filter((ax, i) => ax.score > beAxes[i].score).length
    const gap = timeGap(before.capturedAt, after.capturedAt)

    const evoLines = afAxes.map((ax, i) => {
        const d = Math.round(ax.score) - Math.round(beAxes[i].score)
        const dtxt = d > 0 ? `+${d}` : d < 0 ? `${d}` : '0'
        return `${padR(clip(ax.label, 16), 16)} ${padL(pts(beAxes[i].score), 6)} ${padL(pts(ax.score), 6)} ${padL(dtxt, 4)}`
    })
    const evoTable = [
        `${padR('Eixo', 16)} ${padL('antes', 6)} ${padL('agora', 6)} ${padL('Δ', 4)}`,
        ...evoLines,
    ].join('\n')

    const dateLine =
        before.capturedAt && after.capturedAt
            ? `${fmtDay(before.capturedAt)} → ${fmtDay(after.capturedAt)}${gap ? ` · ${gap}` : ''}`
            : `${fmtWhen(when)} · sua evolução`

    const caption = [
        `⬡ *Sua evolução — ${escapeTelegramMarkdown(a.codename)}*`,
        `\`${dateLine} · via site\``,
        '',
        '*Padrão de jogo — nota do eixo* (100 = Onyx)',
        '```',
        evoTable,
        '```',
        `Cresceu em *${grew} de ${afAxes.length}* eixos.`,
    ].join('\n')

    const statLines = []
    afAxes.forEach((ax, ai) => {
        ax.parts.forEach((pa, pi) => {
            const pb = beAxes[ai].parts[pi]
            statLines.push(`${padR(clip(pa.label, 22), 22)} ${fmtStat(pb.value)} -> ${fmtStat(pa.value)}  (${signed(pa.value - pb.value)})`)
        })
    })
    const table = ['*Valores* — `antes -> agora (Δ)`', '```', ...statLines, '```'].join('\n')

    return {caption, table}
}

/**
 * @param {{a:{codename:string,stats:object,capturedAt?:string},
 *   b:{codename:string,stats:object,capturedAt?:string},
 *   vsOwner?:boolean, when?:Date|string|number}}
 * @returns {{caption:string, table:string}}
 */
export function compareMessages({a, b, vsOwner = false, when = new Date()}) {
    if (a.codename === b.codename) return selfEvolution(a, b, when)

    const aAxes = computeRadarAxes(a.stats)
    const bAxes = computeRadarAxes(b.stats)
    const rows = compareRadar(a.stats, b.stats)

    const aTag = safeClip(a.codename, 9)
    const bTag = safeClip(b.codename, 9)

    let aWins = 0
    let bWins = 0
    let ties = 0
    for (const r of rows) {
        if (r.leader === 'mine') aWins += 1
        else if (r.leader === 'theirs') bWins += 1
        else ties += 1
    }

    const axisLines = aAxes.map((ax, i) => {
        const mark = rows[i].leader === 'mine' ? ' <' : rows[i].leader === 'theirs' ? ' >' : '  '
        return `${padR(clip(ax.label, 16), 16)} ${padL(pts(ax.score), 6)} ${padL(pts(bAxes[i].score), 6)}${mark}`
    })
    const axisTable = [`${padR('Eixo', 16)} ${padL(aTag, 6)} ${padL(bTag, 6)}`, ...axisLines].join('\n')

    const quem = vsOwner ? 'comparado com o seu perfil' : 'comparação entre dois agentes'

    const caption = [
        '⬡ *Comparação no /ingress*',
        `\`${fmtWhen(when)} · via site\``,
        '',
        `*${escapeTelegramMarkdown(a.codename)}*  ⚔️  *${escapeTelegramMarkdown(b.codename)}*`,
        `_${quem}_`,
        '',
        '*Padrão de jogo — nota do eixo* (100 = Onyx · `<` / `>` = líder)',
        '```',
        axisTable,
        '```',
        `Placar por eixo: *${aTag} ${aWins} × ${bWins} ${bTag}*${ties ? ` · ${ties} empate${ties > 1 ? 's' : ''}` : ''}`,
    ].join('\n')

    const statLines = []
    aAxes.forEach((ax, ai) => {
        ax.parts.forEach((pa, pi) => {
            const pb = bAxes[ai].parts[pi]
            statLines.push(
                `${padR(clip(pa.label, 22), 22)} ${fmtStat(pa.value)} (${pct(pa.ratio)}) · ${fmtStat(pb.value)} (${pct(pb.ratio)})`,
            )
        })
    })
    const table = [
        `*Valores* — \`${escapeTelegramMarkdown(a.codename)} · ${escapeTelegramMarkdown(b.codename)}\``,
        '```',
        ...statLines,
        '```',
    ].join('\n')

    return {caption, table}
}

/**
 * Hash estável de uma comparação (codinomes + valores das stats do radar dos
 * dois). O cliente guarda `{hash: timestamp}` e não reenvia o mesmo por 10 min.
 * @param {{a:{codename:string,stats:object}, b:{codename:string,stats:object}}}
 */
export function compareHash({a, b}) {
    const s =
        `${a.codename} ${b.codename} ` +
        RADAR_STAT_KEYS.map((k) => `${Number(a.stats?.[k]) || 0}:${Number(b.stats?.[k]) || 0}`).join('|')
    let h = 5381
    for (let i = 0; i < s.length; i += 1) h = (((h << 5) + h + s.charCodeAt(i)) | 0) >>> 0
    return h.toString(36)
}
