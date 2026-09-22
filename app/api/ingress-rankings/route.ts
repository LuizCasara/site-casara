import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/global/db";
import {
  normalizeCodenameKey,
  buildRankingPageQuery,
  isValidPageSize,
  isValidSortKey,
  isValidSortDir,
  isValidFactionFilter,
} from "@/lib/ingress-rankings.mjs";
import { normalizeCountryCode, isValidCountryCode } from "@/lib/ingress-countries.mjs";
import { computeAxisScores, computeOverallScore, overallTierLabel, computeStatTiers } from "@/lib/ingress-tier-score.mjs";
import { RADAR_STAT_KEYS } from "@/lib/ingress-compare-message.mjs";
import { pickHistoryStats } from "@/lib/ingress-history-diff.mjs";
import { rateLimitOrNull } from "@/lib/global/rate-limit";

export const dynamic = "force-dynamic";

const FACTIONS = new Set(["enlightened", "resistance"]);
// Mesmo teto de nome que o Quiz ao Vivo (QUIZ_LIMITS.NAME_MAX_LEN) — sem
// isso, `codename` é texto livre sem limite, e esta é a rota pensada pra
// receber tráfego de fora (divulgação em comunidade pública): nada impedia
// um script de gravar strings gigantes repetidas vezes.
const CODENAME_MAX_LEN = 40;

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

type RankWindowEntry = { codenameKey: string; codename: string; overallScore: number; countryCode: string | null; rank: number };

/**
 * Janela ao redor de `rank`: até 2 colocados antes + a própria posição + até
 * 2 depois (mesma ordenação de `computeRank`/`lib/ingress-rankings.mjs`) —
 * substitui o antigo "top 3 fixo" por contexto relevante pra quem acabou de
 * entrar, mesmo quando está longe do topo. Perto das pontas a janela encolhe
 * (menos "antes" perto do 1º lugar, menos "depois" perto do último) em vez de
 * inventar posições que não existem.
 */
async function getRankWindow(rank: number, totalAgents: number): Promise<RankWindowEntry[]> {
  const offset = Math.max(rank - 3, 0);
  const limit = Math.max(0, Math.min(5, totalAgents - offset));
  if (limit === 0) return [];
  const rows = await sql`
    SELECT codename_key, codename, overall_score, country_code FROM casara.ingress_rankings
    ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map((r, i) => ({
    codenameKey: r.codename_key as string,
    codename: r.codename as string,
    overallScore: Number(r.overall_score),
    countryCode: r.country_code as string | null,
    rank: offset + i + 1,
  }));
}

/**
 * Alerta fire-and-forget pro Telegram a cada escrita real (nunca quando o
 * debounce bloqueia) — só em produção, mesmo espírito do `notifyTelegram`
 * client-side de `ProfileRadar.tsx` (dev/preview não deve spammar o chat).
 * `isNewAgent` distingue "codinome nunca visto" de "agente já rankeado
 * atualizando os stats" (ver o cálculo via `xmax` no `POST`) — o texto da
 * mensagem no Telegram muda conforme isso. Nunca lança: uma falha aqui não
 * pode derrubar a resposta da rota.
 */
function notifyTelegramRankingWrite(
  origin: string,
  codenameKey: string,
  codename: string,
  rank: number,
  totalAgents: number,
  isNewAgent: boolean
) {
  if (process.env.NODE_ENV !== "production") return;
  getRankWindow(rank, totalAgents)
    .then((rankWindow) =>
      fetch(`${origin}/api/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ingress-ranking-entry",
          codename,
          rank,
          totalAgents,
          isNewAgent,
          window: rankWindow,
          // `destaque` faz a página do ranking rolar/realçar essa linha ao
          // abrir o link — ver o efeito de highlight em IngressRankingTable.
          rankingUrl: `${origin}/ingress/ranking?destaque=${encodeURIComponent(codenameKey)}`,
        }),
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
  // Pública, sem token: qualquer visitante do /ingress/ranking grava/atualiza
  // uma linha. O debounce de 5min abaixo é por codename — não impede um
  // script de gerar codenames diferentes a cada chamada, então o limite por
  // IP é a camada que segura isso (e o flood do Telegram que uma escrita
  // nova dispara via notifyTelegramRankingWrite).
  const limited = await rateLimitOrNull(request, "INGRESS_RANKING_WRITE");
  if (limited) return limited;

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

  if (!codenameKey || codename.length > CODENAME_MAX_LEN) {
    return NextResponse.json(
      { error: `codename é obrigatório (máx. ${CODENAME_MAX_LEN} caracteres)` },
      { status: 400 }
    );
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

  const countryCode = normalizeCountryCode(body.countryCode);
  if (!isValidCountryCode(countryCode)) {
    return NextResponse.json({ error: "countryCode é obrigatório e deve ser um código ISO 3166-1 válido" }, { status: 400 });
  }

  // Informativo (não entra na nota/tier) — por isso, ao contrário de
  // country_code, um valor ausente ou inválido não rejeita o POST, só grava
  // NULL (mesmo estado de uma linha nunca migrada).
  const recursionsRaw = Number(body.recursions);
  const recursions = Number.isFinite(recursionsRaw) && recursionsRaw >= 0 ? Math.floor(recursionsRaw) : null;

  // Mesmo tratamento não-rejeitante de `recursions` acima — informativo (não
  // entra na nota/tier), então ausente ou inválido só grava NULL.
  const monthsSubscribedRaw = Number(body.monthsSubscribed);
  const monthsSubscribed =
    Number.isFinite(monthsSubscribedRaw) && monthsSubscribedRaw >= 0 ? Math.floor(monthsSubscribedRaw) : null;

  // Tudo do export que hoje não tem coluna/eixo dedicado (level, meses de
  // assinatura, e o resto das stats fora do radar) — guardado sem validar
  // formato, exatamente como o cliente mandou. Puramente informativo: nunca
  // lido de volta pelo GET, nunca usado em nota/tier/rank. Só aceita objeto
  // plano (não array, não string) pra não gravar lixo incompatível com JSONB
  // como se fosse um mapa de chave->valor.
  const extra =
    body.extra && typeof body.extra === "object" && !Array.isArray(body.extra) ? body.extra : null;

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
        (codename_key, codename, faction, lifetime_ap, overall_score, axis_scores, stat_values, country_code, recursions, extra_stats, months_subscribed, created_at, updated_at)
      VALUES
        (${codenameKey}, ${codename}, ${faction}, ${lifetimeAp}, ${overallScore}, ${JSON.stringify(axisScoreMap)}, ${JSON.stringify(stats)}, ${countryCode}, ${recursions}, ${extra ? JSON.stringify(extra) : null}, ${monthsSubscribed}, NOW(), NOW())
      ON CONFLICT (codename_key) DO UPDATE SET
        codename = EXCLUDED.codename,
        faction = EXCLUDED.faction,
        lifetime_ap = EXCLUDED.lifetime_ap,
        overall_score = EXCLUDED.overall_score,
        axis_scores = EXCLUDED.axis_scores,
        stat_values = EXCLUDED.stat_values,
        country_code = EXCLUDED.country_code,
        recursions = EXCLUDED.recursions,
        extra_stats = EXCLUDED.extra_stats,
        months_subscribed = EXCLUDED.months_subscribed,
        updated_at = NOW()
      WHERE casara.ingress_rankings.updated_at < NOW() - INTERVAL '5 minutes'
      -- xmax = 0 é o truque padrão de upsert do Postgres pra saber, sem uma
      -- 2a query, se ESTA linha veio do INSERT (agente nunca visto) ou do
      -- UPDATE do ON CONFLICT (agente existente atualizando stats): um INSERT
      -- puro deixa xmax em 0; um UPDATE sempre grava a transacao atual ali.
      RETURNING *, (xmax = 0) AS is_new_agent
    `;

    const written = !!inserted;
    const isNewAgent = Boolean(inserted?.is_new_agent);
    const finalRow = inserted ?? (await sql`SELECT * FROM casara.ingress_rankings WHERE codename_key = ${codenameKey}`)[0];

    if (!finalRow) {
      // Não deveria acontecer: sem conflito o INSERT sempre grava; com
      // conflito e debounce ativo, a linha bloqueada já existe.
      return NextResponse.json({ error: "falha ao gravar o registro" }, { status: 500 });
    }

    if (written) {
      // Um snapshot append-only por escrita real (nunca sob debounce) —
      // alimenta o gráfico de evolução e o "o que mudou" de cada ponto (por isso
      // leva os stats do envio, não só AP/nota) — filtrados por `pickHistoryStats`:
      // a tabela é append-only e `extra` chega sem validação, então só entra o que
      // o painel sabe exibir. Erro aqui não pode derrubar a
      // resposta principal: o ranking já foi gravado com sucesso.
      const historyStats = pickHistoryStats(stats);
      const historyExtra = pickHistoryStats(extra);
      try {
        await sql`
          INSERT INTO casara.ingress_ranking_history (codename_key, lifetime_ap, overall_score, axis_scores, stat_values, extra_stats)
          VALUES (${codenameKey}, ${lifetimeAp}, ${overallScore}, ${JSON.stringify(axisScoreMap)}, ${historyStats ? JSON.stringify(historyStats) : null}, ${historyExtra ? JSON.stringify(historyExtra) : null})
        `;
      } catch (err) {
        console.error("[api/ingress-rankings] falha ao gravar snapshot de histórico:", err);
      }
    }

    const responseBody = await buildResponseFromRow(finalRow, written);
    if (written) {
      notifyTelegramRankingWrite(request.nextUrl.origin, codenameKey, codename, responseBody.rank, responseBody.totalAgents, isNewAgent);
    }
    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[api/ingress-rankings] POST error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

/**
 * Tabela principal do ranking, agora paginada/ordenável/buscável no servidor
 * (feature ingress-ranking-comparison — IRCMP-16 a 23): parâmetros fora da
 * allow-list caem no padrão em vez de 500/SQL malformado. `rank` por linha é
 * sempre o canônico (nota geral desc -> AP desc -> criado asc), calculado
 * ANTES de busca/filtro/ordenação de exibição — nunca mente a colocação real.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const requestedPage = Number(params.get("page"));
    const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1;

    const requestedPageSize = Number(params.get("pageSize"));
    const pageSize = isValidPageSize(requestedPageSize) ? requestedPageSize : 20;

    const requestedSort = params.get("sort") ?? "";
    const sortKey = isValidSortKey(requestedSort) ? requestedSort : "score";

    const requestedDir = params.get("dir") ?? "";
    const sortDir = isValidSortDir(requestedDir) ? requestedDir : undefined;

    const search = params.get("search") ?? "";

    const requestedFaction = params.get("faction") ?? "all";
    const faction = isValidFactionFilter(requestedFaction) ? requestedFaction : "all";

    const { text, values } = buildRankingPageQuery({ page, pageSize, sortKey, sortDir, search, faction });
    const rows = await sql.query(text, values);

    const total = rows.length > 0 ? Number((rows[0] as Record<string, unknown>).total_count) : 0;

    const serialized = rows.map((row) => ({
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
    }));

    return NextResponse.json(
      { rows: serialized, total, page, pageSize },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("[api/ingress-rankings] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
