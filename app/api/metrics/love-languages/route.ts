import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const [totals] = await sql`
      SELECT
        COUNT(*)                                            AS total_completed,
        ROUND(AVG((payload->>'afirmacao')::numeric))        AS avg_afirmacao,
        ROUND(AVG((payload->>'qualidade')::numeric))        AS avg_qualidade,
        ROUND(AVG((payload->>'presentes')::numeric))        AS avg_presentes,
        ROUND(AVG((payload->>'servico')::numeric))          AS avg_servico,
        ROUND(AVG((payload->>'toque')::numeric))             AS avg_toque,
        ROUND(AVG((payload->>'duration_seconds')::numeric)) AS avg_duration_seconds,
        COUNT(*) FILTER (WHERE (payload->>'combined')::boolean) AS total_combined
      FROM casara.events
      WHERE event_name = 'love_language_completed'
    `;

    const byPrimary = await sql`
      SELECT
        payload->>'primary' AS language,
        COUNT(*)             AS count
      FROM casara.events
      WHERE event_name = 'love_language_completed'
      GROUP BY payload->>'primary'
      ORDER BY count DESC
    `;

    const [started] = await sql`
      SELECT COUNT(*) AS total_started
      FROM casara.events
      WHERE event_name = 'love_language_started'
    `;

    return NextResponse.json({
      total_started:    Number(started.total_started),
      total_completed:  Number(totals.total_completed),
      conversion_rate:  totals.total_completed > 0
        ? Math.round((Number(totals.total_completed) / Number(started.total_started)) * 100)
        : 0,
      combined_rate: totals.total_completed > 0
        ? Math.round((Number(totals.total_combined) / Number(totals.total_completed)) * 100)
        : 0,
      averages: {
        afirmacao:        Number(totals.avg_afirmacao),
        qualidade:        Number(totals.avg_qualidade),
        presentes:        Number(totals.avg_presentes),
        servico:          Number(totals.avg_servico),
        toque:            Number(totals.avg_toque),
        duration_seconds: Number(totals.avg_duration_seconds),
      },
      by_primary: byPrimary.map((r) => ({
        language: r.language,
        count:    Number(r.count),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
