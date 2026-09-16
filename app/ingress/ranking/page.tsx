import type {Metadata} from 'next'
import {loadProfile} from '@/lib/ingress'
import sql from '@/lib/db'
import {computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers} from '@/lib/ingress-tier-score.mjs'
import Panel from '@/components/ingress/Panel'
import BackLink from '@/components/ingress/BackLink'
import RankingHero from '@/components/ingress/stats/RankingHero'
import StatsRadarSection from '@/components/ingress/stats/StatsRadarSection'
import AxisExplanations from '@/components/ingress/stats/AxisExplanations'
import IngressRankingTabs from '@/components/ingress/stats/IngressRankingTabs'
import type {RankingRow} from '@/components/ingress/stats/IngressRankingTable'
import type {ActivityRow} from '@/components/ingress/stats/IngressActivityFeed'
import type {NerdStats} from '@/components/ingress/stats/IngressNerdStats'
import IngressTutorial from '@/components/ingress/stats/IngressTutorial'
import {computeNerdStats} from '@/lib/ingress-nerd-stats.mjs'

export const dynamic = 'force-dynamic'

const TITLE = 'Ranking de Agentes Ingress — comparação pública de estatísticas'
const DESCRIPTION =
  'Ranking público e ao vivo de agentes do jogo Ingress (Niantic): cole o export de estatísticas do app e compare Access Points, recursões, resonators e outras métricas com o FencherLC e outros agentes cadastrados.'

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
 * Ranking inicial (SSR), consultado direto no banco em vez de `fetch` pra
 * própria rota (evita um round-trip desnecessário no primeiro paint — mesma
 * ordenação de `lib/ingress-rankings.mjs`/`GET /api/ingress-rankings`).
 *
 * `casara.ingress_rankings` pode ainda não existir: a DDL de T1 é aplicada
 * manualmente no Neon SQL Editor, fora do controle deste código. Degrada pro
 * estado vazio (mesmo espírito do resto do site) em vez de derrubar a página.
 */
async function loadInitialRows(): Promise<RankingRow[]> {
  try {
    const rows = await sql`
      SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, country_code, recursions, created_at, updated_at
      FROM casara.ingress_rankings
      ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC
      LIMIT 100
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
  } catch (err) {
    console.error('[app/ingress/ranking] falha ao consultar casara.ingress_rankings:', err);
    return [];
  }
}

/**
 * SSR direto no banco (mesmo espírito de `loadInitialRows`) — mesma query de
 * `GET /api/ingress-rankings/activity`, evitando o round-trip no primeiro
 * paint da aba "Radar de atividade".
 */
async function loadInitialActivity(): Promise<ActivityRow[]> {
  try {
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
  } catch (err) {
    console.error('[app/ingress/ranking] falha ao consultar casara.ingress_ranking_history:', err);
    return [];
  }
}

/**
 * Estatísticas para nerds (aba estática, sem poll) — busca TODAS as linhas de
 * `casara.ingress_rankings` (sem `LIMIT`, ao contrário de `loadInitialRows`)
 * mais o total de envios de `casara.ingress_ranking_history`, e agrega tudo
 * de uma vez via `computeNerdStats` (lib/ingress-nerd-stats.mjs). Mesmo
 * espírito de degradação de `loadInitialRows`/`loadInitialActivity`.
 */
async function loadNerdStats(): Promise<NerdStats | null> {
  try {
    const [rows, [{count}]] = await Promise.all([
      sql`
        SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values,
               recursions, extra_stats, months_subscribed, created_at
        FROM casara.ingress_rankings
      `,
      sql`SELECT COUNT(*)::int AS count FROM casara.ingress_ranking_history`,
    ]);
    return computeNerdStats(rows, count) as NerdStats;
  } catch (err) {
    console.error('[app/ingress/ranking] falha ao calcular estatísticas para nerds:', err);
    return null;
  }
}

/**
 * `ItemList` schema.org com o top 50 do ranking — limitado pra não inflar o
 * HTML com os 100 registros de `loadInitialRows`. Top 50 já cobre qualquer
 * uso razoável (rich results, resumo por um agente de IA).
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

  const [initialRows, initialEvents, nerdStats] = await Promise.all([
    loadInitialRows(),
    loadInitialActivity(),
    loadNerdStats(),
  ])
  const rankingJsonLd = buildRankingJsonLd(initialRows)

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

      <RankingHero center={profile.s2.center} totalAgents={initialRows.length} />

      <IngressRankingTabs initialRows={initialRows} initialEvents={initialEvents} nerdStats={nerdStats} />

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
