/**
 * Eixos do radar "Padrão de jogo".
 *
 * Cada eixo é a **média** das posições de tier das suas estatísticas (ver
 * `lib/ingress-tier-position.mjs` — linear até o Onyx, log₂ depois dele), e a
 * nota do eixo é essa média × 20:
 *
 *   `score == 100`  → Onyx em todas as partes do eixo
 *   `score  > 100`  → além do Onyx: +20 a cada dobra do limiar (×2 = 120,
 *                     ×4 = 140, ×16 = 180 ...)
 *
 * Este módulo é o espelho, client-safe, do cálculo que o servidor grava no
 * ranking (`computeAxisScores` em `lib/ingress-tier-score.mjs`). Os dois usam a
 * mesma função de posição, mas cada um lê os limiares de um lugar: o servidor,
 * do catálogo de badges (`fs`); aqui, dos `tiers` de cada parte, porque o
 * navegador não pode importar o catálogo. Um teste garante que as duas cópias
 * dos limiares nunca divergem e que os dois caminhos dão a mesma nota.
 *
 * Toda parte é ancorada nos limiares REAIS da medalha correspondente. A âncora
 * (Onyx = posição 5 = nota 100) é a mesma para qualquer agente — é o que torna
 * o formato comparável entre perfis, ao contrário de uma referência escolhida
 * a dedo. Não existe mais teto: nenhuma estatística é travada, ela só passa a
 * valer menos a cada dobra (decisão em `docs/adr/0005-...`).
 */
import {POINTS_PER_POSITION, ONYX_POSITION, tierPositionFromTiers} from './ingress-tier-position.mjs'

/** `ref` = limiar de Onyx da parte (último dos 5 `tiers`) — a régua do "% do Onyx" exibido. */
const part = (p) => ({...p, ref: p.tiers[p.tiers.length - 1]})

export const RADAR_AXES = [
    {
        id: 'construcao',
        label: 'Construção',
        labelEn: 'Construction',
        parts: [
            part({
                key: 'resonatorsDeployed',
                label: 'Ressonadores implantados',
                labelEn: 'Resonators deployed',
                tiers: [2000, 10000, 30000, 100000, 200000],
                badge: 'builder',
            }),
            part({
                key: 'modsDeployed',
                label: 'Mods instalados',
                labelEn: 'Mods installed',
                tiers: [150, 1500, 5000, 20000, 50000],
                badge: 'engineer',
            }),
        ],
    },
    {
        id: 'destruicao',
        label: 'Destruição',
        labelEn: 'Destruction',
        parts: [
            part({
                key: 'resonatorsDestroyed',
                label: 'Ressonadores destruídos',
                labelEn: 'Resonators destroyed',
                tiers: [2000, 10000, 30000, 100000, 300000],
                badge: 'purifier',
            }),
            part({
                key: 'portalsNeutralized',
                label: 'Portais neutralizados',
                labelEn: 'Portals neutralized',
                tiers: [250, 1250, 3750, 12500, 37500],
                note: 'limiares do Purifier ÷ 8 (ressonadores por portal)',
                noteEn: 'Purifier thresholds ÷ 8 (resonators per portal)',
            }),
        ],
    },
    {
        id: 'exploracao',
        label: 'Exploração',
        labelEn: 'Exploration',
        parts: [
            part({
                key: 'uniquePortalsVisited',
                label: 'Portais únicos visitados',
                labelEn: 'Unique portals visited',
                tiers: [100, 1000, 2000, 10000, 30000],
                badge: 'explorer',
            }),
            part({
                key: 'distanceWalkedKm',
                label: 'Distância a pé (km)',
                labelEn: 'Distance walked (km)',
                tiers: [10, 100, 300, 1000, 2500],
                badge: 'trekker',
            }),
            part({
                key: 'uniqueMissionsCompleted',
                label: 'Missões concluídas',
                labelEn: 'Missions completed',
                tiers: [5, 25, 100, 200, 500],
                badge: 'specops',
            }),
        ],
    },
    {
        id: 'hacking',
        label: 'Hacking',
        labelEn: 'Hacking',
        parts: [
            part({
                key: 'hacks',
                label: 'Hacks',
                labelEn: 'Hacks',
                tiers: [2000, 10000, 30000, 100000, 200000],
                badge: 'hacker',
            }),
            part({
                key: 'glyphHackPoints',
                label: 'Pontos de glifo',
                labelEn: 'Glyph points',
                tiers: [200, 2000, 6000, 20000, 50000],
                badge: 'translator',
            }),
        ],
    },
    {
        id: 'linksCampos',
        label: 'Links e campos',
        labelEn: 'Links and fields',
        parts: [
            part({
                key: 'linksCreated',
                label: 'Links criados',
                labelEn: 'Links created',
                tiers: [50, 1000, 5000, 25000, 100000],
                badge: 'connector',
            }),
            part({
                key: 'controlFieldsCreated',
                label: 'Campos de controle',
                labelEn: 'Control fields',
                tiers: [100, 500, 2000, 10000, 40000],
                badge: 'mind-controller',
            }),
            part({
                key: 'mindUnitsCaptured',
                label: 'Mind Units capturadas',
                labelEn: 'Mind Units captured',
                tiers: [5000, 50000, 250000, 1000000, 4000000],
                badge: 'illuminator',
            }),
        ],
    },
]

/**
 * Nota do anel "Onyx ×N" do radar: o eixo cujas partes estão, todas, em N×
 * Onyx. Cada dobra soma 1 posição (= 20 pontos): ×1 = 100, ×2 = 120, ×4 = 140.
 * @param {number} multiple múltiplo do Onyx (≥ 1)
 */
export function scoreAtOnyxMultiple(multiple) {
    return (ONYX_POSITION + Math.log2(multiple)) * POINTS_PER_POSITION
}

/**
 * @param {Record<string, number>} stats
 * @returns {{id:string,label:string,labelEn:string,position:number,score:number,
 *   parts:{key:string,label:string,labelEn:string,value:number,ref:number,ratio:number,
 *     position:number,score:number,note:string|null,noteEn:string|null}[]}[]}
 *   `position` = média das posições das partes (5 = Onyx). `score` = `position`
 *   × 20, a "nota do eixo" (100 = Onyx) — o mesmo número que a Nota geral
 *   mostra por eixo. `parts[].ratio` = valor ÷ Onyx (o "% do Onyx" bruto,
 *   nunca travado); `parts[].position`/`score` = o que essa parte contribui.
 *   `labelEn`/`noteEn` (ISTATS-19) espelham `label`/`note` em inglês.
 */
export function computeRadarAxes(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const parts = axis.parts.map((p) => {
            const n = Number(s[p.key])
            const value = Number.isFinite(n) && n > 0 ? n : 0
            const position = tierPositionFromTiers(value, p.tiers)
            return {
                key: p.key,
                label: p.label,
                labelEn: p.labelEn,
                value,
                ref: p.ref,
                ratio: value / p.ref,
                position,
                score: position * POINTS_PER_POSITION,
                note: p.note ?? null,
                noteEn: p.noteEn ?? null,
            }
        })
        const position = parts.reduce((sum, p) => sum + p.position, 0) / parts.length
        return {
            id: axis.id,
            label: axis.label,
            labelEn: axis.labelEn,
            position,
            score: position * POINTS_PER_POSITION,
            parts,
        }
    })
}

/**
 * Compara dois conjuntos de stats eixo a eixo (para o "duelo de fichas").
 * @returns {{id:string,label:string,mine:number,theirs:number,leader:'mine'|'theirs'|'tie'}[]}
 *   `mine`/`theirs` = nota do eixo (100 = Onyx).
 */
export function compareRadar(mineStats, theirsStats) {
    const a = computeRadarAxes(mineStats)
    const b = computeRadarAxes(theirsStats)
    return a.map((axis, i) => {
        const mine = axis.score
        const theirs = b[i].score
        return {
            id: axis.id,
            label: axis.label,
            mine,
            theirs,
            leader: mine > theirs ? 'mine' : theirs > mine ? 'theirs' : 'tie',
        }
    })
}
