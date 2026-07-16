import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { WORD_CLOUD_LIMITS, canAcceptResponses, dedupeWords, normalizeWord } from "@/lib/word-cloud";

export const dynamic = "force-dynamic";

const PARTICIPANT_ID_RE = /^[0-9a-f-]{20,40}$/i;

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

    const rawWords: unknown[] = Array.isArray(body.words) ? body.words : [];
    const words = dedupeWords(
      rawWords.filter((w): w is string => typeof w === "string")
    );

    if (words.length === 0) {
      return NextResponse.json({ error: "envie ao menos uma palavra" }, { status: 400 });
    }
    if (words.some((w) => w.length > WORD_CLOUD_LIMITS.WORD_MAX_LEN)) {
      return NextResponse.json(
        { error: `cada palavra deve ter no máx. ${WORD_CLOUD_LIMITS.WORD_MAX_LEN} caracteres` },
        { status: 400 }
      );
    }

    const [session] = await sql`
      SELECT mode, fixed_words, max_words, accepting_responses, status
      FROM word_sessions
      WHERE id = ${id}
    `;
    if (!session) {
      return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    }
    if (!canAcceptResponses(session.status, session.accepting_responses)) {
      return NextResponse.json(
        { error: "essa dinâmica não está aceitando respostas no momento" },
        { status: 423 }
      );
    }
    if (words.length > session.max_words) {
      return NextResponse.json(
        { error: `no máximo ${session.max_words} palavra(s) por envio` },
        { status: 400 }
      );
    }
    if (session.mode === "fixed") {
      const allowed = new Set(
        ((session.fixed_words as string[] | null) ?? []).map(normalizeWord)
      );
      const invalid = words.some((w) => !allowed.has(normalizeWord(w)));
      if (invalid) {
        return NextResponse.json(
          { error: "uma ou mais palavras não fazem parte do banco desta dinâmica" },
          { status: 400 }
        );
      }
    }

    const normalized = words.map(normalizeWord);

    try {
      // CTE única e atômica: cria a submissão e já insere todas as palavras
      // usando o id retornado, sem precisar de sql.transaction() (que não
      // permite encadear o resultado de uma query dentro da próxima).
      await sql`
        WITH new_submission AS (
          INSERT INTO word_submissions (session_id, participant_id)
          VALUES (${id}, ${participantId})
          RETURNING id
        )
        INSERT INTO word_entries (submission_id, word, word_normalized)
        SELECT new_submission.id, w.word, w.word_normalized
        FROM new_submission,
             UNNEST(${words}::text[], ${normalized}::text[]) AS w(word, word_normalized)
      `;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        return NextResponse.json(
          { error: "você já enviou sua resposta para essa dinâmica" },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/word-sessions/[id]/responses] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
