import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { PARTICIPANT_ID_RE } from "@/lib/session-ids";
import { QUIZ_SCORING } from "@/lib/quiz";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const participantId =
      typeof body.participant_id === "string" ? body.participant_id.trim() : "";
    if (!PARTICIPANT_ID_RE.test(participantId)) {
      return NextResponse.json({ error: "participant_id inválido" }, { status: 400 });
    }

    const selectedOptionIndex = Number(body.selected_option_index);
    if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0) {
      return NextResponse.json({ error: "selected_option_index inválido" }, { status: 400 });
    }

    try {
      // Tudo num único statement: valida que a pergunta atual está aberta
      // (phase='question'), que o índice escolhido é válido pra ela, calcula
      // acerto/pontuação usando o relógio do próprio Postgres (nunca o do
      // cliente nem o da função serverless), e insere — atômico o bastante
      // pra não ter janela entre "ler o estado" e "gravar a resposta".
      const [row] = await sql`
        WITH current_q AS (
          SELECT qq.id AS question_id, qq.correct_option_index, qq.time_limit_seconds,
                 qs.current_question_started_at
          FROM geav.quiz_sessions qs
          JOIN geav.quiz_questions qq
            ON qq.session_id = qs.id AND qq.order_index = qs.current_question_index
          WHERE qs.id = ${id}
            AND qs.phase = 'question'
            AND qs.status = 'active'
            AND jsonb_array_length(qq.options) > ${selectedOptionIndex}
            AND (
              qq.time_limit_seconds IS NULL
              OR NOW() <= qs.current_question_started_at + (qq.time_limit_seconds || ' seconds')::interval
            )
        ), scored AS (
          SELECT
            question_id,
            (correct_option_index = ${selectedOptionIndex}) AS is_correct,
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - current_question_started_at)) * 1000) AS elapsed_ms,
            time_limit_seconds
          FROM current_q
        )
        INSERT INTO geav.quiz_answers (question_id, session_id, participant_id, selected_option_index, is_correct, points_awarded)
        SELECT
          question_id, ${id}, ${participantId}, ${selectedOptionIndex}, is_correct,
          CASE
            WHEN NOT is_correct THEN 0
            WHEN time_limit_seconds IS NULL THEN ${QUIZ_SCORING.FLAT_POINTS_NO_TIMER}
            ELSE ${QUIZ_SCORING.BASE_POINTS} + ROUND(
              ${QUIZ_SCORING.SPEED_BONUS_MAX} * GREATEST(0, LEAST(1, 1 - elapsed_ms / (time_limit_seconds * 1000.0)))
            )
          END
        FROM scored
        ON CONFLICT (question_id, participant_id) DO NOTHING
        RETURNING is_correct, points_awarded
      `;

      if (!row) {
        return NextResponse.json(
          { error: "não foi possível registrar sua resposta — a pergunta pode ter fechado, ou você já respondeu" },
          { status: 409 }
        );
      }

      return NextResponse.json({ is_correct: row.is_correct, points_awarded: row.points_awarded });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23503") {
        return NextResponse.json(
          { error: "você precisa entrar com um nome antes de responder" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("[api/quiz-sessions/[id]/answers] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
