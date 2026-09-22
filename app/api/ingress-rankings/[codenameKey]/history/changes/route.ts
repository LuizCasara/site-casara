import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/global/db";
import { isValidHistoryBucket, normalizeCodenameKey } from "@/lib/ingress-rankings.mjs";
import { diffSnapshots, snapshotStats } from "@/lib/ingress-history-diff.mjs";

export const dynamic = "force-dynamic";

/**
 * "O que mudou" num ponto do gráfico de evolução — o painel abaixo do gráfico
 * chama isto ao selecionar um nó. `period` é o ISO que `GET .../history` já
 * devolve em cada ponto; junto com `bucket` ele define uma janela
 * `[period, period + 1 dia/mês/ano)`.
 *
 * O ponto é comparado com o ESTADO ANTERIOR à janela (o último snapshot antes
 * dela), não com o primeiro snapshot de dentro: assim "setembro" mostra tudo
 * que mudou desde o fim de agosto, sem buraco entre períodos, e vários envios
 * no mesmo mês já saem compilados num só saldo. Só quando não existe nada
 * antes (primeiro ponto do agente) cai pro primeiro snapshot da própria
 * janela — e sem nem esse (um único envio), não há comparação.
 *
 * Cada busca é pontual no índice `(codename_key, recorded_at DESC)`, então o
 * custo não cresce com o tamanho do histórico. Público e sem token, como o
 * resto de `GET /api/ingress-rankings`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ codenameKey: string }> }) {
  try {
    const { codenameKey: rawCodenameKey } = await params;
    const codenameKey = normalizeCodenameKey(rawCodenameKey);

    const bucket = request.nextUrl.searchParams.get("bucket") ?? "day";
    if (!isValidHistoryBucket(bucket)) {
      return NextResponse.json({ error: "bucket deve ser day, month ou year" }, { status: 400 });
    }
    const periodDate = new Date(request.nextUrl.searchParams.get("period") ?? "");
    // Faixa de anos além de "é uma data": `+275760-09-13` é uma Date válida em JS
    // mas estoura o `timestamptz` do Postgres, o que viraria 500 em vez de 400.
    const year = periodDate.getUTCFullYear();
    if (Number.isNaN(periodDate.getTime()) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "period inválido" }, { status: 400 });
    }
    // `bucket` já passou pela allow-list acima, então concatenar aqui é seguro.
    const start = periodDate.toISOString();
    const span = `1 ${bucket}`;

    // As duas buscas não dependem uma da outra: em paralelo, um clique custa uma
    // ida ao banco, não duas em fila.
    const [[last], [before]] = await Promise.all([
      sql`
        SELECT id, lifetime_ap, overall_score, stat_values, extra_stats, recorded_at
        FROM casara.ingress_ranking_history
        WHERE codename_key = ${codenameKey}
          AND recorded_at >= ${start}::timestamptz
          AND recorded_at < ${start}::timestamptz + ${span}::interval
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      `,
      sql`
        SELECT id, lifetime_ap, overall_score, stat_values, extra_stats, recorded_at
        FROM casara.ingress_ranking_history
        WHERE codename_key = ${codenameKey} AND recorded_at < ${start}::timestamptz
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      `,
    ]);
    if (!last) {
      return NextResponse.json({ error: "nenhum registro nesse período" }, { status: 404 });
    }

    let base: Record<string, unknown> | undefined = before;
    if (!base) {
      const [first] = await sql`
        SELECT id, lifetime_ap, overall_score, stat_values, extra_stats, recorded_at
        FROM casara.ingress_ranking_history
        WHERE codename_key = ${codenameKey}
          AND recorded_at >= ${start}::timestamptz
          AND recorded_at < ${start}::timestamptz + ${span}::interval
        ORDER BY recorded_at ASC, id ASC
        LIMIT 1
      `;
      // Um envio só na janela: o "primeiro" é o próprio "último", não há comparação.
      base = first && first.id !== last.id ? first : undefined;
    }

    const point = (row: Record<string, unknown>) => ({
      at: new Date(row.recorded_at as string | Date).toISOString(),
      ap: Number(row.lifetime_ap),
      score: Number(row.overall_score),
    });

    // `null` em qualquer lado (snapshot de antes da migration 010, que não
    // guardava stats) vira `statsAvailable: false` — a UI explica em vez de
    // mostrar uma lista vazia que pareceria "nada mudou".
    const diff = base ? diffSnapshots(snapshotStats(base), snapshotStats(last)) : null;

    return NextResponse.json(
      {
        bucket,
        period: start,
        to: point(last),
        from: base ? point(base) : null,
        statsAvailable: diff !== null,
        changes: diff?.changes ?? [],
        unchanged: diff?.unchanged ?? 0,
      },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("[api/ingress-rankings/[codenameKey]/history/changes] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
