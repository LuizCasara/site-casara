/**
 * As medalhas reais do Ingress são arte da Niantic — não há pacote com licença
 * aberta. A comunidade (biocards, trackers de stats, IITC) usa essas imagens há
 * mais de uma década sob tolerância de fato; num portfólio pessoal e sem fim
 * comercial, é uma escolha do dono do site.
 *
 * O site NÃO baixa nada automaticamente. O Luiz coloca os PNGs em
 * `public/ingress/medals/<key>-<tier>.png` (ver o README de lá). Se o arquivo
 * do tier atual existe, `BadgeMedal` mostra a arte real; se não, cai no
 * hexágono com a inicial. É incremental: cada PNG que entra melhora uma medalha.
 */
import {existsSync} from 'node:fs'
import {join} from 'node:path'
import {BADGES} from './ingress-badges.mjs'

const DIR = join(process.cwd(), 'public', 'ingress', 'medals')

/** Caminho público da arte da medalha `key` no `tier`, ou `null` se não houver arquivo. */
export function medalArt(key, tier) {
    if (!tier || tier === 'none') return null
    const file = `${key}-${tier}.png`
    return existsSync(join(DIR, file)) ? `/ingress/medals/${file}` : null
}

/** Todos os nomes de arquivo possíveis (14 badges × 5 tiers), para o CLI listar o que falta. */
export function expectedMedalFiles() {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'onyx']
    return BADGES.flatMap((b) => tiers.map((t) => `${b.key}-${t}.png`))
}
