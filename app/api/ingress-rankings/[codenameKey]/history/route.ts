import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidHistoryBucket } from "@/lib/ingress-rankings.mjs";

export const dynamic = "force-dynamic";

const DEFAULT_BUCKET = "day";

/**
 * Série temporal de um agente, agregada por dia/mês/ano — alimenta o gráfico
 * de evolução no painel expandido de `IngressRankingTable`. Pública, sem
 * token (mesmo espírito do `GET /api/ingress-rankings`): o dado já é visível
 * na própria tabela, isto só reagrupa o histórico no tempo.
 *
 * `MAX(lifetime_ap)`/`MAX(overall_score)` por bucket assume que os dois só
 * crescem — mesma classe de dívida aceita que `RADAR_AXES.ref` já tem hoje
 * (ver docs/ingress-proximos-passos.md); se um limiar de tier mudar no
 * catálogo, `overall_score` de snapshots antigos pode, em teoria, cair.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ codenameKey: string }> }) {
  try {
    const { codenameKey } = await params;
    const bucketParam = request.nextUrl.searchParams.get("bucket") ?? DEFAULT_BUCKET;
    if (!isValidHistoryBucket(bucketParam)) {
      return NextResponse.json({ error: "bucket deve ser day, month ou year" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        date_trunc(${bucketParam}, recorded_at) AS period,
        MAX(lifetime_ap)::bigint AS lifetime_ap,
        MAX(overall_score) AS overall_score
      FROM casara.ingress_ranking_history
      WHERE codename_key = ${codenameKey}
      GROUP BY period
      ORDER BY period ASC
    `;

    const points = rows.map((row) => ({
      period: (row.period as Date).toISOString(),
      lifetimeAp: Number(row.lifetime_ap),
      overallScore: Number(row.overall_score),
    }));

    return NextResponse.json(
      { points },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("[api/ingress-rankings/[codenameKey]/history] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
