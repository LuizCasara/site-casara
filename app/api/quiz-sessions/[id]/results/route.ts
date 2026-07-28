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
      SELECT results_token, host_token, title, description, status, phase,
             current_question_index, current_question_started_at, finished_at
      FROM casara.quiz_sessions
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

    const showsQuestion = session.phase === "question" || session.phase === "reveal";
    const revealed = session.phase === "reveal";

    const [[totalsRow], leaderboard, currentQuestionRows, gabarito] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM casara.quiz_questions WHERE session_id = ${id}`,
      sql`
        SELECT p.name, COALESCE(SUM(a.points_awarded), 0)::int AS score
        FROM casara.quiz_participants p
        LEFT JOIN casara.quiz_answers a ON a.session_id = p.session_id AND a.participant_id = p.participant_id
        WHERE p.session_id = ${id}
        GROUP BY p.participant_id, p.name
        ORDER BY score DESC, p.participant_id ASC
      `,
      showsQuestion
        ? sql`
            SELECT qq.id, qq.prompt, qq.options, qq.correct_option_index, qq.time_limit_seconds,
              COUNT(a.id)::int AS answered_count,
              COALESCE(
                (
                  SELECT jsonb_object_agg(a2.selected_option_index, a2.cnt)
                  FROM (
                    SELECT selected_option_index, COUNT(*)::int AS cnt
                    FROM casara.quiz_answers
                    WHERE question_id = qq.id
                    GROUP BY selected_option_index
                  ) a2
                ),
                '{}'::jsonb
              ) AS distribution
            FROM casara.quiz_questions qq
            LEFT JOIN casara.quiz_answers a ON a.question_id = qq.id
            WHERE qq.session_id = ${id} AND qq.order_index = ${session.current_question_index}
            GROUP BY qq.id, qq.prompt, qq.options, qq.correct_option_index, qq.time_limit_seconds
          `
        : Promise.resolve([]),
      session.phase === "finished"
        ? sql`
            SELECT qq.order_index, qq.prompt, qq.options, qq.correct_option_index,
              COUNT(a.id)::int AS total_answers,
              COUNT(a.id) FILTER (WHERE a.is_correct)::int AS correct_answers
            FROM casara.quiz_questions qq
            LEFT JOIN casara.quiz_answers a ON a.question_id = qq.id
            WHERE qq.session_id = ${id}
            GROUP BY qq.id, qq.order_index, qq.prompt, qq.options, qq.correct_option_index
            ORDER BY qq.order_index
          `
        : Promise.resolve([]),
    ]);

    const cq = currentQuestionRows[0] ?? null;

    return NextResponse.json({
      title: session.title,
      description: session.description,
      status: session.status,
      phase: session.phase,
      current_question_index: session.current_question_index,
      questions_total: totalsRow.count,
      server_time: new Date().toISOString(),
      finished_at: session.finished_at,
      leaderboard: leaderboard.map((r) => ({ name: r.name, score: r.score })),
      current_question: cq
        ? {
            prompt: cq.prompt,
            options: cq.options,
            time_limit_seconds: cq.time_limit_seconds,
            started_at: session.current_question_started_at,
            answered_count: cq.answered_count,
            correct_option_index: revealed ? cq.correct_option_index : undefined,
            distribution: revealed ? cq.distribution : undefined,
          }
        : null,
      gabarito: session.phase === "finished" ? gabarito : null,
    });
  } catch (err) {
    console.error("[api/quiz-sessions/[id]/results] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
