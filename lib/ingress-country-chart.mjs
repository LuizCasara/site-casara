/**
 * Ranking de países para os dois gráficos da seção "Países" das estatísticas
 * para nerds (agentes por país, AP por país). Puro e sem I/O — roda no cliente
 * a cada troca do filtro de facção, sobre o `countries` que
 * `computeCountryBreakdown` (lib/ingress-nerd-stats.mjs) já entregou pronto.
 * Vive num módulo à parte de propósito: aquele arrasta o catálogo de badges
 * inteiro, e o bundle do cliente não precisa dele só pra ordenar barras.
 */

const DEFAULT_LIMIT = 10

/** `metric` -> campo da facção que o gráfico soma. */
const METRIC_FIELD = {agents: 'agentCount', ap: 'totalAp'}

/**
 * @param {{code:string, enlightened:{agentCount:number,totalAp:number}, resistance:{agentCount:number,totalAp:number}}[]} countries
 * @param {{metric:'agents'|'ap', faction:'all'|'enlightened'|'resistance', limit?:number}} options
 * @returns {{rows:{code:string,enlightened:number,resistance:number,value:number}[], others:{countryCount:number,enlightened:number,resistance:number,value:number}|null, max:number}}
 *   `enlightened`/`resistance` de cada linha já vêm zerados na facção que o
 *   filtro exclui, então a barra empilhada só desenha o que foi pedido.
 *   `max` é a escala das barras e inclui "Outros" — que pode somar mais que
 *   qualquer país isolado. Empate: o critério de desempate é a outra métrica
 *   (AP no de agentes, agentes no de AP) e, por último, o código do país.
 */
export function rankCountries(countries, {metric, faction, limit = DEFAULT_LIMIT}) {
    const field = METRIC_FIELD[metric]
    const tieField = metric === 'agents' ? 'totalAp' : 'agentCount'
    const includeEnl = faction !== 'resistance'
    const includeRes = faction !== 'enlightened'

    const scored = []
    for (const c of countries) {
        const enlAgents = includeEnl ? c.enlightened.agentCount : 0
        const resAgents = includeRes ? c.resistance.agentCount : 0
        if (enlAgents + resAgents === 0) continue

        const enlightened = includeEnl ? c.enlightened[field] : 0
        const resistance = includeRes ? c.resistance[field] : 0
        const tie = (includeEnl ? c.enlightened[tieField] : 0) + (includeRes ? c.resistance[tieField] : 0)
        scored.push({code: c.code, enlightened, resistance, value: enlightened + resistance, tie})
    }

    scored.sort((a, b) => b.value - a.value || b.tie - a.tie || a.code.localeCompare(b.code))

    const rows = scored.slice(0, limit).map(({code, enlightened, resistance, value}) => ({code, enlightened, resistance, value}))
    const rest = scored.slice(limit)
    const others =
        rest.length === 0
            ? null
            : {
                  countryCount: rest.length,
                  enlightened: rest.reduce((sum, r) => sum + r.enlightened, 0),
                  resistance: rest.reduce((sum, r) => sum + r.resistance, 0),
                  value: rest.reduce((sum, r) => sum + r.value, 0),
              }

    const max = Math.max(0, ...rows.map((r) => r.value), others?.value ?? 0)
    return {rows, others, max}
}
