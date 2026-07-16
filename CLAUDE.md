# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured in this project.

## Architecture

This is a **Next.js 15 (App Router)** personal portfolio site with Tailwind CSS. The site is deployed on Vercel and uses `@vercel/analytics` for event tracking.

### Route Structure

- `/` — Homepage with random quote/tip generator and quick-access cards
- `/about` — Personal bio, social links, gaming/music profiles
- `/projects` — Portfolio of real client projects
- `/app` — Mini-apps hub listing all tools by category
- `/app/[app_name]` — Dynamic route that lazy-loads the matching app component
- `/casamento` — Standalone wedding invitation page (own `layout.tsx`, `icon.tsx`, `opengraph-image.tsx`); photos live in `public/casamento/`
- `/stats` — Internal analytics dashboard reading from the Neon `events` table via `/api/metrics/*`
- `/w/[id]` — Public participant page for a live "Nuvem de Palavras" word-cloud session (standalone layout, no header/footer)
- `/w/[id]/resultados/[token]` — Live results display for the same session (bolhas/texto/gráfico views), gated by a separate `results_token` in the path — see "Nuvem de Palavras" below

### Mini-Apps System

The core architectural pattern: `app/app/[app_name]/page.tsx` resolves a URL slug to a file path, then **dynamically imports** the corresponding component from `apps/<category>/<slug>.tsx`. App metadata (title, description, path) is defined inline in both `app/app/page.tsx` (for the listing) and `app/app/[app_name]/page.tsx` (for routing) — these two lists must stay in sync.

Current apps live in:
- `apps/math/` — rule-of-three, compound-interest, percentage
- `apps/conversion/` — kitchen-units, currency, bitcoin, file-size, number-systems
- `apps/personalization/` — qr-code, image-to-svg
- `apps/desenvolvimento-pessoal/` — descubra-seu-temperamento
- `apps/dinamicas/` — nuvem-de-palavras (host UI for live word-cloud sessions; the public-facing side lives outside the mini-app shell, at `/w/[id]` — see "Nuvem de Palavras" below)

**To add a new app:** create the component in `apps/<category>/<slug>.tsx`, then add its entry to the `appCategories` array in both listing and routing files.

### API Routes

- `POST /api/telegram` — Sends temperament test results to a Telegram group (supports `type: "temperament-test"`)
- `POST /api/send-email` — Sends formatted HTML email via nodemailer/Gmail
- `POST /api/events` — Inserts an analytics event row into the Neon `events` table
- `GET /api/metrics/stats` — Aggregate stats (page views, events, browsers, countries, timeline, temperament breakdown) for `/stats`, filterable by `period` (`7d` | `30d` | `all`)
- `GET /api/metrics/temperament` — Temperament test funnel/averages only
- `POST /api/word-sessions` — Creates a word-cloud session, returns `{id, host_token, results_token}` once
- `GET /api/word-sessions/[id]` / `PATCH /api/word-sessions/[id]` — Public read of session metadata / host-only update (`accepting_responses` toggle or terminal `status` change, requires `x-host-token`)
- `PATCH /api/word-sessions/[id]/fixed-words` — Host-only, appends words to a fixed-mode session's word bank (requires `x-host-token`)
- `POST /api/word-sessions/[id]/responses` — Public participant submission, one per `participant_id` per session (DB-enforced)
- `GET /api/word-sessions/[id]/results` — Aggregated word counts, requires `x-results-token` or `x-host-token` header

### Analytics & Data

Two analytics systems run side by side, both driven from `utils/analytics.ts`'s `trackEvent`: Vercel Analytics (`track()`) and a self-hosted Neon Postgres store.

- `lib/db.ts` — lazy-initialized Neon client (`sql` tagged template) reading `DATABASE_URL`; avoids connecting at build time
- `lib/schema.sql` — DDL for the single `events` table (event_name, route, payload JSONB, geo/browser columns); run manually in the Neon SQL editor
- `middleware.ts` — fire-and-forget inserts a `page_view` event per request (geo from Vercel headers, bot UAs filtered, skips `_next`/`api`/`_vercel`/favicon)
- Adding a new tracked event: add a `trackX` function in `utils/analytics.ts`, call it from the component, and (optionally) add its label to `EVENT_LABELS` in `app/stats/page.tsx` for the dashboard

### Nuvem de Palavras (live word-cloud dynamics)

A Mentimeter-style live activity: a host creates a session in `apps/dinamicas/nuvem-de-palavras.tsx`, shares the `/w/[id]` link/QR code, and participants submit words that render as an animated word cloud (bolhas/texto) or ranked bar chart (gráfico) on `/w/[id]/resultados/[token]`, polling every ~2.5s.

- `lib/word-cloud.ts` — shared types (`SessionMode`, `SessionStatus`), validation/normalization (`normalizeWord`, `dedupeWords`, `WORD_CLOUD_LIMITS`), the font-size curve (`computeFontSizes`), and the `HOT_ACCENT_RGB`/`rgbToCss` color shared by the "texto" and "gráfico" views
- Data model: `word_sessions` (one row per session, holds `host_token` + `results_token`), `word_submissions` (one row per participant, `UNIQUE(session_id, participant_id)` enforces one submission per device at the DB level), `word_entries` (one row per submitted word) — see `lib/schema.sql`
- **These tables are qualified under the `geav` Postgres schema** (`CREATE TABLE geav.word_sessions ...`) — run `lib/schema.sql` as-is in the Neon SQL editor. Application queries in `app/api/word-sessions/**` reference the tables unqualified (`word_sessions`, not `geav.word_sessions`) because the DB connection's `search_path` already resolves to `geav`; do not add a `geav.` prefix to application-layer queries
- Three tokens, three trust levels: `host_token` (full control, kept in the host's browser `localStorage` under the `minhas-nuvens` key), `results_token` (read-only, embedded in the `/resultados/[token]` URL so it can be opened on a separate screen/projector), `participant_id` (a `crypto.randomUUID()` a participant's browser generates once and reuses, enforcing the one-submission-per-device rule)
- `components/WordCloud.tsx` — spiral word-packing + auto-fit-to-container scaling (canvas `measureText` for sizing, framer-motion for layout/pulse animation); `components/WordBarChart.tsx` — top-20 + "Outros" ranked bar chart. Both read from the same `GET .../results` payload

### Environment Variables

Required in `.env.local`:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_THREAD_ID=
EMAIL_USER=
EMAIL_PASS=
DATABASE_URL=
```

### Analytics

All user interactions are tracked via `@vercel/analytics`. Tracking functions live in `utils/analytics.ts` and are imported individually per page/component. Add new events there to maintain consistency.

### PDF Generation

`utils/pdf-generator.tsx` exports `PdfContent` (a hidden React component rendered off-screen) and `generatePdf` (uses html2canvas → jsPDF). Used only by the temperament test app.

### Fonts

Two Google Fonts loaded via `next/font`: `Quicksand` (body, `--font-quicksand`) and `Space Mono` (mono, `--font-space-mono`).
