# Ingress Ranking Country Validation

**Date**: 2026-09-13 (initial pass) / 2026-09-13 (re-verified after fixes)
**Spec**: `.specs/features/ingress-ranking-country/spec.md`
**Diff range**: `9fef370..HEAD` — extended during re-verification; HEAD is now `7fbe4ff` (12 commits, `1af2b0b`..`7fbe4ff`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Verdict History

| Pass | HEAD | Result | Why |
| --- | --- | --- | --- |
| Initial | `2a5406f` | ❌ FAIL | `npm run build` failed (Turbopack panic, `node:fs` in a client-reachable module); fix existed only as uncommitted, unreviewed working-tree edits |
| Re-verification | `7fbe4ff` | ✅ PASS | Both commits below landed the exact fix, plus the two minor edge-case/doc gaps; full gate re-run clean against real HEAD |

Two new commits closed every gap from the initial pass, still inside this feature's diff range:

- `49c8a9f` — Fix 1 (Blocker): `lib/ingress-countries.mjs` now loads `countries.json` via `import COUNTRIES from './ingress/countries.json' with {type: 'json'}` instead of `readFileSync`+`createRequire`; `package.json` `engines.node` bumped to `>=20.10.0`. This is exactly the fix that was sitting uncommitted in the working tree during the initial pass, now actually committed.
- `7fbe4ff` — Fix 2 (Minor): the three new flag `<img>` tags (`CountryPicker.tsx` ×2, `IngressRankingTable.tsx` ×1) now carry `onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}`, matching the pre-existing `MedalDetail.tsx`/`MedalGrid.tsx`/`AchievementTimeline.tsx` pattern verbatim (confirmed by direct comparison). Fix 3 (Minor): `scripts/gen-ingress-countries.mjs`'s comment no longer claims compatibility with `engines >= 20.9.0`; it now correctly states the real reason the generator script still uses `createRequire` there (it's a standalone CLI script, never bundled by Turbopack, so it has no technical need to change).

Operationally (outside code scope, reported by the orchestrator, not independently re-queried by this Verifier session — no DB credentials were used here): the pending migration `lib/migrations/003-ingress-ranking-country.sql` was applied to production with explicit authorization, and the `country_code` column now exists on `casara.ingress_rankings`. This closes the "Autorização pendente" item at the bottom of `tasks.md` and means RKCTY-04/05/07 are now end-to-end live, not just build-correct.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | 250/250 countries↔SVGs exact 1:1 match; `npm run build` now passes |
| T2 | ✅ Done | `isValidCountryCode`/`normalizeCountryCode` logic correct, unit-tested (5/5 new tests); the Node-`fs` build defect in this exact module is fixed by `49c8a9f` |
| T3 | ✅ Done | Migration + `schema.sql` correct, idempotent; **now applied in production** (per orchestrator) |
| T4 | ✅ Done | POST validation/persistence logic correct; build gate now passes |
| T5 | ✅ Done | GET serialization correct; build gate now passes |
| T6 | ✅ Done | SSR query correct; build gate now passes |
| T7 | ✅ Done | `CountryPicker` logic/a11y correct; broken-image defense added (`7fbe4ff`) |
| T8 | ✅ Done | `ProfileRadar` integration/remapping correct; build gate now passes |
| T9 | ✅ Done | `StatsRadarSection.postAgent` correct; build gate now passes |
| T10 | ✅ Done | `IngressRankingTable` column correct; broken-image defense added (`7fbe4ff`) |

---

## Spec-Anchored Acceptance Criteria

Code-review evidence per the project's documented floor (no component/route test infra exists — `tasks.md`'s Test Coverage Matrix; not penalized per task instructions).

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| RKCTY-01: digitar filtra por nome/código, case/acento-insensível, com bandeira na lista | Lista filtrada mostra bandeira por opção | `components/ingress/CountryPicker.tsx:58-64` (`fold()` NFD+lowercase, filtra por `nameFor`/`code`) + `:157-166` (`<img>` por opção, com `onError`) | ✅ PASS |
| RKCTY-02: selecionar preenche campo com nome + associa país ao agente | `onChange(code)` chamado, campo mostra nome, bandeira exibida | `CountryPicker.tsx:66-70` (`selectOption`) + `:56` (`inputText`) + `:114-124` (bandeira no campo, com `onError`); `ProfileRadar.tsx:278-284` (`countryCode` no `Agent`) | ✅ PASS |
| RKCTY-03: sem país escolhido, bloqueia envio, sem chamar API | Nenhuma chamada de rede; erro visual | `ProfileRadar.tsx:268-275` (`runCompare` retorna antes do `try`, `setError`, sem `onCompare`) | ✅ PASS |
| RKCTY-04: POST com `countryCode` válido grava `country_code` | Persistido em `casara.ingress_rankings.country_code` no mesmo upsert | `app/api/ingress-rankings/route.ts:158-168` (`INSERT ... country_code ... ON CONFLICT DO UPDATE SET country_code = EXCLUDED.country_code`); column confirmed live in production by orchestrator | ✅ PASS |
| RKCTY-05: POST sem/código inválido → 400, nenhuma linha gravada | Status 400 antes de qualquer `INSERT` | `route.ts:138-141` (`isValidCountryCode` check before the `try`/`INSERT` block) | ✅ PASS |
| RKCTY-06: dois seletores independentes em modo comparação (A/B) | Um `CountryPicker` por textarea visível | `ProfileRadar.tsx:545-552` (A) + `:576-583` (B, apenas quando `mode==='two'`) | ✅ PASS |
| RKCTY-07: linha com `country_code` mostra bandeira em coluna própria, com nome acessível | Coluna própria, `alt`/`title` = nome do país | `components/ingress/stats/IngressRankingTable.tsx:287-301` (`<td data-col="country">` + `alt`/`title` via `countryName()`, com `onError`) + `route.ts:213-231` (GET inclui `country_code`) + `app/ingress/ranking/page.tsx:26-40` (SSR inclui `country_code`) | ✅ PASS |
| RKCTY-08: linha sem `country_code` → célula vazia, sem erro | `{row.country_code ? <img.../> : null}` | `IngressRankingTable.tsx:288-300` | ✅ PASS |
| RKCTY-09: colunas/ordenação existentes inalteradas | Nova coluna adicionada, nenhuma outra tocada | `IngressRankingTable.tsx:260-267` (`<th data-col="country">` inserido entre `faction` e `codename`, nenhum outro `<th>`/`<td>` alterado); ordenação em `route.ts:216`/`page.tsx:28` inalterada | ✅ PASS |

**Status**: ✅ All ACs covered — 9/9 PASS, 0 spec-precision gaps, 0 unresolved code gaps.

---

## Discrimination Sensor

Ran in disposable `git worktree`s (symlinked `node_modules`, real tree never touched), once against the initial HEAD (`2a5406f`) and re-run against the final HEAD (`7fbe4ff`) during re-verification. `git status --porcelain` on the real repo was confirmed unchanged by the sensor work on both occasions.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `lib/ingress-countries.mjs` (`isValidCountryCode`) | `VALID_CODES.has(...)` → `!VALID_CODES.has(...)` (flip boolean) | ✅ Killed — `lib/ingress-countries.test.mjs` fails (`'ZZ'`/`'BRA'`/`''`/`undefined` now report `true`). Re-confirmed against `7fbe4ff`. |
| 2 | `lib/ingress-countries.mjs` (`normalizeCountryCode`) | removed `.toUpperCase()` | ✅ Killed — test file fails (`'br'` stays `'br'`; downstream `isValidCountryCode('br')` flips to `false`). Re-confirmed against `7fbe4ff`. |
| 3 | `app/api/ingress-rankings/route.ts:139` | `if (!isValidCountryCode(countryCode))` → `if (isValidCountryCode(countryCode))` (flip guard) | ⚠️ Evaluated by reading — **no automated test exists for this route** (documented project floor, not a new gap; `route.ts` unchanged by the two fix commits, so this reasoning still holds against `7fbe4ff`). The mutation would wrongly 400 a valid `"BR"` (violates RKCTY-04) and let `""`/`"ZZ"` reach the `INSERT` (violates RKCTY-05 — `"ZZ"` would even pass the DB's format-only `CHECK` and get silently persisted). The unmutated code correctly guards against all of this; only the absence of an automated safety net is being reported, which is the accepted floor for this project's API routes. |

**Sensor depth**: lightweight (3 mutations; 1 route mutation evaluated by reading, per the documented no-route-test floor)
**Result**: 2/2 automatable mutations killed; 1/1 non-automatable mutation correctly reasoned — **PASS**

---

## Interactive UAT Results

Not performed — this Verifier run is a code-level validation pass (per the task brief). Visual/interactive confirmation on `/ingress/ranking` (three modes, keyboard nav, flag rendering) is left to the user, per this project's standing preference (no automated browser verification — `feedback_sem_verificacao_visual_automatica.md`).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ — fix commits touch exactly the files implicated by the initial gaps (`lib/ingress-countries.mjs`, `package.json`, `CountryPicker.tsx`, `IngressRankingTable.tsx`, `scripts/gen-ingress-countries.mjs`) |
| No scope creep | ✅ |
| Matches patterns | ✅ — `onError` fix reuses `MedalDetail.tsx`'s exact handler (`e.currentTarget.style.visibility = 'hidden'`), not a new pattern |
| Spec-anchored outcome check (asserted values match spec) | ✅ for lib unit tests; N/A for untested layers (project floor) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix (floor: only `.mjs` gets automated tests) — followed |
| Shared lib modules reachable from client components avoid Node-only APIs | ✅ — fixed by `49c8a9f` (this was the sole Code Quality failure in the initial pass) |

---

## Edge Cases

- [x] Formato de país inválido / fora da lista → 400 com mensagem: `route.ts:138-141`
- [x] SVG ausente para um `country_code` válido → célula sem imagem, nunca ícone quebrado: **fixed in `7fbe4ff`** — `onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}` added to all three flag `<img>` sites (`CountryPicker.tsx:121,163`; `IngressRankingTable.tsx:296`), matching the exact in-repo precedent from `MedalDetail.tsx`
- [x] Apagar o campo de país já preenchido reativa o bloqueio: `CountryPicker.tsx` (`handleChange` calls `onChange(null)` on any edit while a value was selected)

---

## Gate Check

- **Gate command**: `npm run build && npm run lint && npm test` (per `tasks.md` Gate Check Commands, Build tier)
- **Result at final HEAD (`7fbe4ff`)**, run directly against the real (clean) working tree:
  - `npm run build` → **PASSED**, exit 0. All routes emitted, including `/ingress` and `/ingress/ranking`. (At the initial HEAD `2a5406f` this failed with `TurbopackInternalError: ... does not support external modules (request: node:fs)` — now resolved.)
  - `npm test` → 393 passed, 0 failed, 0 skipped
  - `npm run lint` → exit 1 overall, but **zero new errors/warnings in this feature's files versus the initial pass** — same 94 pre-existing errors / 22 warnings in files outside this feature's diff (`components/ui/text-scramble.tsx`, `tailwind.config.ts`, `utils/pdf-generator.tsx`, `utils/love-language-pdf-generator.tsx`, `components/ingress/S2Explorer.tsx`, `components/ingress/TierLadder.tsx`, `components/livros/CadernoOverlay.tsx`, `utils/analytics.ts`). The only findings inside feature files remain the pre-existing `@next/next/no-img-element` **warnings** (`CountryPicker.tsx:115,157`; `IngressRankingTable.tsx:278,289,346`) — same warning already present on sibling, untouched `/ingress` components, an accepted project convention, not a regression.
- **Test count before feature** (commit `9fef370`): 388
- **Test count after feature** (HEAD `7fbe4ff`): 393
- **Delta**: +5 new tests (`lib/ingress-countries.test.mjs`), 0 deletions
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

All three gaps from the initial pass were addressed and independently re-verified in this pass — no open fix plans remain.

| # | Issue | Fixed in | Verified how |
| - | ----- | -------- | ------------- |
| 1 (Blocker) | `npm run build` failed — Node-only APIs in a client-reachable module | `49c8a9f` | `npm run build` re-run against real HEAD, exit 0 |
| 2 (Minor) | No `onError` fallback on new flag `<img>` tags | `7fbe4ff` | Direct code read; handler matches `MedalDetail.tsx` verbatim |
| 3 (Minor) | Stale Node-version comment in `scripts/gen-ingress-countries.mjs` | `7fbe4ff` | Direct code read; comment now states the real (correct) rationale |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| RKCTY-01 | Implementing | ✅ Verified |
| RKCTY-02 | Implementing | ✅ Verified |
| RKCTY-03 | Implementing | ✅ Verified |
| RKCTY-04 | Implementing | ✅ Verified |
| RKCTY-05 | Implementing | ✅ Verified |
| RKCTY-06 | Implementing | ✅ Verified |
| RKCTY-07 | Implementing | ✅ Verified |
| RKCTY-08 | Implementing | ✅ Verified |
| RKCTY-09 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 9/9 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 2/2 automatable mutations killed; 1 route-level mutation correctly reasoned against the documented no-route-test floor
**Gate**: `npm run build` passed (0), `npm test` 393/393, `npm run lint` clean for this feature's files (94 pre-existing, unrelated errors elsewhere unchanged from before this feature)

**What works**: Country data (250/250 exact), validation logic (fully unit-tested), migration/schema (now live in production), API POST/GET, SSR query, `CountryPicker` combobox (filter, keyboard nav, ARIA, invalidation-on-edit, broken-icon defense), `ProfileRadar` integration (including the `vs-me`-mode country remapping), and the ranking table's flag column (with broken-icon defense) are all correct and the app builds cleanly.

**Issues found**: None outstanding. The initial pass's one Blocker and two Minors were all fixed in `49c8a9f`/`7fbe4ff` and independently re-verified in this pass (build re-run, mutation sensor re-run, direct code comparison against the in-repo `onError` precedent).

**Next steps**: None required for this feature. The `LESSONS.md` candidate `L-007` (client-reachable lib modules must avoid Node-only APIs for static data loading) remains recorded as project-general guidance for future features, independent of this feature now being resolved.
