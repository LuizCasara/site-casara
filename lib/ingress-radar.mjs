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
        labelEn: 'Construction',
        parts: [
            {
                key: 'resonatorsDeployed',
                label: 'Ressonadores implantados',
                labelEn: 'Resonators deployed',
                ref: 200000,
                badge: 'builder',
            },
            {key: 'modsDeployed', label: 'Mods instalados', labelEn: 'Mods installed', ref: 50000, badge: 'engineer'},
        ],
    },
    {
        id: 'destruicao',
        label: 'Destruição',
        labelEn: 'Destruction',
        parts: [
            {
                key: 'resonatorsDestroyed',
                label: 'Ressonadores destruídos',
                labelEn: 'Resonators destroyed',
                ref: 300000,
                badge: 'purifier',
            },
            {
                key: 'portalsNeutralized',
                label: 'Portais neutralizados',
                labelEn: 'Portals neutralized',
                ref: 37500,
                note: 'Onyx de Purifier ÷ 8 resonadores por portal',
                noteEn: 'Purifier Onyx ÷ 8 resonators per portal',
            },
        ],
    },
    {
        id: 'exploracao',
        label: 'Exploração',
        labelEn: 'Exploration',
        parts: [
            {
                key: 'uniquePortalsVisited',
                label: 'Portais únicos visitados',
                labelEn: 'Unique portals visited',
                ref: 30000,
                badge: 'explorer',
            },
            {
                key: 'distanceWalkedKm',
                label: 'Distância a pé (km)',
                labelEn: 'Distance walked (km)',
                ref: 2500,
                badge: 'trekker',
            },
            {
                key: 'uniqueMissionsCompleted',
                label: 'Missões concluídas',
                labelEn: 'Missions completed',
                ref: 500,
                badge: 'specops',
            },
        ],
    },
    {
        id: 'hacking',
        label: 'Hacking',
        labelEn: 'Hacking',
        parts: [
            {key: 'hacks', label: 'Hacks', labelEn: 'Hacks', ref: 200000, badge: 'hacker'},
            {key: 'glyphHackPoints', label: 'Pontos de glifo', labelEn: 'Glyph points', ref: 50000, badge: 'translator'},
        ],
    },
    {
        id: 'linksCampos',
        label: 'Links e campos',
        labelEn: 'Links and fields',
        parts: [
            {key: 'linksCreated', label: 'Links criados', labelEn: 'Links created', ref: 100000, badge: 'connector'},
            {
                key: 'controlFieldsCreated',
                label: 'Campos de controle',
                labelEn: 'Control fields',
                ref: 40000,
                badge: 'mind-controller',
            },
            {
                key: 'mindUnitsCaptured',
                label: 'Mind Units capturadas',
                labelEn: 'Mind Units captured',
                ref: 4000000,
                badge: 'illuminator',
            },
        ],
    },
]

/**
 * @param {Record<string, number>} stats
 * @returns {{id:string,label:string,labelEn:string,onyxRatio:number,value:number,
 *   parts:{key:string,label:string,labelEn:string,value:number,ref:number,ratio:number,note:string|null,noteEn:string|null}[]}[]}
 *   `onyxRatio` = média das razões travadas em `RADAR_DRAW_MAX` (1 = Onyx).
 *   `value` = raio 0..1 do polígono (`onyxRatio / RADAR_DRAW_MAX`, travado em 1).
 *   `parts[].ratio` = razão REAL do componente (não travada), para o hover.
 *   `labelEn`/`noteEn` (ISTATS-19) espelham `label`/`note` em inglês — vêm direto de `RADAR_AXES`.
 */
export function computeRadarAxes(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const parts = axis.parts.map((p) => {
            const n = Number(s[p.key])
            const value = Number.isFinite(n) && n > 0 ? n : 0
            return {
                key: p.key,
                label: p.label,
                labelEn: p.labelEn,
                value,
                ref: p.ref,
                ratio: value / p.ref,
                note: p.note ?? null,
                noteEn: p.noteEn ?? null,
            }
        })
        const capped = parts.map((p) => Math.min(p.ratio, RADAR_DRAW_MAX))
        const onyxRatio = capped.reduce((sum, r) => sum + r, 0) / capped.length
        const value = Math.max(0, Math.min(1, onyxRatio / RADAR_DRAW_MAX))
        return {id: axis.id, label: axis.label, labelEn: axis.labelEn, onyxRatio, value, parts}
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
