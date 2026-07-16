import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { SessionStatus } from "@/lib/word-cloud";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [session] = await sql`
      SELECT title, description, mode, fixed_words, max_words, accepting_responses, status
      FROM word_sessions
      WHERE id = ${id}
    `;
    if (!session) {
      return NextResponse.json({ error: "sessão não encontrada" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (err) {
    console.error("[api/word-sessions/[id]] GET error:", err);
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
    const hasAccepting = typeof body.accepting_responses === "boolean";
    const hasStatus = typeof body.status === "string";

    if (hasAccepting === hasStatus) {
      return NextResponse.json(
        { error: "envie exatamente um de accepting_responses ou status" },
        { status: 400 }
      );
    }

    if (hasAccepting) {
      const [row] = await sql`
        UPDATE word_sessions
        SET accepting_responses = ${body.accepting_responses}, updated_at = NOW()
        WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active'
        RETURNING id, accepting_responses, status
      `;
      if (!row) {
        return NextResponse.json(
          { error: "sessão não encontrada, token inválido, ou sessão não está mais ativa" },
          { status: 409 }
        );
      }
      return NextResponse.json(row);
    }

    const next = body.status as SessionStatus;
    if (next !== "saved" && next !== "discarded") {
      return NextResponse.json(
        { error: "status deve ser 'saved' ou 'discarded'" },
        { status: 400 }
      );
    }

    const [row] = await sql`
      UPDATE word_sessions
      SET status = ${next}, updated_at = NOW()
      WHERE id = ${id} AND host_token = ${hostToken} AND status = 'active'
      RETURNING id, status
    `;
    if (!row) {
      return NextResponse.json(
        { error: "sessão não encontrada, token inválido, ou transição de status inválida" },
        { status: 409 }
      );
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("[api/word-sessions/[id]] PATCH error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
