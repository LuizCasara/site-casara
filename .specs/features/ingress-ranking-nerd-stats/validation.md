# Estatísticas para Nerds Validation

**Date**: 2026-09-16
**Spec**: `.specs/features/ingress-ranking-nerd-stats/spec.md`
**Diff range**: `main...HEAD` (`main`=`630bd2a`, `HEAD`=`4cdf8ee`, branch `feat/ingress-ranking-nerd-stats`), 19 commits
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `lib/migrations/009-ingress-ranking-months-subscribed.sql` — matches 005 template, `ADD COLUMN IF NOT EXISTS`, `CHECK >= 0` |
| T2   | ✅ Done | `app/api/ingress-rankings/route.ts:187-190` — non-rejecting parse, INSERT + `ON CONFLICT` both updated |
| T3   | ✅ Done | `computeCommunityTotals` — `lib/ingress-nerd-stats.mjs:45-73` |
| T4   | ✅ Done | `computeFactionComparison` — `lib/ingress-nerd-stats.mjs:94-105` |
| T5   | ✅ Done | `computeAveragesSection` — `lib/ingress-nerd-stats.mjs:114-144` |
| T6   | ✅ Done | `computeHallOfFame` — `lib/ingress-nerd-stats.mjs:193-201` |
| T7   | ✅ Done | `computeSeasonalEngagement` — `lib/ingress-nerd-stats.mjs:225-241` |
| T8   | ✅ Done | `computeSubscription` — `lib/ingress-nerd-stats.mjs:251-265` |
| T9   | ✅ Done | `computeNerdStats` — `lib/ingress-nerd-stats.mjs:278-287` |
| T10  | ✅ Done | `components/ingress/stats/NerdStatTiles.tsx` |
| T11  | ✅ Done | `components/ingress/stats/NerdFactionCompare.tsx` |
| T12  | ✅ Done | `components/ingress/stats/CommunityRadarChart.tsx` — no `import ProfileRadar` present |
| T13  | ✅ Done | `components/ingress/stats/NerdAverages.tsx` |
| T14  | ✅ Done | `components/ingress/stats/NerdHallOfFame.tsx` |
| T15  | ✅ Done | `components/ingress/stats/NerdSeasonalEngagement.tsx` |
| T16  | ✅ Done | `components/ingress/stats/NerdSubscription.tsx` |
| T17  | ✅ Done | `components/ingress/stats/IngressNerdStats.tsx` — single empty-state branch for both `null` and `totalAgents===0` |
| T18  | ✅ Done | `app/ingress/ranking/page.tsx` (`loadNerdStats`) + `components/ingress/stats/IngressRankingTabs.tsx` (third `'nerd'` tab, conditional mount) |

All 18 tasks match their commits 1:1 (`git log --oneline main..HEAD`), each with an atomic Conventional Commit.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| NERD-01: total de agentes | `COUNT(*)` de `casara.ingress_rankings` | `lib/ingress-nerd-stats.mjs:46` `totalAgents = rows.length`; `lib/ingress-nerd-stats.test.mjs:69-74` `assert.equal(result.totalAgents, 2)`; rendered `components/ingress/stats/NerdStatTiles.tsx:57`; queried without `LIMIT` in `app/ingress/ranking/page.tsx:136-141` | ✅ PASS |
| NERD-02: soma de `lifetime_ap` | soma bruta de todos os agentes | `lib/ingress-nerd-stats.mjs:52` `totalLifetimeAp += Number(row.lifetime_ap)\|\|0`; `lib/ingress-nerd-stats.test.mjs:73` `assert.equal(result.totalLifetimeAp, 3500)` | ✅ PASS |
| NERD-03: total de envios, rotulado distinto | `COUNT(*)` de `casara.ingress_ranking_history`, label diferente do total de agentes | `app/ingress/ranking/page.tsx:139` `SELECT COUNT(*)::int ... FROM casara.ingress_ranking_history`; `lib/ingress-nerd-stats.test.mjs:275-278` `assert.equal(result.totals.totalSubmissions, 42)`; UI label `NerdStatTiles.tsx:12` `'Total de envios'` vs `:10` `'Agentes cadastrados'` | ✅ PASS |
| NERD-04: total de medalhas por tier, excluindo `'none'` | soma de tiers atingidos nos 12 stats, `'none'` fora | `lib/ingress-nerd-stats.mjs:58` `if (tier && tier !== 'none')`; `lib/ingress-nerd-stats.test.mjs:76-82` agente sem stats → `badgeTiersGranted` todo zero | ✅ PASS |
| NERD-05: total de Onyx concedidas, destacado | subconjunto de NERD-04 | `lib/ingress-nerd-stats.mjs:70` `onyxBadgesGranted: badgeTiersGranted.onyx`; `lib/ingress-nerd-stats.test.mjs:84-90` 12 onyx → `onyxBadgesGranted===12`; UI tile próprio `NerdStatTiles.tsx:74-77` | ✅ PASS |
| NERD-06: "clube Onyx" (12/12 onyx) | contagem de agentes com os 12 stats em onyx | `lib/ingress-nerd-stats.mjs:56-63` `onyxCountForAgent === RADAR_STAT_KEYS.length`; `lib/ingress-nerd-stats.test.mjs:92-97` 11/12 → `onyxClubCount===0`, `:84-90` 12/12 → `onyxClubCount===1` | ✅ PASS |
| NERD-07: estado vazio (0 agentes) | mensagem graciosa, não contadores/gráficos quebrados | `components/ingress/stats/IngressNerdStats.tsx:70-76` `if (!stats \|\| stats.totals.totalAgents === 0) return <Panel label={t.lostSignal}>...` — same branch for `null` and `0` | ✅ PASS (no automated test per Test Coverage Matrix — components untested by project convention; visual-only inspection) |
| NERD-08: agentes cadastrados por facção | contagem por facção | `lib/ingress-nerd-stats.mjs:98` `agentCount = agents.length`; `lib/ingress-nerd-stats.test.mjs:106-119` 2 enlightened / 1 resistance → `agentCount` bate | ✅ PASS |
| NERD-09: soma de `lifetime_ap` por facção | soma bruta por facção | `lib/ingress-nerd-stats.mjs:99` `totalAp = agents.reduce(...)`; `lib/ingress-nerd-stats.test.mjs:114,117` `totalAp===4000`/`500` | ✅ PASS |
| NERD-10: média de `overall_score` por facção | média por facção | `lib/ingress-nerd-stats.mjs:100-101`; `lib/ingress-nerd-stats.test.mjs:115` `avgOverallScore===50` | ✅ PASS |
| NERD-11: total de Onyx por facção | mesma definição de NERD-05, por facção | `lib/ingress-nerd-stats.mjs:76-85` `countOnyxBadges`; `lib/ingress-nerd-stats.test.mjs:121-129` `enlightened.onyxBadges===12`, `resistance.onyxBadges===0` | ✅ PASS |
| NERD-12: barras divergentes, rótulo central | Enlightened cresce à esquerda (verde), Resistance à direita (azul) | `components/ingress/stats/NerdFactionCompare.tsx:24-39` `DivergentRow` com `ing-nerd-divergent-bar--enlightened`/`--resistance` em lados opostos do rótulo central | ✅ PASS (visual layout; no automated test per matrix) |
| NERD-13: facção zerada não omite a linha | zeros, não omissão da métrica | `lib/ingress-nerd-stats.mjs:94-105` sempre popula as 2 chaves; `lib/ingress-nerd-stats.test.mjs:99-104` `result.resistance` deepEqual zeros, chave presente | ✅ PASS |
| NERD-14: AP médio por agente | `total_ap / total_agentes` | `lib/ingress-nerd-stats.mjs:117` `avgApPerAgent = totalAp/totalAgents`; `lib/ingress-nerd-stats.test.mjs:159-163` `avgApPerAgent===2000` | ✅ PASS |
| NERD-15: histograma de `overall_score`, 6 faixas de 20 pontos | contagem por faixa, cortes exatos da spec | `lib/ingress-nerd-stats.mjs:24-32` `OVERALL_SCORE_BANDS` (0/20/40/60/80/100/120+, 7 faixas incl. Onyx+); `lib/ingress-nerd-stats.test.mjs:131-142` 1 agente por faixa → `[1,1,1,1,1,1,1]`, labels batem 1:1 | ✅ PASS |
| NERD-16: radar consolidado (média dos 5 eixos) | mesmo formato visual do radar individual | `lib/ingress-nerd-stats.mjs:127-131` `communityAxisAverage`; `lib/ingress-nerd-stats.test.mjs:144-157` média simples bate; `components/ingress/stats/CommunityRadarChart.tsx` reaproveita classes `ing-radar__*`, sem importar `ProfileRadar` (grep confirma zero ocorrências) | ✅ PASS |
| NERD-17: média de recursões, só `IS NOT NULL` | média exclui ausentes | `lib/ingress-nerd-stats.mjs:133-141` `withRecursions = rows.filter(r => r.recursions !== null && !== undefined)`; `lib/ingress-nerd-stats.test.mjs:171-175` mix null/5/15 → `avg===10, reportedCount===2` | ✅ PASS |
| NERD-18: maior recursão + quantos informaram | max + reportedCount | mesmo bloco acima, `max: Math.max(...)`; teste `:174` `max===15` | ✅ PASS |
| NERD-19: 0 agentes com `recursions` → "sem dados suficientes" em vez de média sobre zero | `avg:null` quando `reportedCount===0` | `lib/ingress-nerd-stats.mjs:136-137` `withRecursions.length===0 ? null : ...`; teste `:165-169` `{avg:null,max:null,reportedCount:0}`; UI `components/ingress/stats/NerdAverages.tsx:76-77` `recursions.reportedCount === 0 ? <p>{t.recursionsEmpty}</p>` | ✅ PASS |
| NERD-20: recorde por cada um dos 12 stats | codinome + valor do maior | `lib/ingress-nerd-stats.mjs:193-197` `perStat[key] = pickRecordCoerceZero(...)` para os 12 `RADAR_STAT_KEYS`; `lib/ingress-nerd-stats.test.mjs:203-208` maior `lifetime_ap` devolve codinome certo (mesmo padrão usado nos 12 stats) | ✅ PASS |
| NERD-21: empate exato → `created_at` mais antigo vence | tie-break por antiguidade | `lib/ingress-nerd-stats.mjs:146-149,160` `isOlder` + `pickRecordCoerceZero`; `lib/ingress-nerd-stats.test.mjs:184-201` empate exato → `codenameKey==='mais-velho'` | ✅ PASS |
| NERD-22: maior `lifetime_ap` + codinome | recorde de AP | `lib/ingress-nerd-stats.mjs:198` `lifetimeAp = pickRecordCoerceZero(rows, r => r.lifetime_ap)`; teste `:203-208` | ✅ PASS |
| NERD-23: maior recursões (entre `NOT NULL`) + codinome | recorde excluindo ausentes | `lib/ingress-nerd-stats.mjs:199` `pickRecordExcludeMissing`; `lib/ingress-nerd-stats.test.mjs:210-218` agente com `recursions:null` e AP altíssimo NÃO vence o recorde de recursões | ✅ PASS |
| NERD-24: soma das 9 métricas sazonais de `extra_stats` | soma entre quem informou | `lib/ingress-nerd-stats.mjs:204-214,225-241` `SEASONAL_ENGAGEMENT_KEYS` (9 chaves) + `computeSeasonalEngagement`; `lib/ingress-nerd-stats.test.mjs:231-239` soma bate | ✅ PASS |
| NERD-25: ausência de chave exclui do somatório E do divisor, nunca vira 0 | exclusão, não coerção | `lib/ingress-nerd-stats.mjs:231-232` `if (raw===undefined\|\|raw===null) continue`; `lib/ingress-nerd-stats.test.mjs:231-239` agente sem `firstSaturdayEvents` não conta em `sum` nem `reportedCount`; `:241-245` valor não-numérico também excluído | ✅ PASS |
| NERD-26: exibir quantos agentes informaram cada métrica | `reportedCount` por chave | mesmo bloco; `components/ingress/stats/NerdSeasonalEngagement.tsx:60-66` `t.reportedBy(metric.reportedCount)` renderizado por linha | ✅ PASS |
| NERD-27: aviso visível de dado parcial | aviso não-condicional | `components/ingress/stats/NerdSeasonalEngagement.tsx:55` `<p>{t.partialNote}</p>` fora de qualquer condicional, sempre renderizado | ✅ PASS (visual; sem teste automatizado por convenção do projeto) |
| NERD-28: `monthsSubscribed` opcional no POST, grava em `months_subscribed` | campo aceito e persistido | `app/api/ingress-rankings/route.ts:187-190` parse; `:216-218,230` INSERT + `ON CONFLICT ... months_subscribed = EXCLUDED.months_subscribed` | ✅ PASS (sem teste automatizado — rota não tem suíte, convenção já registrada na Test Coverage Matrix de `tasks.md`) |
| NERD-29: ausente/inválido → `NULL`, sem rejeitar | não-rejeitante | `app/api/ingress-rankings/route.ts:188-189` `Number.isFinite(monthsSubscribedRaw) && >=0 ? Math.floor(...) : null` — mesmo padrão de `recursions` (linha 184-185), nenhuma validação bloqueante adicionada | ✅ PASS (código idêntico ao padrão comprovado de `recursions`; sem teste de rota por convenção) |
| NERD-30: % de agentes com assinatura | `months_subscribed IS NOT NULL AND >0` / `IS NOT NULL` | `lib/ingress-nerd-stats.mjs:257-258` `subscribed = withData.filter(r => Number(r.months_subscribed)>0)`, `percentSubscribed = subscribed.length/withData.length*100`; `lib/ingress-nerd-stats.test.mjs:261-273` mix null/0/6/12 → `2/3*100` | ✅ PASS |
| NERD-31: média de meses entre `>0` | média só entre assinantes reais | `lib/ingress-nerd-stats.mjs:259-262` `avgMonthsAmongSubscribed` sobre `subscribed` (months>0), não `withData`; teste `:272` `avgMonthsAmongSubscribed===9` (média de 6 e 12, exclui o `0`) | ✅ PASS |
| NERD-32: ninguém com o campo preenchido → "sem dados suficientes" | `hasData:false`, não 0%/média zerada | `lib/ingress-nerd-stats.mjs:252-255` `withData.length===0` → `{hasData:false,...:null}`; teste `:255-259`; UI `components/ingress/stats/NerdSubscription.tsx:31-33` `if (!hasData) return <p>{t.empty}</p>` | ✅ PASS |

**Status**: ✅ All ACs covered (32/32 NERD-01..32, spec-defined outcomes matched — no spec-precision gaps found)

**Note on route/component tests**: NERD-07, 12, 26-29 have no automated test assertion (route/component layers), consistent with the project-wide convention documented in `tasks.md`'s Test Coverage Matrix ("nenhuma rota do projeto tem teste automatizado... rotas e componentes React não têm teste automatizado"). These are marked PASS on code-reading evidence (file:line cited above), not test assertion — flagged here for transparency, not as a gap, since the convention predates this feature and the matrix explicitly scoped route/component layers to "build gate only."

---

## Discrimination Sensor

Ran in an isolated `git worktree` (`../site-casara-verify-scratch`, `git worktree add ... HEAD`), never touching the real tree. Baseline porcelain captured before sensor work (`?? .specs/features/ingress-ranking-comparison/` only, pre-existing/unrelated) and confirmed identical after cleanup.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `lib/ingress-nerd-stats.mjs:58` | Removed `tier !== 'none'` filter (`if (tier && tier !== 'none')` → `if (tier)`) — targets NERD-04 | ✅ Killed — `badgeTiersGranted` gained a spurious `none: NaN` key, failed `deepEqual` |
| 2 | `lib/ingress-nerd-stats.mjs:160` | Flipped tie-break argument order (`isOlder(row, best.row)` → `isOlder(best.row, row)`) — targets NERD-21 | ✅ Killed — tie-break test expected `'mais-velho'`, mutant returned `'mais-novo'` |
| 3 | `lib/ingress-nerd-stats.mjs:230-236` | Removed missing/non-numeric exclusion in `computeSeasonalEngagement` (coerced absent key to 0 and counted it) — targets NERD-25 | ✅ Killed — 2 tests failed (`reportedCount` inflated from 1→2 and 0→1) |
| 4 | `lib/ingress-nerd-stats.mjs:258` | Changed subscription percent denominator from `withData.length` to `rows.length` — targets NERD-30 | ✅ Killed — `percentSubscribed` assertion failed (`2/3` expected, wrong denominator produced) |

**Sensor depth**: lightweight (4 targeted behavior-level mutations, standard feature tier)
**Result**: 4/4 killed — PASS ✅
**Isolation verified**: `git worktree remove --force` executed; `git status --porcelain` on the real tree after cleanup matched the pre-sensor baseline exactly (`?? .specs/features/ingress-ranking-comparison/`, unrelated pre-existing untracked dir)

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ — P7-P9 (`NerdGeography`/`NerdGrowth`/`NerdCorrelation`) correctly left unbuilt, matching tasks.md scope |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — diff surface matches design.md's component list exactly |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — reuses `computeStatTiers`, `RADAR_AXES`/`RADAR_STAT_KEYS`, `fmtStat`, `Panel`, "Sinal perdido" pattern, `try/catch` degrade pattern from `loadInitialRows`/`loadInitialActivity` |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria, non-shallow | ✅ — spot-checked P4 (hall of fame tie-break) and P6 (subscription) stories in detail above; assertions target exact values, not just "no throw" |
| Spec-anchored outcome check | ✅ — see table above; no spec-precision gaps |
| Per-layer Coverage Expectation met | ✅ — domain logic (`lib/ingress-nerd-stats.mjs`) has 1:1 AC-to-test mapping (32 ACs, 26 tests covering every branch/edge case); routes/components follow the project's documented no-test convention (build-gate only), not a gap introduced by this feature |
| Every test maps to a spec AC / edge case / Done-when | ✅ — all 26 tests in `ingress-nerd-stats.test.mjs` trace to specific NERD-IDs or edge cases (empty list, tie-break, missing keys) |
| Documented project quality/testing guidelines followed | ✅ — `tasks.md` Test Coverage Matrix (self-documented for this feature, sampled from `ingress-tier-score.test.mjs`/`ingress-badges.test.mjs` conventions) |

---

## Edge Cases

- [x] `casara.ingress_rankings` inacessível → `loadNerdStats` catches and returns `null` (`app/ingress/ranking/page.tsx:143-146`), same pattern as sibling loaders; `IngressNerdStats` renders "Sinal perdido" for `null`
- [x] `casara.ingress_ranking_history` vazia, `ingress_rankings` com linhas → `totalSubmissions` fica 0 sem quebrar o resto (parameter passed straight through in `computeNerdStats:280`, no special-casing needed since `count` from `COUNT(*)` naturally returns 0)
- [x] `stat_values` com chave ausente/não-numérica → tratada como 0 (`pickRecordCoerceZero:159` `Number(getValue(row)) || 0`; test `lib/ingress-nerd-stats.test.mjs:220-229` confirms agent stays in the race with value 0, not excluded)
- [x] 1 agente cadastrado → facção/médias/hall da fama funcionam normalmente (no minimum-sample-size gates found anywhere in `lib/ingress-nerd-stats.mjs`; single-row fixtures used throughout the test file, e.g. `computeNerdStats([makeRow()], 1)`)

---

## Gate Check

- **Gate command**: `npm test && npx tsc --noEmit && npm run lint` (Full, per Gate Check Commands table); `npm run build` not run (see note below)
- **`npm test` result**: 419 passed, 0 failed, 0 skipped (full suite, includes 26 tests in `lib/ingress-nerd-stats.test.mjs`)
- **`npx tsc --noEmit` result**: clean, no output, exit 0
- **`npm run lint` result**: 94 errors / 26 warnings total in the repo, but **zero** touch any file in this feature's diff surface (`lib/ingress-nerd-stats.mjs`, `lib/ingress-nerd-stats.test.mjs`, `app/api/ingress-rankings/route.ts`, `app/ingress/ranking/page.tsx`, `components/ingress/stats/Nerd*.tsx`, `IngressNerdStats.tsx`, `CommunityRadarChart.tsx`, `IngressRankingTabs.tsx`). All pre-existing errors live in `components/ui/text-scramble.tsx`, `tailwind.config.ts`, `utils/love-language-pdf-generator.tsx`, `utils/pdf-generator.tsx`, `utils/analytics.ts` — unrelated to this feature, confirmed pre-existing on `main` (not introduced by this branch's diff)
- **`npm run build` result**: independently re-run by the Verifier — succeeded (`✓ Compiled successfully`, `✓ Generating static pages (83/83)`), `/ingress/ranking` listed as `ƒ` (server-rendered on demand), consistent with its `force-dynamic` export and the SSR-only `loadNerdStats` design (no static generation attempted for a route with a DB-backed third tab)
- **Test count before feature**: not independently measured (no pre-feature baseline commit checked out); test count after feature is 419, of which 26 are net-new (`lib/ingress-nerd-stats.test.mjs`, entirely new file — commit `d983c8b` onward)
- **Delta**: +26 new tests (entire file is new)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None required for P1-P6 (NERD-01..32) scope. One process gap noted (not a code defect):

None. `npm run build` was independently re-run and succeeded (see Gate Check above) — no gap remains.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| NERD-01 .. NERD-32 | Pending | ✅ Verified |
| NERD-33 .. NERD-37 | Pending | Pending (out of scope, P7-P9, not implemented — correctly deferred) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 32/32 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 4/4 mutations killed
**Gate**: 419 passed, 0 failed (npm test); tsc clean; lint clean on diff surface; `npm run build` succeeded

**What works**: All 6 MVP sections (totals, faction comparison, averages/histogram/radar, hall of fame, seasonal engagement, subscription) are implemented, wired into a third tab on `/ingress/ranking`, computed once via SSR without polling, backed by 26 unit tests covering every branch and edge case named in the spec (empty list, ties, missing/non-numeric data, faction with zero agents). Domain logic correctly reuses `computeStatTiers`/`RADAR_AXES`/`RADAR_STAT_KEYS` rather than duplicating tier thresholds. `CommunityRadarChart` confirmed not importing `ProfileRadar` (Risk 1 mitigation from design.md honored). Production build succeeds end-to-end.

**Issues found**: None.

**Next steps**: None required for NERD-01..32. P7-P9 (geography/growth/correlation) remain out of scope for this round, as intended.
