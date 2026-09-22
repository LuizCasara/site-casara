import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/global/db";
import { normalizeCodenameKey } from "@/lib/ingress-rankings.mjs";

export const dynamic = "force-dynamic";

type CompareRow = {
  codename_key: string;
  codename: string;
  faction: string;
  lifetime_ap: number;
  overall_score: number;
  axis_scores: Record<string, number>;
  stat_values: Record<string, number>;
  country_code: string | null;
  rank: number;
  total_agents: number;
};

function serialize(row: Record<string, unknown> | undefined): CompareRow | null {
  if (!row) return null;
  return {
    codename_key: row.codename_key as string,
    codename: row.codename as string,
    faction: row.faction as string,
    lifetime_ap: Number(row.lifetime_ap),
    overall_score: Number(row.overall_score),
    axis_scores: row.axis_scores as Record<string, number>,
    stat_values: row.stat_values as Record<string, number>,
    country_code: row.country_code as string | null,
    rank: Number(row.rank),
    total_agents: Number(row.total_agents),
  };
}

/**
 * Resolve 1 ou 2 `codename_key` pros dados completos da comparação (aba
 * "Comparação") — também usada pelo `AgentSelect` pra mostrar o nome de um
 * agente pré-selecionado que não está nas páginas carregadas. `a`/`b` são
 * independentes: qualquer um pode faltar.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const rawA = params.get("a");
    const rawB = params.get("b");
    const keyA = rawA ? normalizeCodenameKey(rawA) : null;
    const keyB = rawB ? normalizeCodenameKey(rawB) : null;

    if (keyA && keyB && keyA === keyB) {
      return NextResponse.json({ error: "a e b não podem ser o mesmo agente" }, { status: 400 });
    }

    const keys = [keyA, keyB].filter((k): k is string => !!k);
    if (keys.length === 0) {
      return NextResponse.json({ a: null, b: null });
    }

    // `rank` usa a mesma ordenação canônica de `buildRankingPageQuery`
    // (lib/ingress-rankings.mjs): nota geral desc -> AP total desc -> primeira
    // medição asc. Precisa ser calculado sobre a tabela inteira, por isso o
    // filtro por chave vem DEPOIS da CTE e não dentro dela.
    const rows = await sql`
      WITH ranked AS (
        SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, country_code,
               ROW_NUMBER() OVER (ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC) AS rank,
               COUNT(*) OVER () AS total_agents
        FROM casara.ingress_rankings
      )
      SELECT * FROM ranked WHERE codename_key = ANY(${keys})
    `;
    const byKey = new Map(rows.map((row) => [row.codename_key as string, row]));

    return NextResponse.json({
      a: keyA ? serialize(byKey.get(keyA)) : null,
      b: keyB ? serialize(byKey.get(keyB)) : null,
    });
  } catch (err) {
    console.error("[api/ingress-rankings/compare] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
