import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { WORD_CLOUD_LIMITS, dedupeWords, normalizeWord } from "@/lib/word-cloud";

export const dynamic = "force-dynamic";

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
    const rawWords: unknown[] = Array.isArray(body.words) ? body.words : [];
    const incoming = dedupeWords(
      rawWords.filter((w): w is string => typeof w === "string")
    );

    if (incoming.length === 0) {
      return NextResponse.json({ error: "envie ao menos uma palavra" }, { status: 400 });
    }
    if (incoming.some((w) => w.length > WORD_CLOUD_LIMITS.WORD_MAX_LEN)) {
      return NextResponse.json(
        { error: `cada palavra deve ter no máx. ${WORD_CLOUD_LIMITS.WORD_MAX_LEN} caracteres` },
        { status: 400 }
      );
    }

    const [session] = await sql`
      SELECT mode, fixed_words, status
      FROM casara.word_sessions
      WHERE id = ${id} AND host_token = ${hostToken}
    `;
    if (!session) {
      return NextResponse.json(
        { error: "sessão não encontrada ou token inválido" },
        { status: 404 }
      );
    }
    if (session.mode !== "fixed") {
      return NextResponse.json(
        { error: "só é possível acrescentar palavras em sessões no modo fixo" },
        { status: 400 }
      );
    }
    if (session.status !== "active") {
      return NextResponse.json(
        { error: "sessão não está mais ativa" },
        { status: 409 }
      );
    }

    const existing: string[] = session.fixed_words ?? [];
    const existingNormalized = new Set(existing.map(normalizeWord));
    const newOnes = incoming.filter((w) => !existingNormalized.has(normalizeWord(w)));

    if (newOnes.length === 0) {
      return NextResponse.json({ fixed_words: existing });
    }

    const merged = [...existing, ...newOnes];
    if (merged.length > WORD_CLOUD_LIMITS.FIXED_WORDS_MAX) {
      return NextResponse.json(
        { error: `banco de palavras atingiu o limite de ${WORD_CLOUD_LIMITS.FIXED_WORDS_MAX}` },
        { status: 400 }
      );
    }

    const [updated] = await sql`
      UPDATE casara.word_sessions
      SET fixed_words = ${JSON.stringify(merged)}, updated_at = NOW()
      WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active'
      RETURNING fixed_words
    `;
    if (!updated) {
      return NextResponse.json(
        { error: "sessão não está mais ativa" },
        { status: 409 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/word-sessions/[id]/fixed-words] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
