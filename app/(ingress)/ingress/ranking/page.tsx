import type {Metadata} from 'next'
import {unstable_cache} from 'next/cache'
import {loadProfile} from '@/lib/ingress/profile/ingress'
import sql from '@/lib/global/db'
import {buildRankingPageQuery} from '@/lib/ingress/ranking/ingress-rankings.mjs'
import {computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers} from '@/lib/ingress/stats/ingress-tier-score.mjs'
import Panel from '@/components/ingress/shell/Panel'
import BackLink from '@/components/ingress/shell/BackLink'
import RankingHero from '@/components/ingress/stats/RankingHero'
import StatsRadarSection from '@/components/ingress/stats/StatsRadarSection'
import AxisExplanations from '@/components/ingress/stats/AxisExplanations'
import IngressRankingTabs from '@/components/ingress/stats/IngressRankingTabs'
import type {RankingRow} from '@/components/ingress/stats/IngressRankingTable'
import type {ActivityRow} from '@/components/ingress/stats/IngressActivityFeed'
import type {NerdStats} from '@/components/ingress/stats/IngressNerdStats'
import IngressTutorial from '@/components/ingress/stats/IngressTutorial'
import {computeNerdStats} from '@/lib/ingress/stats/ingress-nerd-stats.mjs'
import {
  INGRESS_NERD_STATS_REVALIDATE_S,
  INGRESS_NERD_STATS_TAG,
  INGRESS_RANKING_REVALIDATE_S,
  INGRESS_RANKING_TAG,
} from '@/lib/ingress/ranking/ingress-ranking-cache'

// ISR em vez de `force-dynamic`: bots e previews de link recebem HTML da CDN
// sem acordar o Neon. Literal porque o Next lê este export estaticamente; é o
// mesmo valor de `INGRESS_RANKING_REVALIDATE_S`. Um envio de agente invalida
// antes disso (ver `lib/ingress/ranking/ingress-ranking-cache.ts`).
export const revalidate = 60

const rankingCache = {tags: [INGRESS_RANKING_TAG], revalidate: INGRESS_RANKING_REVALIDATE_S}

/**
 * As queries abaixo passam pelo Data Cache e LANÇAM em caso de erro; o
 * `try/catch` que degrada para o estado vazio fica fora do cache, em `loadSafely`.
 * Se a degradação ficasse dentro, uma queda do banco seria cacheada como
 * "ranking vazio" pela janela inteira (15 min, no caso das estatísticas).
 */
async function loadSafely<T>(load: () => Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await load()
  } catch (err) {
    console.error(`[app/ingress/ranking] falha ao consultar ${what}:`, err)
    return fallback
  }
}

// Metadata em EN de propósito — ver o comentário em `app/(ingress)/ingress/layout.tsx`.
const TITLE = 'Ingress Agent Ranking — public stats comparison'
const DESCRIPTION =
  'Public, live ranking of Ingress (Niantic) agents: paste your stats export from the app and compare Access Points, recursions, resonators and other metrics with FencherLC and other registered agents.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: 'https://luizcasara.com/ingress/ranking',
  },
  openGraph: {
    type: 'website',
    url: 'https://luizcasara.com/ingress/ranking',
    siteName: 'Luiz Casara',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

/**
 * Página 1 do ranking (SSR), consultado direto no banco em vez de `fetch` pra
 * própria rota (evita um round-trip desnecessário no primeiro paint) — MESMA
 * query paginada de `GET /api/ingress-rankings` (via `buildRankingPageQuery`,
 * `lib/ingress/ranking/ingress-rankings.mjs`), página 1, ordenação/tamanho padrão. `total` é
 * o total REAL de agentes (sem busca/filtro aplicados) — usado tanto pela
 * tabela quanto pelo hero (`RankingHero totalAgents`), que antes da paginação
 * usava `initialRows.length` (capado em 100, e ficaria capado em 20 se
 * usasse só a página carregada).
 *
 * `casara.ingress_rankings` pode ainda não existir: a DDL de T1 é aplicada
 * manualmente no Neon SQL Editor, fora do controle deste código. Degrada pro
 * estado vazio (mesmo espírito do resto do site) em vez de derrubar a página.
 */
const loadRankingFirstPage = unstable_cache(async (): Promise<{rows: (RankingRow & {rank: number})[]; total: number}> => {
  const {text, values} = buildRankingPageQuery({page: 1, pageSize: 20});
  const rows = await sql.query(text, values);
  const total = rows.length > 0 ? Number((rows[0] as Record<string, unknown>).total_count) : 0;
  return {
    rows: rows.map((row) => ({
      codename_key: row.codename_key,
      codename: row.codename,
      faction: row.faction,
      lifetime_ap: Number(row.lifetime_ap),
      overall_score: Number(row.overall_score),
      axis_scores: row.axis_scores,
      stat_values: row.stat_values,
      stat_tiers: computeStatTiers(row.stat_values as Record<string, number>),
      country_code: row.country_code,
      recursions: row.recursions === null || row.recursions === undefined ? null : Number(row.recursions),
      created_at: row.created_at,
      updated_at: row.updated_at,
      rank: Number(row.rank),
    })) as (RankingRow & {rank: number})[],
    total,
  };
}, ['ingress:ranking-first-page'], rankingCache)

/**
 * Top 50 pro JSON-LD (`ItemList`), independente da paginação da tabela —
 * antes vinha de `loadInitialRows` (até 100 linhas), que agora só carrega 20
 * (página 1). Query isolada pra não reduzir o JSON-LD de 50 pra 20 itens.
 */
const loadTop50ForJsonLd = unstable_cache(async (): Promise<RankingRow[]> => {
  const rows = await sql`
    SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, country_code, recursions, created_at, updated_at
    FROM casara.ingress_rankings
    ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC
    LIMIT 50
  `;
  return rows.map((row) => ({
    codename_key: row.codename_key,
    codename: row.codename,
    faction: row.faction,
    lifetime_ap: Number(row.lifetime_ap),
    overall_score: Number(row.overall_score),
    axis_scores: row.axis_scores,
    stat_values: row.stat_values,
    stat_tiers: computeStatTiers(row.stat_values as Record<string, number>),
    country_code: row.country_code,
    recursions: row.recursions === null || row.recursions === undefined ? null : Number(row.recursions),
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as RankingRow[];
}, ['ingress:ranking-top50'], rankingCache)

/**
 * SSR direto no banco (mesmo espírito de `loadRankingFirstPage`) — mesma
 * query de `GET /api/ingress-rankings/activity`, evitando o round-trip no
 * primeiro paint da aba "Radar de atividade".
 */
const loadInitialActivity = unstable_cache(async (): Promise<ActivityRow[]> => {
  const rows = await sql`
    WITH deltas AS (
      SELECT
        codename_key,
        lifetime_ap,
        overall_score,
        recorded_at,
        LAG(lifetime_ap) OVER w AS prev_ap,
        LAG(overall_score) OVER w AS prev_score
      FROM casara.ingress_ranking_history
      WINDOW w AS (PARTITION BY codename_key ORDER BY recorded_at)
    )
    SELECT
      r.codename_key, r.codename, r.faction, r.country_code,
      d.lifetime_ap, d.overall_score, d.prev_ap, d.prev_score, d.recorded_at
    FROM deltas d
    JOIN casara.ingress_rankings r ON r.codename_key = d.codename_key
    WHERE d.prev_ap IS NULL OR d.lifetime_ap <> d.prev_ap OR d.overall_score <> d.prev_score
    ORDER BY d.recorded_at DESC
    LIMIT 100
  `;
  return rows.map((row) => {
    const isNewAgent = row.prev_ap === null;
    return {
      codename_key: row.codename_key,
      codename: row.codename,
      faction: row.faction,
      country_code: row.country_code,
      kind: isNewAgent ? 'novo_agente' : 'atualizacao',
      lifetime_ap: Number(row.lifetime_ap),
      overall_score: Number(row.overall_score),
      ap_delta: isNewAgent ? null : Number(row.lifetime_ap) - Number(row.prev_ap),
      score_delta: isNewAgent ? null : Number(row.overall_score) - Number(row.prev_score),
      recorded_at: row.recorded_at,
    };
  }) as ActivityRow[];
}, ['ingress:ranking-activity'], rankingCache)

/**
 * Estatísticas para nerds (aba estática, sem poll; cache de 15 min, ver
 * `INGRESS_NERD_STATS_TAG`) — busca TODAS as linhas de
 * `casara.ingress_rankings` (sem `LIMIT`, ao contrário de `loadRankingFirstPage`)
 * mais o total de envios de `casara.ingress_ranking_history`, e agrega tudo
 * de uma vez via `computeNerdStats` (lib/ingress/stats/ingress-nerd-stats.mjs). Mesmo
 * espírito de degradação de `loadRankingFirstPage`/`loadInitialActivity`.
 */
const loadNerdStats = unstable_cache(async (): Promise<NerdStats | null> => {
  const [rows, [{count}]] = await Promise.all([
    sql`
      SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values,
             country_code, recursions, extra_stats, months_subscribed, created_at
      FROM casara.ingress_rankings
    `,
    sql`SELECT COUNT(*)::int AS count FROM casara.ingress_ranking_history`,
  ]);
  return computeNerdStats(rows, count) as NerdStats;
}, ['ingress:nerd-stats'], {tags: [INGRESS_NERD_STATS_TAG], revalidate: INGRESS_NERD_STATS_REVALIDATE_S})

/**
 * `ItemList` schema.org com o top 50 do ranking, vindo de `loadTop50ForJsonLd`
 * — independente da paginação da tabela (`loadRankingFirstPage` só carrega
 * 20). Top 50 já cobre qualquer uso razoável (rich results, resumo por um
 * agente de IA).
 */
function buildRankingJsonLd(rows: RankingRow[]) {
  if (rows.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ranking de Agentes Ingress',
    description: DESCRIPTION,
    url: 'https://luizcasara.com/ingress/ranking',
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 50).map((row, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Thing',
        name: row.codename,
        additionalProperty: [
          {'@type': 'PropertyValue', name: 'Facção', value: row.faction},
          {'@type': 'PropertyValue', name: 'Access Points (lifetime)', value: row.lifetime_ap},
          {'@type': 'PropertyValue', name: 'Pontuação geral', value: row.overall_score},
        ],
      },
    })),
  }
}

export default async function IngressRankingPage() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <main className="ing-shell ing-shell--wide">
        <Panel label="Sinal perdido">
          <p style={{color: 'var(--ing-text-dim)'}}>
            O perfil do agente ainda não foi publicado. Volte em breve.
          </p>
        </Panel>
      </main>
    )
  }

  const axisScores = computeAxisScores(profile.stats)
  const overallScore = computeOverallScore(axisScores)
  const tier = overallTierLabel(axisScores)
  const axisScoreMap = Object.fromEntries(axisScores.map((a) => [a.id, a.score]))

  const [{rows: initialRows, total: initialTotal}, jsonLdRows, initialEvents, nerdStats] = await Promise.all([
    loadSafely(loadRankingFirstPage, {rows: [], total: 0}, 'casara.ingress_rankings'),
    loadSafely(loadTop50ForJsonLd, [], 'casara.ingress_rankings (JSON-LD)'),
    loadSafely(loadInitialActivity, [], 'casara.ingress_ranking_history'),
    loadSafely(loadNerdStats, null, 'estatísticas para nerds'),
  ])
  const rankingJsonLd = buildRankingJsonLd(jsonLdRows)

  return (
    <main className="ing-shell ing-shell--wide">
      {rankingJsonLd && (
        <script
          type="application/ld+json"
          // JSON-LD (schema.org ItemList) pro ranking: é o formato que
          // buscadores/IAs de fato reconhecem pra listas ordenadas — nada de
          // texto oculto ou comentário instruindo crawler, que não é um
          // mecanismo real e pode ser tratado como cloaking.
          dangerouslySetInnerHTML={{__html: JSON.stringify(rankingJsonLd).replace(/</g, '\\u003c')}}
        />
      )}

      <BackLink fallback="/ingress" />

      <RankingHero center={profile.s2.center} totalAgents={initialTotal} />

      <IngressRankingTabs initialRows={initialRows} initialTotal={initialTotal} initialEvents={initialEvents} nerdStats={nerdStats} />

      <StatsRadarSection
        fencherlc={{
          stats: profile.stats,
          agentName: profile.agent.codename,
          capturedAt: profile.capturedAt,
          axisScores: axisScoreMap,
          overallScore,
          tier,
        }}
      />

      <AxisExplanations />

      <IngressTutorial />
    </main>
  )
}
