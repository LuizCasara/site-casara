import {loadProfile} from '@/lib/ingress'
import sql from '@/lib/db'
import {computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers} from '@/lib/ingress-tier-score.mjs'
import Panel from '@/components/ingress/Panel'
import BackLink from '@/components/ingress/BackLink'
import RankingHero from '@/components/ingress/stats/RankingHero'
import StatsRadarSection from '@/components/ingress/stats/StatsRadarSection'
import AxisExplanations from '@/components/ingress/stats/AxisExplanations'
import IngressRankingTable, {type RankingRow} from '@/components/ingress/stats/IngressRankingTable'
import IngressTutorial from '@/components/ingress/stats/IngressTutorial'

export const dynamic = 'force-dynamic'

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
      SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, country_code, created_at, updated_at
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
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as RankingRow[];
  } catch (err) {
    console.error('[app/ingress/ranking] falha ao consultar casara.ingress_rankings:', err);
    return [];
  }
}

export default async function IngressRankingPage() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <main className="ing-shell">
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

  const initialRows = await loadInitialRows()

  return (
    <main className="ing-shell">
      <BackLink fallback="/ingress" />

      <RankingHero center={profile.s2.center} totalAgents={initialRows.length} />

      <IngressRankingTable initialRows={initialRows} />

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
