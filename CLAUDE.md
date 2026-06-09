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

### Mini-Apps System

The core architectural pattern: `app/app/[app_name]/page.tsx` resolves a URL slug to a file path, then **dynamically imports** the corresponding component from `apps/<category>/<slug>.tsx`. App metadata (title, description, path) is defined inline in both `app/app/page.tsx` (for the listing) and `app/app/[app_name]/page.tsx` (for routing) — these two lists must stay in sync.

Current apps live in:
- `apps/math/` — rule-of-three, compound-interest, percentage
- `apps/conversion/` — kitchen-units, currency, bitcoin, file-size, number-systems
- `apps/personalization/` — qr-code, image-to-svg
- `apps/desenvolvimento-pessoal/` — descubra-seu-temperamento

**To add a new app:** create the component in `apps/<category>/<slug>.tsx`, then add its entry to the `appCategories` array in both listing and routing files.

### API Routes

- `POST /api/telegram` — Sends temperament test results to a Telegram group (supports `type: "temperament-test"`)
- `POST /api/send-email` — Sends formatted HTML email via nodemailer/Gmail

### Environment Variables

Required in `.env.local`:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_THREAD_ID=
EMAIL_USER=
EMAIL_PASS=
```

### Analytics

All user interactions are tracked via `@vercel/analytics`. Tracking functions live in `utils/analytics.ts` and are imported individually per page/component. Add new events there to maintain consistency.

### PDF Generation

`utils/pdf-generator.tsx` exports `PdfContent` (a hidden React component rendered off-screen) and `generatePdf` (uses html2canvas → jsPDF). Used only by the temperament test app.

### Fonts

Two Google Fonts loaded via `next/font`: `Quicksand` (body, `--font-quicksand`) and `Space Mono` (mono, `--font-space-mono`).
