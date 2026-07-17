import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participantId = request.nextUrl.searchParams.get("participant_id");

  try {
    const [session] = await sql`
      SELECT title, description, status, phase, current_question_index, current_question_started_at, finished_at
      FROM geav.quiz_sessions
      WHERE id = ${id}
    `;
    if (!session) {
      return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    }

    const showsQuestion = session.phase === "question" || session.phase === "reveal";
    const revealed = session.phase === "reveal" || session.phase === "finished";

    const [[totalsRow], currentQuestionRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM geav.quiz_questions WHERE session_id = ${id}`,
      showsQuestion
        ? sql`
            SELECT id, prompt, options, time_limit_seconds, correct_option_index
            FROM geav.quiz_questions
            WHERE session_id = ${id} AND order_index = ${session.current_question_index}
          `
        : Promise.resolve([]),
    ]);

    const currentQuestion = currentQuestionRows[0] ?? null;

    let participant = null;
    if (participantId) {
      const [participantRow] = await sql`
        SELECT name FROM geav.quiz_participants WHERE session_id = ${id} AND participant_id = ${participantId}
      `;
      if (!participantRow) {
        participant = { joined: false };
      } else {
        const [[scoreRow], answerRows] = await Promise.all([
          sql`
            WITH scores AS (
              SELECT p.participant_id, COALESCE(SUM(a.points_awarded), 0)::int AS total
              FROM geav.quiz_participants p
              LEFT JOIN geav.quiz_answers a ON a.session_id = p.session_id AND a.participant_id = p.participant_id
              WHERE p.session_id = ${id}
              GROUP BY p.participant_id
            ), ranked AS (
              SELECT participant_id, total,
                     RANK() OVER (ORDER BY total DESC, participant_id ASC)::int AS rank
              FROM scores
            )
            SELECT total, rank FROM ranked WHERE participant_id = ${participantId}
          `,
          currentQuestion
            ? sql`
                SELECT selected_option_index, is_correct, points_awarded
                FROM geav.quiz_answers
                WHERE question_id = ${currentQuestion.id} AND participant_id = ${participantId}
              `
            : Promise.resolve([]),
        ]);
        const answer = answerRows[0] ?? null;
        participant = {
          joined: true,
          name: participantRow.name,
          has_answered_current: !!answer,
          selected_option_index: answer ? answer.selected_option_index : undefined,
          is_correct: revealed && answer ? answer.is_correct : undefined,
          points_awarded_current: revealed && answer ? answer.points_awarded : undefined,
          total_score: scoreRow.total,
          rank: scoreRow.rank,
        };
      }
    }

    return NextResponse.json({
      title: session.title,
      description: session.description,
      status: session.status,
      phase: session.phase,
      current_question_index: session.current_question_index,
      questions_total: totalsRow.count,
      question: currentQuestion
        ? {
            prompt: currentQuestion.prompt,
            options: currentQuestion.options,
            time_limit_seconds: currentQuestion.time_limit_seconds,
            started_at: session.current_question_started_at,
            correct_option_index: revealed ? currentQuestion.correct_option_index : undefined,
          }
        : null,
      server_time: new Date().toISOString(),
      finished_at: session.finished_at,
      participant,
    });
  } catch (err) {
    console.error("[api/quiz-sessions/[id]] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hostToken = request.headers.get("x-host-token");
  if (!hostToken) {
    return NextResponse.json({ error: "x-host-token é obrigatório" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (typeof body.status === "string") {
      const next = body.status;
      if (next !== "saved" && next !== "discarded") {
        return NextResponse.json(
          { error: "status deve ser 'saved' ou 'discarded'" },
          { status: 400 }
        );
      }
      const [row] = await sql`
        UPDATE geav.quiz_sessions
        SET status = ${next}, updated_at = NOW()
        WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active'
        RETURNING id, status
      `;
      if (!row) {
        return NextResponse.json(
          { error: "sessão não encontrada, token inválido, ou já finalizada" },
          { status: 409 }
        );
      }
      return NextResponse.json(row);
    }

    const action = typeof body.action === "string" ? body.action : "";

    if (action === "start") {
      const [row] = await sql`
        UPDATE geav.quiz_sessions
        SET phase = 'question', current_question_index = 0, current_question_started_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active' AND phase = 'lobby'
        RETURNING id, phase, current_question_index
      `;
      if (!row) {
        return NextResponse.json({ error: "quiz não está no lobby" }, { status: 409 });
      }
      return NextResponse.json(row);
    }

    if (action === "reveal") {
      const [row] = await sql`
        UPDATE geav.quiz_sessions
        SET phase = 'reveal', updated_at = NOW()
        WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active' AND phase = 'question'
        RETURNING id, phase
      `;
      if (!row) {
        return NextResponse.json({ error: "não há pergunta aberta pra revelar" }, { status: 409 });
      }
      return NextResponse.json(row);
    }

    if (action === "restart") {
      // DELETE e UPDATE na mesma CTE: a DELETE só afeta linhas cujo
      // session_id está em `target`, que só existe quando o token/fase batem
      // — assim uma tentativa não autorizada (token errado, fase != finished)
      // não apaga nada, sem precisar de sql.transaction(). Apaga
      // quiz_participants (não só quiz_answers): o índice único de nome
      // (session_id, lower(name)) é por sessão, não por rodada, então manter
      // os participantes prenderia esses nomes pra sempre nessa sessão,
      // barrando qualquer pessoa nova que tente entrar com o mesmo nome numa
      // rodada seguinte. quiz_answers cai junto via ON DELETE CASCADE.
      const [row] = await sql`
        WITH target AS (
          SELECT id FROM geav.quiz_sessions
          WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active' AND phase = 'finished'
        ), deleted AS (
          DELETE FROM geav.quiz_participants WHERE session_id IN (SELECT id FROM target)
        )
        UPDATE geav.quiz_sessions
        SET phase = 'lobby', current_question_index = NULL, current_question_started_at = NULL,
            finished_at = NULL, updated_at = NOW()
        WHERE id IN (SELECT id FROM target)
        RETURNING id, phase
      `;
      if (!row) {
        return NextResponse.json({ error: "só é possível reiniciar um quiz encerrado" }, { status: 409 });
      }
      return NextResponse.json(row);
    }

    if (action === "next") {
      const [row] = await sql`
        WITH total AS (
          SELECT COUNT(*)::int AS count FROM geav.quiz_questions WHERE session_id = ${id}
        )
        UPDATE geav.quiz_sessions
        SET
          phase = CASE WHEN current_question_index + 1 < total.count THEN 'question' ELSE 'finished' END,
          current_question_index = LEAST(current_question_index + 1, total.count - 1),
          current_question_started_at = CASE
            WHEN current_question_index + 1 < total.count THEN NOW()
            ELSE current_question_started_at
          END,
          finished_at = CASE
            WHEN current_question_index + 1 < total.count THEN finished_at
            ELSE NOW()
          END,
          updated_at = NOW()
        FROM total
        WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active' AND phase = 'reveal'
        RETURNING id, phase, current_question_index
      `;
      if (!row) {
        return NextResponse.json({ error: "pergunta atual ainda não foi revelada" }, { status: 409 });
      }
      return NextResponse.json(row);
    }

    return NextResponse.json(
      { error: "action deve ser 'start', 'reveal', 'next' ou 'restart'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/quiz-sessions/[id]] PATCH error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
