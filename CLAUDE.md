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
- `/q/[id]` — Public participant page for a live "Quiz ao Vivo" session (name entry → lobby → question → results, standalone layout)
- `/q/[id]/resultados/[token]` — Live results display (lobby/question/reveal/finished phases, podium + gabarito), gated by `results_token` — see "Quiz ao Vivo" below

### Mini-Apps System

The core architectural pattern: `app/app/[app_name]/page.tsx` resolves a URL slug to a file path, then **dynamically imports** the corresponding component from `apps/<category>/<slug>.tsx`. App metadata (title, description, path) is defined inline in both `app/app/page.tsx` (for the listing) and `app/app/[app_name]/page.tsx` (for routing) — these two lists must stay in sync.

Current apps live in:
- `apps/math/` — rule-of-three, compound-interest, percentage
- `apps/conversion/` — kitchen-units, currency, bitcoin, file-size, number-systems
- `apps/personalization/` — qr-code, image-to-svg
- `apps/desenvolvimento-pessoal/` — descubra-seu-temperamento
- `apps/dinamicas/` — nuvem-de-palavras and quiz-ao-vivo/ (host UI for live sessions; the public-facing side lives outside the mini-app shell, at `/w/[id]` and `/q/[id]` respectively — see "Nuvem de Palavras" and "Quiz ao Vivo" below). `quiz-ao-vivo` is a folder (`index.tsx` + `QuestionBuilder.tsx` + `ControlPanel.tsx`), not a single file — bigger feature, same dynamic-import mechanics (`@/apps/dinamicas/quiz-ao-vivo` resolves the folder's `index.tsx`)

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
- `POST /api/quiz-sessions` — Creates a quiz session + all its questions atomically, returns `{id, host_token, results_token}` once
- `GET /api/quiz-sessions/[id]` / `PATCH /api/quiz-sessions/[id]` — Public read (accepts `?participant_id=` to include that participant's own progress/score/rank) / host-only update (`{action: "start"|"reveal"|"next"|"restart"}` to progress or restart the quiz, or `{status: "saved"|"discarded"}` to finalize)
- `POST /api/quiz-sessions/[id]/join` — Public, registers a participant's display name (case-insensitive unique per session)
- `POST /api/quiz-sessions/[id]/answers` — Public, submits an answer to the current question; scoring (correctness + speed bonus) is computed entirely inside the SQL statement, never in Node
- `GET /api/quiz-sessions/[id]/results` — Leaderboard + current-question distribution + final gabarito, requires `x-results-token` or `x-host-token` header

### Analytics & Data

Two analytics systems run side by side, both driven from `utils/analytics.ts`'s `trackEvent`: Vercel Analytics (`track()`) and a self-hosted Neon Postgres store.

- `lib/db.ts` — lazy-initialized Neon client (`sql` tagged template) reading `DATABASE_URL`; avoids connecting at build time
- `lib/schema.sql` — DDL for the single `events` table (event_name, route, payload JSONB, geo/browser columns); run manually in the Neon SQL editor
- `middleware.ts` — fire-and-forget inserts a `page_view` event per request (geo from Vercel headers, bot UAs filtered, skips `_next`/`api`/`_vercel`/favicon)
- Adding a new tracked event: add a `trackX` function in `utils/analytics.ts`, call it from the component, and (optionally) add its label to `EVENT_LABELS` in `app/stats/page.tsx` for the dashboard

### Nuvem de Palavras (live word-cloud dynamics)

A Mentimeter-style live activity: a host creates a session in `apps/dinamicas/nuvem-de-palavras.tsx`, shares the `/w/[id]` link/QR code, and participants submit words that render as an animated word cloud (bolhas/texto) or ranked bar chart (gráfico) on `/w/[id]/resultados/[token]`, polling every ~2.5s.

- `lib/session-ids.ts` — generic helpers shared by every live-session feature: `generateSessionId()` (short collision-retry id), `generateToken()` (host/results secrets), `PARTICIPANT_ID_RE`. `lib/word-cloud.ts` re-exports the first two for backwards compatibility with existing call sites
- `lib/word-cloud.ts` — word-cloud-specific types (`SessionMode`, `SessionStatus`), validation/normalization (`normalizeWord`, `dedupeWords`, `WORD_CLOUD_LIMITS`), the font-size curve (`computeFontSizes`), and the `HOT_ACCENT_RGB`/`rgbToCss` color shared by the "texto" and "gráfico" views
- Data model: `word_sessions` (one row per session, holds `host_token` + `results_token`), `word_submissions` (one row per participant, `UNIQUE(session_id, participant_id)` enforces one submission per device at the DB level), `word_entries` (one row per submitted word) — see `lib/schema.sql`
- **These tables live under the `geav` Postgres schema** (`CREATE TABLE geav.word_sessions ...`) — run `lib/schema.sql` as-is in the Neon SQL editor. **The connection's `search_path` is just `"$user", public` — it does NOT include `geav`.** Every application query in `app/api/word-sessions/**` and `app/api/quiz-sessions/**` must explicitly qualify tables as `geav.word_sessions`, `geav.quiz_sessions`, etc. (confirmed by querying `SHOW search_path` directly — an earlier assumption that unqualified names resolved automatically was wrong and briefly left the app reading/writing a stray, unrelated `public.word_sessions` table instead of the real `geav` one; that duplicate may still exist and can be dropped once confirmed safe)
- Three tokens, three trust levels: `host_token` (full control, kept in the host's browser `localStorage` under the `minhas-nuvens` key), `results_token` (read-only, embedded in the `/resultados/[token]` URL so it can be opened on a separate screen/projector), `participant_id` (a `crypto.randomUUID()` a participant's browser generates once and reuses, enforcing the one-submission-per-device rule)
- `components/WordCloud.tsx` — spiral word-packing + auto-fit-to-container scaling (canvas `measureText` for sizing, framer-motion for layout/pulse animation); `components/WordBarChart.tsx` — top-20 + "Outros" ranked bar chart. Both read from the same `GET .../results` payload

### Quiz ao Vivo (live multiple-choice quiz)

A Kahoot-style live activity, sharing the same 3-token / 3-route architecture as Nuvem de Palavras but with its own data model: `apps/dinamicas/quiz-ao-vivo/` (host builds questions, then controls live progression), `/q/[id]` (participant: name → lobby → question → reveal → final score/rank), `/q/[id]/resultados/[token]` (big-screen: podium + full leaderboard + gabarito).

- `lib/quiz.ts` — `QuizPhase`, `QUIZ_LIMITS` (2-6 options, question/answer length caps), `QUIZ_SCORING` constants, `isValidQuestionDraft`, and `clockOffsetMs`/`correctedNow` (client clock-drift correction for the countdown — see below)
- Data model: `quiz_sessions` (adds a `phase` state machine on top of the usual `status`: `lobby → question → reveal → ... → finished`, plus `current_question_index`/`current_question_started_at`/`finished_at`), `quiz_questions` (fixed at creation, `options` JSONB + `correct_option_index`, optional `time_limit_seconds`), `quiz_participants` (named, unique name per session via `CREATE UNIQUE INDEX ... (session_id, lower(name))`), `quiz_answers` (FK's to `quiz_participants` so answering without joining is impossible at the DB level) — see `lib/schema.sql`
- **Every host action (`start`/`reveal`/`next`/`restart`) is a single `UPDATE ... WHERE phase = <expected phase>`** — this is what makes double-clicks and race conditions no-ops (409) instead of corrupting state, with no explicit locking needed. `restart` is the one exception with a side effect beyond the UPDATE: in the same statement it also `DELETE`s that session's `quiz_participants` (guarded by the same phase/token check, so an unauthorized/mistimed call deletes nothing) — `quiz_answers` cascades away with it via `ON DELETE CASCADE`. This is deliberate: the unique-name index is per-session, not per-round, so keeping old participants around after a restart would permanently block anyone else from reusing their name in a later round. Scoring in `POST /api/quiz-sessions/[id]/answers` follows the general "one atomic guarded statement" principle too: one CTE-based `INSERT` that reads `current_question_started_at` and computes correctness + speed bonus using the **Postgres clock**, never the client's or the serverless function's — this is the one rule to preserve if this route is ever touched
- The countdown (`components/QuizCountdown.tsx`) is a local `setInterval` (~150ms) computing `deadline - Date.now()`, corrected by `clockOffsetMs(server_time)` from the last poll — a participant's wrong device clock would otherwise show the timer expiring early/late. The countdown itself is purely visual, but for timed questions the server independently enforces the same deadline: `POST /api/quiz-sessions/[id]/answers` rejects an answer once `NOW() > current_question_started_at + time_limit_seconds` even while `phase` is still `'question'` (host hasn't clicked reveal yet) — so `phase` alone is no longer sufficient to reason about whether an answer will be accepted for a timed question, only in combination with elapsed time
- `components/QuizLeaderboard.tsx` and `components/QuizPodium.tsx` are shared between the host's `ControlPanel.tsx` and the `/resultados/[token]` big screen — both poll the same `GET .../results` shape. `ControlPanel.tsx` (private, host-only) shows the plain leaderboard immediately on `finished`; the public results page and `/q/[id]` gate it behind the suspense reveal below
- **Final podium reveal is a suspense sequence, not an instant reveal**: when the `next` action closes out the last question, the same atomic `UPDATE` stamps `finished_at = NOW()`. Both `/q/[id]/resultados/[token]` and `/q/[id]` independently compute `elapsedMs` from that shared server timestamp (clock-corrected the same way as the countdown) and derive the current stage from `PODIUM_REVEAL`/`podiumRevealedPlaces`/`podiumFullyRevealed` in `lib/quiz.ts` — no extra network round-trip or new phase is needed, it's pure client-side timing anchored to one server timestamp. The results page reveals 3rd → 2nd → 1st (each place animated in by `QuizPodium`'s `revealedPlaces` prop) then the full leaderboard once `podiumFullyRevealed`; the participant page shows a "Apurando o resultado..." suspense screen and only renders the participant's own rank/score at that same `podiumFullyRevealed` instant. This is cosmetic pacing like the countdown, not a security boundary: `GET .../results` already returns the full ordered leaderboard the moment `phase==='finished'`, unlike `correct_option_index`/`distribution` on that same route, which genuinely are withheld server-side until `phase==='reveal'` — someone reading the network response or React state directly during the suspense window could see the outcome early. A screen opened late (after the whole window has elapsed) just renders fully revealed immediately, same as the countdown never "rewinding"

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
