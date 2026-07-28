import {NextRequest, NextResponse} from 'next/server';
import sql from '@/lib/db';
import { parseBrowser } from '@/lib/request-meta';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { event_name, route, payload = {}, resolution } = await request.json();

    if (!event_name) {
      return NextResponse.json({ error: 'event_name is required' }, { status: 400 });
    }

    const country = request.headers.get('x-vercel-ip-country') ?? null;
    const city    = request.headers.get('x-vercel-ip-city')    ?? null;
    const browser = parseBrowser(request.headers.get('user-agent') ?? '');

    await sql`
      INSERT INTO casara.events (event_name, route, payload, resolution, country, city, browser)
      VALUES (
        ${event_name},
        ${route ?? null},
        ${JSON.stringify(payload)},
        ${resolution ?? null},
        ${country},
        ${city},
        ${browser}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/events] error:', err);
    return NextResponse.json(
      { error: 'internal error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}