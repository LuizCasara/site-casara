import {NextRequest, NextResponse} from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { event_name, route, payload = {}, resolution } = await request.json();

    if (!event_name) {
      return NextResponse.json({ error: 'event_name is required' }, { status: 400 });
    }

    await sql`
      INSERT INTO events (event_name, route, payload, resolution)
      VALUES (
        ${event_name},
        ${route ?? null},
        ${JSON.stringify(payload)},
        ${resolution ?? null}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}