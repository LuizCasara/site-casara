/**
 * Constantes puras dos 5 tiers de medalha — sem I/O, sem dependência do
 * catálogo. Vive separado de `ingress-badges.mjs` (que lê `badge-catalog.json`
 * do disco) para os componentes client poderem importar daqui sem arrastar
 * `node:fs` para o bundle do navegador.
 */

/** Os 5 tiers de uma badge de contagem, do menor para o maior. */
export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']

/** Peso numérico de cada tier para comparar/ordenar (`none` = 0). */
export const TIER_RANK = {none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, onyx: 5}

export const TIER_LABELS = {
    none: 'Sem medalha',
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
    onyx: 'Onyx',
    single: 'Evento',
}

/**
 * Cor de cada tier — pontos de gráfico e selos. `single` = medalha de evento
 * (imagem única, sem escala). Fonte única; antes `TIER_COLOR` estava copiado
 * (e já divergindo) em MedalSpark/MedalDetail/AchievementTimeline.
 */
export const TIER_COLOR = {
    bronze: '#d08a4e',
    silver: '#9aa4ac',
    gold: '#ffd24a',
    platinum: '#6b7280',
    onyx: '#0c0f14',
    single: '#26b6ff',
}

/** Nomes oficiais em inglês — mesmas chaves de `TIER_LABELS`. */
export const TIER_LABELS_EN = {
    none: 'No medal',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    onyx: 'Onyx',
    single: 'Event',
}

/**
 * Rótulo de um tier no idioma pedido (ISTATS-19) — aditivo: `TIER_LABELS`
 * continua exportado como está para quem ainda não migrou pro bilíngue.
 *
 * `tier` é tipado como `string` (não o `keyof typeof TIER_LABELS` mais estrito)
 * porque a maioria dos call sites (linha do tempo, escada de tiers, detalhe de
 * medalha) traz o valor de campos de dados já tipados como `string` — a chave
 * é sempre válida em runtime, mas apertar o tipo aqui só empurraria `as`/`any`
 * pra cada um desses call sites.
 * @param {string} tier
 * @param {'pt'|'en'} lang
 * @returns {string}
 */
export function tierLabel(tier, lang) {
    return lang === 'en' ? (TIER_LABELS_EN[tier] ?? tier) : (TIER_LABELS[tier] ?? tier)
}
