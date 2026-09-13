# 🚀 Luiz Casara - Portfolio & Utility Apps

<div align="center">
  <img src="/public/android-chrome-512x512.png" alt="Luiz Casara Logo" width="120" height="120" />
  <br />
  <p><em>Web Developer & Software Engineer Portfolio</em></p>
</div>

## 📋 Overview

This is a personal portfolio site with three kinds of things living side by
side: a collection of small utility apps, a set of live/social features with
their own backend (real-time dynamics, a 3D reading room, an Ingress stats
hub), and an internal analytics dashboard reading from a self-hosted Postgres
table. It's a single Next.js App Router project, not several sites bolted
together — everything shares auth-less public routes, a Neon database, and a
Telegram bot for notifications.

**This README covers the "what" and the high-level "why."** For the actual
architecture (route structure, data model, every non-obvious constraint) see
[`CLAUDE.md`](./CLAUDE.md) — it's long and current by design, written for
whoever (human or AI agent) touches this code next. For *why a specific past
decision was made the way it was*, see [`docs/adr/`](./docs/adr/README.md).

### ✨ Features

- 🧰 A collection of small utility apps (`/app`): unit/currency converters,
  math calculators, QR code generator, image-to-SVG, and two forced-choice
  personality-style tests (temperament, love languages)
- 🎉 **Live dynamics** (`/w/[id]`, `/q/[id]`) — Mentimeter/Kahoot-style
  real-time word-cloud and quiz sessions, participants join from their own
  phone, host controls progression from a control panel, results poll live
- 📚 **A 3D reading room** (`/livros`) — a `react-three-fiber` scene where
  read/reading/to-read books are shelved, stacked, or piled, built from a
  small personal book catalog (own CLI, no public admin route by design)
- 🎮 **Ingress stats hub** (`/ingress`) — a public profile/ranking/comparison
  page for the Ingress Prime game, built from static exported data (no live
  game API — Niantic's ToS doesn't allow it)
- 📊 An internal analytics dashboard (`/stats`) reading from a self-hosted
  Postgres events table (production traffic only — dev/preview writes are
  gated out, see [`lib/analytics-env.ts`](./lib/analytics-env.ts))
- 📱 Telegram notifications, 📧 email notifications, 📄 client-side PDF
  generation for test results
- 🛡️ Per-IP rate limiting on every public write route that could otherwise be
  abused for spam or database bloat (see [ADR-0001](./docs/adr/0001-rate-limiting-via-upstash-redis.md))

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack by default)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Neon](https://neon.tech/) (serverless Postgres) — this repo
  owns everything under the `casara` schema in a database shared with an
  unrelated site of the same owner; see "Database tenancy" in `CLAUDE.md`
- **3D**: [three.js](https://threejs.org/) via
  [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) +
  [`@react-three/drei`](https://github.com/pmndrs/drei) (helpers: loaders,
  camera controls) + [`@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing)
  (bloom etc.) — powers the `/livros` reading room
- **Rate limiting**: [Upstash Redis](https://upstash.com/) via
  [`@upstash/ratelimit`](https://github.com/upstash/ratelimit) — chosen
  because serverless functions don't share in-memory state between
  invocations; see [ADR-0001](./docs/adr/0001-rate-limiting-via-upstash-redis.md)
- **Animation**: [Framer Motion](https://www.framer.com/motion/) — live
  dynamics, personality test flows
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics) +
  [Vercel Speed Insights](https://vercel.com/docs/speed-insights) (client-side)
  running alongside the self-hosted Postgres store above
- **Maps/geometry**: [Leaflet](https://leafletjs.com/) /
  [`react-leaflet`](https://github.com/PaulLeCam/react-leaflet) +
  [`s2js`](https://github.com/missinglink/s2-geometry-library-js) (Google S2
  cell geometry) — power the Ingress portal/S2-cell explorer map
- **UI feedback**: [`sonner`](https://sonner.emilkowal.ski/) (toasts)
- **Libraries**:
  - [potrace](https://github.com/tooolbox/node-potrace) — image → SVG mini-app (runs entirely client-side)
  - [qrcode](https://github.com/soldair/node-qrcode) — QR codes for the standalone generator app *and* for joining a live session from a phone
  - [html2canvas](https://html2canvas.hertzen.com/) + [jspdf](https://github.com/parallax/jsPDF) — the shared PDF pipeline for personality test results (see `utils/pdf-generator.tsx`)
  - [nodemailer](https://nodemailer.com/) — sends the temperament test result email via Gmail
  - [sharp](https://sharp.pixelplumbing.com/) — image processing at build/CLI time (favicons, book cover downsizing + dominant-color extraction — never in a request path)

## 🚀 Getting Started

### Prerequisites

- Node.js **20.9+** (required by Next.js 16 and nodemailer 10)
- npm

### Environment Variables

Copy [`.env.example`](./.env.example) to `.env.local` and fill it in. It's the
source of truth for every variable this project reads — keeping a second copy
here would just drift out of sync, so this README doesn't duplicate the list.
Two things worth knowing going in:

- `DATABASE_URL` points at **production** Neon even in local dev — see
  `lib/analytics-env.ts` for the gate that stops `npm run dev` from writing
  fake analytics rows into it.
- `UPSTASH_REDIS_REST_URL`/`_TOKEN` are optional in the sense that the app
  runs fine without them (rate limiting fails open, see ADR-0001) — but
  that's a "works locally," not "safe in production," state.

### Installation

1. Clone the repository and `cd` into it.
2. `npm install`
3. Set up `.env.local` as described above.
4. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## 🔧 Available Scripts

- `npm run dev` — dev server (Turbopack, default since Next 16)
- `npm run build` — production build
- `npm run start` — start the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next`) — `next lint`
  was removed in Next 16, so this calls `eslint .` directly
- `npm test` — runs `lib/**/*.test.mjs` via `node --test`; this is where the
  pure logic (scoring, validation, formatting — anything that doesn't touch
  Next or the DB) is unit tested
- `npm run gen:favicons` — regenerates the favicon set from the source mark

## 📂 Project Structure

The real, current structure is best read from the repo itself — a hand-kept
tree here goes stale within a week on a project this active. At a glance:

- `app/` — routes (pages + `app/api/**` route handlers)
- `apps/<category>/<slug>.tsx` — the utility mini-apps, dynamically loaded by
  `app/app/[app_name]/page.tsx`
- `components/` — shared UI, grouped by feature area (`components/livros/`,
  `components/ingress/`, ...)
- `lib/` — server-side logic and pure `.mjs` modules (kept dependency-free
  from Next/TS on purpose where a CLI script or a `node --test` file needs to
  import them directly — see `CLAUDE.md`)
- `scripts/` — one-off/CLI scripts (book catalog management, Ingress data
  import, favicon generation) — never exposed as a route
- `docs/` — decision records and feature research that don't belong in code
  comments; see [`docs/adr/`](./docs/adr/README.md) specifically for
  Architecture Decision Records
- `.specs/` — planning artifacts from in-progress feature work (spec-driven
  workflow); pruned once a feature ships, the ADR is what survives

See `CLAUDE.md` for the full route table, data model, and every
project-specific gotcha.

## 🌐 Deployment

Deployed on [Vercel](https://vercel.com/). The `casara` Postgres schema lives
in a Neon database shared with an unrelated project of the same owner — see
"Database tenancy" in `CLAUDE.md` before touching anything DB-related.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Feel free to reach out if you have any questions or suggestions!

---

<div align="center">
  <p>Made with ❤️ by Luiz Casara</p>
  <p>
    <a href="https://github.com/luizcasara">GitHub</a> •
    <a href="https://linkedin.com/in/luizcasara">LinkedIn</a>
  </p>
</div>
