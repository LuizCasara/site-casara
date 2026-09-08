# Ingress — Perfil de Agente Validation

**Date**: 2026-09-07
**Spec**: `.specs/features/ingress/spec.md`
**Diff range**: `main..feat/ingress` (32 commits)
**Verifier**: standalone fresh-eyes pass (sub-agents declinados pelo usuário; fallback do skill)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T7 (Fase 1: lib pura + semente + loader) | ✅ Done | 40 testes unitários |
| T8–T13 (Fase 2: layout + seções server) | ✅ Done | + `refactor: direção visual Prime` (pedido do usuário) |
| T14–T18 (Fase 3: gráficos SVG + S2) | ✅ Done | Radar/barras/timeline SVG à mão; Leaflet code-split |
| T19–T23 (Fase 4: CLI + OG + icon + CountUp + integração) | ✅ Done | + `fix: parseAppExport rejeita arquivo que não é export` |

23/23 tasks. Nenhuma parcial ou bloqueada.

---

## Spec-Anchored Acceptance Criteria

Camada de lógica pura (`lib/ingress-*.mjs`) — matriz exige teste unitário 1:1:

| Critério | Outcome esperado (spec) | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| INGR-06 export→JSON chaves estáveis | valores reais do snapshot | `lib/ingress-stats.test.mjs:56` `assert.equal(stats.lifetimeAp, 94990303)` … `:60` `assert.equal(Object.keys(stats).length, 54)` | ✅ PASS |
| INGR-07 colunas divergentes → aborta | `Error` sem gravar | `lib/ingress-stats.test.mjs:74` `assert.throws(() => parseAppExport(...), /60/)` | ✅ PASS |
| INGR-07 sem linha de dados → aborta | `Error` | `lib/ingress-stats.test.mjs:80` `assert.throws(..., /cabeçalho \+ ao menos uma linha/)` | ✅ PASS |
| INGR-07 arquivo não-export → aborta | `Error` (falta Agent Name) | `lib/ingress-stats.test.mjs:84` `assert.throws(..., /Agent Name/)` | ✅ PASS |
| INGR-06 casa por nome (não posição) | cabeçalho reordenado ainda mapeia | `lib/ingress-stats.test.mjs:94-101` `assert.equal(stats.lifetimeAp, 94990303)` após swap | ✅ PASS |
| INGR-10 buildProfile idempotente | objetos idênticos | `lib/ingress-profile.test.mjs:24` `assert.deepEqual(a, b)` + `assert.equal(JSON.stringify(a), JSON.stringify(b))` | ✅ PASS |
| INGR-11 merge preserva seções do dump | `timeSeries`/`portals` mantidos, `pending` recalculado | `lib/ingress-profile.test.mjs:39-49` `assert.deepEqual(p.timeSeries, previous.timeSeries)` + `assert.deepEqual(p.pending, [])` | ✅ PASS |
| INGR-19 pending vem de campo explícito | lista derivada, não valores mágicos | `lib/ingress-profile.test.mjs:19` `assert.deepEqual(p.pending, ['apTimeline','portalMap'])`; `:71` fixture parcial → `['portalMap']` | ✅ PASS |
| INGR-12 tier a partir da tabela | limiar exato → aquele tier | `lib/ingress-badges.test.mjs:34` `assert.equal(computeBadge(byKey('liberator'), 5000).tier, 'gold')` | ✅ PASS |
| INGR-13 falta para o próximo tier | valor restante | `lib/ingress-badges.test.mjs:40` `assert.deepEqual(r.next, {tier:'platinum', remaining:1})` | ✅ PASS |
| INGR-14 Onyx → tier máximo | `atMax:true`, `next:null` | `lib/ingress-badges.test.mjs:46` `assert.equal(r.atMax, true)` + `assert.equal(r.next, null)` | ✅ PASS |
| INGR-15 stat ausente → badge omitida | não aparece | `lib/ingress-badges.test.mjs:56` `assert.equal(computeAllBadges({portalsCaptured:20330}).length, 1)` | ✅ PASS |
| INGR-16 limiares oficiais + testados | tiers do FencherLC conferem | `lib/ingress-badges.test.mjs:63` `assert.deepEqual(got, {builder:'platinum', …, specops:'onyx'})` | ✅ PASS |
| INGR-21 radar por eixo, escala 0..1 | 5 eixos normalizados | `lib/ingress-radar.test.mjs:9` estrutura; `:41` soma múltiplas stats → `value === 1` | ✅ PASS |
| INGR-23 normalização em lib testada | satura em 1 | `lib/ingress-radar.test.mjs:16` `for (…) assert.equal(axis.value, 1)` | ✅ PASS |
| INGR-24 eixo sem dado → 0 | não quebra os outros | `lib/ingress-radar.test.mjs:28` `assert.equal(hacking.raw, 75000)` + `assert.ok(Number.isFinite(a.value))` | ✅ PASS |
| INGR-26/27 cobertura por nível | conjunto determinístico de tokens | `lib/ingress-s2.test.mjs:23` `assert.deepEqual(tokens, ['94dce11', …])` | ✅ PASS |
| INGR-28 matemática S2 em lib testada | anel de 4 vértices, nível certo | `lib/ingress-s2.test.mjs:33` `assert.equal(s2.cellid.level(...), 12)` + `assert.equal(cell.ring.length, 4)` | ✅ PASS |
| INGR-28 cap respeitado | ≤ cap, sem travar | `lib/ingress-s2.test.mjs:44` `assert.ok(cells.length <= 50)` + `< 5000ms` | ✅ PASS |
| INGR-32/33 ingestão dump + merge por recência | mais novo ganha, antigo não | `lib/ingress-profile.test.mjs:79` `assert.equal(merged.stats.lifetimeAp, 94990303)` (antigo) / `:88` sobrescreve (novo) | ✅ PASS |
| INGR-34 arquivo do dump ausente não aborta | no-op seguro | `lib/ingress-profile.test.mjs:93` `mergeGdprDump(base, {})` → `pending` intacto | ✅ PASS |

Camada React (matriz: **build gate only** — sem infra de teste de componente no projeto):

| Critério | Cobertura | Resultado |
| --- | --- | --- |
| INGR-01 página renderiza identidade + stats | build compila `/ingress` estático; lógica (badges/radar) coberta em lib | ⚠️ build-gate + verificação visual do Luiz |
| INGR-02 números pt-BR agrupados | `STAT_GROUPS` particiona as 54 stats (`ingress-stats.test.mjs:44`); `Intl.NumberFormat('pt-BR')` em `StatValue`/`CountUp` | ⚠️ formatação não unit-testada (consistente com a matriz) |
| INGR-03 PT, layout próprio, fora do LanguageProvider | Header/Footer `return null` em `/ingress` (inspeção); layout carrega Sora+Barlow | ⚠️ build-gate + visual |
| INGR-04 chave ausente não quebra render | `StatGroups` filtra `typeof stats[k]==='number'`; `computeAllBadges`/`computeRadarAxes` omitem/zeram (lib-testado) | ✅ lógica testada; render por build-gate |
| INGR-05 zero chamadas à Niantic em runtime | `loadProfile` é `import` estático; nenhum `fetch` em `app/ingress`/`components/ingress`; tiles do OSM, não Niantic | ✅ por inspeção |
| INGR-17/18/19/20 estado "aguardando dump" | `profile.pending` (lib-testado) decide o slot; `PendingSection` por `kind` | ✅ decisão testada; render por build-gate |
| INGR-22 distribuição de ações | `ActionsBreakdown` barras CSS, contagem ausente omitida | ⚠️ build-gate + visual |
| INGR-25/29 mapa Leaflet + fallback | `S2Explorer` `dynamic ssr:false`; `MapErrorBoundary` no Loader | ⚠️ **integração Leaflet não verificada automaticamente** — Luiz precisa abrir e testar slider/arrasto/erro |
| INGR-30/31 OpenGraph | rota `opengraph-image` compila (edge); mesmo mecanismo do `/casamento` | ⚠️ render final verificável colando o link |
| INGR-35 timeline de AP com dump | `ApTimeline` renderiza `{t,v}[]`; `< 2` pontos → `null` | ⚠️ sem dado real ainda (P3); render por build-gate |
| INGR-36 mobile-first 360px | `clamp()`, `flex-wrap`, `overflow-wrap`, grades `minmax(0,1fr)` | ⚠️ **verificação a 360px pendente do Luiz** |

**Status**: ✅ Todos os ACs de lógica pura cobertos com evidência `file:line`; ACs de UI dependem do build-gate (verde) + verificação visual do Luiz, consistente com a Test Coverage Matrix (React = build gate).

---

## Discrimination Sensor

Scratch: `git worktree add ../site-casara-sensor HEAD`. Baseline real-tree porcelain (`CLEAN`) confirmado idêntico após a limpeza (`git worktree remove --force`).

| # | File | Mutação | Morto? |
| --- | --- | --- | --- |
| 1 | `lib/ingress-badges.mjs` (computeBadge) | `value >= tiers[name]` → `value > tiers[name]` | ✅ Morto (2 testes falharam) |
| 2 | `lib/ingress-stats.mjs` (parseAppExport) | `if (values.length !== header.length)` → `if (false)` | ✅ Morto (1 teste) |
| 3 | `lib/ingress-s2.mjs` (coverViewport) | `out.length < cap` → `out.length < cap * 999` | ✅ Morto (1 teste) |
| 4 | `lib/ingress-radar.mjs` (computeRadarAxes) | `Math.min(1, …)` → `Math.min(9, …)` | ✅ Morto (1 teste) |
| 5 | `lib/ingress-profile.mjs` (isNewer) | `String(a) > String(b)` → `String(a) < String(b)` | ✅ Morto (2 testes) |

**Sensor depth**: lightweight (5 mutações behavior-level no código novo de maior risco)
**Result**: 5/5 mortos — PASS ✅

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ (Header/Footer: 1 linha cada; refactor Prime foi pedido explícito) |
| Sem scope creep | ✅ (mapa de calor de portais e P3 do dump ficaram fora, como na spec) |
| Segue os padrões do projeto | ✅ (`lib/*.mjs` + `.test.mjs`; tipos em `.ts`; CLI espelha `scripts/livros.mjs`; SVG à mão como `/stats`; layout próprio como `/casamento`) |
| Spec-anchored: valores testados batem com a spec | ✅ |
| Coverage Expectation por camada | ✅ domínio 1:1 com ACs; React = build-gate (matriz) |
| Todo teste mapeia para um requisito | ✅ (nenhum teste especulativo) |
| Guidelines seguidas | `CLAUDE.md` + amostras `lib/*.test.mjs` (node:test) |

Dois `fix`/`style` commits no meio da execução (`parseAppExport` endurecido depois que o CLI expôs o buraco; constante órfã removida) — ambos rastreáveis, ambos com teste onde cabia.

---

## Edge Cases

- [x] Número com separador de milhar / aspas → `ingress-stats.test.mjs:88`
- [x] `capturedAt` novo mais antigo → `isNewer` testado (`:79`) + `scripts/ingress.mjs persist()` pede confirmação extra (verificado à mão em T19)
- [x] JSON de perfil ausente / `schemaVersion` desconhecido → `loadProfile()` retorna `null` → página "Sinal perdido" (guarda simples; verificado por inspeção + build)
- [x] `s2.center` ausente → fallback em código (`ingress-profile.test.mjs:19` cobre o caminho sem `previous`)
- [x] Viewport S2 afastada demais → `cap` (`ingress-s2.test.mjs:44`)
- [x] `prefers-reduced-motion` → neutralizado no `theme.css`; `CountUp`/`HeroMesh` param no valor final

---

## Gate Check

- **Comando**: `npm run lint && npm test && npm run build`
- **Resultado**: lint ✔ (0 warnings) · 296 testes ✔ 0 falhas · build ✔ (`/ingress` 105 kB estático, `opengraph-image` edge)
- **Testes antes da feature**: 256
- **Testes depois**: 296
- **Delta**: +40 (ingress-stats 10, badges 9, radar 6, profile 9, s2 6)
- **Pulados**: nenhum
- **Falhas**: nenhuma

---

## Requirement Traceability Update

Lógica pura (INGR-06,07,10,11,12,13,14,15,16,19,21,23,24,26,27,28,32,33,34): **✅ Verified**.
UI (INGR-01,02,03,04,05,17,18,20,22,25,29,30,31,35,36): **Implementing → build-gate OK, UAT visual pendente do Luiz**.

---

## Summary

**Overall**: ✅ Ready (com verificação visual pendente)

**Spec-anchored check**: 19/19 ACs de lógica com evidência `file:line` batendo com a spec; ACs de UI cobertos por build-gate + a verificação visual do Luiz (consistente com a matriz)
**Sensor**: 5/5 mutações mortas
**Gate**: lint ✔ · 296 testes ✔ · build ✔

**O que funciona**: pipeline export→JSON idempotente; parser resiliente (casa por nome, rejeita lixo); 14 badges com limiares oficiais e tiers conferidos; radar/barras/timeline SVG; cobertura S2 determinística e limitada; página compõe as 8+ seções; placeholders honestos; CLI `build`/`gdpr`/`show`; OG image + favicon.

**Riscos residuais**:
1. Integração Leaflet (T17) — slider redesenha, arrasto recalcula, error boundary — não é verificável por teste automático. Luiz precisa abrir `/ingress`, tocar em "explorar as células" e exercitar.
2. Mobile-first a 360px (INGR-36) — construído com `clamp`/`flex-wrap`/grids fluidas, mas não medido. Luiz confere na tela.
3. Direção visual "Prime" — aprovada em conceito, não vista renderizada.
4. `data/ingress/fencherlc.json` → `timeSeries`/`portals` seguem `null` até o dump GDPR; o mapa de nomes de arquivo em `scripts/ingress.mjs` (`GDPR_SERIES`) vai precisar de ajuste contra o dump real (já anotado no código e na spec como P3).

**Próximos passos**: Luiz revisa `/ingress` no navegador (desktop + 360px) e o explorador S2. Depois: `git push` + PR (precisa de OK explícito). O dump GDPR, quando chegar, roda `node scripts/ingress.mjs gdpr <pasta> --apply`.

---

## Adendo — T24: arte real das medalhas (pós-Verifier, 2026-09-07)

Enhancement aditivo pedido pelo Luiz depois da entrega. `BadgeMedal` passa a usar
`public/ingress/medals/<key>-<tier>.png` quando o arquivo existe (checagem no
server via `lib/ingress-medal-art.mjs`), com fallback total para o hexágono
atual. Sem PNG nenhum, comportamento idêntico ao verificado acima.

Gate re-rodado: lint ✔ · 296 testes ✔ · build ✔ (`/ingress` segue 105 kB, `<img>`
local com `eslint-disable` pontual). Sem novo sensor — mudança puramente aditiva
com fallback, coberta pelo build-gate. Copyright: arte da Niantic, uso tolerado
pela comunidade Ingress, decisão do dono do site.

Os 14 PNGs do tier atual foram baixados de **ingress.plus** (API PocketBase
aberta). O `tier_values` da API conferiu com `lib/ingress-badges.mjs` em 13 de 14
badges — a exceção foi o **bronze do Illuminator** (ingress.plus 2000 vs. Fev
Games 5000); corrigido para 2000 (fonte viva). Não afeta o resultado do FencherLC
(Illuminator = Onyx nos dois casos), então nenhum teste mudou de veredito.

---

## Expansão — Medalhas (Onda 1), Fases 5-8 (T25–T43) — 2026-09-08

Executada com o Luiz dormindo, na latitude "o que der pra adiantar, adiante". As
Fases 7-8 (UI) foram construídas com o snapshot atual; a seção "Conquistas" e a
timeline ficam no estado convite/placeholder até o Luiz transcrever os prints do
scanner (que ele manda amanhã, 1 por medalha).

**Diff range**: `main..feat/ingress` (T25–T43, ~30 commits da expansão)

### Tasks

| Fase | Tasks | Status |
| --- | --- | --- |
| 5 (catálogo + lógica) | T25–T30 | ✅ 5 libs `.mjs` novas/refatoradas com teste |
| 6 (CLI + arte) | T31–T32 | ✅ comando `badges`, `medals --fetch`, 130 PNGs |
| 7 (medalhas no topo) | T33–T38 | ✅ BadgeShelf 26, detalhe `/medalha/[slug]`, TierLadder, Conquistas, nova ordem |
| 8 (timeline, hover, OG, projeção) | T39–T43 | ✅ timeline, hover KPI→badge (CSS), OG por badge, projeção |

### Spec-Anchored Acceptance Criteria (lógica pura — evidência `file:line`)

| Critério | `file:line` + asserção | Resultado |
| --- | --- | --- |
| MED-01 (26 badges do catálogo, statKey real, tiers crescentes) | `lib/ingress-badges.test.mjs:11` `assert.equal(BADGES.length, 26)` + loop `STAT_KEYS.has(b.statKey)` | ✅ |
| MED-01 (badge sem stat → tier none, não some) | `lib/ingress-badges.test.mjs:54` `assert.equal(badges.length, 26)` + `:58` `builder → 'none'` | ✅ |
| MED-01 (nextMedal: maior pct, desempate por ordem) | `lib/ingress-badges.test.mjs:89` `assert.equal(nextMedal(badges).key, 'builder')` | ✅ |
| MED-01 (tierCounts) | `lib/ingress-badges.test.mjs:83` `assert.deepEqual(tierCounts(...), {onyx:7,...})` | ✅ |
| MED-02 (catálogo: catalogEntry, coreBadges ordem, artPath) | `lib/ingress-catalog.test.mjs:22,29,43` | ✅ |
| MED-02 (slugForStatKey inversa; filtro por group) | `lib/ingress-catalog.test.mjs:34` + `:41` (catálogo misto) | ✅ |
| MED-04 (appendSnapshot ordenado, dedupe, imutável) | `lib/ingress-history.test.mjs:7` `assert.deepEqual(h2.map(t), [...])` + `:18` dedupe | ✅ |
| MED-04 (buildProfile cria/preserva history/medalDates/eventBadges) | `lib/ingress-profile.test.mjs:26` + `:44` + `:60` (idempotência) | ✅ |
| MED-04 (mergeGdprDump insere snapshot anterior ao primeiro) | `lib/ingress-profile.test.mjs:67` `assert.deepEqual(merged.history.map(t), ['2020..','2023..','2026..'])` | ✅ |
| MED-06 (collectAcquisitions junta as 2 fontes, ordenado) | `lib/ingress-timeline.test.mjs:16` `assert.deepEqual(rows.map(...), [...])` | ✅ |
| MED-06 (data inválida / slug fora do catálogo ignorados) | `lib/ingress-timeline.test.mjs:29` + `:36` | ✅ |
| MED-08 (projectNextTier: {tier,date} / null / {reason}) | `lib/ingress-history.test.mjs:41` + `:57` + `:62` + `:36` (days===0 → null) | ✅ |

### Camada React / CLI (build gate — matriz)

MED-02 (rota `/ingress/medalha/[slug]`), MED-03 (AchievementsShelf), MED-05 (CLI
`badges`/`medals --fetch`), MED-07 (hover KPI→badge, feito em CSS puro sem client
component), OG por badge: **compilados, build prerendera as 26 rotas de detalhe +
26 OG**. UAT visual pendente do Luiz.

### Discrimination Sensor

Scratch: `git worktree add ../ic-s3 HEAD`. Real-tree porcelain limpo antes e
depois.

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| 1 | `lib/ingress-catalog.mjs` | `coreBadges` filter `group==='core'` → `() => true` | ✅ (após fix: teste com catálogo misto) |
| 2 | `lib/ingress-badges.mjs` | `computeAllBadges` volta a omitir badge sem a stat | ✅ Morto (2 testes) |
| 3 | `lib/ingress-badges.mjs` | `nextMedal` desempate `<` → `>` | ✅ Morto |
| 4 | `lib/ingress-history.mjs` | `appendSnapshot` dedupe desligado | ✅ Morto |
| 5 | `lib/ingress-history.mjs` | `ratePerDay` `days <= 0` → `days < 0` | ✅ (após fix: teste days===0) |
| 6 | `lib/ingress-timeline.mjs` | `Date.parse` filter desligado | ✅ Morto |
| 7 | `lib/ingress-timeline.mjs` | `sort` invertido | ✅ Morto |
| 8 | `lib/ingress-profile.mjs` | `buildProfile` para de chamar `appendSnapshot` | ✅ Morto (4 testes) |

**Depth**: lightweight (8 mutações). **Result**: 8/8 mortos (2 exigiram fix —
commit `test(ingress): mata 2 mutantes sobreviventes do sensor`).

### Gate

`npm run lint` ✔ (0 warnings) · `npm test` **325 testes ✔** (era 256 no início da
feature; +69) · `npm run build` ✔ — `/ingress` 109 kB, `/ingress/medalha/[slug]`
e `.../opengraph-image` prerenderizados (26 cada).

### Riscos residuais / pendente do Luiz

1. **Prints do perfil** — a seção "Conquistas" (anomalias/eventos/colecionáveis)
   e a timeline de datas ficam no estado convite/placeholder até o Luiz
   transcrever (`node scripts/ingress.mjs badges add <slug> ...`). Tudo pronto
   para receber: `medals --fetch` já baixa a arte de evento.
2. **UAT visual** — a nova ordem da página, o detalhe da medalha, o hover no KPI,
   a escada de tiers — nada verificado na tela.
3. **`GDPR_SERIES`** em `scripts/ingress.mjs` ainda precisa de ajuste contra o
   formato real do dump (mapa de nomes de arquivo).
4. **`history` com 1 ponto** — a projeção mostra "mande um 2º export"; liga
   sozinha no próximo `build`.
