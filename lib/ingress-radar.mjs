/**
 * Eixos do radar de perfil. Cada eixo soma uma ou mais estatísticas do snapshot
 * e divide por uma `reference` calibrada em código (não há "máximo" real numa
 * conta acumulada — a referência define o ponto em que o eixo satura em 1).
 * A normalização vive aqui, separada do componente SVG (`ProfileRadar`).
 *
 * `statKeys` referenciam chaves de `lib/ingress-stats.mjs`.
 */

export const RADAR_AXES = [
    {id: 'construcao', label: 'Construção', statKeys: ['resonatorsDeployed', 'modsDeployed'], reference: 150000},
    {id: 'destruicao', label: 'Destruição', statKeys: ['resonatorsDestroyed', 'enemyLinksDestroyed', 'enemyFieldsDestroyed'], reference: 150000},
    {id: 'exploracao', label: 'Exploração', statKeys: ['uniquePortalsVisited', 'distanceWalkedKm', 'uniqueMissionsCompleted'], reference: 15000},
    {id: 'hacking', label: 'Hacking', statKeys: ['hacks', 'glyphHackPoints'], reference: 150000},
    {id: 'linksCampos', label: 'Links e campos', statKeys: ['linksCreated', 'controlFieldsCreated'], reference: 50000},
];

/**
 * @param {Record<string, number>} stats
 * @returns {{id:string,label:string,raw:number,value:number}[]} `value` em 0..1
 */
export function computeRadarAxes(stats) {
    const s = stats || {};
    return RADAR_AXES.map((axis) => {
        const raw = axis.statKeys.reduce((sum, k) => {
            const n = Number(s[k]);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const value = Math.max(0, Math.min(1, raw / axis.reference));
        return {id: axis.id, label: axis.label, raw, value};
    });
}
