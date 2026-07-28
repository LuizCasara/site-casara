import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { REAL_ROUTE_PATTERN } from '@/lib/routes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'all';
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 36500;

  try {
    // Só arquivos e rotas reais (mesma allowlist do middleware) contam no topo
    // e em TOP_ROTAS — descarta page_view de arquivo estático e sondas de bot
    // que ficaram no histórico de antes desse filtro existir no middleware.
    const IS_REAL_ROUTE = sql`route ~ ${REAL_ROUTE_PATTERN}`;

    const [overview] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name != 'page_view' OR ${IS_REAL_ROUTE})              AS total_events,
        COUNT(*) FILTER (WHERE event_name = 'page_view' AND ${IS_REAL_ROUTE})               AS total_page_views,
        COUNT(DISTINCT route) FILTER (WHERE event_name = 'page_view' AND ${IS_REAL_ROUTE})  AS unique_routes
      FROM casara.events
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
    `;

    const byEvent = await sql`
      SELECT event_name, COUNT(*) AS count
      FROM casara.events
      WHERE event_name != 'page_view'
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY event_name
      ORDER BY count DESC
    `;

    const byRoute = await sql`
      SELECT route, COUNT(*) AS count
      FROM casara.events
      WHERE event_name = 'page_view'
        AND ${IS_REAL_ROUTE}
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY route
      ORDER BY count DESC
      LIMIT 10
    `;

    const byBrowser = await sql`
      SELECT browser, COUNT(*) AS count
      FROM casara.events
      WHERE browser IS NOT NULL
        AND browser != ''
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY browser
      ORDER BY count DESC
    `;

    const byCountry = await sql`
      SELECT country, COUNT(*) AS count
      FROM casara.events
      WHERE country IS NOT NULL
        AND country != ''
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `;

    const timeline = await sql`
      SELECT
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
        COUNT(*)                                 AS count
      FROM casara.events
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    const [temperament] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'temperament_started')                                                      AS total_started,
        COUNT(*) FILTER (WHERE event_name = 'temperament_completed')                                                    AS total_completed,
        ROUND(AVG((payload->>'sanguineo')::numeric)        FILTER (WHERE event_name = 'temperament_completed'))         AS avg_sanguineo,
        ROUND(AVG((payload->>'colerico')::numeric)         FILTER (WHERE event_name = 'temperament_completed'))         AS avg_colerico,
        ROUND(AVG((payload->>'melancolico')::numeric)      FILTER (WHERE event_name = 'temperament_completed'))         AS avg_melancolico,
        ROUND(AVG((payload->>'fleumatico')::numeric)       FILTER (WHERE event_name = 'temperament_completed'))         AS avg_fleumatico,
        ROUND(AVG((payload->>'duration_seconds')::numeric) FILTER (WHERE event_name = 'temperament_completed'))         AS avg_duration_seconds
      FROM casara.events
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
    `;

    const byPrimary = await sql`
      SELECT payload->>'primary' AS temperament, COUNT(*) AS count
      FROM casara.events
      WHERE event_name = 'temperament_completed'
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY payload->>'primary'
      ORDER BY count DESC
    `;

    const [loveLanguages] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'love_language_started')                                                          AS total_started,
        COUNT(*) FILTER (WHERE event_name = 'love_language_completed')                                                        AS total_completed,
        COUNT(*) FILTER (WHERE event_name = 'love_language_completed' AND (payload->>'combined')::boolean)                    AS total_combined,
        ROUND(AVG((payload->>'afirmacao')::numeric)        FILTER (WHERE event_name = 'love_language_completed'))             AS avg_afirmacao,
        ROUND(AVG((payload->>'qualidade')::numeric)        FILTER (WHERE event_name = 'love_language_completed'))             AS avg_qualidade,
        ROUND(AVG((payload->>'presentes')::numeric)        FILTER (WHERE event_name = 'love_language_completed'))             AS avg_presentes,
        ROUND(AVG((payload->>'servico')::numeric)          FILTER (WHERE event_name = 'love_language_completed'))             AS avg_servico,
        ROUND(AVG((payload->>'toque')::numeric)             FILTER (WHERE event_name = 'love_language_completed'))             AS avg_toque,
        ROUND(AVG((payload->>'duration_seconds')::numeric) FILTER (WHERE event_name = 'love_language_completed'))             AS avg_duration_seconds
      FROM casara.events
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
    `;

    const loveLanguagesByPrimary = await sql`
      SELECT payload->>'primary' AS language, COUNT(*) AS count
      FROM casara.events
      WHERE event_name = 'love_language_completed'
        AND created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY payload->>'primary'
      ORDER BY count DESC
    `;

    return NextResponse.json({
      overview: {
        total_events:     Number(overview.total_events),
        total_page_views: Number(overview.total_page_views),
        unique_routes:    Number(overview.unique_routes),
      },
      by_event:   byEvent.map(r  => ({ event_name: r.event_name as string, count: Number(r.count) })),
      by_route:   byRoute.map(r  => ({ route: r.route as string,           count: Number(r.count) })),
      by_browser: byBrowser.map(r => ({ browser: r.browser as string,      count: Number(r.count) })),
      by_country: byCountry.map(r => ({ country: r.country as string,      count: Number(r.count) })),
      timeline:   timeline.map(r  => ({ day: r.day as string,              count: Number(r.count) })),
      temperament: {
        total_started:        Number(temperament.total_started),
        total_completed:      Number(temperament.total_completed),
        avg_sanguineo:        Number(temperament.avg_sanguineo),
        avg_colerico:         Number(temperament.avg_colerico),
        avg_melancolico:      Number(temperament.avg_melancolico),
        avg_fleumatico:       Number(temperament.avg_fleumatico),
        avg_duration_seconds: Number(temperament.avg_duration_seconds),
        by_primary: byPrimary.map(r => ({
          temperament: r.temperament as string,
          count:       Number(r.count),
        })),
      },
      love_languages: {
        total_started:        Number(loveLanguages.total_started),
        total_completed:      Number(loveLanguages.total_completed),
        combined_rate: Number(loveLanguages.total_completed) > 0
          ? Math.round((Number(loveLanguages.total_combined) / Number(loveLanguages.total_completed)) * 100)
          : 0,
        avg_afirmacao:        Number(loveLanguages.avg_afirmacao),
        avg_qualidade:        Number(loveLanguages.avg_qualidade),
        avg_presentes:        Number(loveLanguages.avg_presentes),
        avg_servico:          Number(loveLanguages.avg_servico),
        avg_toque:            Number(loveLanguages.avg_toque),
        avg_duration_seconds: Number(loveLanguages.avg_duration_seconds),
        by_primary: loveLanguagesByPrimary.map(r => ({
          language: r.language as string,
          count:    Number(r.count),
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
