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
- `apps/desenvolvimento-pessoal/` — descubra-seu-temperamento (forced-choice binary questions per axis, not a Likert scale — see `docs/testes-de-personalidade.md` before building another personality/temperament-style test) and descubra-sua-linguagem-do-amor (same forced-choice mechanics, but a 5-way pairing instead of 2 orthogonal axes — see "Descubra sua Linguagem do Amor" below and `docs/linguagens-do-amor-pesquisa.md`)
- `apps/dinamicas/` — nuvem-de-palavras and quiz-ao-vivo/ (host UI for live sessions; the public-facing side lives outside the mini-app shell, at `/w/[id]` and `/q/[id]` respectively — see "Nuvem de Palavras" and "Quiz ao Vivo" below), plus sorteio.tsx (single-screen, no session/backend — see "Sorteio" below). `quiz-ao-vivo` is a folder (`index.tsx` + `QuestionBuilder.tsx` + `ControlPanel.tsx`), not a single file — bigger feature, same dynamic-import mechanics (`@/apps/dinamicas/quiz-ao-vivo` resolves the folder's `index.tsx`)

**To add a new app:** create the component in `apps/<category>/<slug>.tsx`, then add its entry to the `appCategories` array in both listing and routing files.

### API Routes

- `POST /api/telegram` — Sends test results to a Telegram group; `type: "temperament-test"` and `type: "love-language-test"` post to the **same bot/chat**, but different topics (`TELEGRAM_THREAD_ID` vs `TELEGRAM_LOVE_LANGUAGES_THREAD_ID`)
- `POST /api/send-email` — Sends formatted HTML email via nodemailer/Gmail (temperament test only — the love language test does not send email)
- `POST /api/events` — Inserts an analytics event row into the Neon `events` table
- `GET /api/metrics/stats` — Aggregate stats (page views, events, browsers, countries, timeline, temperament breakdown, love language breakdown) for `/stats`, filterable by `period` (`7d` | `30d` | `all`)
- `GET /api/metrics/temperament` — Temperament test funnel/averages only
- `GET /api/metrics/love-languages` — Love language test funnel/averages only (mirrors `/api/metrics/temperament`)
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

### Database tenancy — everything lives in the `casara` schema

**The Neon database (`neondb`) is shared with another, unrelated site of the same owner, which owns the `geav` schema** (`geav.cancoes`, `geav.planos`, `geav.users`, and its own `geav.events` — 19 tables that this repo must never read or write). To keep the two tenants isolated, **every table this site owns lives in the `casara` schema**: `casara.events` plus the seven `word_*`/`quiz_*` tables.

**The connection's `search_path` is just `"$user", public` — it does NOT include `casara`.** So every single query must qualify the table explicitly: `casara.events`, `casara.word_sessions`, `casara.quiz_sessions`, … An unqualified `FROM events` does not fall back to `casara` — it fails, or worse, silently resolves somewhere else. `public` is now intentionally empty of base tables.

- `lib/schema.sql` — DDL for a clean install (creates the schema + all 8 tables)
- `lib/migrations/001-schema-casara.sql` + `scripts/migrate-casara.mjs` — the one-time migration that moved these tables out of `public`/`geav` into `casara` (`ALTER TABLE ... SET SCHEMA`, applied 2026-07-27). Historical record; do not re-run

### Analytics & Data

Two analytics systems run side by side, both driven from `utils/analytics.ts`'s `trackEvent`: Vercel Analytics (`track()`) and a self-hosted Neon Postgres store.

- `lib/db.ts` — lazy-initialized Neon client (`sql` tagged template) reading `DATABASE_URL`; avoids connecting at build time
- `casara.events` — the single analytics table (event_name, route, payload JSONB, geo/browser columns)
- `middleware.ts` — fire-and-forget inserts a `page_view` event per request (geo from Vercel headers, bot UAs filtered, skips `_next`/`api`/`_vercel`/favicon)
- Adding a new tracked event: add a `trackX` function in `utils/analytics.ts`, call it from the component, and (optionally) add its label to `EVENT_LABELS` in `app/stats/page.tsx` for the dashboard

### Nuvem de Palavras (live word-cloud dynamics)

A Mentimeter-style live activity: a host creates a session in `apps/dinamicas/nuvem-de-palavras.tsx`, shares the `/w/[id]` link/QR code, and participants submit words that render as an animated word cloud (bolhas/texto) or ranked bar chart (gráfico) on `/w/[id]/resultados/[token]`, polling every ~2.5s.

- `lib/session-ids.ts` — generic helpers shared by every live-session feature: `generateSessionId()` (short collision-retry id), `generateToken()` (host/results secrets), `PARTICIPANT_ID_RE`. `lib/word-cloud.ts` re-exports the first two for backwards compatibility with existing call sites
- `lib/word-cloud.ts` — word-cloud-specific types (`SessionMode`, `SessionStatus`), validation/normalization (`normalizeWord`, `dedupeWords`, `WORD_CLOUD_LIMITS`), the font-size curve (`computeFontSizes`), and the `HOT_ACCENT_RGB`/`rgbToCss` color shared by the "texto" and "gráfico" views
- Data model: `word_sessions` (one row per session, holds `host_token` + `results_token`), `word_submissions` (one row per participant, `UNIQUE(session_id, participant_id)` enforces one submission per device at the DB level), `word_entries` (one row per submitted word) — see `lib/schema.sql`
- These tables live under the `casara` Postgres schema, like everything else this site owns — see "Database tenancy" above
- Three tokens, three trust levels: `host_token` (full control, kept in the host's browser `localStorage` under the `minhas-nuvens` key), `results_token` (read-only, embedded in the `/resultados/[token]` URL so it can be opened on a separate screen/projector), `participant_id` (a `crypto.randomUUID()` a participant's browser generates once and reuses, enforcing the one-submission-per-device rule)
- `components/WordCloud.tsx` — spiral word-packing + auto-fit-to-container scaling (canvas `measureText` for sizing, framer-motion for layout/pulse animation); `components/WordBarChart.tsx` — top-20 + "Outros" ranked bar chart. Both read from the same `GET .../results` payload
- The results page plays a "pop" sound (see "Sound effects" below) whenever `total_participants` goes up between polls — edge-triggered off a ref, so it never fires on first load or when the poll returns an unchanged count

### Quiz ao Vivo (live multiple-choice quiz)

A Kahoot-style live activity, sharing the same 3-token / 3-route architecture as Nuvem de Palavras but with its own data model: `apps/dinamicas/quiz-ao-vivo/` (host builds questions, then controls live progression), `/q/[id]` (participant: name → lobby → question → reveal → final score/rank), `/q/[id]/resultados/[token]` (big-screen: podium + full leaderboard + gabarito).

- `lib/quiz.ts` — `QuizPhase`, `QUIZ_LIMITS` (2-6 options, question/answer length caps), `QUIZ_SCORING` constants, `isValidQuestionDraft`, and `clockOffsetMs`/`correctedNow` (client clock-drift correction for the countdown — see below)
- Data model: `quiz_sessions` (adds a `phase` state machine on top of the usual `status`: `lobby → question → reveal → ... → finished`, plus `current_question_index`/`current_question_started_at`/`finished_at`), `quiz_questions` (fixed at creation, `options` JSONB + `correct_option_index`, optional `time_limit_seconds`), `quiz_participants` (named, unique name per session via `CREATE UNIQUE INDEX ... (session_id, lower(name))`), `quiz_answers` (FK's to `quiz_participants` so answering without joining is impossible at the DB level) — see `lib/schema.sql`
- **Every host action (`start`/`reveal`/`next`/`restart`) is a single `UPDATE ... WHERE phase = <expected phase>`** — this is what makes double-clicks and race conditions no-ops (409) instead of corrupting state, with no explicit locking needed. `restart` is the one exception with a side effect beyond the UPDATE: in the same statement it also `DELETE`s that session's `quiz_participants` (guarded by the same phase/token check, so an unauthorized/mistimed call deletes nothing) — `quiz_answers` cascades away with it via `ON DELETE CASCADE`. This is deliberate: the unique-name index is per-session, not per-round, so keeping old participants around after a restart would permanently block anyone else from reusing their name in a later round. Scoring in `POST /api/quiz-sessions/[id]/answers` follows the general "one atomic guarded statement" principle too: one CTE-based `INSERT` that reads `current_question_started_at` and computes correctness + speed bonus using the **Postgres clock**, never the client's or the serverless function's — this is the one rule to preserve if this route is ever touched
- The countdown (`components/QuizCountdown.tsx`) is a local `setInterval` (~150ms) computing `deadline - Date.now()`, corrected by `clockOffsetMs(server_time)` from the last poll — a participant's wrong device clock would otherwise show the timer expiring early/late. The countdown itself is purely visual, but for timed questions the server independently enforces the same deadline: `POST /api/quiz-sessions/[id]/answers` rejects an answer once `NOW() > current_question_started_at + time_limit_seconds` even while `phase` is still `'question'` (host hasn't clicked reveal yet) — so `phase` alone is no longer sufficient to reason about whether an answer will be accepted for a timed question, only in combination with elapsed time
- `components/QuizLeaderboard.tsx` and `components/QuizPodium.tsx` are shared between the host's `ControlPanel.tsx` and the `/resultados/[token]` big screen — both poll the same `GET .../results` shape. `ControlPanel.tsx` (private, host-only) shows the plain leaderboard immediately on `finished`; the public results page and `/q/[id]` gate it behind the suspense reveal below
- Sound (results/big-screen only — see "Sound effects" below): `QuizCountdown` takes an opt-in `playSound` prop (only `/q/[id]/resultados/[token]` passes it — the participant's own phone, `/q/[id]`, stays silent) that ticks once per displayed second and rings once at zero. The results page also plays a "everyone answered" chime (edge-triggered off `answered_count === leaderboard.length`, tracked per `current_question_index` so it fires once) and a reveal/fanfare sound for each podium place inside the same `setInterval` that already drives the podium suspense countdown
- **Final podium reveal is a suspense sequence, not an instant reveal**: when the `next` action closes out the last question, the same atomic `UPDATE` stamps `finished_at = NOW()`. Both `/q/[id]/resultados/[token]` and `/q/[id]` independently compute `elapsedMs` from that shared server timestamp (clock-corrected the same way as the countdown) and derive the current stage from `PODIUM_REVEAL`/`podiumRevealedPlaces`/`podiumFullyRevealed` in `lib/quiz.ts` — no extra network round-trip or new phase is needed, it's pure client-side timing anchored to one server timestamp. The results page reveals 3rd → 2nd → 1st (each place animated in by `QuizPodium`'s `revealedPlaces` prop) then the full leaderboard once `podiumFullyRevealed`; the participant page shows a "Apurando o resultado..." suspense screen and only renders the participant's own rank/score at that same `podiumFullyRevealed` instant. This is cosmetic pacing like the countdown, not a security boundary: `GET .../results` already returns the full ordered leaderboard the moment `phase==='finished'`, unlike `correct_option_index`/`distribution` on that same route, which genuinely are withheld server-side until `phase==='reveal'` — someone reading the network response or React state directly during the suspense window could see the outcome early. A screen opened late (after the whole window has elapsed) just renders fully revealed immediately, same as the countdown never "rewinding"

### Sorteio (raffle/random draw)

Unlike Nuvem de Palavras and Quiz ao Vivo, this one is **single-screen and client-only** — no `/api` route, no DB, no session/tokens. The host pastes a comma-separated list and draws directly in `apps/dinamicas/sorteio.tsx`; there's nothing for a second device to connect to.

- `lib/sorteio.ts` — `parseEntries` (comma-split, trim, dedupe), `drawWinners` (Fisher-Yates, plain `Math.random()` — no cryptographic randomness needed, this isn't a paid raffle), `SORTEIO_LIMITS`
- Draw history and the "exclude past winners" toggle both live in plain React state inside the component, not `localStorage` — intentionally ephemeral, resets on page reload
- The animated reveal (slot-machine-style name cycling, one winner at a time) and the confetti burst are both hand-rolled with framer-motion (already a project dependency via the Quiz/Nuvem de Palavras animations) rather than pulling in a dedicated confetti library
- The spin's tick interval is **not** a fixed `setInterval` — `spinFor()` uses a recursive `setTimeout` whose delay follows `easedTickDelay()` (a `Math.sin` curve: slow → fast → slow), so the roulette accelerates then decelerates into the landing name over a fixed `SPIN_DURATION_MS`, regardless of how many entries are in the pool. This is deliberate: with a naive fixed-speed loop, a short list "landed" almost instantly and killed the suspense — duration is now time-based, not cycle-count-based

### Acervo de Livros

`/livros` (fase 1: redireciona para `/livros/lista`; vira a sala 3D na fase 2),
`/livros/lista` (grade com filtros por categoria/tag/status, todos via query
param para serem compartilháveis) e `/livros/[slug]` (página do livro,
server-rendered para SEO). Ver `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`.

- **Não existe rota de admin.** O cadastro acontece só por `scripts/livros.mjs`,
  rodando localmente — foi requisito explícito de não criar superfície de ataque
  pública. O script lê `DATABASE_URL` de `.env.local` com o mesmo parsing manual
  de `scripts/migrate-casara.mjs`, escreve em **produção**, e por isso sempre
  mostra o que vai gravar e pede confirmação; tem `--dry-run`. Comandos:
  `list`, `add <isbn>`, `edit <slug>` (um livro por vez) e `seed [--limit N]
  [--apply] [--incluir-revisar]` (importação em lote a partir de
  `scripts/seed/acervo.json`)
- **`scripts/seed/acervo.json` é a fonte da verdade** para título, autor,
  nota, categoria, tags e status — a Open Library só entra para complementar
  **capa, páginas e ano**. Não é uma limitação temporária: a busca por
  título+autor devolve com frequência texto de marketing dentro de
  `author_name` e casa o livro errado com um box de 3 volumes, então usar a
  resposta da API para título/autor/nota corromperia dado bom com dado ruim.
  `seed` sem `--apply` é dry-run (não grava no banco, mas AINDA baixa capas
  para o disco — é assim que se descobre quais vão ficar placeholder antes de
  gravar); `--limit N` importa só os N primeiros da fila; `--incluir-revisar`
  inclui livros marcados com `_revisar` no JSON (pulados por padrão).
  **A idempotência do `seed` é por TÍTULO**, não por slug: rodar de novo só
  importa os livros do `acervo.json` cujo título ainda não está no banco
  — comparar por slug quebraria, porque o slug gravado pode ganhar sufixo
  (`-<ano>` ou `-2`) em caso de colisão e nunca mais bater com `slugify(title)`
- **Armadilha do `seed --apply`: as linhas vão para o banco de produção NA
  HORA, mas as capas baixadas só existem no site ao vivo depois de
  `git commit` + deploy** (`public/livros/capas/` é versionado). Entre rodar
  `--apply` e dar push, o site fica com `/livros` mostrando imagens quebradas
  para as capas novas. Rode e faça o push junto, no mesmo momento
- **A lógica pura vive em `.mjs`, não `.ts`** (`lib/book-utils.mjs`,
  `lib/book-categories.mjs`, `lib/book-sources/`, `lib/book-cover.mjs`): o CLI é
  Node puro e não consegue importar `.ts` sem build. Esses arquivos são
  importados tanto pelo CLI quanto pelo Next, e são os únicos cobertos por teste
  (`npm test`, via `node --test`) — porque um bug ali corrompe dado permanente
- `lib/books.ts` é o lado Next: tipo `Book` e queries. Sempre `casara.books`
- **Um livro tem UMA `category`** (taxonomia fechada em `lib/book-categories.mjs`,
  define a cor e, na fase 2, a posição na estante) **e N `tags` livres** (eixo
  transversal de busca). Multi-categoria tornaria a posição na prateleira ambígua
- **Capas são baixadas, não linkadas** (`public/livros/capas/<slug>.jpg`): a API
  de covers da Open Library tem rate limit e linkar direto faria cada visitante
  bater no servidor deles. `spine_color` é a cor dominante, extraída uma vez no
  cadastro pelo `sharp` — o navegador nunca faz esse trabalho
- **A Open Library é incompleta**, sobretudo para edições brasileiras: faltar
  `number_of_pages` ou capa é rotina. O CLI trata isso como caminho normal
  (pergunta no terminal, gera capa placeholder), não como erro
- Skoob **não** é uma fonte: a API pública foi desligada em setembro de 2025 e
  não há exportação nativa. `lib/book-sources/index.mjs` existe como gancho caso
  isso mude
- `/livros` é **só em português**, como os mini-apps e as dinâmicas — o
  `LanguageProvider` cobre apenas home, about, projects e a listagem `/app`

### Descubra sua Linguagem do Amor

A second forced-choice personality-style test, `apps/desenvolvimento-pessoal/descubra-sua-linguagem-do-amor.tsx`, following the same lessons as the temperament test (see `docs/testes-de-personalidade.md`) but researched separately in `docs/linguagens-do-amor-pesquisa.md` — read that doc before changing the question bank or scoring.

- `apps/desenvolvimento-pessoal/linguagens-do-amor.json` — 30 questions, same `{id, opcoes: [{polo, frase}]}` schema as `temperamentos.json`. **Structural difference from the temperament test**: instead of 2 orthogonal axes (quente/frio, seco/úmido), this is a 5-way category (`afirmacao`/`qualidade`/`presentes`/`servico`/`toque`) — every question pits exactly 2 of the 5 categories against each other, covering all `C(5,2) = 10` pairs × 3 repetitions, so each language appears in exactly 12 of the 30 questions (balance validated by script, not just by construction)
- `apps/desenvolvimento-pessoal/love-language-info.ts` — `LOVE_LANGUAGE_INFO` (display name, Tailwind/hex colors, `description`, `howYouFeelLoved`, `commonMisunderstandings`, `relationshipTips`), same shape/purpose as `temperament-info.ts`
- **No tiebreaker phase, unlike the temperament test.** The source theory itself expects mixed profiles (people commonly value more than one love language), so a close #1/#2 result isn't something to break with extra questions — `calculateResults` just flags `combined: true` when the top two percentages are within `COMBINED_RESULT_THRESHOLD` (10 points) of each other, and the results UI/PDF/Telegram message all present both languages together instead of forcing a single winner
- `utils/love-language-pdf-generator.tsx` — `LoveLanguagePdfContent` + `generateLoveLanguagePdf`, reusing the shared `renderElementToPdf` engine now exported from `utils/pdf-generator.tsx` (the html2canvas → jsPDF assembly is identical between tests; only the content component and filename differ). If a third test-with-PDF app is ever added, extend this shared engine rather than copying it again
- Email is intentionally **not** sent for this test (unlike temperament, which emails `fencher.aa@gmail.com`) — Telegram + in-app stats were the only notification channel requested when this app was built
- Same `/stats` treatment as temperament: a `LINGUAGENS_DO_AMOR_ANALYSIS` panel next to `TEMPERAMENTO_ANALYSIS`, fed by the `love_languages` block in `GET /api/metrics/stats` (started/completed/conversion, per-language averages, `combined_rate`, avg duration) — see `app/stats/page.tsx`

### Sound effects

Shared across all three live dynamics — `lib/sound.ts` exports `playSound(name)` (fire-and-forget, cached `HTMLAudioElement` per name) and `startLoop(name)` (returns a stop function, used only by Sorteio's spin). Every `.play()` is `.catch(() => {})`'d, same spirit as `toggleFullscreen`: a browser autoplay-policy rejection just means "no sound this time," never a thrown error. Effect files live in `public/sounds/*.mp3` — short (12-110KB) clips from [Mixkit's free SFX library](https://mixkit.co/free-sound-effects/) (no attribution required). Swapping a sound is a one-file replacement, no code change needed as long as the filename stays the same.

### Environment Variables

Required in `.env.local`:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_THREAD_ID=
TELEGRAM_LOVE_LANGUAGES_THREAD_ID=
EMAIL_USER=
EMAIL_PASS=
DATABASE_URL=
```

### Analytics

All user interactions are tracked via `@vercel/analytics`. Tracking functions live in `utils/analytics.ts` and are imported individually per page/component. Add new events there to maintain consistency.

### PDF Generation

`utils/pdf-generator.tsx` exports `PdfContent` (a hidden React component rendered off-screen), `generatePdf` (temperament test), and the shared `renderElementToPdf` engine (html2canvas → jsPDF) that both tests build on. `utils/love-language-pdf-generator.tsx` reuses that engine for the love language test's own `LoveLanguagePdfContent`/`generateLoveLanguagePdf`.

### Fonts

Two Google Fonts loaded via `next/font`: `Quicksand` (body, `--font-quicksand`) and `Space Mono` (mono, `--font-space-mono`).
