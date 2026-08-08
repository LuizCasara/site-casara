import {NextRequest, NextResponse} from 'next/server';
import sql from '@/lib/db';
import { parseBrowser } from '@/lib/request-meta';
import { shouldRecordEvents } from '@/lib/analytics-env';

export const dynamic = 'force-dynamic';

/**
 * Teto do lote. O cliente esvazia a fila a cada 10 eventos, então na prática
 * um lote legítimo nunca passa disso — a folga é só para o envio de saída, que
 * carrega o que tiver sobrado. Serve como limite de abuso: sem ele, um POST
 * com dez mil itens viraria dez mil linhas numa requisição.
 */
const LOTE_MAXIMO = 50;

type EventoRecebido = {
  event_name?: unknown;
  route?: unknown;
  payload?: unknown;
  resolution?: unknown;
};

const texto = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, 512) : null;

export async function POST(request: NextRequest) {
  try {
    // Barreira de ambiente: 200 e não 403, porque não é erro do cliente — em
    // dev e preview o evento simplesmente não interessa. Ver lib/analytics-env.
    if (!shouldRecordEvents()) {
      return NextResponse.json({ ok: true, skipped: 'nao-e-producao' });
    }

    const corpo = await request.json();
    // Aceita o lote (formato atual) e o objeto solto: uma aba aberta antes do
    // deploy continua mandando um evento por vez até ser recarregada.
    const recebidos: EventoRecebido[] = Array.isArray(corpo) ? corpo : [corpo];

    if (recebidos.length === 0) return NextResponse.json({ ok: true, inserted: 0 });
    if (recebidos.length > LOTE_MAXIMO) {
      return NextResponse.json({ error: 'lote grande demais' }, { status: 400 });
    }

    const validos = recebidos.filter((e) => typeof e?.event_name === 'string' && e.event_name);
    if (validos.length === 0) {
      return NextResponse.json({ error: 'event_name is required' }, { status: 400 });
    }

    const country = request.headers.get('x-vercel-ip-country') ?? null;
    const city    = request.headers.get('x-vercel-ip-city')    ?? null;
    const browser = parseBrowser(request.headers.get('user-agent') ?? '');

    // UNNEST, e não um INSERT por item num laço: o lote inteiro vira UMA ida ao
    // Neon. Era esse o ponto do batching — trocar N conexões HTTP por uma. Os
    // três campos de contexto ficam fora do array porque valem para o lote
    // todo: vêm dos headers desta requisição, não de cada evento.
    const nomes       = validos.map((e) => (e.event_name as string).slice(0, 128));
    const rotas       = validos.map((e) => texto(e.route));
    const payloads    = validos.map((e) => JSON.stringify(e.payload ?? {}));
    const resolucoes  = validos.map((e) => texto(e.resolution));

    await sql`
      INSERT INTO casara.events (event_name, route, payload, resolution, country, city, browser)
      SELECT nome, rota, carga::jsonb, resolucao, ${country}, ${city}, ${browser}
      FROM UNNEST(
        ${nomes}::text[],
        ${rotas}::text[],
        ${payloads}::text[],
        ${resolucoes}::text[]
      ) AS t(nome, rota, carga, resolucao)
    `;

    return NextResponse.json({ ok: true, inserted: validos.length });
  } catch (err) {
    console.error('[api/events] error:', err);
    return NextResponse.json(
      { error: 'internal error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
