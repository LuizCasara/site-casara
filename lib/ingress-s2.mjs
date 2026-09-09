/**
 * Cobertura de células S2 de uma viewport, isolada do mapa (o `S2Explorer` só
 * consome o resultado). S2 é geometria open-source do Google — nada de dado da
 * Niantic. Todo o uso de `s2js` mora aqui.
 */

import {s2} from 's2js';

const {RegionCoverer, Rect, LatLng, Cell, cellid} = s2;

export const LEVEL_RANGE = {min: 6, max: 16, default: 12};

const RAD2DEG = 180 / Math.PI;

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function ringOf(id) {
    const cell = Cell.fromCellID(id);
    const ring = [0, 1, 2, 3].map((i) => {
        const ll = LatLng.fromPoint(cell.vertex(i));
        return [ll.lat * RAD2DEG, ll.lng * RAD2DEG];
    });
    return {token: cellid.toToken(id), ring};
}

/**
 * Células S2 de nível `level` que cobrem a bbox. Um `RegionCoverer` limitado por
 * `cap` faz a cobertura grossa (níveis <= level, rápido mesmo numa bbox enorme);
 * em seguida uma BFS subdivide até `level`, parando ao atingir `cap` — é assim
 * que uma viewport afastada demais nunca gera milhares de polígonos.
 *
 * @param {{north:number, south:number, east:number, west:number}} bounds — graus
 * @param {number} level — nível de célula S2 alvo
 * @param {{cap?:number}} [opts]
 * @returns {{token:string, ring:[number,number][]}[]} anéis de borda (lat,lng em graus)
 */
export function coverViewport(bounds, level, opts = {}) {
    const cap = opts.cap ?? 400;
    const lvl = Math.round(clamp(level, LEVEL_RANGE.min, LEVEL_RANGE.max));

    let rect = Rect.fromLatLng(LatLng.fromDegrees(bounds.south, bounds.west));
    rect = rect.addPoint(LatLng.fromDegrees(bounds.north, bounds.east));

    const coverer = new RegionCoverer({maxLevel: lvl, maxCells: cap});
    const queue = [...coverer.covering(rect)];

    const out = [];
    const seen = new Set();
    for (let i = 0; i < queue.length && out.length < cap; i++) {
        const id = queue[i];
        if (cellid.level(id) >= lvl) {
            const token = cellid.toToken(id);
            if (!seen.has(token)) {
                seen.add(token);
                out.push(ringOf(id));
            }
        } else {
            for (const child of cellid.children(id)) queue.push(child);
        }
    }
    return out;
}
