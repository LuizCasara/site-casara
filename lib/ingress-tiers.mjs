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
