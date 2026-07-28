import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { PARTICIPANT_ID_RE } from "@/lib/session-ids";
import { QUIZ_LIMITS, normalizeName } from "@/lib/quiz";

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

    const name = normalizeName(typeof body.name === "string" ? body.name : "");
    if (!name || name.length > QUIZ_LIMITS.NAME_MAX_LEN) {
      return NextResponse.json(
        { error: `informe um nome (máx. ${QUIZ_LIMITS.NAME_MAX_LEN} caracteres)` },
        { status: 400 }
      );
    }

    try {
      // A cláusula SELECT ... FROM casara.quiz_sessions WHERE ... torna o "sessão
      // está aceitando entrada" parte do mesmo statement atômico do INSERT.
      // O ON CONFLICT (session_id, participant_id) atualiza o nome — cobre o
      // refresh idempotente (mesmo nome) e a correção de nome (nome novo);
      // um conflito no índice de nome (outra pessoa já usando esse nome) é
      // uma constraint diferente e não é silenciado por essa cláusula — cai
      // no catch abaixo como 23505.
      const [row] = await sql`
        INSERT INTO casara.quiz_participants (session_id, participant_id, name)
        SELECT ${id}, ${participantId}, ${name}
        FROM casara.quiz_sessions
        WHERE id = ${id} AND status = 'active' AND phase != 'finished'
        ON CONFLICT (session_id, participant_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING name
      `;
      if (!row) {
        return NextResponse.json(
          { error: "essa sessão não existe ou já foi encerrada" },
          { status: 409 }
        );
      }
      return NextResponse.json({ name: row.name });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        return NextResponse.json(
          { error: "esse nome já está em uso nessa sessão, escolha outro" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("[api/quiz-sessions/[id]/join] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
