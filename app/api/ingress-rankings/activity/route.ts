import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

/**
 * Feed de atividade do ranking — deriva "novo agente"/"atualização" comparando
 * cada snapshot de `casara.ingress_ranking_history` com o snapshot ANTERIOR do
 * mesmo agente (`LAG()` particionado por `codename_key`, ordenado por
 * `recorded_at`). Sem linha anterior = agente nunca visto antes (evento "novo
 * agente"); com linha anterior e algum delta = "atualização". Snapshots
 * idênticos ao anterior (reenvio do mesmo export após o debounce de 5min, sem
 * mudança real de AP/nota) não viram evento — não é atividade de verdade.
 *
 * A janela (`LIMIT`) só corta o RESULTADO devolvido, não o cálculo do delta:
 * este é aplicado sobre o histórico inteiro do agente antes do corte, senão o
 * primeiro snapshot dentro da janela pareceria erradamente um "novo agente".
 *
 * Sem token, como o resto de GET /api/ingress-rankings — mesmo dado já visível
 * na tabela principal, isto só reagrupa em formato de linha do tempo.
 */
export async function GET(request: NextRequest) {
  try {
    const requested = Number(request.nextUrl.searchParams.get("limit"));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_LIMIT));

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
        r.codename_key,
        r.codename,
        r.faction,
        r.country_code,
        d.lifetime_ap,
        d.overall_score,
        d.prev_ap,
        d.prev_score,
        d.recorded_at
      FROM deltas d
      JOIN casara.ingress_rankings r ON r.codename_key = d.codename_key
      WHERE d.prev_ap IS NULL OR d.lifetime_ap <> d.prev_ap OR d.overall_score <> d.prev_score
      ORDER BY d.recorded_at DESC
      LIMIT ${limit}
    `;

    const events = rows.map((row) => {
      const isNewAgent = row.prev_ap === null;
      return {
        codename_key: row.codename_key,
        codename: row.codename,
        faction: row.faction,
        country_code: row.country_code,
        kind: isNewAgent ? ("novo_agente" as const) : ("atualizacao" as const),
        lifetime_ap: Number(row.lifetime_ap),
        overall_score: Number(row.overall_score),
        ap_delta: isNewAgent ? null : Number(row.lifetime_ap) - Number(row.prev_ap),
        score_delta: isNewAgent ? null : Number(row.overall_score) - Number(row.prev_score),
        recorded_at: row.recorded_at,
      };
    });

    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("[api/ingress-rankings/activity] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
