import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  WORD_CLOUD_LIMITS,
  dedupeWords,
  generateSessionId,
  generateToken,
  maxWordsCeiling,
} from "@/lib/word-cloud";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const mode = body.mode;

    if (!title || title.length > WORD_CLOUD_LIMITS.TITLE_MAX) {
      return NextResponse.json(
        { error: `title é obrigatório (máx. ${WORD_CLOUD_LIMITS.TITLE_MAX} caracteres)` },
        { status: 400 }
      );
    }
    if (description.length > WORD_CLOUD_LIMITS.DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `description excede ${WORD_CLOUD_LIMITS.DESCRIPTION_MAX} caracteres` },
        { status: 400 }
      );
    }
    if (mode !== "fixed" && mode !== "open") {
      return NextResponse.json(
        { error: "mode deve ser 'fixed' ou 'open'" },
        { status: 400 }
      );
    }

    let fixedWords: string[] | null = null;

    if (mode === "fixed") {
      const rawWords = Array.isArray(body.fixed_words) ? body.fixed_words : [];
      fixedWords = dedupeWords(
        rawWords.filter((w: unknown) => typeof w === "string")
      );

      if (fixedWords.some((w) => w.length > WORD_CLOUD_LIMITS.WORD_MAX_LEN)) {
        return NextResponse.json(
          { error: `cada palavra deve ter no máx. ${WORD_CLOUD_LIMITS.WORD_MAX_LEN} caracteres` },
          { status: 400 }
        );
      }
      if (
        fixedWords.length < WORD_CLOUD_LIMITS.FIXED_WORDS_MIN ||
        fixedWords.length > WORD_CLOUD_LIMITS.FIXED_WORDS_MAX
      ) {
        return NextResponse.json(
          {
            error: `fixed_words deve ter entre ${WORD_CLOUD_LIMITS.FIXED_WORDS_MIN} e ${WORD_CLOUD_LIMITS.FIXED_WORDS_MAX} palavras`,
          },
          { status: 400 }
        );
      }
    }

    const ceiling = maxWordsCeiling(mode, fixedWords?.length ?? 0);
    const maxWords = Number(body.max_words);
    if (
      !Number.isInteger(maxWords) ||
      maxWords < WORD_CLOUD_LIMITS.MAX_WORDS_FLOOR ||
      maxWords > ceiling
    ) {
      return NextResponse.json(
        { error: `max_words deve ser um inteiro entre ${WORD_CLOUD_LIMITS.MAX_WORDS_FLOOR} e ${ceiling}` },
        { status: 400 }
      );
    }

    const hostToken = generateToken();
    const resultsToken = generateToken();

    let id = generateSessionId();
    let attempts = 0;
    for (;;) {
      try {
        await sql`
          INSERT INTO casara.word_sessions (id, host_token, results_token, title, description, mode, fixed_words, max_words)
          VALUES (
            ${id},
            ${hostToken},
            ${resultsToken},
            ${title},
            ${description || null},
            ${mode},
            ${fixedWords ? JSON.stringify(fixedWords) : null},
            ${maxWords}
          )
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
    console.error("[api/word-sessions] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
