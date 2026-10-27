/**
 * Tags e janelas do cache de leitura do `/ingress/ranking`.
 *
 * A página era `force-dynamic` e fazia ~5 queries por render — inclusive para
 * bots e previews de link, que não gravam `page_view`. Como o compute do Neon
 * só suspende após 5 min sem query, cada um desses renders custava no mínimo
 * 5 min de compute. Agora a página é ISR e as queries passam pelo Data Cache:
 *
 * - `INGRESS_RANKING_TAG` (primeira página, top 50 do JSON-LD, radar de
 *   atividade, contador da OG): muda a cada envio de agente;
 * - `INGRESS_NERD_STATS_TAG` (estatísticas para nerds): lê TODAS as linhas,
 *   e um minuto de atraso nessas médias não muda nada para quem lê.
 *
 * `POST /api/ingress-rankings` invalida as duas a cada escrita real, então as
 * janelas abaixo só valem quando ninguém envia nada — o que é quase sempre.
 * `POST /api/revalidate` aceita as duas, para `ingress-rescore.mjs`.
 */
export const INGRESS_RANKING_TAG = 'ingress-ranking'
export const INGRESS_NERD_STATS_TAG = 'ingress-nerd-stats'

/** Igual ao `s-maxage=60` dos `GET /api/ingress-rankings*`. */
export const INGRESS_RANKING_REVALIDATE_S = 60
export const INGRESS_NERD_STATS_REVALIDATE_S = 900
