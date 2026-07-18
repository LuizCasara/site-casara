import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { generateSessionId, generateToken } from "@/lib/session-ids";
import { QUIZ_LIMITS, isValidQuestionDraft, type QuizQuestionDraft } from "@/lib/quiz";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!title || title.length > QUIZ_LIMITS.TITLE_MAX) {
      return NextResponse.json(
        { error: `title é obrigatório (máx. ${QUIZ_LIMITS.TITLE_MAX} caracteres)` },
        { status: 400 }
      );
    }
    if (description.length > QUIZ_LIMITS.DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `description excede ${QUIZ_LIMITS.DESCRIPTION_MAX} caracteres` },
        { status: 400 }
      );
    }

    const rawQuestions: unknown[] = Array.isArray(body.questions) ? body.questions : [];
    if (
      rawQuestions.length < QUIZ_LIMITS.QUESTIONS_MIN ||
      rawQuestions.length > QUIZ_LIMITS.QUESTIONS_MAX
    ) {
      return NextResponse.json(
        {
          error: `envie entre ${QUIZ_LIMITS.QUESTIONS_MIN} e ${QUIZ_LIMITS.QUESTIONS_MAX} perguntas`,
        },
        { status: 400 }
      );
    }

    const questions: QuizQuestionDraft[] = [];
    for (const raw of rawQuestions) {
      const r = raw as Record<string, unknown>;
      const draft: QuizQuestionDraft = {
        prompt: typeof r.prompt === "string" ? r.prompt.trim() : "",
        options: Array.isArray(r.options)
          ? r.options.filter((o): o is string => typeof o === "string").map((o) => o.trim())
          : [],
        correctOptionIndex: Number(r.correct_option_index),
        timeLimitSeconds:
          r.time_limit_seconds === null || r.time_limit_seconds === undefined
            ? null
            : Number(r.time_limit_seconds),
      };
      const error = isValidQuestionDraft(draft);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      questions.push(draft);
    }

    const hostToken = generateToken();
    const resultsToken = generateToken();

    const orderIndexes = questions.map((_, i) => i);
    const prompts = questions.map((q) => q.prompt);
    const optionsJson = questions.map((q) => JSON.stringify(q.options));
    const correctIndexes = questions.map((q) => q.correctOptionIndex);
    const timeLimits = questions.map((q) => q.timeLimitSeconds);

    let id = generateSessionId();
    let attempts = 0;
    for (;;) {
      try {
        await sql`
          WITH new_session AS (
            INSERT INTO geav.quiz_sessions (id, host_token, results_token, title, description)
            VALUES (${id}, ${hostToken}, ${resultsToken}, ${title}, ${description || null})
            RETURNING id
          )
          INSERT INTO geav.quiz_questions (session_id, order_index, prompt, options, correct_option_index, time_limit_seconds)
          SELECT new_session.id, q.order_index, q.prompt, q.options, q.correct_option_index, q.time_limit_seconds
          FROM new_session,
               UNNEST(
                 ${orderIndexes}::smallint[],
                 ${prompts}::text[],
                 ${optionsJson}::jsonb[],
                 ${correctIndexes}::smallint[],
                 ${timeLimits}::smallint[]
               ) AS q(order_index, prompt, options, correct_option_index, time_limit_seconds)
        `;
        break;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "23505" && attempts < 3) {
          attempts += 1;
          id = generateSessionId();
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({ id, host_token: hostToken, results_token: resultsToken });
  } catch (err) {
    console.error("[api/quiz-sessions] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
