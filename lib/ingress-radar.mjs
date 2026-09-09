/**
 * Eixos do radar "Padrão de jogo".
 *
 * Cada eixo é a **média** das razões das suas estatísticas, cada razão
 * normalizada pelo **limiar de Onyx** da medalha correspondente. Então:
 *
 *   `onyxRatio == 1.0`  → nível Onyx naquela dimensão
 *   `onyxRatio  > 1.0`  → além do Onyx (agente recursado / veterano)
 *
 * A âncora (Onyx = 1) é a mesma para qualquer agente — é o que torna o formato
 * comparável entre perfis, ao contrário de uma referência escolhida a dedo.
 *
 * Toda parte é ancorada num limiar de Onyx REAL (campo `badge`). Cada razão de
 * componente é travada em `RADAR_DRAW_MAX` (2× Onyx) antes de entrar na média,
 * pra um único stat monstro não estourar o eixo sozinho — mas a razão real fica
 * guardada em `parts[].ratio` para exibição.
 */

export const RADAR_DRAW_MAX = 2

export const RADAR_AXES = [
    {
        id: 'construcao',
        label: 'Construção',
        parts: [
            {key: 'resonatorsDeployed', label: 'Ressonadores implantados', ref: 200000, badge: 'builder'},
            {key: 'modsDeployed', label: 'Mods instalados', ref: 50000, badge: 'engineer'},
        ],
    },
    {
        id: 'destruicao',
        label: 'Destruição',
        parts: [
            {key: 'resonatorsDestroyed', label: 'Ressonadores destruídos', ref: 300000, badge: 'purifier'},
            {
                key: 'portalsNeutralized',
                label: 'Portais neutralizados',
                ref: 37500,
                note: 'Onyx de Purifier ÷ 8 resonadores por portal',
            },
        ],
    },
    {
        id: 'exploracao',
        label: 'Exploração',
        parts: [
            {key: 'uniquePortalsVisited', label: 'Portais únicos visitados', ref: 30000, badge: 'explorer'},
            {key: 'distanceWalkedKm', label: 'Distância a pé (km)', ref: 2500, badge: 'trekker'},
            {key: 'uniqueMissionsCompleted', label: 'Missões concluídas', ref: 500, badge: 'specops'},
        ],
    },
    {
        id: 'hacking',
        label: 'Hacking',
        parts: [
            {key: 'hacks', label: 'Hacks', ref: 200000, badge: 'hacker'},
            {key: 'glyphHackPoints', label: 'Pontos de glifo', ref: 50000, badge: 'translator'},
        ],
    },
    {
        id: 'linksCampos',
        label: 'Links e campos',
        parts: [
            {key: 'linksCreated', label: 'Links criados', ref: 100000, badge: 'connector'},
            {key: 'controlFieldsCreated', label: 'Campos de controle', ref: 40000, badge: 'mind-controller'},
            {key: 'mindUnitsCaptured', label: 'Mind Units capturadas', ref: 4000000, badge: 'illuminator'},
        ],
    },
]

/**
 * @param {Record<string, number>} stats
 * @returns {{id:string,label:string,onyxRatio:number,value:number,
 *   parts:{key:string,label:string,value:number,ref:number,ratio:number,note:string|null}[]}[]}
 *   `onyxRatio` = média das razões travadas em `RADAR_DRAW_MAX` (1 = Onyx).
 *   `value` = raio 0..1 do polígono (`onyxRatio / RADAR_DRAW_MAX`, travado em 1).
 *   `parts[].ratio` = razão REAL do componente (não travada), para o hover.
 */
export function computeRadarAxes(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const parts = axis.parts.map((p) => {
            const n = Number(s[p.key])
            const value = Number.isFinite(n) && n > 0 ? n : 0
            return {key: p.key, label: p.label, value, ref: p.ref, ratio: value / p.ref, note: p.note ?? null}
        })
        const capped = parts.map((p) => Math.min(p.ratio, RADAR_DRAW_MAX))
        const onyxRatio = capped.reduce((sum, r) => sum + r, 0) / capped.length
        const value = Math.max(0, Math.min(1, onyxRatio / RADAR_DRAW_MAX))
        return {id: axis.id, label: axis.label, onyxRatio, value, parts}
    })
}

/**
 * Compara dois conjuntos de stats eixo a eixo (para o "duelo de fichas").
 * @returns {{id:string,label:string,mine:number,theirs:number,leader:'mine'|'theirs'|'tie'}[]}
 */
export function compareRadar(mineStats, theirsStats) {
    const a = computeRadarAxes(mineStats)
    const b = computeRadarAxes(theirsStats)
    return a.map((axis, i) => {
        const mine = axis.onyxRatio
        const theirs = b[i].onyxRatio
        return {
            id: axis.id,
            label: axis.label,
            mine,
            theirs,
            leader: mine > theirs ? 'mine' : theirs > mine ? 'theirs' : 'tie',
        }
    })
}
