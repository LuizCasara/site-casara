import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'all';
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 36500;
  const route = searchParams.get('route');
  const eventName = searchParams.get('event_name');

  if (!route && !eventName) {
    return NextResponse.json({ error: 'route_or_event_name_required' }, { status: 400 });
  }

  try {
    const rows = route
      ? await sql`
          SELECT country, COUNT(*) AS count
          FROM casara.events
          WHERE event_name = 'page_view'
            AND route = ${route}
            AND country IS NOT NULL AND country != ''
            AND created_at > NOW() - INTERVAL '1 day' * ${days}
          GROUP BY country
          ORDER BY count DESC
          LIMIT 10
        `
      : await sql`
          SELECT country, COUNT(*) AS count
          FROM casara.events
          WHERE event_name = ${eventName}
            AND country IS NOT NULL AND country != ''
            AND created_at > NOW() - INTERVAL '1 day' * ${days}
          GROUP BY country
          ORDER BY count DESC
          LIMIT 10
        `;

    const [totals] = route
      ? await sql`
          SELECT COUNT(*) AS total
          FROM casara.events
          WHERE event_name = 'page_view'
            AND route = ${route}
            AND created_at > NOW() - INTERVAL '1 day' * ${days}
        `
      : await sql`
          SELECT COUNT(*) AS total
          FROM casara.events
          WHERE event_name = ${eventName}
            AND created_at > NOW() - INTERVAL '1 day' * ${days}
        `;

    return NextResponse.json({
      total:      Number(totals.total),
      by_country: rows.map(r => ({ country: r.country as string, count: Number(r.count) })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
