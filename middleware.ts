import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { REAL_ROUTE_RE } from '@/lib/routes';
import { parseBrowser } from '@/lib/request-meta';

const SKIP_PREFIXES = ['/_next', '/api', '/favicon', '/_vercel'];

function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|preview/i.test(ua);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Só rastreia page_view para rotas reais do site — filtra tanto arquivos
  // estáticos (manifest.json, *.jpg, ...) quanto sondas de bot/scanner
  // (/.env, /app/next.config.js, ...) na origem.
  if (!REAL_ROUTE_RE.test(pathname)) {
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
    INSERT INTO casara.events (event_name, route, country, city, browser)
    VALUES ('page_view', ${pathname}, ${country}, ${city}, ${browser})
  `.catch(() => {});

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};