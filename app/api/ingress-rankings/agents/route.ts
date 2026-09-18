import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { buildAgentOptionsQuery, AGENT_SELECT_PAGE_SIZE } from "@/lib/ingress-rankings.mjs";

export const dynamic = "force-dynamic";

/**
 * Lista paginada (keyset por `codename_key`, ordem alfabética case-insensitive)
 * ou busca por substring de codinome — alimenta o `AgentSelect` da aba
 * Comparação. Leitura pública, sem token, sem rate-limit (mesmo padrão já
 * decidido para os GETs públicos existentes de `/api/ingress-rankings`).
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const cursor = params.get("cursor");
    const search = params.get("search") ?? "";

    const { text, values } = buildAgentOptionsQuery({ cursor, search });
    const rows = await sql.query(text, values);

    const trimmedSearch = search.trim();
    const hasMore = !trimmedSearch && rows.length > AGENT_SELECT_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, AGENT_SELECT_PAGE_SIZE) : rows;

    const serialized = page.map((row) => ({
      codename_key: row.codename_key,
      codename: row.codename,
      faction: row.faction,
      country_code: row.country_code,
      lifetime_ap: Number(row.lifetime_ap),
    }));

    return NextResponse.json({
      rows: serialized,
      hasMore,
      nextCursor: hasMore ? serialized[serialized.length - 1].codename_key : null,
    });
  } catch (err) {
    console.error("[api/ingress-rankings/agents] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
