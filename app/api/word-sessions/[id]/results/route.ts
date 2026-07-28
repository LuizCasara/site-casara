import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resultsToken = request.headers.get("x-results-token");
  const hostToken = request.headers.get("x-host-token");

  if (!resultsToken && !hostToken) {
    return NextResponse.json({ error: "token de acesso ausente" }, { status: 401 });
  }

  try {
    const [session] = await sql`
      SELECT results_token, host_token, title, description, status, accepting_responses
      FROM casara.word_sessions
      WHERE id = ${id}
    `;
    if (!session) {
      return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    }

    const authorized =
      (!!resultsToken && resultsToken === session.results_token) ||
      (!!hostToken && hostToken === session.host_token);
    if (!authorized) {
      return NextResponse.json({ error: "token inválido" }, { status: 403 });
    }

    // Independentes uma da outra — rodam em paralelo em vez de round-trips
    // sequenciais, o que importa aqui porque essa rota é chamada a cada poll.
    const [[totals], words] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total_participants
        FROM casara.word_submissions
        WHERE session_id = ${id}
      `,
      sql`
        SELECT MIN(e.word) AS word, COUNT(*)::int AS count
        FROM casara.word_entries e
        JOIN casara.word_submissions s ON s.id = e.submission_id
        WHERE s.session_id = ${id}
        GROUP BY e.word_normalized
        ORDER BY count DESC
        LIMIT 500
      `,
    ]);

    return NextResponse.json({
      title: session.title,
      description: session.description,
      status: session.status,
      accepting_responses: session.accepting_responses,
      total_participants: totals.total_participants,
      words,
    });
  } catch (err) {
    console.error("[api/word-sessions/[id]/results] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
