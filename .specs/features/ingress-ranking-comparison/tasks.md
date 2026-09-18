# Ingress Ranking Comparison Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Sub-agent delegation note:** este projeto tem uma preferência registrada (`.specs` memory / conversa anterior) por execução inline em vez de sub-agent-driven para tasks de implementação — mesmo com 17 tasks (acima do limiar de ~8), a orquestração roda inline nesta sessão em vez de oferecer batches de sub-agentes. O Verifier ao final continua obrigatório e roda como sub-agente independente, como sempre.

---

**Design**: `.specs/features/ingress-ranking-comparison/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase sampling. Guidelines found: nenhum `AGENTS.md`/`CONTRIBUTING.md` com regras de teste — `CLAUDE.md` só documenta os comandos (`npm test` roda `lib/**/*.test.mjs` via `node --test`). Convenção real do repositório (confirmada por amostragem: 41 arquivos `lib/*.test.mjs`, **zero** arquivos `*.test.tsx`/`*.test.ts` em todo o projeto): lógica pura de domínio em `.mjs`/`.ts` sob `lib/` é testada por unidade; rotas de API (Next Route Handlers) e componentes React **não têm nenhum precedente de teste automatizado neste repo** — verificação dessas camadas é feita por build/lint/typecheck + checagem manual (é assim que toda feature anterior de `/ingress/ranking` foi verificada, conforme `STATE.md`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura de domínio (`lib/ingress-rankings.mjs`, allow-lists e construtores de query) | unit | Todas as branches de validação (allow-list de `sortKey`/`pageSize`/`faction`), 1:1 com os ACs de paginação/ordenação/busca, incluindo o rank canônico | `lib/ingress-rankings.test.mjs` | `npm test` |
| Rotas de API (`app/api/ingress-rankings/**/route.ts`) | none (sem precedente no repo) | Verificado por build + checagem manual (dev server) documentada no "Done when" da task | — | `npm run build` + checagem manual |
| Componentes React (`components/ingress/**`, `app/ingress/ranking/page.tsx`) | none (sem precedente no repo) | Verificado por lint + typecheck + build; UAT visual do Luiz ao final da feature (fora do escopo automatizável) | — | `npx tsc --noEmit`, `npm run lint`, `npm run build` |
| CSS (`app/ingress/theme.css`) | none | Build gate only | — | `npm run build` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks que só tocam `lib/*.mjs`/`.ts` puro (com teste unitário) | `npm test` |
| Full | Após tasks que tocam rotas ou componentes TS/TSX | `npm test && npx tsc --noEmit && npm run lint` |
| Build | Ao final de cada fase com mudança de UI/rota, e obrigatoriamente ao final da Fase 5 | `npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Fundação — lógica pura (paginação/ordenação/busca) e módulos compartilhados

Sem dependências entre si — executadas em sequência só pela ordem da fase.

```
T1
T2
T3
```

### Phase 2: Rotas de API (server)

```
T1 → T4
T1 → T5
T1 → T7
T6
```

### Phase 3: Simplificação do `ProfileRadar` e extração do radar compartilhado

```
T8 → T9 → T10
T2 → T10
T11
```

### Phase 4: Seletor de agentes e nova aba de Comparação

```
T5 → T12 → T13
T6 → T13
T8 → T13
T11 → T13
T2 → T14
T13 → T14
T4 → T15
T14 → T15
```

### Phase 5: Estilos e fechamento

```
T12 → T16
T13 → T16
T15 → T16
T16 → T17
```

---

## Task Breakdown

### T1: Allow-lists e construtores de query de paginação/ordenação/busca

**What**: Estender `lib/ingress-rankings.mjs` com `isValidPageSize`, `isValidSortKey`, `isValidSortDir`, `isValidFactionFilter`, `defaultSortDir`, `RANKING_PAGE_SIZES`, `RANKING_SORT_KEYS`, `buildRankingPageQuery({page,pageSize,sortKey,sortDir,search,faction})` (rank canônico via `ROW_NUMBER() OVER (ORDER BY overall_score DESC, lifetime_ap DESC, created_at ASC)`, busca `ILIKE`, filtro de facção, `COUNT(*) OVER()`) e `buildAgentOptionsQuery({cursor,search})` (keyset por `codename_key`, ou busca sem cursor) — todas puras, retornando `{text, values}` para `sql.query()`.
**Where**: `lib/ingress-rankings.mjs`
**Depends on**: None
**Reuses**: `normalizeCodenameKey` (já existe no mesmo arquivo, sem mudança)
**Requirement**: IRCMP-06 a IRCMP-23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `isValidSortKey`/`isValidPageSize`/`isValidFactionFilter`/`isValidSortDir` rejeitam qualquer valor fora da allow-list (inclusive tentativas de injeção como `"score; DROP TABLE x"`)
- [x] `buildRankingPageQuery` nunca interpola `search`/`faction` como texto SQL — só como `values[]`; a coluna de ORDER BY só pode vir de uma constante fixa mapeada pela allow-list, nunca do parâmetro `sortKey` cru
- [x] `buildRankingPageQuery` calcula o rank ANTES de aplicar busca/filtro (numa CTE separada), preservando o rank canônico mesmo com filtro ativo
- [x] `buildAgentOptionsQuery` sem `cursor` nem `search` retorna a query da 1ª página; com `cursor`, usa `codename_key > $cursor`; com `search`, ignora `cursor` e busca por substring
- [x] Gate check passes: `npm test`
- [x] Test count: suíte de `lib/ingress-rankings.test.mjs` cresce em 16 testes novos (420 → 436) — nenhum teste existente removido

**Tests**: unit
**Gate**: quick
**Status**: ✅ Complete

---

### T2: Módulo compartilhado de "meu agente" (localStorage)

**What**: Criar `lib/ingress-my-agent.ts` exportando `MY_AGENT_STORAGE_KEY`, `saveMyAgent(codenameKey: string): void`, `loadMyAgent(): string | null` — únicos pontos de leitura/escrita dessa chave de `localStorage`, com `try/catch` silencioso (mesmo espírito do `notifyTelegram`/`SENT_KEY` já existente em `ProfileRadar.tsx`).
**Where**: `lib/ingress-my-agent.ts`
**Depends on**: None
**Reuses**: nenhum — módulo novo e pequeno, sem precedente direto além do padrão de `try/catch` de `localStorage` já visto em `ProfileRadar.tsx:167-183`
**Requirement**: IRCMP-24, IRCMP-27

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `saveMyAgent`/`loadMyAgent` nunca lançam (localStorage bloqueado/indisponível cai em no-op/`null`)
- [x] Chave usada é distinta de `ing-cmp-sent` (a chave de dedupe do Telegram já existente)
- [x] Gate check passes: `npx tsc --noEmit`
- [x] Sem teste automatizado — repo não tem harness de browser (jsdom) para `localStorage`; mesma lacuna já aceita para o uso existente de `localStorage` em `ProfileRadar.tsx`

**Tests**: none
**Gate**: full
**Status**: ✅ Complete

---

### T3: Evento de analytics `trackIngressComparisonViewed` + remoção dos eventos mortos

**What**: Em `utils/analytics.ts`, adicionar `trackIngressComparisonViewed(codenameKeyA: string, codenameKeyB: string)` (payload plano, mesmo padrão de `trackIngressRankingJoin`) e remover `trackIngressCompareVsMe`/`trackIngressCompareTwoAgents` — ficam inalcançáveis depois que T9/T10 removerem os modos `vs-me`/`two` da variant `ranking` (único chamador dessas duas funções).
**Where**: `utils/analytics.ts`
**Depends on**: None (a remoção só é segura de fato depois de T9/T10, mas o arquivo em si pode ser preparado agora — ver nota abaixo)
**Reuses**: padrão de `trackIngressRankingJoin`/`trackIngressAgentShared`
**Requirement**: assumption "Novo evento de analytics ao completar uma comparação" (spec.md linha 45), IRCMP-30

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `trackIngressComparisonViewed` existe e segue o padrão (`trackEvent('ingress_comparison_viewed', {...})`)
- [x] Remoção de `trackIngressCompareVsMe`/`trackIngressCompareTwoAgents` adiada para T10 (ainda têm chamador em `StatsRadarSection.tsx` até T9/T10 removerem os modos `vs-me`/`two`) — decisão já prevista nesta própria task
- [x] Gate check passes: `npx tsc --noEmit`
- [x] Sem teste automatizado — nenhuma outra função `trackIngressX` deste arquivo tem teste

**Tests**: none
**Gate**: full
**Status**: ✅ Complete

---

### T4: `GET /api/ingress-rankings` — paginação/ordenação/busca server-side

**What**: Reescrever o handler `GET` de `app/api/ingress-rankings/route.ts` para aceitar `page`, `pageSize`, `sort`, `dir`, `search`, `faction` (validados pelas allow-lists de T1), usar `buildRankingPageQuery` via `sql.query(text, values)`, e devolver `{rows: (RankingRow & {rank:number})[], total, page, pageSize}`. `POST` não muda.
**Where**: `app/api/ingress-rankings/route.ts`
**Depends on**: T1
**Reuses**: `computeStatTiers` (`lib/ingress-tier-score.mjs`, já usado no GET atual)
**Requirement**: IRCMP-16 a IRCMP-23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Parâmetro inválido (`sort`/`dir`/`pageSize`/`faction` fora da allow-list) cai no valor padrão em vez de 500 ou SQL malformado
- [x] Resposta inclui `rank` por linha igual ao rank canônico, mesmo com `search`/`faction` aplicados
- [x] `total` reflete o total FILTRADO (pós `search`/`faction`, pré-paginação) — é o que a UI usa pra decidir se há próxima página
- [x] `POST` continua idêntico ao comportamento atual (nenhuma mudança de código nessa função nesta task)
- [x] Checagem manual: `npm run dev`, `curl "http://localhost:3000/api/ingress-rankings?page=1&pageSize=20"` respondeu 200 com dados reais (`rank` presente, `total`/`page`/`pageSize` na resposta)
- [x] Gate check passes: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none (rota — ver matrix)
**Gate**: full
**Status**: ✅ Complete

---

### T5: `GET /api/ingress-rankings/agents` — seletor paginado/buscável

**What**: Nova rota `app/api/ingress-rankings/agents/route.ts`, `GET ?cursor&search`, usando `buildAgentOptionsQuery` (T1). Sem `search`: keyset por `codename_key`, até 100 por página, `hasMore`/`nextCursor` calculados pedindo 101 e cortando o 101º. Com `search`: até 100 resultados por substring, sem cursor/hasMore.
**Where**: `app/api/ingress-rankings/agents/route.ts`
**Depends on**: T1
**Reuses**: `sql` (`lib/db.ts`)
**Requirement**: IRCMP-06 a IRCMP-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Resposta: `{rows: {codename_key,codename,faction,country_code,lifetime_ap}[], hasMore, nextCursor}`
- [x] `hasMore=false` quando o total de agentes cabe numa página (confirmado no smoke test: 10 agentes cadastrados, `hasMore:false`)
- [x] Ranking vazio → `{rows:[], hasMore:false, nextCursor:null}` (200, não erro) — por inspeção do código (`rows.slice`/`hasMore` sempre calculados a partir do array, nunca lança em array vazio)
- [x] Sem token/autenticação exigida
- [x] Checagem manual: `curl` sem `cursor` retornou ordenado por `codename_key` asc; `?search=fencher` retornou só `fencherlc`, case-insensitive substring
- [x] Gate check passes: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none (rota — ver matrix)
**Gate**: full
**Status**: ✅ Complete

---

### T6: `GET /api/ingress-rankings/compare` — resolução de 1/2 agentes

**What**: Nova rota `app/api/ingress-rankings/compare/route.ts`, `GET ?a&b` (ambos opcionais independentemente), devolve `{a: CompareRow|null, b: CompareRow|null}`. `a===b` (após `normalizeCodenameKey`) → 400.
**Where**: `app/api/ingress-rankings/compare/route.ts`
**Depends on**: None (usa só `sql`/`normalizeCodenameKey`, já existentes)
**Reuses**: `normalizeCodenameKey` (`lib/ingress-rankings.mjs`)
**Requirement**: IRCMP-01, IRCMP-02, IRCMP-04, IRCMP-35, IRCMP-37

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `?a=<key>` sozinho resolve só `a`, `b` vem `null` (confirmado no smoke test)
- [x] `?a=<key>&b=<key-diferente>` resolve ambos — por inspeção do código (`ANY(${keys})` + `Map` por chave)
- [x] `?a=<key>&b=<mesmo-key>` → 400 (confirmado no smoke test: `{"error":"a e b não podem ser o mesmo agente"}`)
- [x] `codename_key` inexistente → aquele lado volta `null`, sem erro 404/500 (`byKey.get` retorna `undefined` → `serialize(undefined)` → `null`)
- [x] Sem `a` nem `b` → `{a:null,b:null}` (200) (confirmado no smoke test)
- [x] Gate check passes: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none (rota — ver matrix)
**Gate**: full
**Status**: ✅ Complete

---

### T7: `page.tsx` — SSR paginado + preserva hero/JSON-LD

**What**: Em `app/ingress/ranking/page.tsx`, trocar `loadInitialRows()` por uma chamada que reaproveita a MESMA query de T4 (page=1, pageSize=20, sort=score desc) via `buildRankingPageQuery`/`sql.query`, retornando `{rows, total}`. `RankingHero totalAgents` passa a usar `total` (grand total real, não mais `initialRows.length` capado). JSON-LD (`buildRankingJsonLd`) passa a vir de uma query SSR isolada `LIMIT 50` independente da paginação (evita cair de 50 para 20 itens).
**Where**: `app/ingress/ranking/page.tsx`
**Depends on**: T1
**Reuses**: `buildRankingPageQuery` (T1), padrão de degradação `try/catch → []` já usado no arquivo
**Requirement**: IRCMP-16 (primeira página), risco "hero/JSON-LD" do design.md

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `RankingHero` mostra o total REAL de agentes (não capado em 20 nem em 100) — `totalAgents={initialTotal}`, vindo do `total_count` da própria query paginada (página 1, sem filtro)
- [x] JSON-LD continua com até 50 itens mesmo com a tabela paginada em 20 — `loadTop50ForJsonLd()` isolada
- [x] `casara.ingress_rankings` vazia → hero mostra 0, tabela mostra estado vazio, sem 500 (por inspeção: `try/catch` degrada pra `{rows:[], total:0}`, mesmo padrão já usado no arquivo)
- [x] Gate check passes: `npm run build` — build de produção completo, `/ingress/ranking` responde 200 em dev com dados reais

**SPEC_DEVIATION**: `IngressRankingTabs` continua recebendo só `initialRows` (não `initialTotal`) — o `total` real só importa pra paginação da TABELA, que ainda é client-side/`rankByKey` local até T15. Passar `initialTotal` agora criaria uma prop não usada em `IngressRankingTabs` (não é essa task que consome). Reason: T15 (reescrita de `IngressRankingTable` pra paginação server-side) vai buscar o total no mount via fetch imediato à API já paginada (mesmos parâmetros da SSR), em vez de precisar de uma prop adicional — evita estender a assinatura de `IngressRankingTabs` numa task que não a consome.

**Tests**: none (Server Component — ver matrix)
**Gate**: build
**Status**: ✅ Complete

---

### T8: Extrair `RadarOverlay` do `ProfileRadar`

**What**: Criar `components/ingress/RadarOverlay.tsx` movendo o bloco de desenho (SVG de 1-2 polígonos + `ing-radar__cmp-table` + painel de breakdown por hover, hoje `ProfileRadar.tsx:347-522`) para um componente próprio `({agentA, agentB?, blank?, labelA?, labelB?}) => JSX`, com seu próprio estado `active`/`scale`. `ProfileRadar` passa a importar e renderizar `<RadarOverlay .../>` no lugar do bloco antigo, sem nenhuma mudança visual/de marcação.
**Where**: `components/ingress/RadarOverlay.tsx` (novo), `components/ingress/ProfileRadar.tsx` (modificado)
**Depends on**: None
**Reuses**: `computeRadarAxes`, `compareRadar`, `RADAR_DRAW_MAX` (`lib/ingress-radar.mjs`), `fmtStat` (`lib/ingress-format.mjs`)
**Requirement**: suporta IRCMP-01, IRCMP-02 (reuso do radar pela nova aba, ver T13)

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client` (componente client, mas puramente apresentacional — confirmar que não precisa de nada server-only)

**Done when**:
- [ ] `/ingress/fencherlc` (variant `default`, modos `vs-me`/`two`) renderiza pixel-idêntico ao comportamento anterior (checagem manual: abrir a página, comparar com um export colado, ver os 2 polígonos + tabela + breakdown exatamente como antes)
- [ ] `ProfileRadar.tsx` não duplica mais a lógica de desenho — só monta `agentA`/`agentB`/`isBlank` e delega a `RadarOverlay`
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T9: `ProfileRadar` — remover modos `vs-me`/`two` da variant `ranking`

**What**: Em `ProfileRadar.tsx`, quando `variant==='ranking'`, não renderizar mais o bloco `ing-radar__cmp-mode` (botões "Comparar com {FencherLC}"/"Comparar com outro agente") — só o fluxo "colar export + país + enviar" (mode fica travado em `'solo'`, sem UI pra trocar). Remover a string morta `t.modeSolo` e simplificar `modeVsMe`/`modeTwo` (deixam de receber o parâmetro `ranking`, já que só a variant `default` os renderiza agora). `CountryPicker`/textarea B e o mode `'two'` continuam existindo no código só para a variant `default` (inalterados).
**Where**: `components/ingress/ProfileRadar.tsx`
**Depends on**: T8
**Reuses**: nada novo
**Requirement**: IRCMP-28, IRCMP-29

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `/ingress/ranking`: painel de envio mostra só textarea + `CountryPicker` + botão "Enviar" — nenhum botão de troca de modo, nenhum texto "Comparar com..."
- [ ] `/ingress/fencherlc`: os 3 modos originais (`vs-me`/`two`, já que `solo` nunca existiu ali) continuam intactos, sem regressão visual/funcional
- [ ] `grep -n "t.modeSolo"` não retorna nada (string morta removida)
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T10: `StatsRadarSection` — simplifica `handleCompare` + CTA "Comparar meu status" + salva "meu agente"

**What**: Simplificar `handleCompare` (agora só recebe `{a}`, sem `mode`/`b`, já que T9 tornou `vs-me`/`two` inalcançáveis a partir de `ranking`): 1 `postAgent`, 1 `trackIngressRankingJoin`, 1 toast. Depois de uma resposta bem-sucedida (`response !== null`), chamar `saveMyAgent(normalizeCodenameKey(a.codename))` (T2) e mostrar um botão "Comparar meu status" que, ao clicar, navega via `window.location.href = "/ingress/ranking?tab=compare&a=" + encodeURIComponent(codenameKey)`.
**Where**: `components/ingress/stats/StatsRadarSection.tsx`
**Depends on**: T2, T9
**Reuses**: `saveMyAgent` (T2), `postAgent` (já existe)
**Requirement**: IRCMP-24, IRCMP-25, IRCMP-30

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `ProfileRadar`'s `onCompare` prop type simplifica para `(agent: Agent) => void` (sem `mode`/`b`) — atualizar a assinatura em `ProfileRadar.tsx` também, já que T9 já tornou `b` sempre `undefined` em `ranking`
- [ ] Após um envio bem-sucedido (`written:true` OU `written:false` por debounce — ambos contam como "sucesso"), `localStorage` ganha a chave de `lib/ingress-my-agent.ts` com o `codename_key` certo
- [ ] Botão "Comparar meu status" só aparece depois de uma submissão bem-sucedida nesta sessão
- [ ] `trackIngressCompareVsMe`/`trackIngressCompareTwoAgents` removidas de `utils/analytics.ts` nesta task (completa o que T3 deixou pendente) — confirmar via `grep` que não sobra nenhum chamador
- [ ] Gate check passes: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix); T3 e a remoção aqui não adicionam lógica pura nova, só religação
**Gate**: full

---

### T11: `OverallScorePanel` — campos opcionais de AP/país/facção

**What**: Estender `AgentScore` com `lifetimeAp?: number`, `countryCode?: string|null`, `faction?: 'enlightened'|'resistance'`; quando presentes, renderizar um emblema de país (`flagSrc`) + ícone de facção + valor de AP total ao lado do nome do agente em cada linha. Chamador existente (`StatsRadarSection`) não passa esses campos — sem mudança visual ali.
**Where**: `components/ingress/stats/OverallScorePanel.tsx`
**Depends on**: None
**Reuses**: `flagSrc` (`lib/ingress-countries.mjs`), `FACTION_ICON`-equivalente (mesmo par de caminhos `/ingress/factions/{enlightened,resistance}.svg` já usado em `IngressRankingTable.tsx`)
**Requirement**: IRCMP-01 (painel de informações detalhadas: AP, país, facção)

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `StatsRadarSection` (que não passa os campos novos) renderiza pixel-idêntico a antes (checagem manual)
- [ ] Quando `lifetimeAp`/`countryCode`/`faction` são passados, aparecem na linha do agente
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T12: `AgentSelect` — combobox paginado/buscável

**What**: Novo componente `components/ingress/AgentSelect.tsx`, modelado na estrutura ARIA combobox+listbox de `CountryPicker.tsx`, mas assíncrono: busca a 1ª página de `GET /api/ingress-rankings/agents` na 1ª abertura, mostra emblema país+facção+nickname+AP por opção, item "próxima página" no fim da lista quando `hasMore` (acrescenta, não substitui), campo de busca com debounce (~300ms) que troca pra busca no servidor (substitui a navegação por página), estados de loading/erro-com-retry/vazio. Controlado por `value`/`onChange`, com `selected` (dado já resolvido pelo pai) pra exibir o campo fechado mesmo se a opção não estiver nas páginas carregadas.
**Where**: `components/ingress/AgentSelect.tsx`
**Depends on**: T5
**Reuses**: estrutura de `CountryPicker.tsx` (ARIA, teclado), `flagSrc`/`COUNTRIES` (`lib/ingress-countries.mjs`)
**Requirement**: IRCMP-06 a IRCMP-15

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Abrir sem digitar nada mostra a 1ª página (até 100), ordenada por nickname (case-insensitive)
- [ ] "Próxima página" acrescenta a 2ª leva sem descartar a 1ª; some quando não há mais páginas
- [ ] Digitar substitui a lista pelos resultados da busca no servidor; limpar o campo volta pra navegação por página, reiniciando da 1ª
- [ ] Busca sem resultado mostra estado vazio explicativo; ranking vazio (nenhum agente cadastrado) também mostra estado vazio
- [ ] Falha de rede mostra erro com "tentar de novo" sem quebrar o resto da página
- [ ] Alvo de toque ≥ ~44×44px nos itens da lista (mobile)
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T13: `IngressComparisonTab` — orquestra a comparação

**What**: Novo `components/ingress/stats/IngressComparisonTab.tsx`. Props: `agentAKey`, `agentBKey`, `onChangeA`, `onChangeB`, `aFromUrl`, `bFromUrl`. Renderiza 2× `AgentSelect`; busca `/api/ingress-rankings/compare` sempre que `agentAKey`/`agentBKey` mudam (debounce desnecessário — são eventos discretos de seleção, não digitação); estados: nenhum/1 selecionado → mensagem de espera; mesmo agente nos dois campos → bloqueado com mensagem inline (sem round-trip); erro de rede → inline com retry; ambos resolvidos e diferentes → `RadarOverlay` (T8) + `OverallScorePanel` estendido (T11) com AP/país/facção/tier/nota geral/nota por eixo; dispara `trackIngressComparisonViewed` uma vez por par (edge-triggered por ref, nunca em seleção intermediária). Agente vindo de URL (`aFromUrl`/`bFromUrl`) que não resolve → aviso "agente não encontrado" nesse campo; vindo de outra fonte (localStorage/atalho de linha) que não resolve → limpa em silêncio.
**Where**: `components/ingress/stats/IngressComparisonTab.tsx`
**Depends on**: T6, T8, T11, T12
**Reuses**: `AgentSelect` (T12), `RadarOverlay` (T8), `OverallScorePanel` (T11), `trackIngressComparisonViewed` (T3)
**Requirement**: IRCMP-01 a IRCMP-05, IRCMP-37, IRCMP-38, IRCMP-39

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Selecionar A e B (diferentes) renderiza radar sobreposto + painel lado a lado sem colar nenhum texto
- [ ] Só A ou só B preenchido → mensagem de espera, nunca uma comparação parcial
- [ ] A === B → bloqueado, mensagem inline, nenhuma chamada a `/compare`
- [ ] `trackIngressComparisonViewed` dispara exatamente uma vez por par completo (não a cada re-render/seleção intermediária)
- [ ] Falha do endpoint de comparação → erro inline, selects continuam preenchidos, dá pra tentar de novo
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T14: `IngressRankingTabs` — aba "Comparação", precedência de pré-preenchimento, link compartilhável

**What**: Adicionar `'compare'` a `Tab`. Estado novo: `agentAKey`/`agentBKey` (+ `aFromUrl`/`bFromUrl`). No mount (`useEffect`, mesmo idiom do `?destaque=`), ler `window.location.search`: se `tab=compare` presente, ativar essa aba; se `a`/`b` presentes e válidos como string, usá-los (marcando `aFromUrl=true`/`bFromUrl=true`); senão, se `agentAKey` vazio, tentar `loadMyAgent()` (T2) — resolução real de existência acontece dentro do `IngressComparisonTab` via `/compare` (T13), que limpa em silêncio se inválido. Sincroniza `?tab=&a=&b=` na URL via `history.replaceState` sempre que `tab==='compare'` e `agentAKey`/`agentBKey` mudam (sem navegação/reload). Passa `onCompareRow` para `IngressRankingTable` (T15): se A vazio, preenche A; senão substitui B; e troca a aba ativa para `'compare'`.
**Where**: `components/ingress/stats/IngressRankingTabs.tsx`
**Depends on**: T2, T13
**Reuses**: idiom de `window.location.search` em `useEffect` (`IngressRankingTable.tsx:355-362`)
**Requirement**: IRCMP-24 a IRCMP-27, IRCMP-31 a IRCMP-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Abrir `/ingress/ranking?tab=compare&a=X&b=Y` (válidos) abre direto na aba Comparação com os dois campos preenchidos e a comparação renderizada
- [ ] Trocar A/B na aba Comparação atualiza a URL sem recarregar a página
- [ ] Sem `a`/`b` na URL e com `localStorage` de "meu agente" válido → Agente A pré-preenchido; `localStorage` corrompido/agente removido → campo A fica vazio, sem erro
- [ ] Clicar "Comparar" numa linha da tabela (T15) muda pra aba Comparação e preenche A (se vazio) ou B (substituindo)
- [ ] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full

---

### T15: `IngressRankingTable` — paginação/ordenação/busca server-side + atalho "Comparar"

**What**: Reescrever `IngressRankingTable` para não guardar mais `rows` completo em memória com filtro/sort client-side: `search`/`factionFilter`/`sortKey`/`sortDir`/`page`/`pageSize` viram parâmetros de uma busca ao servidor (`GET /api/ingress-rankings`, T4), com debounce na busca por texto; qualquer mudança de `pageSize`/ordenação/facção/busca volta pra página 1; `rank` vem pronto em cada linha da resposta (remove o cálculo local `rankByKey`); adiciona controles de paginação (seletor 20/50/100 + anterior/próxima + indicador de posição) e um botão "Comparar" por linha (alvo de toque ≥44px) que chama a nova prop `onCompareRow(codenameKey)`. Poll (20s) e botão "Atualizar" passam a refazer a página/filtro/ordenação ATUAIS, não mais um "top 100" fixo. Mantém expand/detalhe/compartilhar/`?destaque=` como estão. **Nota de T7**: `total` real não vem mais de uma prop (`IngressRankingTabs` não foi estendido pra isso) — este componente busca o `total` fazendo, no mount, um fetch imediato com os MESMOS parâmetros da SSR (page=1/score desc/sem busca), substituindo o antigo poll-só-depois-de-20s por um fetch logo na montagem + poll subsequente.
**Where**: `components/ingress/stats/IngressRankingTable.tsx`
**Depends on**: T4, T14
**Reuses**: expand/detail/`MiniPlayStyleRadar`/share/highlight (inalterados)
**Requirement**: IRCMP-16 a IRCMP-23, IRCMP-31, IRCMP-32, IRCMP-33

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Tamanho de página padrão 20; opções 20/50/100 disponíveis
- [ ] Trocar tamanho/ordenação/facção/busca sempre volta pra página 1
- [ ] Coluna "#" sempre mostra o rank canônico vindo do servidor, nunca recalculado no cliente
- [ ] Clicar num cabeçalho ordenável reordena o ranking INTEIRO no servidor (não só a página carregada) e recarrega a página 1 nessa ordem
- [ ] Busca por codinome filtra no servidor (substring, case-insensitive), mantendo a ordenação vigente
- [ ] Filtro de facção continua funcionando, agora aplicado no servidor junto com busca/ordenação, antes da paginação
- [ ] Sem resultados (busca/facção) → estado vazio explicativo, não tabela em branco
- [ ] Botão "Comparar" por linha chama `onCompareRow` com o `codename_key` certo
- [ ] Highlight/scroll de `?destaque=` continua funcionando mesmo que o agente destacado esteja fora da página 1 carregada (buscar a página dele ou, no mínimo, degradar sem quebrar — documentar a escolha se não achar automaticamente)
- [ ] Gate check passes: `npm run build` (fim de fase — build completo)

**Tests**: none (componente — ver matrix)
**Gate**: build

---

### T16: Estilos — `AgentSelect`, aba Comparação, paginação, botão "Comparar", mobile

**What**: Adicionar as classes CSS novas em `app/ingress/theme.css` (mesma convenção `ing-*` já usada no arquivo): `AgentSelect` (campo + listbox + item "próxima página" + estados de loading/erro/vazio), layout da aba Comparação (dois selects lado a lado em desktop, empilhados em mobile — mesmos breakpoints já usados no arquivo, ex. `max-width: 640px`/`760px`), controles de paginação da tabela principal, botão "Comparar" por linha (visível e alcançável em mobile sem rolagem horizontal).
**Where**: `app/ingress/theme.css`
**Depends on**: T12, T13, T15
**Reuses**: convenções `ing-*`, breakpoints já existentes no arquivo (`135`, `293`, `1898`, `2876`, `2887`, `3752`, `3794`, `4231`)
**Requirement**: IRCMP-41 (responsividade mobile), suporte visual de IRCMP-01 a IRCMP-33

**Tools**:
- MCP: NONE
- Skill: `frontend-design` (só se precisar de decisão estética não-trivial; a maior parte é seguir o padrão visual já estabelecido no arquivo)

**Done when**:
- [ ] Em ~375-400px de largura: aba Comparação, seletor e tabela paginada funcionam sem rolagem horizontal
- [ ] Dois `AgentSelect` empilham verticalmente em mobile
- [ ] Radar sobreposto + painel de detalhes se adaptam à largura disponível
- [ ] Controles de paginação/busca continuam alcançáveis sem rolagem horizontal
- [ ] Gate check passes: `npm run build`

**Tests**: none (CSS — ver matrix)
**Gate**: build

---

### T17: Verificação final + traceability

**What**: Rodar a suíte completa (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`), subir `npm run dev` e checar manualmente os fluxos-chave (seletor paginando/buscando, tabela paginando/ordenando/buscando, comparação renderizando, CTA "Comparar meu status", link compartilhável, atalho de linha, `/ingress/fencherlc` sem regressão). Atualizar a tabela de Requirement Traceability em `spec.md` (`Pending` → `Implementing`/`Verified` conforme o caso) e a coluna `Coverage` no rodapé.
**Where**: `.specs/features/ingress-ranking-comparison/spec.md` (traceability), sem mudança de código além de fixes pontuais que a checagem manual encontrar
**Depends on**: T16
**Reuses**: nada
**Requirement**: todos (IRCMP-01 a IRCMP-41)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` passam limpos
- [ ] Checagem manual dos fluxos-chave listados acima, sem quebra
- [ ] `spec.md` — Requirement Traceability atualizada, `Coverage` no rodapé reflete o real (41 mapeados)
- [ ] Gate check passes: `npm run build`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

T1 → T4
T1 → T5
T1 → T7
T6
T8 → T9 → T10
T2 → T10
T11
T5 → T12 → T13
T6 → T13
T8 → T13
T11 → T13
T2 → T14
T13 → T14
T4 → T15
T14 → T15
T12 → T16
T13 → T16
T15 → T16
T16 → T17
```

Execução estritamente sequencial: dentro de cada fase, as tasks rodam na ordem listada; entre fases, uma fase só começa depois que a anterior termina (o que já garante toda dependência cross-fase acima, mesmo as que não têm um vínculo direto de dado — ex. T2→T3 na Fase 1 é só ordem, não dependência real). Sem sub-agentes (ver nota de execução no topo) — tudo roda inline nesta sessão.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 arquivo (funções puras coesas de paginação/ordenação) | ✅ Granular |
| T2 | 1 arquivo novo pequeno | ✅ Granular |
| T3 | 1 arquivo (adição + remoção de funções) | ✅ Granular |
| T4 | 1 endpoint (GET de `route.ts` já existente) | ✅ Granular |
| T5 | 1 endpoint novo | ✅ Granular |
| T6 | 1 endpoint novo | ✅ Granular |
| T7 | 1 arquivo (Server Component) | ✅ Granular |
| T8 | 1 componente extraído | ✅ Granular |
| T9 | 1 arquivo (remoção de UI condicional) | ✅ Granular |
| T10 | 1 arquivo (simplificação + CTA) | ✅ Granular |
| T11 | 1 componente (extensão de props) | ✅ Granular |
| T12 | 1 componente novo | ✅ Granular |
| T13 | 1 componente novo | ✅ Granular |
| T14 | 1 componente (reescrita coesa: estado de abas + precedência) | ✅ Granular |
| T15 | 1 componente (reescrita coesa: paginação server-side) | ✅ Granular |
| T16 | 1 arquivo CSS | ✅ Granular |
| T17 | verificação + 1 arquivo de tracking | ✅ Granular |

**Granularity check**: cada task é 1 componente/1 função-módulo/1 endpoint/1 arquivo. T14/T15 são reescritas maiores de um único arquivo já existente (não múltiplos arquivos) — aceitas como um único task coeso, com "Done when" detalhado o suficiente para compensar o tamanho.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T2 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T3 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T4 | T1 | `T1 → T4` | ✅ Match |
| T5 | T1 | `T1 → T5` | ✅ Match |
| T6 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T7 | T1 | `T1 → T7` | ✅ Match |
| T8 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T9 | T8 | `T8 → T9` | ✅ Match |
| T10 | T2, T9 | `T2 → T10`, `T9 → T10` | ✅ Match |
| T11 | None | (nó isolado, sem seta de entrada) | ✅ Match |
| T12 | T5 | `T5 → T12` | ✅ Match |
| T13 | T6, T8, T11, T12 | `T6 → T13`, `T8 → T13`, `T11 → T13`, `T12 → T13` | ✅ Match |
| T14 | T2, T13 | `T2 → T14`, `T13 → T14` | ✅ Match |
| T15 | T4, T14 | `T4 → T15`, `T14 → T15` | ✅ Match |
| T16 | T12, T13, T15 | `T12 → T16`, `T13 → T16`, `T15 → T16` | ✅ Match |
| T17 | T16 | `T16 → T17` | ✅ Match |

**Rules check**: nenhuma dependência aponta para uma fase posterior; todas as dependências entre fases apontam pra trás. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: query builders | Lógica pura de domínio (`lib/ingress-rankings.mjs`) | unit | unit | ✅ OK |
| T2: `ingress-my-agent.ts` | Lógica pura tocando `localStorage` (sem harness de browser no repo) | none (sem precedente) | none | ✅ OK |
| T3: analytics | Lógica pura tocando `track()`/Vercel Analytics (sem precedente de teste em `utils/analytics.ts`) | none | none | ✅ OK |
| T4: GET paginado | Rota de API | none | none | ✅ OK |
| T5: GET agents | Rota de API | none | none | ✅ OK |
| T6: GET compare | Rota de API | none | none | ✅ OK |
| T7: page.tsx | Server Component | none | none | ✅ OK |
| T8: RadarOverlay | Componente React | none | none | ✅ OK |
| T9: ProfileRadar | Componente React | none | none | ✅ OK |
| T10: StatsRadarSection | Componente React | none | none | ✅ OK |
| T11: OverallScorePanel | Componente React | none | none | ✅ OK |
| T12: AgentSelect | Componente React | none | none | ✅ OK |
| T13: IngressComparisonTab | Componente React | none | none | ✅ OK |
| T14: IngressRankingTabs | Componente React | none | none | ✅ OK |
| T15: IngressRankingTable | Componente React | none | none | ✅ OK |
| T16: theme.css | CSS | none | none | ✅ OK |
| T17: verificação | — | — | none | ✅ OK |

Nenhuma violação — todas as tasks que tocam a única camada com teste automatizado no repo (`lib/ingress-rankings.mjs`, em T1) declaram `Tests: unit` e incluem os testes na mesma task.
