/**
 * Núcleo puro da aba "Estatísticas para Nerds" de `/ingress/ranking` — recebe
 * TODAS as linhas de `casara.ingress_rankings` (sem `LIMIT`, ao contrário da
 * tabela principal) e agrega tudo em Node, reaproveitando `computeStatTiers`/
 * `RADAR_AXES` já existentes em vez de duplicar limiares de tier em SQL. Sem
 * I/O — chamado por `app/(ingress)/ingress/ranking/page.tsx` (SSR), testado aqui via
 * `node --test`.
 *
 * Formato de linha esperado (mesmas colunas de `casara.ingress_rankings`,
 * snake_case — mesma convenção de `RankingRow` em `IngressRankingTable.tsx`):
 * `{codename_key, codename, faction, lifetime_ap, overall_score, axis_scores,
 * stat_values, recursions, extra_stats, months_subscribed, created_at}`.
 */
import {computeStatTiers} from './ingress-tier-score.mjs'
import {BADGES, computeBadge} from '../catalog/ingress-badges.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'
import {RADAR_STAT_KEYS} from '../ranking/ingress-compare-message.mjs'

/** `statKey` (export do app) -> definição da badge do catálogo, quando existe uma — nem todo stat medido tem badge (ex.: `portalsNeutralized`, `apolloTokens`). */
const BADGE_BY_STAT_KEY = Object.fromEntries(BADGES.map((b) => [b.statKey, b]))

/**
 * Badge (slug + tier alcançado) de `value` para `statKey`, ou `null` se esse stat não tem badge no catálogo.
 * `onyxMultiple` = quantas vezes `value` bateu o limiar de Onyx (`beyond.multiple` de `computeBadge`);
 * `null` enquanto o valor não chegou ao Onyx.
 */
function badgeFor(statKey, value) {
    const def = BADGE_BY_STAT_KEY[statKey]
    if (!def) return null
    const badge = computeBadge(def, value)
    return {badgeSlug: def.slug, tier: badge.tier, onyxMultiple: badge.beyond?.multiple ?? null}
}

/** Anexa a `record` a badge/tier/`onyxMultiple` do recordista — tudo `null` quando o stat não tem badge no catálogo. */
function withBadge(statKey, record) {
    if (!record) return null
    const badge = badgeFor(statKey, record.value)
    return {
        ...record,
        badgeSlug: badge?.badgeSlug ?? null,
        tier: badge?.tier ?? null,
        onyxMultiple: badge?.onyxMultiple ?? null,
    }
}

/**
 * Bandas do histograma de `overall_score` — 6 faixas de 20 pontos (`max` fixo)
 * mais uma faixa aberta "Onyx+" pra quem passou de 120 (agente recursado,
 * `tierPosition` pode estender indefinidamente além do Onyx). Meio-aberto
 * `[min, max)`, exceto a última (`max: null`, sem teto).
 */
const OVERALL_SCORE_BANDS = [
    {label: 'Abaixo de Bronze', min: 0, max: 20},
    {label: 'Bronze', min: 20, max: 40},
    {label: 'Silver', min: 40, max: 60},
    {label: 'Gold', min: 60, max: 80},
    {label: 'Platinum', min: 80, max: 100},
    {label: 'Onyx', min: 100, max: 120},
    {label: 'Onyx+', min: 120, max: null},
]

const TIER_KEYS = ['bronze', 'silver', 'gold', 'platinum', 'onyx']
const FACTIONS = ['enlightened', 'resistance']

/**
 * P1 — totais da comunidade. `badgeTiersGranted` soma os tiers atingidos nos
 * 12 stats do radar entre todos os agentes, excluindo `'none'` (MED-01: uma
 * badge sem tier existe, mas não é "medalha concedida"). `onyxClubCount` só
 * conta agente com os 12/12 stats em onyx simultaneamente.
 * @param {Record<string, unknown>[]} rows
 * @returns {{totalAgents:number, totalLifetimeAp:number, badgeTiersGranted:Record<string,number>, onyxBadgesGranted:number, onyxClubCount:number}}
 */
export function computeCommunityTotals(rows) {
    const totalAgents = rows.length
    let totalLifetimeAp = 0
    const badgeTiersGranted = Object.fromEntries(TIER_KEYS.map((t) => [t, 0]))
    let onyxClubCount = 0

    for (const row of rows) {
        totalLifetimeAp += Number(row.lifetime_ap) || 0

        const tiers = computeStatTiers(row.stat_values)
        let onyxCountForAgent = 0
        for (const key of RADAR_STAT_KEYS) {
            const tier = tiers[key]?.tier
            if (tier && tier !== 'none') {
                badgeTiersGranted[tier] += 1
                if (tier === 'onyx') onyxCountForAgent += 1
            }
        }
        if (onyxCountForAgent === RADAR_STAT_KEYS.length) onyxClubCount += 1
    }

    return {
        totalAgents,
        totalLifetimeAp,
        badgeTiersGranted,
        onyxBadgesGranted: badgeTiersGranted.onyx,
        onyxClubCount,
    }
}

/** Conta agentes de `rows` com os 12 stats do radar em tier onyx entre `agents` — reaproveitado por `computeFactionComparison`. */
function countOnyxBadges(agents) {
    let onyxBadges = 0
    for (const row of agents) {
        const tiers = computeStatTiers(row.stat_values)
        for (const key of RADAR_STAT_KEYS) {
            if (tiers[key]?.tier === 'onyx') onyxBadges += 1
        }
    }
    return onyxBadges
}

/**
 * P2 — comparativo por facção. Facção sem nenhum agente devolve zeros, nunca
 * omite a chave (o comparativo divergente precisa das duas linhas mesmo
 * zeradas — ver NERD-13).
 * @param {Record<string, unknown>[]} rows
 * @returns {Record<'enlightened'|'resistance', {agentCount:number, totalAp:number, avgOverallScore:number, onyxBadges:number}>}
 */
export function computeFactionComparison(rows) {
    const result = {}
    for (const faction of FACTIONS) {
        const agents = rows.filter((r) => r.faction === faction)
        const agentCount = agents.length
        const totalAp = agents.reduce((sum, r) => sum + (Number(r.lifetime_ap) || 0), 0)
        const avgOverallScore =
            agentCount === 0 ? 0 : agents.reduce((sum, r) => sum + (Number(r.overall_score) || 0), 0) / agentCount
        result[faction] = {agentCount, totalAp, avgOverallScore, onyxBadges: countOnyxBadges(agents)}
    }
    return result
}

/**
 * P3 — médias, distribuição de `overall_score` e ficha média da comunidade.
 * `recursions` só entre agentes com o campo preenchido (`IS NOT NULL`) —
 * ausência nunca vira 0 na média/máximo.
 * @param {Record<string, unknown>[]} rows
 * @returns {{avgApPerAgent:number, overallScoreHistogram:{label:string,min:number,max:number|null,count:number}[], communityAxisAverage:Record<string,number>, recursions:{avg:number|null,max:number|null,reportedCount:number}}}
 */
export function computeAveragesSection(rows) {
    const totalAgents = rows.length
    const totalAp = rows.reduce((sum, r) => sum + (Number(r.lifetime_ap) || 0), 0)
    const avgApPerAgent = totalAgents === 0 ? 0 : totalAp / totalAgents

    const overallScoreHistogram = OVERALL_SCORE_BANDS.map((band) => ({
        ...band,
        count: rows.filter((r) => {
            const score = Number(r.overall_score) || 0
            return score >= band.min && (band.max === null || score < band.max)
        }).length,
    }))

    const communityAxisAverage = {}
    for (const axis of RADAR_AXES) {
        const values = rows.map((r) => Number(r.axis_scores?.[axis.id]) || 0)
        communityAxisAverage[axis.id] = values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
    }

    const withRecursions = rows.filter((r) => r.recursions !== null && r.recursions !== undefined)
    const recursions = {
        avg:
            withRecursions.length === 0
                ? null
                : withRecursions.reduce((sum, r) => sum + Number(r.recursions), 0) / withRecursions.length,
        max: withRecursions.length === 0 ? null : Math.max(...withRecursions.map((r) => Number(r.recursions))),
        reportedCount: withRecursions.length,
    }

    return {avgApPerAgent, overallScoreHistogram, communityAxisAverage, recursions}
}

/** `true` se `a` é mais antigo que `b` (desempate por `created_at`, mesmo critério de `compareRankingRows`). */
function isOlder(a, b) {
    return new Date(a.created_at).getTime() < new Date(b.created_at).getTime()
}

/** Monta o objeto de recorde público a partir da linha vencedora — sempre carrega facção/país, pro nick vir identificado (cor de facção, emblema, bandeira) em qualquer lista de recordes. */
function toRecord(row, value) {
    return {
        codenameKey: row.codename_key,
        codename: row.codename,
        faction: row.faction,
        countryCode: row.country_code ?? null,
        value,
    }
}

/**
 * Recorde entre `rows` pelo valor de `getValue`, tratando chave ausente/não
 * numérica como 0 (mesmo comportamento de `computeStatTiers`/`computeBadge` —
 * nunca exclui o agente da disputa). Usado para os 12 stats do radar e AP.
 */
function pickRecordCoerceZero(rows, getValue) {
    let best = null
    for (const row of rows) {
        const value = Number(getValue(row)) || 0
        if (best === null || value > best.value || (value === best.value && isOlder(row, best.row))) {
            best = {row, value}
        }
    }
    return best ? toRecord(best.row, best.value) : null
}

/**
 * Recorde entre `rows` pelo valor de `getValue`, EXCLUINDO agentes com valor
 * ausente/não numérico da disputa (nunca vira 0) — usado para `recursions` e
 * pros eventos sazonais, campos genuinamente "não informados" quando ausentes.
 */
function pickRecordExcludeMissing(rows, getValue) {
    let best = null
    for (const row of rows) {
        const raw = getValue(row)
        if (raw === null || raw === undefined) continue
        const value = Number(raw)
        if (!Number.isFinite(value)) continue
        if (best === null || value > best.value || (value === best.value && isOlder(row, best.row))) {
            best = {row, value}
        }
    }
    return best ? toRecord(best.row, best.value) : null
}

/**
 * Stats com badge no catálogo que NÃO fazem parte do radar (não vêm de
 * `stat_values`, vêm de `extra_stats` — balde solto pra tudo do export sem
 * eixo/coluna dedicado, ver migration 006). Cada uma tem medalha real, então
 * merece hall da fama igual às 12 do radar; a diferença é só a fonte do
 * valor e o tratamento de ausência (aqui exclui, nunca vira 0 — `extra_stats`
 * é informativo e pode faltar até em agentes que jogam muito).
 */
export const HALL_OF_FAME_EXTRA_KEYS = [
    'portalsCaptured',
    'uniquePortalsCaptured',
    'longestSojournerStreak',
    'oprAgreements',
    'portalScansUploaded',
    'uniquesScoutControlled',
    'maxTimePortalHeldDays',
    'missionDaysAttended',
    'droneHacks',
    'machinaPortalsReclaimed',
    'completedHackstreaks',
]

/**
 * P4 — hall da fama. Maior valor vence; empate exato resolvido pelo agente
 * com `created_at` mais antigo (mesmo critério de desempate do ranking
 * principal, `compareRankingRows`). Cada stat carrega a badge/tier que o
 * próprio recordista atingiu nesse stat (quando existe badge pra ele —
 * `portalsNeutralized` é sintético, sem badge própria), pro ícone da medalha
 * aparecer na cor certa em vez de um genérico, e `onyxMultiple` (quantas vezes
 * ele bateu o limiar de Onyx daquela medalha; `null` abaixo do Onyx ou sem
 * badge). Cobre os 12 stats do radar
 * (de `stat_values`, ausência vira 0) mais os `HALL_OF_FAME_EXTRA_KEYS` (de
 * `extra_stats`, ausência EXCLUI o agente da disputa — dado opcional).
 * @param {Record<string, unknown>[]} rows
 * @returns {{perStat:Record<string,{codenameKey:string,codename:string,faction:string,countryCode:string|null,value:number,badgeSlug:string|null,tier:string|null,onyxMultiple:number|null}|null>, lifetimeAp:object|null, recursions:object|null}}
 */
export function computeHallOfFame(rows) {
    const perStat = {}
    for (const key of RADAR_STAT_KEYS) {
        perStat[key] = withBadge(key, pickRecordCoerceZero(rows, (r) => r.stat_values?.[key]))
    }
    for (const key of HALL_OF_FAME_EXTRA_KEYS) {
        perStat[key] = withBadge(key, pickRecordExcludeMissing(rows, (r) => r.extra_stats?.[key]))
    }
    const lifetimeAp = pickRecordCoerceZero(rows, (r) => r.lifetime_ap)
    const recursions = pickRecordExcludeMissing(rows, (r) => r.recursions)
    return {perStat, lifetimeAp, recursions}
}

/**
 * As chaves de `extra_stats` que compõem "engajamento em eventos sazonais"
 * (NERD-24). `apolloTokens`/`apolloModBattlePoints` saíram de propósito — são
 * de uma anomalia sazonal que vai parar de aparecer no export; `nl1331MeetupsAttended`
 * entrou no lugar (evento recorrente, igual First/Second Saturday/Sunday).
 */
export const SEASONAL_ENGAGEMENT_KEYS = [
    'firstSaturdayEvents',
    'secondSundayEvents',
    'clearFieldsEvents',
    'battleBeaconCombatant',
    'nl1331MeetupsAttended',
    'seerPoints',
    'xmRecharged',
    'agentsRecruited',
]

/**
 * P5 — engajamento em eventos sazonais. Cada chave é lida de `extra_stats`
 * (JSONB solto, nunca validado no POST) — ausência OU valor não-numérico
 * exclui o agente do somatório E do divisor daquela métrica especificamente,
 * nunca vira 0 (um export incompleto não pode arrastar a soma/amostra pra
 * baixo artificialmente). `top` é o "recordista" daquela métrica entre quem
 * informou (mesmo critério de desempate do hall da fama); `badgeSlug` só
 * existe pras 6 das 9 chaves que têm badge real no catálogo (as outras 3 —
 * `battleBeaconCombatant`/`apolloTokens`/`apolloModBattlePoints` — não têm).
 * @param {Record<string, unknown>[]} rows
 * @returns {Record<string, {sum:number, reportedCount:number, badgeSlug:string|null, top:object|null}>}
 */
export function computeSeasonalEngagement(rows) {
    const result = {}
    for (const key of SEASONAL_ENGAGEMENT_KEYS) {
        let sum = 0
        let reportedCount = 0
        for (const row of rows) {
            const raw = row.extra_stats?.[key]
            if (raw === undefined || raw === null) continue
            const value = Number(raw)
            if (!Number.isFinite(value)) continue
            sum += value
            reportedCount += 1
        }
        const top = pickRecordExcludeMissing(rows, (r) => r.extra_stats?.[key])
        result[key] = {sum, reportedCount, badgeSlug: BADGE_BY_STAT_KEY[key]?.slug ?? null, top}
    }
    return result
}

/**
 * P6 — assinatura paga. `hasData: false` só quando NENHUM agente tem
 * `months_subscribed` preenchido (linhas anteriores à migration 009).
 * Percentual é `agentes com months_subscribed > 0` sobre `agentes com
 * months_subscribed IS NOT NULL` — nunca sobre o total geral. `reportedCount`
 * é esse mesmo divisor (agentes que informaram, inclusive com 0 meses) e `top`
 * o assinante com mais meses (empate: `created_at` mais antigo).
 * @param {Record<string, unknown>[]} rows
 * @returns {{hasData:boolean, reportedCount:number, percentSubscribed:number|null, avgMonthsAmongSubscribed:number|null, top:object|null}}
 */
export function computeSubscription(rows) {
    const withData = rows.filter((r) => r.months_subscribed !== null && r.months_subscribed !== undefined)
    if (withData.length === 0) {
        return {hasData: false, reportedCount: 0, percentSubscribed: null, avgMonthsAmongSubscribed: null, top: null}
    }

    const subscribed = withData.filter((r) => Number(r.months_subscribed) > 0)
    const percentSubscribed = (subscribed.length / withData.length) * 100
    const avgMonthsAmongSubscribed =
        subscribed.length === 0
            ? null
            : subscribed.reduce((sum, r) => sum + Number(r.months_subscribed), 0) / subscribed.length

    // `top` só entre assinantes de fato: sem ninguém com meses > 0 não há recordista
    // (0 meses "vencendo" com 0 seria um recorde de mentira).
    const top = subscribed.length === 0 ? null : pickRecordExcludeMissing(subscribed, (r) => r.months_subscribed)

    return {hasData: true, reportedCount: withData.length, percentSubscribed, avgMonthsAmongSubscribed, top}
}

/**
 * P7 — agentes e AP por país, separados por facção (o filtro Enlightened/
 * Resistance dos gráficos é aplicado no cliente, por `rankCountries`). Linha
 * sem `country_code` (coluna nullable, ver migration 003) não vira um país
 * "desconhecido": só entra em `withoutCountryCount`, pra UI avisar quantos
 * agentes ficaram de fora em vez de deixá-los puxar o gráfico.
 * @param {Record<string, unknown>[]} rows
 * @returns {{countries:{code:string, enlightened:{agentCount:number,totalAp:number}, resistance:{agentCount:number,totalAp:number}}[], withoutCountryCount:number}}
 */
export function computeCountryBreakdown(rows) {
    const byCode = new Map()
    let withoutCountryCount = 0

    for (const row of rows) {
        const code = row.country_code
        if (!code) {
            withoutCountryCount += 1
            continue
        }
        if (!FACTIONS.includes(row.faction)) continue
        if (!byCode.has(code)) {
            byCode.set(code, {
                code,
                enlightened: {agentCount: 0, totalAp: 0},
                resistance: {agentCount: 0, totalAp: 0},
            })
        }
        const bucket = byCode.get(code)[row.faction]
        bucket.agentCount += 1
        bucket.totalAp += Number(row.lifetime_ap) || 0
    }

    return {countries: [...byCode.values()], withoutCountryCount}
}

/**
 * Orquestrador — chamado por `app/(ingress)/ingress/ranking/page.tsx` (SSR) com TODAS
 * as linhas de `casara.ingress_rankings` (sem `LIMIT`) e o total de envios já
 * contado (`COUNT(*)` de `casara.ingress_ranking_history`). `rows.length ===
 * 0` não é tratado como caso especial aqui: cada função das seções já devolve
 * zeros/`null` para lista vazia, então o objeto final sai coerente sem
 * exceção — quem decide exibir o estado vazio é a UI (P1 AC7).
 * @param {Record<string, unknown>[]} rows
 * @param {number} totalSubmissions
 * @returns {{totals:object, byFaction:object, averages:object, hallOfFame:object, seasonalEngagement:object, subscription:object}}
 */
export function computeNerdStats(rows, totalSubmissions) {
    return {
        totals: {...computeCommunityTotals(rows), totalSubmissions},
        byFaction: computeFactionComparison(rows),
        averages: computeAveragesSection(rows),
        hallOfFame: computeHallOfFame(rows),
        seasonalEngagement: computeSeasonalEngagement(rows),
        subscription: computeSubscription(rows),
        byCountry: computeCountryBreakdown(rows),
    }
}
