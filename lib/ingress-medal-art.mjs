/**
 * Resolve a arte de uma medalha em `public/ingress/medals/`, baixada do
 * ingress.plus por `scripts/ingress.mjs medals --fetch`. `slug` é o mesmo do
 * catálogo (`data/ingress/badge-catalog.json`). Se o arquivo não existe,
 * `BadgeMedal`/`TierLadder` caem no hexágono com a inicial.
 *
 * Sobre direito autoral: arte da Niantic, uso tolerado pela comunidade Ingress,
 * decisão do dono do site — o código funciona sem as imagens.
 */
import {existsSync} from 'node:fs'
import {join} from 'node:path'
import {artPath} from './ingress-art.mjs'
import {BADGES} from './ingress-badges.mjs'

const DIR = join(process.cwd(), 'public', 'ingress', 'medals')

/**
 * Caminho público da arte da medalha, ou `null` se o PNG não existe.
 * `tier` = um dos 5 (badge de contagem) ou `null`/`'single'` (badge de imagem
 * única). `tier: 'none'` (sem medalha) → `null`.
 */
export function medalArt(slug, tier) {
    if (tier === 'none') return null
    const rel = artPath(slug, tier)
    return existsSync(join(DIR, rel.replace('/ingress/medals/', ''))) ? rel : null
}

/** Os 130 nomes de arquivo possíveis (26 badges × 5 tiers), para o CLI. */
export function expectedMedalFiles() {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'onyx']
    return BADGES.flatMap((b) => tiers.map((t) => `${b.slug}-${t}.png`))
}
