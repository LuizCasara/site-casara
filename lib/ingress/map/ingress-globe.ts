/**
 * Dados e matemática do globo do hero de `/ingress` (`components/ingress/HeroGlobe.tsx`).
 * Nada de DOM aqui — só o bitmap de terra e geração determinística da cena.
 *
 * O bitmap: Natural Earth 110m `land`, rasterizado num grid equirretangular
 * 1-bit de 180x90 (2°), ~2 KB em base64. Gerado uma vez; se precisar
 * regerar, ver `docs/ingress-*` / histórico do PR.
 */

export type Vec3 = [number, number, number]

export const MASK_W = 180
export const MASK_H = 90
const MASK_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf4AP/AAAAAAAAAAAAAAAAAAAAAAAAX/z///+AAAAAAAABAAAAAAAAAAAAAYd8P///wAA+AAAAAA8AAAAAAAAAAAwAnw////4AAIAAAAAAGAAAAAAAAAAADivwAf//wAAAAADAAf/wAHYAAAAAADoi3sAP//gAAAAAMAD///sAAAAgBgACfwz/AD/+gAAAwAEHf///+/8gBAP/7/nJdjwD/+AAAH/AA7f///////f4P//////h8H/gAAAf/6//f////////Mf/////9H4D8AeAA+ev///////////AP/////4A0B4AAAD5/////////////Af3////gHgA4AAAH5///////////LwAHgH///gHkAAAAAH4/////////+CIAABAB///4D+AAAAGCx/////////4A8AAIAAf///n/gAAAOCD/////////wA4AAAAAf///n/wAAAbP///////////AgAAAAAP/////wAAADf//////////9AAAAAAAF////0YAAAB///////////9AAAAAAAD////8EAAAB///////////5AAAAAAAD////2AAAAB/f5fP//////wAAAAAAAD////gAAAAfxnwPP//////jAAAAAAAD////AAAAAPCb3/n/////+CAAAAAAAD///8AAAAAfALf/n////+ECAAAAAAAB///8AAAAAGHQP/n/////mMAAAAAAAA///8AAAAAH+Ai///////E8AAAAAAAAf//wAAAAAP/AA///////BgAAAAAAAAP//gAAAAAf/73///////gAAAAAAAAAD/AQAAAAAf////f/////gAAAAAAAAAF+AQAAAAB///+/n/////AAAAAAAAAAC+AAAAAAB///+f0H////AAAAAAAAAAAeAwAAAAD////f/B///8gAAAAAAAAAAeGEAAAAH////v+B/z/AAAAAAAAAAAAPMAgAAAD////n+A/B+gAAAAAAAAAAAD8AAAAAD////n4AeB/AgAAAAAAAAAAAPAAAAAH////3gAcAfAgAAAAAAAAAAADAAAAAD////6AAcAfggAAAAAAAAAAABDwAAAD////8wAMATAIAAAAAAAAAAAAr/AAAB/////gAKASAAAAAAAAAAAAAAH/gAAA/////gACAAAIAAAAAAAAAAAAH/8AAAaH///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAUOAAAAAAAAAAAAAP/+AAAAB//8AAAAYegAAAAAAAAAAAAP//gAAAD//4AAAAMeBgAAAAAAAAAAAP//8AAAB//wAAAAGdiuAAAAAAAAAAAf///AAAA//wAAAACAQHgAAAAAAAAAAP///gAAA//wAAAABwAHwgAAAAAAAAAH///AAAA//wAAAAACIDQIAAAAAAAAAH//+AAAAf/wAAAAAAAAAAAAAAAAAAAD//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//wgAAAAAPxgBAAAAAAAAAA//8AAAA//jgAAAAAf5gAAAAAAAAAAAf/8AAAA//DgAAAAAf/gAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/wAAAAf/DAAAAAH//4AAAAAAAAAAAf/AAAAAf+CAAAAAH//8AAAAAAAAAAAf/AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAD//+AAAAAAAAAAA/8AAAAAHwAAAAAADwf8AAAAAAAAAAA/gAAAAAAAAAAAAACAH4AIAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB+AAAAAAAAAAAAAAAAAAAGAAAAAAAAB6AAAAAAAAAAAAAAAAAwAMAAAAAAAAA8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAAAwAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAACAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAeAAIP+f/gAAAAAAAAAAAMAAAAAAABP/+H//////AAAAAAAAAAA+AAAAAf////8////////AAAAAAAOEAPAAAB///////////////gAAAP//T//8AAAH//////////////+AAAH/////4AAAH///////////////8AAE//////4ABw////////////////8AAAD//////gCA////////////////wAAAf/////////////////////////+A/4A///////////////////////////////////////////////////////////////////////////////////////'

let _mask: Uint8Array | null = null
function mask(): Uint8Array {
  if (_mask) return _mask
  const bin = atob(MASK_B64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  _mask = arr
  return arr
}

/** `true` se o ponto (graus) cai em terra no bitmap. Longitude dá a volta. */
export function isLand(lat: number, lng: number): boolean {
  const i = ((Math.floor(((lng + 180) / 360) * MASK_W) % MASK_W) + MASK_W) % MASK_W
  const j = Math.floor(((90 - lat) / 180) * MASK_H)
  if (j < 0 || j >= MASK_H) return false
  const b = j * MASK_W + i
  return ((mask()[b >> 3] >> (7 - (b & 7))) & 1) === 1
}

/** Ponto de terra com pelo menos um vizinho no mar a `d` graus — a "costa". */
export function isCoast(lat: number, lng: number, d: number): boolean {
  return (
    !isLand(lat + d, lng) ||
    !isLand(lat - d, lng) ||
    !isLand(lat, lng + d) ||
    !isLand(lat, lng - d)
  )
}

export const TILT = (-15 * Math.PI) / 180
export const COLOR = {
  green: [0, 230, 118] as Vec3,
  cyan: [38, 182, 255] as Vec3,
  gold: [214, 182, 120] as Vec3,
}

export function llToVec(lat: number, lng: number): Vec3 {
  const la = (lat * Math.PI) / 180
  const lo = (lng * Math.PI) / 180
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)]
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/** PRNG determinística (mulberry32) — a cena é sempre a mesma entre loads. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Arc {
  a: number
  b: number
  green: boolean
  lift: number
  phase: number
}

export interface GlobeScene {
  /** Vetores unitários dos portais; índice 0 é o portal-casa. */
  vecs: Vec3[]
  /** Grau (nº de arcos) de cada portal. */
  degree: number[]
  /** Índices dos portais que participam de algum arco verde. */
  greenPortals: Set<number>
  arcs: Arc[]
  /** Triângulos (índices de `vecs`) dos campos verdes ancorados na casa. */
  fields: [number, number, number][]
}

/**
 * Portais numa fibonacci sphere (distribuição uniforme, sem amontoar) com leve
 * jitter, casa fixada em (0). Arcos: pares a distância angular média, grau
 * máximo 3 por portal; ~4 marcados como "verdes rasteiros" (os mais curtos +
 * os que tocam a casa). Dois campos verdes entre a casa e seus vizinhos.
 */
export function buildScene(home: {lat: number; lng: number}, count = 26, arcCount = 12): GlobeScene {
  const rnd = mulberry32(20260908)
  const golden = Math.PI * (3 - Math.sqrt(5))
  const ll: [number, number][] = []
  for (let k = 0; k < count; k++) {
    const y = 1 - ((k + 0.5) / count) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * k
    const lat = (Math.asin(y) * 180) / Math.PI
    let lng = (Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180) / Math.PI
    lng += (rnd() - 0.5) * 14
    ll.push([lat, lng])
  }
  ll[0] = [home.lat, home.lng]
  const vecs = ll.map(([a, b]) => llToVec(a, b))

  const arcs: Arc[] = []
  const degree = new Array(count).fill(0)
  let guard = 0
  while (arcs.length < arcCount && guard++ < 4000) {
    const a = (rnd() * count) | 0
    const b = (rnd() * count) | 0
    if (a === b || degree[a] >= 3 || degree[b] >= 3) continue
    const ang = (Math.acos(Math.max(-1, Math.min(1, dot(vecs[a], vecs[b]))) ) * 180) / Math.PI
    if (ang < 42 || ang > 150) continue
    if (arcs.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) continue
    arcs.push({a, b, green: false, lift: 0, phase: arcs.length * 0.19})
    degree[a]++
    degree[b]++
  }

  const angleOf = (x: Arc) =>
    Math.acos(Math.max(-1, Math.min(1, dot(vecs[x.a], vecs[x.b]))))
  const greenSet = new Set<number>()
  arcs.forEach((x, n) => {
    if (x.a === 0 || x.b === 0) greenSet.add(n)
  })
  ;[...arcs.keys()].sort((p, q) => angleOf(arcs[p]) - angleOf(arcs[q])).slice(0, 4).forEach((n) => greenSet.add(n))

  const greenPortals = new Set<number>()
  arcs.forEach((x, n) => {
    x.green = greenSet.has(n)
    x.lift = x.green ? 0.11 + (n % 3) * 0.03 : 0.3 + (n % 5) * 0.075
    if (x.green) {
      greenPortals.add(x.a)
      greenPortals.add(x.b)
    }
  })

  const near = [...vecs.keys()]
    .filter((k) => k !== 0)
    .sort((p, q) => dot(vecs[q], vecs[0]) - dot(vecs[p], vecs[0]))
    .slice(0, 3)
  const fields: [number, number, number][] = [
    [0, near[0], near[1]],
    [0, near[1], near[2]],
  ]

  return {vecs, degree, greenPortals, arcs, fields}
}
