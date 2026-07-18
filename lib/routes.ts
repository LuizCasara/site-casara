/** Slugs of every mini-app under /app/[app_name] — keep in sync with the
 * `appCategories` list in app/app/page.tsx and app/app/[app_name]/page.tsx. */
export const APP_SLUGS = [
  "descubra-seu-temperamento",
  "rule-of-three",
  "compound-interest",
  "percentage",
  "kitchen-units",
  "currency",
  "bitcoin",
  "file-size",
  "number-systems",
  "qr-code",
  "image-to-svg",
  "nuvem-de-palavras",
  "quiz-ao-vivo",
  "sorteio",
] as const;

const SESSION_ID = "[0-9a-f]{10}"; // lib/session-ids.ts generateSessionId()
const RESULTS_TOKEN = "[0-9a-f-]{20,40}"; // lib/session-ids.ts PARTICIPANT_ID_RE

/**
 * POSIX/JS-compatible regex source matching only real, addressable site
 * routes — deliberately an allowlist, not a blocklist, so it filters out
 * both static-file page_views (manifest.json, *.jpg, ...) and bot/scanner
 * probes (/.env, /app/next.config.js, ...) in one place. Used by
 * middleware.ts (page_view tracking) and app/api/metrics/stats/route.ts
 * (TOP_ROTAS + top counters), so they can't drift apart.
 */
export const REAL_ROUTE_PATTERN =
  `^/$` +
  `|^/(about|projects|app|casamento|stats)$` +
  `|^/app/(${APP_SLUGS.join("|")})$` +
  `|^/[wq]/${SESSION_ID}$` +
  `|^/[wq]/${SESSION_ID}/resultados/${RESULTS_TOKEN}$`;

export const REAL_ROUTE_RE = new RegExp(REAL_ROUTE_PATTERN);
