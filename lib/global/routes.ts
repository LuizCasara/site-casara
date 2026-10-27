/** Slugs of every mini-app under /app/[app_name] — keep in sync with the
 * `appCategories` list in app/(apps)/app/(global)/page.tsx and app/(apps)/app/[app_name]/page.tsx. */
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

const SESSION_ID = "[0-9a-f]{10}"; // lib/apps/session-ids.ts generateSessionId()
const RESULTS_TOKEN = "[0-9a-f-]{20,40}"; // lib/apps/session-ids.ts PARTICIPANT_ID_RE

/**
 * POSIX/JS-compatible regex source matching only real, addressable site
 * routes — deliberately an allowlist, not a blocklist, so it filters out
 * both static-file page_views (manifest.json, *.jpg, ...) and bot/scanner
 * probes (/.env, /app/next.config.js, ...) in one place. Used by
 * middleware.ts (page_view tracking) and app/(global)/api/metrics/stats/route.ts
 * (TOP_ROTAS + top counters), so they can't drift apart.
 */
export const REAL_ROUTE_PATTERN =
  `^/$` +
  `|^/(about|projects|app|casamento|stats)$` +
  `|^/livros$` +
  `|^/livros/lista$` +
  `|^/livros/[a-z0-9-]+$` +
  `|^/ingress$` +
  `|^/ingress/(ranking|fencherlc)$` +
  `|^/ingress/fencherlc/linha-do-tempo$` +
  `|^/ingress/fencherlc/medalha/[a-z0-9-]+$` +
  `|^/app/(${APP_SLUGS.join("|")})$` +
  `|^/[wq]/${SESSION_ID}$` +
  `|^/[wq]/${SESSION_ID}/resultados/${RESULTS_TOKEN}$`;

export const REAL_ROUTE_RE = new RegExp(REAL_ROUTE_PATTERN);
/**
 * Das rotas reais, as únicas cujo `page_view` o proxy ainda grava no Neon.
 *
 * Cada `page_view` isolado acorda o compute do Neon por no mínimo 5 min (ele
 * só suspende após 5 min sem query). Numa medição de 30 dias (out/2026), os
 * page views abriam sozinhos a maioria das janelas de compute; os cliques quase
 * sempre caíam numa janela já aberta. Home, about, projects, `/app*` e
 * `/casamento` saíram: o Vercel Analytics já conta esses acessos, e nada no
 * site lê esses números do banco. Ficaram:
 * - `/ingress*`: o painel INGRESS_ANALYSIS do `/stats` conta acessos por aqui;
 * - `/livros*`: os gráficos da sala de leitura;
 * - `/w/*` e `/q/*`: durante uma dinâmica o banco já está acordado pelo
 *   polling da sessão, então gravar não custa nada a mais.
 *
 * `REAL_ROUTE_PATTERN` continua o allowlist completo porque o `/stats` o usa
 * para filtrar o histórico, que tem page views de todas as rotas.
 */
const PAGE_VIEW_ROUTE_RE = /^\/(ingress|livros)(\/|$)|^\/[wq]\//;

export function shouldRecordPageView(pathname: string): boolean {
  return REAL_ROUTE_RE.test(pathname) && PAGE_VIEW_ROUTE_RE.test(pathname);
}

