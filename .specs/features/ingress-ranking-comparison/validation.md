# Ingress Ranking Comparison Validation

## Validation: Ingress Ranking Comparison - PASS ✅

**Re-verified 2026-09-18 (2nd pass) on commit `390bc89`.** The 1st pass (below, superseded) found exactly one GAP: IRCMP-06's badge order (`<emblema país><emblema facção>`) was swapped in `components/ingress/AgentSelect.tsx`. Commit `390bc89` ("fix(ingress): order country flag before faction icon in AgentSelect") swaps the two `<img>` blocks in both spots (closed-field badges and each option `<li>`); this Verifier re-read both edited blocks against IRCMP-06's literal quoted order and re-ran the full gate on the new HEAD — both confirmed clean (see **Fix Verification** section below). 41/41 ACs now PASS, gate is green, no other change was needed. `390bc89` also fixed the T1 test-count arithmetic this report flagged (423→436/13 new tests, not 420→436/16) directly in `tasks.md` — confirmed by re-reading the diff.

**Date**: 2026-09-18 (1st pass), 2026-09-18 (re-verify pass, commit `390bc89`)
**Spec**: `.specs/features/ingress-ranking-comparison/spec.md`
**Diff range**: `feat/ingress-ranking-nerd-stats..feat/ingress-ranking-comparison` (= `2ddfe9d..390bc89`, 18 commits: T1–T17 + the post-Verifier Fix 1 commit)
**Verifier**: independent sub-agent (author ≠ verifier) — no context inherited from the implementing session

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Query builders + allow-lists exist and are wired everywhere they're claimed. **Evidence-integrity note (fixed in `390bc89`)**: Done-when originally claimed "420 → 436 (16 testes novos)"; actual measured delta is **423 → 436 (13 new tests)**, all in `lib/ingress-rankings.test.mjs`, 0 removed (`git diff 2ddfe9d..28f5dc5 -- lib/ingress-rankings.test.mjs \| grep -c '^+test('` = 13). `tasks.md` was corrected to read "13 testes novos (423 → 436...)" in `390bc89`. The `436` end-state and the "all new tests in this one file, none removed" claim were always correct; only the *before* figure/delta arithmetic was wrong. |
| T2 | ✅ Done | `lib/ingress-my-agent.ts` — try/catch on both functions, key `ing-cmp-my-agent` distinct from `ing-cmp-sent`. |
| T3 | ✅ Done | `trackIngressComparisonViewed` added; `trackIngressCompareVsMe`/`trackIngressCompareTwoAgents` confirmed removed from `utils/analytics.ts` (grep: zero matches). |
| T4 | ✅ Done | `GET /api/ingress-rankings` rewritten, allow-lists degrade to defaults, `rank`/`total`/`page`/`pageSize` all present. |
| T5 | ✅ Done | `GET /api/ingress-rankings/agents` — keyset + search, `hasMore`/`nextCursor` correct. |
| T6 | ✅ Done | `GET /api/ingress-rankings/compare` — `a===b` guard returns 400; confirmed both by static reading and by a live (unmutated) functional check during the sensor run. |
| T7 | ✅ Done | `page.tsx` SSR uses `buildRankingPageQuery`, real `total` feeds hero, isolated top-50 JSON-LD query. `SPEC_DEVIATION` (no `initialTotal` prop into `IngressRankingTabs`) is accurately described and its consequence (T15 fetches its own total on mount) is real and correctly implemented. |
| T8 | ✅ Done | `RadarOverlay.tsx` is a faithful, unchanged-markup extraction of the old inline block; both `ProfileRadar` and `IngressComparisonTab` consume it. |
| T9 | ✅ Done | `variant==='ranking'` no longer renders `ing-radar__cmp-mode`; `variant==='default'` keeps both modes verbatim. `modeSolo` string confirmed absent. |
| T10 | ✅ Done | `handleCompare` simplified to 1 arg; `saveMyAgent` called on any truthy response; CTA is a real `<a href>` gated on `myAgentKey`. |
| T11 | ✅ Done | `AgentScore` optional fields render conditionally; `StatsRadarSection` (which never passes them) is visually unaffected by construction. |
| T12 | ✅ Done | `AgentSelect` — badge order fixed in `390bc89` (was IRCMP-06's GAP in the 1st pass, now resolved). Everything else (pagination, search, debounce, empty/error states, 44px touch target) matches. |
| T13 | ✅ Done | `IngressComparisonTab` orchestration matches spec precisely, including the `aFromUrl`/`bFromUrl`-gated "not found" vs. silent-clear distinction. |
| T14 | ✅ Done | Precedence resolution (URL > localStorage) and URL sync (`history.replaceState`) both correct. Row-shortcut wiring correctly deferred to T15 per its own `SPEC_DEVIATION`, and T15 does wire it. |
| T15 | ✅ Done | Table is fully server-paginated; canonical `rank` never recomputed client-side (no `.sort(` call left in the file); `onCompareRow` wired. |
| T16 | ✅ Done | CSS for `AgentSelect`, comparison tab grid, pagination controls, and the 44px mobile compare-button target all present and match the code they style. |
| T17 | ✅ Done | Gate commands re-run clean by this Verifier independently (see Gate Check below); traceability table present in `spec.md`. |

No task is blocked or partial. All 17 commits map 1:1 to T1–T17 (`git log --oneline 2ddfe9d..28f5dc5` = 17 commits).

---

## Spec-Anchored Acceptance Criteria

### P1: Comparar dois agentes quaisquer (IRCMP-01 a 05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-01: A+B diferentes → radar + painel lado a lado | Renderiza `RadarOverlay`+`OverallScorePanel` a partir só de dados persistidos | `components/ingress/stats/IngressComparisonTab.tsx:205-209` — `result.status==='ready' && result.a && result.b` monta `<RadarOverlay agentA={toAgent(result.a)} agentB={toAgent(result.b)} /><OverallScorePanel agents={[...]} />`; dados vêm de `app/api/ingress-rankings/compare/route.ts:55-59` (`SELECT ... FROM casara.ingress_rankings WHERE codename_key = ANY($1)`) | ✅ PASS |
| IRCMP-02: monta só de campos persistidos, sem exigir paste | `stat_values, axis_scores, overall_score, lifetime_ap, country_code, faction` | `app/api/ingress-rankings/compare/route.ts:55-59` seleciona exatamente essas 6 colunas (+chave/codename); `IngressComparisonTab.tsx` não renderiza nenhum `<textarea>` | ✅ PASS |
| IRCMP-03: só 1 campo preenchido → estado de espera | Nunca renderiza comparação parcial | `IngressComparisonTab.tsx:210-212` — `else <p>{agentAKey \|\| agentBKey ? t.waitingHintOne : t.waitingHint}</p>`; o branch de render exige `result.a && result.b` | ✅ PASS |
| IRCMP-04: mesmo agente em A e B → bloqueado + mensagem | Comparação bloqueada, mensagem inline, sem round-trip | `IngressComparisonTab.tsx:121` (`sameAgent`), `:133-136` (retorna cedo, sem fetch), `:196-197` (`<p>{t.sameAgentError}</p>`). Defesa redundante no servidor: `app/api/ingress-rankings/compare/route.ts:46-48` → 400 | ✅ PASS |
| IRCMP-05: exatamente 2 agentes por vez | UI só suporta 2 slots (A/B) | `IngressComparisonTab.tsx:178-193` — exatamente 2 `<AgentSelect>`, sem mecanismo de adicionar um 3º | ✅ PASS |

### P1: Selecionar agente por nickname (IRCMP-06 a 15)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-06: ordem `<país><facção> <nickname> <AP>` | Emblema de país ANTES do de facção, depois nickname, depois AP | **Corrigido em `390bc89`.** `components/ingress/AgentSelect.tsx:200-211` (campo fechado) e `:264-278` (cada opção) agora renderizam a bandeira de país (`flagSrc`) primeiro, só depois `<img src={FACTION_ICON[...]}>`, seguido de `codename` (`:279`) e `fmtAp(...)` (`:280`) — ordem real confere literalmente com `<emblema país><emblema facção> <nickname> <AP>`. Re-lido e confirmado nesta 2ª passada (ver **Fix Verification**) | ✅ PASS |
| IRCMP-07: sem busca, ordena por nickname case-insensitive, páginas de 100 | `ORDER BY codename_key ASC LIMIT 100` (`codename_key` já é lower-case) | `lib/ingress-rankings.mjs:182-207` (`buildAgentOptionsQuery`), `AGENT_SELECT_PAGE_SIZE=100` (`:171`); teste `lib/ingress-rankings.test.mjs:169-175` | ✅ PASS |
| IRCMP-08: fim da lista + mais agentes → controle "próxima página" que acrescenta | Acrescenta sem descartar as já carregadas | `components/ingress/AgentSelect.tsx:283-297` (`li` "load more"), `:122-125` (`loadPage` concatena `[...prevOptions, ...result.rows]` quando `append`) | ✅ PASS |
| IRCMP-09: sem mais agentes → SHALL NOT mostrar "próxima página" | Controle ausente quando `hasMore===false` | `AgentSelect.tsx:283` — `{hasMore ? (<li>...) : null}`; `hasMore` vem de `app/api/ingress-rankings/agents/route.ts:23` (`rows.length > AGENT_SELECT_PAGE_SIZE`) | ✅ PASS |
| IRCMP-10: digitar substitui paginação por busca substring case-insensitive | Busca no servidor via `ILIKE` | `AgentSelect.tsx:138-149` (`handleChange`, debounce 300ms) → `lib/ingress-rankings.mjs:187-192` (`codename ILIKE $1`, Postgres `ILIKE` é case-insensitive por definição) | ✅ PASS |
| IRCMP-11: limpar busca → volta à paginação, reinicia da 1ª página | `loadPage({})` sem cursor | `AgentSelect.tsx:143-147` — `if (!trimmed) { void loadPage({}); return }` | ✅ PASS |
| IRCMP-12: busca sem resultado → estado vazio explicativo | `t.emptySearch` | `AgentSelect.tsx:247-248` — `options.length === 0 ? (isSearching ? t.emptySearch : t.emptyNoAgents)` | ✅ PASS |
| IRCMP-13: ranking vazio → estado vazio explicativo | `t.emptyNoAgents` | mesmo branch acima; rota degrada array vazio sem erro (`app/api/ingress-rankings/agents/route.ts` — `rows`/`hasMore` sempre calculados do array, nunca lança) | ✅ PASS |
| IRCMP-14: falha de rede/DB → estado de erro com retry | `state:'error'` + botão retry, resto da página intacto | `AgentSelect.tsx:118-121` (`if (!result) setState({status:'error'})`), `:234-246` (botão "Tentar de novo" reexecuta `loadPage`) | ✅ PASS |
| IRCMP-15: leitura sem token de autenticação | Nenhuma checagem de auth na rota | `app/api/ingress-rankings/agents/route.ts` — nenhum header/token validado | ✅ PASS |

### P1: Paginar/buscar tabela principal (IRCMP-16 a 23)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-16: paginação server-side, padrão 20 | `pageSize=20` default | `app/api/ingress-rankings/route.ts:295` (`isValidPageSize(requestedPageSize) ? requestedPageSize : 20`); `lib/ingress-rankings.mjs:126` (`pageSize=20` default) | ✅ PASS |
| IRCMP-17: 20/50/100 escolhíveis | `RANKING_PAGE_SIZES=[20,50,100]` | `lib/ingress-rankings.mjs:46`; testado em `lib/ingress-rankings.test.mjs:80-88`; UI em `IngressRankingTable.tsx:872-881` | ✅ PASS |
| IRCMP-18: mudar tamanho/ordenação/facção/busca → volta pra página 1 | `setPage(1)` em cada handler | `IngressRankingTable.tsx:436-454` (`handleSort`/`handleFactionFilter`/`handlePageSizeChange` todos chamam `setPage(1)`); busca: `:428-434` (`setPage(1)` no debounce) | ✅ PASS |
| IRCMP-19 (posição canônica, nunca relativa): rank nunca recalculado client-side | `ROW_NUMBER()` numa CTE ANTES do filtro | `lib/ingress-rankings.mjs:156-166` (CTE `ranked` antes do `WHERE`); teste `lib/ingress-rankings.test.mjs:136-141` confirma `rankedIdx < whereIdx`; `IngressRankingTable.tsx:652` usa `row.rank` direto, nenhuma chamada `.sort(` no arquivo | ✅ PASS |
| IRCMP-20: cabeçalho ordenável reordena o ranking INTEIRO no servidor | Nunca ordena só as linhas carregadas | `IngressRankingTable.tsx:436-444` (`handleSort` seta `sortKey`/`sortDir`, dispara novo `fetchPage`); servidor aplica `ORDER BY ${column}` sobre a tabela inteira antes do `LIMIT/OFFSET` (`lib/ingress-rankings.mjs:165-166`) | ✅ PASS |
| IRCMP-21: busca por codinome filtra server-side, mantém ordenação | `ILIKE` + `ORDER BY` mantido | `lib/ingress-rankings.mjs:141-144,165` — busca e ordenação compõem a mesma query | ✅ PASS |
| IRCMP-22: filtro de facção aplicado server-side junto com busca/ordenação, antes da paginação | `conditions` combinadas com `AND`, antes de `LIMIT/OFFSET` | `lib/ingress-rankings.mjs:139-154` | ✅ PASS |
| IRCMP-23: sem resultado (busca/facção) → estado vazio | `t.noResultsBody` | `IngressRankingTable.tsx:577-578` — `rows.length === 0 && !loading` | ✅ PASS |

### P1: Comparar meu status (IRCMP-24 a 27)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-24: envio bem-sucedido → salva `codename_key` + mostra CTA | `saveMyAgent` + CTA condicional | `components/ingress/stats/StatsRadarSection.tsx:145-147` (`saveMyAgent(codenameKey); setMyAgentKey(codenameKey)`); CTA em `:167-174` (`{myAgentKey ? <a ...> : null}`) | ✅ PASS |
| IRCMP-25: clicar CTA → aba Comparação com A pré-preenchido | Navegação real `?tab=compare&a=` | `StatsRadarSection.tsx:170` (`href={\`/ingress/ranking?tab=compare&a=${...}\`}`); `IngressRankingTabs.tsx:63-66` lê `tab`/`a` no mount | ✅ PASS |
| IRCMP-26: A vazio ao abrir + localStorage válido → pré-preenche A | `loadMyAgent()` quando sem `urlA` | `IngressRankingTabs.tsx:64-70` — `if (urlA) {...} else { const saved = loadMyAgent(); if (saved) setAgentAKey(saved) }` | ✅ PASS |
| IRCMP-27: chave inválida no localStorage → ignora em silêncio, sem erro | Limpa sem mensagem | `IngressComparisonTab.tsx:158-162` — `if (agentAKey && !result.a && !aFromUrl) onChangeA(null)` (sem mensagem, já que `aFromUrl===false` para valor vindo do localStorage) | ✅ PASS |

### P1: Fluxo simplificado (IRCMP-28 a 30)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-28: `variant="ranking"` só mostra fluxo de envio | `ing-radar__cmp-mode` ausente | `components/ingress/ProfileRadar.tsx:268-280` — `{variant === 'ranking' ? null : (<div className="ing-radar__cmp-mode">...)}` | ✅ PASS |
| IRCMP-29: `variant="default"` preserva `vs-me`/`two` exatamente | Bloco `ing-radar__cmp-mode` intacto para `default` | mesmo trecho acima — branch `else` renderiza os 2 botões originais sem alteração | ✅ PASS |
| IRCMP-30: envio concluído (com ou sem escrita real) → toast de posição | `toast.success` sempre que `response` truthy | `StatsRadarSection.tsx:136-149` — `if (response) {... toast.success(t.rankToast(response.rank)) }`, independente de `response.written` | ✅ PASS |

### P2: Atalho "Comparar" na linha (IRCMP-31 a 33)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-31: controle "Comparar" em cada linha | Botão presente por linha | `components/ingress/stats/IngressRankingTable.tsx:719-730` (linha principal) + `:762-772` (duplicata mobile no detalhe) | ✅ PASS |
| IRCMP-32: A vazio → preenche A; senão → substitui B | `handleCompareRow` | `components/ingress/stats/IngressRankingTabs.tsx:110-114` — `if (!agentAKey) handleChangeA(...) else handleChangeB(...)` (`handleChangeB` sempre sobrescreve) | ✅ PASS |
| IRCMP-33: alvo de toque ≥44×44px em mobile | `min-height: 2.75rem` (44px) | `app/ingress/theme.css:4377-4386` — regra mobile `.ing-ranking-table__compare.ing-ranking-table__detail-share { min-height: 2.75rem }`; a coluna compacta (sem esse tamanho) é escondida abaixo de 640px (`col[data-col='details'] { visibility: collapse }`), então só a versão de 44px fica visível/clicável no celular | ✅ PASS |

### P2: Comparação compartilhável (IRCMP-34 a 36)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-34: A/B mudam → refletem na URL sem reload | `history.replaceState` | `IngressRankingTabs.tsx:81-98` | ✅ PASS |
| IRCMP-35: abrir link com `tab=compare&a=&b=` válidos → aba já renderizada | `setTab`+`setAgentAKey`+`setAgentBKey` no mount | `IngressRankingTabs.tsx:56-76`; confirmado no smoke test manual do T17 (`?tab=compare&a=fencherlc&b=gal0daxj` 200) | ✅ PASS |
| IRCMP-36: `codename_key` inexistente → aviso "agente não encontrado", resto funciona | Aviso condicionado a `aFromUrl` | `IngressComparisonTab.tsx:183-185`/`190-192`; confirmado manualmente (`?tab=compare&a=agente-inexistente` 200, T17) | ✅ PASS |

### Edge Cases (IRCMP-37 a 41)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IRCMP-37: falha do endpoint de comparação → erro inline, selects preenchidos, retry | `status:'error'` sem limpar `agentAKey`/`agentBKey` | `IngressComparisonTab.tsx:148-150` (`.catch(() => setResult({status:'error'}))`), `:198-204` (retry); `agentAKey`/`agentBKey` são props controladas pelo pai, não são tocadas pelo catch | ✅ PASS |
| IRCMP-38: agente mudou entre carregamento e comparação → reflete o mais recente, sem reconciliar | Ausência de qualquer lógica de staleness | `app/api/ingress-rankings/compare/route.ts` consulta o banco a cada chamada, sem cache/ETag/versão — não há o que reconciliar por construção | ✅ PASS |
| IRCMP-39: localStorage limpo/anônimo → aba abre com campos vazios, sem erro | `loadMyAgent()` retorna `null` sem lançar | `lib/ingress-my-agent.ts:20-25` — `try { ... } catch { return null }` | ✅ PASS |
| IRCMP-40: paginação não precisa ser idêntica entre reaberturas | Comportamento aceito, sem mecanismo de snapshot | Ausência confirmada de qualquer lock/snapshot em `buildAgentOptionsQuery`/`buildRankingPageQuery` — paginação lê a tabela ao vivo a cada chamada | ✅ PASS (aceito por design) |
| IRCMP-41: responsivo em mobile (aba, seletor, tabela) | Sem rolagem horizontal, empilhamento vertical | `app/ingress/theme.css:4589-4592` (`.ing-comparison-tab__selects { grid-template-columns: 1fr }` abaixo de 640px), `:4392-4396` (`.ing-ranking-table__pagination { flex-wrap: wrap }`), `.ing-agent-select__option` sem largura fixa em px | ✅ PASS |

**Status**: ✅ 41/41 ACs PASS (IRCMP-06 fixed in `390bc89`, re-verified this pass — was the only GAP in the 1st pass).

---

## Discrimination Sensor

Executado num `git worktree` temporário (`C:\Users\Luiz\AppData\Local\Temp\claude\scratch-ircmp-sensor`, `HEAD` = `28f5dc5`), nunca na working tree real. Baseline `git status --porcelain` capturado antes (7 entradas pré-existentes e não relacionadas a esta feature: `app/ingress/layout.tsx`, `components/ingress/IngressHub.tsx` modificados + 5 arquivos novos de uma feature de PWA em andamento) e confirmado idêntico depois da remoção do worktree (`diff` vazio) — isolamento comprovado.

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `lib/ingress-rankings.mjs:158` (scratch) | `ROW_NUMBER() OVER (ORDER BY overall_score DESC, ...)` → `ASC` (inverte o rank canônico) | ✅ Killed — `node --test lib/ingress-rankings.test.mjs`: 20 pass / **1 fail** (`buildRankingPageQuery: sem busca/filtro...` — regex não bate mais) |
| 2 | `lib/ingress-rankings.mjs:187-192` (scratch) | Remove o branch de busca de `buildAgentOptionsQuery` (busca passa a cair, sem aviso, na paginação por keyset) | ✅ Killed — mesma suíte: 20 pass / **1 fail** (`buildAgentOptionsQuery: com busca, ignora cursor...`) |
| 3 | `app/api/ingress-rankings/compare/route.ts:46` (scratch) | `keyA === keyB` → `keyA !== keyB` (inverte o bloqueio "mesmo agente") | ⚠️ **Não coberto por teste automatizado** — confirmado funcionalmente: com o mutante, `GET /compare?a=fencherlc&b=fencherlc` respondeu **200** (deveria ser 400) e `GET /compare?a=fencherlc&b=gal0daxj` respondeu **400** (deveria ser 200) — comportamento exatamente invertido, provando que a mutação testa a linha certa. Mas nenhum de `npm test`/`tsc`/`lint`/`build` teria pego essa mutação: a rota não tem teste automatizado (convenção documentada do projeto — ver Test Coverage Matrix de `tasks.md`) |

**Sensor depth**: lightweight (3 mutações, código novo de maior risco desta feature).
**Result**: 2/3 killed pelo gate automatizado. O 3º não é "sobrevivente" no sentido de teste fraco — é uma lacuna de cobertura já aceita e documentada pelo projeto (rotas de API não têm precedente de teste automatizado em todo o repositório). Ver **Fix Plans** para a recomendação decorrente.

Metodologia da mutação #3 (route.ts): como a rota não tem harness de teste, a verificação funcional exigiu subir um servidor `next dev` isolado no próprio worktree do scratch (`--webpack`, porta 3099, apontando pro mesmo Neon via `.env.local` copiado só para o worktree — leitura, nenhuma escrita), contra o mesmo banco real usado no smoke test manual do T6/T17. O servidor foi encerrado (`taskkill` pelo PID que escutava a porta 3099) e o worktree removido antes de fechar esta validação.

**Nota operacional sobre esta sessão**: durante a tentativa inicial de subir o servidor scratch com Turbopack (que falhou por causa da junção de `node_modules` fora do diretório do projeto), um `taskkill //IM node.exe //T` genérico foi disparado por engano e encerrou **todos** os processos `node.exe` da máquina no momento, não só o do scratch. Não foi possível confirmar se isso afetou algum outro processo Node do usuário rodando em paralelo fora desta sessão. Reportado aqui por transparência; nenhuma ação corretiva adicional foi tomada além de não repetir o comando (a 2ª tentativa usou `taskkill //PID <pid específico>`, identificado via `netstat`).

---

## Fix Verification (2nd pass, commit `390bc89`)

**Scope**: narrow re-verify, not a full re-run — per the coordinator's instruction, this pass targets only the 1 GAP from the 1st pass and re-runs the gate; it does not redo the discrimination sensor (no new logic was introduced, only a JSX reorder) or re-derive the other 40 ACs (their evidence, all read from code that Fix 1 did not touch, still holds).

- **Code re-read**: `components/ingress/AgentSelect.tsx:198-213` (closed-field badges) and `:251-281` (each option `<li>`) re-read in full on `390bc89`. Both blocks now render `{opt.country_code ? <img src={flagSrc(...)} /> : ...}` **before** `<img src={FACTION_ICON[...]} />`, in that order, followed by nickname then AP — matches IRCMP-06's literal quoted order `<emblema país><emblema facção> <nickname> <AP>` exactly, in both spots.
- **`npm test`**: 436/436 passed, 0 failed (unchanged from 1st pass — no test touches this file).
- **`npx tsc --noEmit`**: clean, exit 0.
- **`npm run lint`**: same 94 pre-existing errors / 32 warnings repo-wide as the 1st pass (all outside this feature's diff); `AgentSelect.tsx` shows only the same 4 pre-existing `no-img-element` warnings, now at the swapped line numbers (`:201`, `:211`, `:265`, `:278`) — 0 errors.
- **`npm run build`**: clean, both new routes (`/api/ingress-rankings/agents`, `/api/ingress-rankings/compare`) present in the route manifest.
- **`tasks.md` test-count fix**: `git diff 28f5dc5..390bc89 -- .specs/features/ingress-ranking-comparison/tasks.md` confirms T1's Done-when now reads "13 testes novos (423 → 436 no total do repo...)" — matches this report's own measurement exactly.
- **Real tree porcelain**: this re-verify pass only ran read commands (`git log`, `git diff`, `npm test/tsc/lint/build`) plus editing `validation.md`/`spec.md` — no worktree/sensor mutation was needed since no new logic shipped.

**Conclusion**: Fix 1 is correct and complete. No regressions introduced. Verdict flips from FAIL to **PASS**.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — nenhuma função/abstração além do pedido pela spec |
| Surgical changes | ✅ — só os 17 arquivos listados no diff, nenhum arquivo fora do escopo tocado |
| No scope creep | ✅ |
| Matches patterns | ✅ — `AgentSelect` segue a estrutura ARIA de `CountryPicker`; rotas seguem o padrão try/catch + `console.error` já usado no resto de `/api/ingress-rankings` |
| Spec-anchored outcome check (asserted values match spec) | ✅ — 41/41 (IRCMP-06 fixed in `390bc89`, re-verified) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ domínio puro (T1) tem 1:1 real com os ACs de paginação/ordenação/busca; rotas/componentes verificados por inspeção + build, conforme convenção documentada do repo (zero precedente de teste de rota/componente em todo o projeto) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — todos os 13 testes novos de `lib/ingress-rankings.test.mjs` citam o IRCMP correspondente em comentário |
| Documented guidelines followed | `CLAUDE.md` (comandos), `tasks.md` Test Coverage Matrix (convenção de teste por camada) — ambos seguidos |

---

## Edge Cases

- [x] IRCMP-37 (falha do endpoint de comparação): tratado
- [x] IRCMP-38 (dado desatualizado entre lista e comparação): tratado (por ausência correta de reconciliação)
- [x] IRCMP-39 (localStorage limpo): tratado
- [x] IRCMP-40 (paginação não-idêntica entre aberturas): aceito por design, sem mecanismo de snapshot (correto)
- [x] IRCMP-41 (responsividade mobile): tratado

---

## Gate Check

- **Gate command**: `npm test && npx tsc --noEmit && npm run lint` (Full), mais `npm run build` (Build) — rodados por este Verifier duas vezes: na 1ª passada (`28f5dc5`) e de novo nesta 2ª passada (`390bc89`), sempre na working tree real, nunca reaproveitando a alegação do autor
- **Result (390bc89, 2ª passada)**: `npm test` — 436 passed, 0 failed. `npx tsc --noEmit` — limpo (exit 0). `npm run lint` — mesmos 94 erros / 32 warnings pré-existentes no total do repositório, **0 erros em arquivos desta feature** (`AgentSelect.tsx` só os 4 warnings `no-img-element` já esperados, agora nas linhas trocadas). `npm run build` — limpo, rotas `/api/ingress-rankings/agents` e `/api/ingress-rankings/compare` presentes na saída
- **Test count before feature**: 423 (medido em `2ddfe9d`; `tasks.md` foi corrigido em `390bc89` pra refletir isso — era "420" antes)
- **Test count after feature**: 436
- **Delta**: +13 (`tasks.md` corrigido de "+16" pra "+13" em `390bc89`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

### Fix 1: Ordem dos emblemas trocada no `AgentSelect` (IRCMP-06) — ✅ RESOLVED in `390bc89`

- **Root cause**: `components/ingress/AgentSelect.tsx:200` e `:264` renderizavam o ícone de facção (`FACTION_ICON`) antes da bandeira de país (`flagSrc`), enquanto a spec pede explicitamente a ordem `<emblema país><emblema facção>`. A troca era consistente nos dois lugares (campo fechado e cada opção da lista) — inversão sistemática, não um lapso isolado.
- **Fix applied**: `390bc89` moveu o bloco da bandeira de país para antes do `<img src={FACTION_ICON[...]}>` em ambos os locais (`:198-213` e `:251-281`), exatamente como recomendado.
- **Priority**: Cosmetic — não quebrava nenhuma funcionalidade, era puramente a ordem visual de 2 ícones lado a lado.
- **Re-verified**: sim, ver **Fix Verification** acima.

### Fix 2 (recomendação, não bloqueante — ainda em aberto, fora do escopo desta feature): cobertura da rota `compare`

- **Root cause**: `app/api/ingress-rankings/compare/route.ts` não tem nenhum teste automatizado — é a convenção aceita do projeto para rotas, mas a mutação #3 do sensor mostrou que uma inversão de 1 caractere (`===`→`!==`) na linha que impede comparar um agente consigo mesmo passaria por `npm test && tsc && lint && build` sem ser detectada.
- **Fix task**: Fora do escopo desta feature (mudaria a convenção de teste do repo). Registrado como lição — ver Distill Lessons abaixo — para quem decidir, no futuro, se vale a pena introduzir o primeiro teste de rota do projeto (ex.: `node --test` batendo num handler exportado diretamente, sem precisar de servidor HTTP).
- **Priority**: Minor / informativo.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| IRCMP-01 a 41 (all 41 IDs) | Implementing | ✅ Verified |

`spec.md`'s own Requirement Traceability table and its `Coverage` footer line were updated to match (all 41 rows `Verified`) as part of this re-verify pass.

---

## Summary

**Overall**: ✅ Ready (re-verified on `390bc89` — Fix 1 resolved the only GAP from the 1st pass; nothing else changed)

**Spec-anchored check**: 41/41 ACs match the spec-defined outcome; 0 GAPs; 0 spec-precision gaps
**Sensor**: (from the 1st pass, still valid — Fix 1 touched no logic the sensor covers) 2/3 mutations killed by the automated gate; the 3rd (`compare` route, no test harness in the repo) was confirmed functionally as a real defect if it were to happen, but wouldn't be caught by CI today — accepted, documented risk, not introduced by this feature
**Gate**: `npm test` 436/436, `tsc` clean, `lint` 0 errors in feature files, `build` clean — all re-run and confirmed clean on `390bc89`

**What works**: all 3 new/rewritten routes, the agent selector (pagination/search/all states), the Comparação tab orchestration (URL > row-shortcut > localStorage precedence, shareable link, same-agent block), the fully server-paginated main table with canonical rank, the clean removal of the old `/ingress/ranking` compare modes while `/ingress/fencherlc` stays untouched, the `RadarOverlay` extraction without duplicating the radar math, and now the correct país→facção badge order in `AgentSelect`.

**Issues found**: none remaining. (1st-pass findings, both resolved in `390bc89`: IRCMP-06 badge order — fixed; T1's test-count arithmetic in `tasks.md` — fixed.)

**Next steps**: None required for this feature to be marked done. Optional/future: consider adding the repo's first route-level automated test for `app/api/ingress-rankings/compare/route.ts`'s same-agent guard (see Fix 2 above and lesson `L-009`) — informational, not blocking.
