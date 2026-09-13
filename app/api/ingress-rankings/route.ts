import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { normalizeCodenameKey } from "@/lib/ingress-rankings.mjs";
import { computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers } from "@/lib/ingress-tier-score.mjs";
import { RADAR_STAT_KEYS } from "@/lib/ingress-compare-message.mjs";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const FACTIONS = new Set(["enlightened", "resistance"]);

type AxisScore = { id: string; label: string; score: number };
type AxisScoreMap = Record<string, number>;

/** `axisScores` como o design/data-model exige pra armazenar/devolver: `{id: score}`, sem os labels (estáticos, derivados de `RADAR_AXES`). */
function toAxisScoreMap(axisScores: AxisScore[]): AxisScoreMap {
  return Object.fromEntries(axisScores.map((a) => [a.id, a.score]));
}

/** Reconstrói a forma `{id,label,score}[]` que `computeOverallScore`/`overallTierLabel` esperam, a partir do mapa persistido (o `label` não é usado por essas duas funções). */
function fromAxisScoreMap(map: AxisScoreMap): AxisScore[] {
  return Object.entries(map).map(([id, score]) => ({ id, label: id, score }));
}

function isValidStats(stats: unknown): stats is Record<string, number> {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as Record<string, unknown>;
  return RADAR_STAT_KEYS.every((k: string) => typeof s[k] === "number" && Number.isFinite(s[k] as number));
}

/**
 * Posição (1-based) e total de agentes medidos, usando a mesma ordenação de
 * `lib/ingress-rankings.mjs` (`compareRankingRows`): nota geral desc -> AP
 * total desc -> data da primeira medição asc.
 */
async function computeRank(overallScore: number, lifetimeAp: number, createdAt: string | Date) {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM casara.ingress_rankings
    WHERE overall_score > ${overallScore}
       OR (overall_score = ${overallScore} AND lifetime_ap > ${lifetimeAp})
       OR (overall_score = ${overallScore} AND lifetime_ap = ${lifetimeAp} AND created_at < ${createdAt})
  `;
  const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM casara.ingress_rankings`;
  return { rank: count + 1, totalAgents: total };
}

/** Top 3 atual, mesma ordenação de `computeRank`/`lib/ingress-rankings.mjs`. */
async function getTop3(): Promise<{ codename: string; overallScore: number }[]> {
  const rows = await sql`
    SELECT codename, overall_score FROM casara.ingress_rankings
    ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC
    LIMIT 3
  `;
  return rows.map((r) => ({ codename: r.codename as string, overallScore: Number(r.overall_score) }));
}

/**
 * Alerta fire-and-forget pro Telegram a cada escrita real (nunca quando o
 * debounce bloqueia) — só em produção, mesmo espírito do `notifyTelegram`
 * client-side de `ProfileRadar.tsx` (dev/preview não deve spammar o chat).
 * Nunca lança: uma falha aqui não pode derrubar a resposta da rota.
 */
function notifyTelegramNewEntry(origin: string, codename: string, rank: number, totalAgents: number) {
  if (process.env.NODE_ENV !== "production") return;
  getTop3()
    .then((top3) =>
      fetch(`${origin}/api/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ingress-ranking-entry", codename, rank, totalAgents, top3 }),
      })
    )
    .catch((err) => console.error("[api/ingress-rankings] alerta do Telegram falhou:", err));
}

type RowResponse = {
  written: boolean;
  rank: number;
  totalAgents: number;
  overallScore: number;
  axisScores: AxisScoreMap;
  tier: string;
};

async function buildResponseFromRow(row: Record<string, unknown>, written: boolean): Promise<RowResponse> {
  const overallScore = Number(row.overall_score);
  const axisScores = row.axis_scores as AxisScoreMap;
  const { rank, totalAgents } = await computeRank(overallScore, Number(row.lifetime_ap), row.created_at as string);
  return { written, rank, totalAgents, overallScore, axisScores, tier: overallTierLabel(fromAxisScoreMap(axisScores)) };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const codename = typeof body.codename === "string" ? body.codename.trim() : "";
  const codenameKey = normalizeCodenameKey(codename);
  const faction = typeof body.faction === "string" ? body.faction.trim().toLowerCase() : "";
  const lifetimeAp = Number(body.lifetimeAp);

  if (!codenameKey) {
    return NextResponse.json({ error: "codename é obrigatório" }, { status: 400 });
  }
  if (!FACTIONS.has(faction)) {
    return NextResponse.json({ error: "faction deve ser enlightened ou resistance" }, { status: 400 });
  }
  if (!Number.isFinite(lifetimeAp) || lifetimeAp < 0) {
    return NextResponse.json({ error: "lifetimeAp inválido" }, { status: 400 });
  }
  if (!isValidStats(body.stats)) {
    return NextResponse.json({ error: "stats inválidos — faltam chaves do radar" }, { status: 400 });
  }
  const stats = body.stats as Record<string, number>;

  try {
    // O codinome do FencherLC não tem mais guarda especial: se o body trouxe
    // stats de verdade (inclusive um export fresco do próprio FencherLC), a
    // rota escreve/atualiza normalmente, sujeito ao mesmo debounce de 5 min
    // de qualquer outro agente. `data/ingress/fencherlc.json` continua sendo
    // a baseline estática usada em outros lugares (radar padrão de /ingress,
    // modo "vs-me"), mas esta tabela reflete o que foi de fato submetido.
    const axisScores = computeAxisScores(stats);
    const overallScore = computeOverallScore(axisScores);
    const axisScoreMap = toAxisScoreMap(axisScores);

    // Upsert atômico e guardado: só atualiza se a última atualização foi há
    // mais de 5 minutos. Sem conflito (agente novo), o INSERT sempre vale.
    const [inserted] = await sql`
      INSERT INTO casara.ingress_rankings
        (codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, created_at, updated_at)
      VALUES
        (${codenameKey}, ${codename}, ${faction}, ${lifetimeAp}, ${overallScore}, ${JSON.stringify(axisScoreMap)}, ${JSON.stringify(stats)}, NOW(), NOW())
      ON CONFLICT (codename_key) DO UPDATE SET
        codename = EXCLUDED.codename,
        faction = EXCLUDED.faction,
        lifetime_ap = EXCLUDED.lifetime_ap,
        overall_score = EXCLUDED.overall_score,
        axis_scores = EXCLUDED.axis_scores,
        stat_values = EXCLUDED.stat_values,
        updated_at = NOW()
      WHERE casara.ingress_rankings.updated_at < NOW() - INTERVAL '5 minutes'
      RETURNING *
    `;

    const written = !!inserted;
    const finalRow = inserted ?? (await sql`SELECT * FROM casara.ingress_rankings WHERE codename_key = ${codenameKey}`)[0];

    if (!finalRow) {
      // Não deveria acontecer: sem conflito o INSERT sempre grava; com
      // conflito e debounce ativo, a linha bloqueada já existe.
      return NextResponse.json({ error: "falha ao gravar o registro" }, { status: 500 });
    }

    const responseBody = await buildResponseFromRow(finalRow, written);
    if (written) {
      notifyTelegramNewEntry(request.nextUrl.origin, codename, responseBody.rank, responseBody.totalAgents);
    }
    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[api/ingress-rankings] POST error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const requested = Number(request.nextUrl.searchParams.get("limit"));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_LIMIT));

    const rows = await sql`
      SELECT codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, created_at, updated_at
      FROM casara.ingress_rankings
      ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC
      LIMIT ${limit}
    `;

    const serialized = rows.map((row) => ({
      codename_key: row.codename_key,
      codename: row.codename,
      faction: row.faction,
      lifetime_ap: Number(row.lifetime_ap),
      overall_score: Number(row.overall_score),
      axis_scores: row.axis_scores,
      stat_values: row.stat_values,
      stat_tiers: computeStatTiers(row.stat_values as Record<string, number>),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(
      { rows: serialized },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("[api/ingress-rankings] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
