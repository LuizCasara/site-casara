import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const [totals] = await sql`
      SELECT
        COUNT(*)                                          AS total_completed,
        ROUND(AVG((payload->>'sanguineo')::numeric))     AS avg_sanguineo,
        ROUND(AVG((payload->>'colerico')::numeric))      AS avg_colerico,
        ROUND(AVG((payload->>'melancolico')::numeric))   AS avg_melancolico,
        ROUND(AVG((payload->>'fleumatico')::numeric))    AS avg_fleumatico,
        ROUND(AVG((payload->>'duration_seconds')::numeric)) AS avg_duration_seconds
      FROM events
      WHERE event_name = 'temperament_completed'
    `;

    const byPrimary = await sql`
      SELECT
        payload->>'primary' AS temperament,
        COUNT(*)            AS count
      FROM events
      WHERE event_name = 'temperament_completed'
      GROUP BY payload->>'primary'
      ORDER BY count DESC
    `;

    const [started] = await sql`
      SELECT COUNT(*) AS total_started
      FROM events
      WHERE event_name = 'temperament_started'
    `;

    return NextResponse.json({
      total_started:    Number(started.total_started),
      total_completed:  Number(totals.total_completed),
      conversion_rate:  totals.total_completed > 0
        ? Math.round((Number(totals.total_completed) / Number(started.total_started)) * 100)
        : 0,
      averages: {
        sanguineo:        Number(totals.avg_sanguineo),
        colerico:         Number(totals.avg_colerico),
        melancolico:      Number(totals.avg_melancolico),
        fleumatico:       Number(totals.avg_fleumatico),
        duration_seconds: Number(totals.avg_duration_seconds),
      },
      by_primary: byPrimary.map((r) => ({
        temperament: r.temperament,
        count:       Number(r.count),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}