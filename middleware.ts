import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const SKIP_PREFIXES = ['/_next', '/api', '/favicon', '/_vercel'];

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Other';
}

function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|preview/i.test(ua);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!process.env.DATABASE_URL) return NextResponse.next();

  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) return NextResponse.next();

  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const city    = request.headers.get('x-vercel-ip-city')    ?? null;
  const browser = parseBrowser(ua);

  const sql = neon(process.env.DATABASE_URL);
  // fire-and-forget: não bloqueia a resposta
  sql`
    INSERT INTO events (event_name, route, country, city, browser)
    VALUES ('page_view', ${pathname}, ${country}, ${city}, ${browser})
  `.catch(() => {});

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};