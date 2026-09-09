/**
 * Eixos do radar "Padrão de jogo".
 *
 * Cada eixo é a **média** das razões de suas estatísticas, cada razão
 * normalizada pelo **limiar de Onyx** da medalha correspondente. Então:
 *
 *   `onyxRatio == 1.0`  → nível Onyx naquela dimensão
 *   `onyxRatio  > 1.0`  → além do Onyx (agente recursado / veterano)
 *
 * Essa âncora (Onyx = 1) é a mesma para qualquer agente — é o que torna o
 * formato comparável entre perfis, ao contrário de uma referência escolhida a
 * dedo. O radar é desenhado até `RADAR_DRAW_MAX` (1.5× Onyx); acima disso o
 * vértice fica na borda.
 *
 * Duas estatísticas de combate não têm medalha própria
 * (`enemyLinksDestroyed`, `enemyFieldsDestroyed`): a âncora delas é **derivada**
 * do Onyx de Purifier (300 000 resonadores ≈ 37 500 portais limpos), com uma
 * razão típica de links/campos por portal limpo. É uma estimativa — marcada com
 * `estimated: true` — não um limiar oficial.
 */

export const RADAR_DRAW_MAX = 1.5

export const RADAR_AXES = [
    {
        id: 'construcao',
        label: 'Construção',
        parts: [
            {key: 'resonatorsDeployed', ref: 200000, badge: 'builder'},
            {key: 'modsDeployed', ref: 50000, badge: 'engineer'},
        ],
    },
    {
        id: 'destruicao',
        label: 'Destruição',
        parts: [
            {key: 'resonatorsDestroyed', ref: 300000, badge: 'purifier'},
            {key: 'enemyLinksDestroyed', ref: 55000, estimated: true},
            {key: 'enemyFieldsDestroyed', ref: 20000, estimated: true},
        ],
    },
    {
        id: 'exploracao',
        label: 'Exploração',
        parts: [
            {key: 'uniquePortalsVisited', ref: 30000, badge: 'explorer'},
            {key: 'distanceWalkedKm', ref: 2500, badge: 'trekker'},
            {key: 'uniqueMissionsCompleted', ref: 500, badge: 'specops'},
        ],
    },
    {
        id: 'hacking',
        label: 'Hacking',
        parts: [
            {key: 'hacks', ref: 200000, badge: 'hacker'},
            {key: 'glyphHackPoints', ref: 50000, badge: 'translator'},
        ],
    },
    {
        id: 'linksCampos',
        label: 'Links e campos',
        parts: [
            {key: 'linksCreated', ref: 100000, badge: 'connector'},
            {key: 'controlFieldsCreated', ref: 40000, badge: 'mind-controller'},
        ],
    },
]

/**
 * @param {Record<string, number>} stats
 * @returns {{id:string,label:string,onyxRatio:number,value:number,parts:{key:string,value:number,ratio:number}[]}[]}
 *   `onyxRatio` = média das razões (1 = Onyx). `value` = raio 0..1 para o
 *   polígono (`onyxRatio / RADAR_DRAW_MAX`, travado em 1).
 */
export function computeRadarAxes(stats) {
    const s = stats || {}
    return RADAR_AXES.map((axis) => {
        const parts = axis.parts.map((p) => {
            const n = Number(s[p.key])
            const value = Number.isFinite(n) && n > 0 ? n : 0
            return {key: p.key, value, ratio: value / p.ref}
        })
        const onyxRatio = parts.reduce((sum, p) => sum + p.ratio, 0) / parts.length
        const value = Math.max(0, Math.min(1, onyxRatio / RADAR_DRAW_MAX))
        return {id: axis.id, label: axis.label, onyxRatio, value, parts}
    })
}
