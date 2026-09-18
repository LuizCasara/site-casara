# Ingress Ranking Comparison Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Sub-agent delegation note:** este projeto tem uma preferência registrada (`.specs` memory / conversa anterior) por execução inline em vez de sub-agent-driven para tasks de implementação — mesmo com 17 tasks (acima do limiar de ~8), a orquestração roda inline nesta sessão em vez de oferecer batches de sub-agentes. O Verifier ao final continua obrigatório e roda como sub-agente independente, como sempre.

---

**Design**: `.specs/features/ingress-ranking-comparison/design.md`
**Status**: Done (T1–T17 completas; falta a validação independente do Verifier)

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
- [x] Test count: suíte de `lib/ingress-rankings.test.mjs` cresce em 13 testes novos (423 → 436 no total do repo, medido em `2ddfe9d..28f5dc5`) — nenhum teste existente removido

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
- [x] `/ingress/fencherlc` e `/ingress/ranking` respondem 200 em dev após a extração (checagem manual via `curl`) — a marcação/JSX do bloco de desenho foi movida verbatim pra `RadarOverlay.tsx`, sem alteração de classes/estrutura, então não há mudança visual esperada; **UAT visual completo (clicar/colar/comparar na tela) continua pendente do Luiz**, como já registrado em memória para este projeto (checagem visual automática está fora do que este agente faz)
- [x] `ProfileRadar.tsx` não duplica mais a lógica de desenho — só monta `agentA`/`agentB`/`isBlank` e delega a `RadarOverlay`
- [x] Gate check passes: `npx tsc --noEmit && npm run lint`

**Nota**: `RadarOverlay` não recebeu `labelA?`/`labelB?` como props externas (diferença do desenho original do design) — o rótulo com data de desambiguação (`selfCmp`) é calculado inteiramente dentro do componente a partir de `agentA`/`agentB`, sem precisar de override externo; nenhum consumidor previsto (`ProfileRadar` nem a futura `IngressComparisonTab`, T13) precisa customizar esse texto.

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete

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
- [x] `/ingress/ranking`: `variant==='ranking'` não renderiza mais o bloco `ing-radar__cmp-mode` (verificado por leitura do JSX: `{variant === 'ranking' ? null : (<div className="ing-radar__cmp-mode">...)}`) — só textarea + `CountryPicker` + botão "Enviar"; 200 confirmado via `curl` em dev
- [x] `/ingress/fencherlc`: os 2 modos originais (`vs-me`/`two`) continuam intactos no código (bloco `ing-radar__cmp-mode` inalterado pra `variant==='default'`); 200 confirmado via `curl` em dev — **UAT visual completo continua pendente do Luiz**
- [x] `grep -n "modeSolo"` não retorna nada (string morta removida)
- [x] Gate check passes: `npx tsc --noEmit && npm run lint`

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete

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
- [x] `ProfileRadar`'s `onCompare` prop type simplifica para `(agent: Agent) => void` (sem `mode`/`b`), chamado como `onCompare?.(a)`
- [x] Após um envio bem-sucedido (`response !== null` — `written:true` OU `written:false` por debounce, ambos contam), `localStorage` ganha a chave de `lib/ingress-my-agent.ts` com o `codename_key` certo
- [x] Botão "Comparar meu status" (um `<a href="/ingress/ranking?tab=compare&a=...">`, navegação real de mesma origem — mesmo mecanismo do design.md, mais simples que `window.location.href` num handler) só aparece depois de uma submissão bem-sucedida nesta sessão (`myAgentKey !== null`)
- [x] `trackIngressCompareVsMe`/`trackIngressCompareTwoAgents` removidas de `utils/analytics.ts` — `grep` confirma zero chamadores antes da remoção
- [x] Gate check passes: `npm test` (436 passando) `&& npx tsc --noEmit && npm run lint` (0 erros novos) — `curl` confirma `/ingress/ranking` 200

**Tests**: none (componente — ver matrix); T3 e a remoção aqui não adicionam lógica pura nova, só religação
**Status**: ✅ Complete
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
- [x] `StatsRadarSection` (que não passa os campos novos) renderiza pixel-idêntico a antes — os 3 blocos novos (`faction`/`countryCode`/`lifetimeAp`) são todos condicionais (`agent.faction ? ... : null`, etc.), e esse chamador nunca passa esses campos
- [x] Quando `lifetimeAp`/`countryCode`/`faction` são passados, aparecem na linha do agente (bandeira + ícone de facção antes do nome, AP total como novo `ing-score-panel__stat`)
- [x] Gate check passes: `npx tsc --noEmit && npm run lint` (só os 2 warnings pré-existentes de `<img>`, já aceitos no resto do `/ingress`)

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete

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
- [x] Abrir sem digitar nada mostra a 1ª página (até 100), ordenada por nickname (case-insensitive) — `handleFocus` dispara `loadPage({})` quando `state.status==='idle'`
- [x] "Próxima página" acrescenta a 2ª leva sem descartar a 1ª (`loadPage({append:true})` concatena `[...prevOptions, ...result.rows]`); some quando `hasMore` vira `false`
- [x] Digitar substitui a lista pelos resultados da busca no servidor (debounce 300ms); limpar o campo volta pra navegação por página, reiniciando da 1ª (`handleChange` chama `loadPage({})` sem cursor quando o texto fica vazio)
- [x] Busca sem resultado mostra `t.emptySearch`; ranking vazio mostra `t.emptyNoAgents` — mesmo branch (`options.length === 0`), texto decidido por `isSearching`
- [x] Falha de rede (`fetchAgents` retorna `null`) → `state:'error'` com botão "Tentar de novo" que re-executa a última operação (busca ou página), sem afetar o resto da página
- [x] Alvo de toque ≥44×44px nos itens da lista — resolvido em T16 (`.ing-agent-select__option { min-height: 2.75rem }`, `<li>` inteiro é a área clicável)
- [x] Gate check passes: `npx tsc --noEmit && npm run lint` (só warnings pré-existentes de `<img>`)

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete

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
- [x] Selecionar A e B (diferentes) renderiza radar sobreposto + painel lado a lado sem colar nenhum texto — `result.status==='ready' && result.a && result.b` monta `RadarOverlay`+`OverallScorePanel` a partir só de `CompareRow`
- [x] Só A ou só B preenchido → mensagem de espera (`t.waitingHintOne`), nunca uma comparação parcial (o branch de render exige os dois lados presentes)
- [x] A === B → `sameAgent` calculado sem esperar fetch nenhum; efeito principal retorna cedo (`status:'blocked'`) sem chamar `/compare`
- [x] `trackIngressComparisonViewed` dispara exatamente uma vez por par completo — `trackedPairRef` dedupe por `"a|b"`, só reseta quando o par muda de verdade
- [x] Falha do endpoint de comparação → `status:'error'`, botão "Tentar de novo" (`retryTick`), selects continuam com `value` preenchido
- [x] Gate check passes: `npx tsc --noEmit && npm run lint` (0 erros; ainda não montado em nenhuma tela — T14 faz a religação)

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete

---

### T14: `IngressRankingTabs` — aba "Comparação", precedência de pré-preenchimento, link compartilhável

**What**: Adicionar `'compare'` a `Tab`. Estado novo: `agentAKey`/`agentBKey` (+ `aFromUrl`/`bFromUrl`). No mount (`useEffect`, mesmo idiom do `?destaque=`), ler `window.location.search`: se `tab=compare` presente, ativar essa aba; se `a`/`b` presentes e válidos como string, usá-los (marcando `aFromUrl=true`/`bFromUrl=true`); senão, se `agentAKey` vazio, tentar `loadMyAgent()` (T2) — resolução real de existência acontece dentro do `IngressComparisonTab` via `/compare` (T13), que limpa em silêncio se inválido. Sincroniza `?tab=&a=&b=` na URL via `history.replaceState` sempre que `tab`/`agentAKey`/`agentBKey` mudam (sem navegação/reload).

**SPEC_DEVIATION**: o atalho "Comparar" por linha (`onCompareRow`) NÃO foi wireado nesta task, ao contrário do texto original do design. Reason: `IngressRankingTable` (T15) ainda não aceita esse prop — passar `onCompareRow` aqui quebraria o build até T15 rodar, e a task "Resolving compilation dependencies" do próprio `tasks.md` pede merge-forward/backward em vez de deixar código morto/quebrado entre tasks. `handleChangeA`/`handleChangeB` já ficam prontos aqui; T15 é quem vai definir `handleCompareRow` (usando esses dois) e passar o prop pra `<IngressRankingTable>`, tocando os dois arquivos na mesma task — mesmo padrão já usado em T7/T15 pro `initialTotal`.
**Where**: `components/ingress/stats/IngressRankingTabs.tsx`
**Depends on**: T2, T13
**Reuses**: idiom de `window.location.search` em `useEffect` (`IngressRankingTable.tsx:355-362`)
**Requirement**: IRCMP-24 a IRCMP-27, IRCMP-31 a IRCMP-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] Abrir `/ingress/ranking?tab=compare&a=X&b=Y` (válidos) abre direto na aba Comparação com os dois campos preenchidos — confirmado via `curl` (200) + leitura do código (`urlA`/`urlB` presentes → `setAgentAKey`/`setAgentBKey` + `aFromUrl`/`bFromUrl=true`, `urlTab==='compare'` → `setTab('compare')`)
- [x] Trocar A/B na aba Comparação atualiza a URL sem recarregar a página (`history.replaceState`, segundo `useEffect`)
- [x] Sem `a`/`b` na URL e com `localStorage` de "meu agente" válido → Agente A pré-preenchido (`loadMyAgent()`); `localStorage` corrompido/agente removido → resolução real de existência é responsabilidade do `IngressComparisonTab` (T13, já commitada), que limpa em silêncio quando `aFromUrl===false`
- [ ] Clicar "Comparar" numa linha da tabela → **deferido pro T15** (ver SPEC_DEVIATION acima)
- [x] Gate check passes: `npm test` (436) `&& npx tsc --noEmit && npm run lint` — `curl` confirma `/ingress/ranking` e `/ingress/ranking?tab=compare` 200

**Tests**: none (componente — ver matrix)
**Gate**: full
**Status**: ✅ Complete (atalho de linha deferido pro T15, ver SPEC_DEVIATION acima)

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
- [x] Tamanho de página padrão 20; opções 20/50/100 disponíveis (`RANKING_PAGE_SIZES` importado de `lib/ingress-rankings.mjs`, única fonte)
- [x] Trocar tamanho/ordenação/facção/busca sempre volta pra página 1 (`handlePageSizeChange`/`handleSort`/`handleFactionFilter` chamam `setPage(1)`; debounce da busca idem)
- [x] Coluna "#" sempre mostra `row.rank` vindo do servidor, nunca recalculado no cliente — confirmado no smoke test: filtro `faction=resistance` + `sort=ap&dir=asc` devolveu ranks `24,22,13` (fora de ordem entre si, exatamente porque é o rank CANÔNICO, não a posição na lista filtrada/ordenada)
- [x] Clicar num cabeçalho ordenável reordena o ranking INTEIRO no servidor — confirmado: `sort=ap&dir=asc` reordenou por AP ascendente de verdade (40.396.886 < 82.666.045 < 150.553.491)
- [x] Busca por codinome filtra no servidor (substring, case-insensitive) — confirmado: `search=fencher` → só `FencherLC`
- [x] Filtro de facção aplicado no servidor junto com busca/ordenação, antes da paginação — confirmado: `faction=resistance` devolveu só os 3 agentes resistance
- [x] Sem resultados (busca/facção) → `t.noResultsBody` (`rows.length===0 && !loading`, distinto do `trulyEmpty` que cobre "ranking nunca teve ninguém")
- [x] Botão "Comparar" por linha chama `onCompareRow(row.codename_key)` — wireado em `IngressRankingTabs.tsx` (`handleCompareRow`, nesta mesma task, ver SPEC_DEVIATION de T14)
- [x] Highlight/scroll de `?destaque=` — decisão tomada: degrada em silêncio se o agente não estiver na página/filtro/ordenação atual (documentado inline no código); é exatamente o comportamento que o efeito já tinha (`if (!el) return`), sem mudança de lógica
- [x] Gate check passes: `npm run build` (limpo) — smoke test manual confirma paginação/ordenação/busca/filtro reais contra o banco (30 agentes cadastrados), `/ingress/ranking` 200, zero erros no log do dev server

**Tests**: none (componente — ver matrix)
**Gate**: build
**Status**: ✅ Complete

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
- [x] Em ~375-400px de largura: aba Comparação (grid 1 coluna abaixo de 640px), seletor (lista já ocupa 100% da largura do campo) e tabela paginada (`ing-ranking-table__pagination` com `flex-wrap`) funcionam sem rolagem horizontal — a tabela em si já tinha `overflow-x:auto` isolado no próprio `.ing-ranking-table__wrap` (pré-existente), não na página
- [x] Dois `AgentSelect` empilham verticalmente em mobile (`.ing-comparison-tab__selects { grid-template-columns: 1fr }` abaixo de 640px)
- [x] Radar sobreposto + painel de detalhes se adaptam à largura disponível — herdado sem mudança: `.ing-radar__cmp-layout` já tinha `@media` responsivo pré-existente (linha 1899), e `RadarOverlay` (T8) reaproveita essa marcação verbatim
- [x] Controles de paginação/busca alcançáveis sem rolagem horizontal (`flex-wrap` em `__pagination`/`__toolbar`, já existente pro toolbar)
- [x] Botão "Comparar" por linha: alvo de toque ≥44px só na duplicata mobile (`.ing-ranking-table__compare.ing-ranking-table__detail-share`), consistente com o alvo do `AgentSelect` (`.ing-agent-select__option`, também 2.75rem/44px)
- [x] Gate check passes: `npm run build` — limpo, nenhum erro de CSS/PostCSS

**Tests**: none (CSS — ver matrix)
**Status**: ✅ Complete
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
- [x] `npm test` (436 passando, 0 falhas), `npx tsc --noEmit` (limpo), `npm run lint` nos arquivos da feature (0 erros, só os warnings `<img>`/`_userName` já pré-existentes), `npm run build` (limpo) — todos passaram
- [x] Checagem manual via `curl`+log do dev server (sem verificação visual automática, por diretriz do projeto): `/ingress/ranking` 200; `?tab=compare&a=fencherlc&b=gal0daxj` 200 (link compartilhável com 2 agentes reais); `?tab=compare&a=fencherlc` 200 (mesmo formato da CTA "Comparar meu status"); `?tab=compare&a=agente-inexistente` 200 (não quebra); `/api/ingress-rankings/compare?a=fencherlc&b=gal0daxj` resolve os dois nomes corretamente; `?destaque=chicofera` 200; `faction=xyz` (inválido) cai no default sem filtrar; paginação/ordenação/busca/filtro reais contra os 30 agentes cadastrados (ver evidência em T15) — zero erros no log do dev server em toda a sessão. **UAT visual (clicar/tocar na tela) continua pendente do Luiz**, como já registrado em memória para este projeto
- [x] `spec.md` — Requirement Traceability: 41/41 IDs mapeados, todos `Implementing`; `Coverage` no rodapé atualizado; linha duplicada antiga removida
- [x] Gate check passes: `npm run build`

**Tests**: none
**Gate**: build
**Status**: ✅ Complete

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

---

## Fix 1 (pós-Verifier): ordem dos emblemas em `AgentSelect`

**Gap reportado**: `.specs/features/ingress-ranking-comparison/validation.md` — IRCMP-06 (AC1) exige a ordem `<emblema país><emblema facção> <nickname> <AP total>`; `components/ingress/AgentSelect.tsx` renderizava facção antes de país (campo fechado e cada opção da lista).
**Fix**: trocada a ordem dos dois `<img>` em dois pontos (`AgentSelect.tsx` — badges do campo fechado e cada `<li>` de opção). Nenhuma mudança de CSS necessária (flex row, ordem visual segue a ordem no DOM).
**Verificado**: `npx tsc --noEmit` limpo, `npx eslint components/ingress/AgentSelect.tsx` só os 4 warnings `<img>` já esperados, `npm test` 436/436, `npm run build` limpo.
**Também corrigido**: T1's "Done when" tinha aritmética errada de contagem de testes ("420 → 436, 16 novos") — medição real (`git diff 2ddfe9d..28f5dc5 -- lib/ingress-rankings.test.mjs | grep -c '^+test('`) é 13 testes novos (423 → 436). Corrigido na task acima.

---

## Fix 2 (pós-UAT do Luiz): "B" pisca e é limpo sozinho na aba Comparação

**Bug reportado**: ao preencher o segundo select (Agente B) na aba Comparação, o campo pisca e volta a ficar vazio sozinho.
**Causa raiz**: `IngressComparisonTab.tsx` tinha um `useEffect` separado (observando `result`) que limpava em silêncio uma chave não encontrada — mas lia `result` de um ciclo de fetch ANTERIOR (não correlacionado com o `agentAKey`/`agentBKey` atuais), porque efeitos de um mesmo commit não veem a atualização de estado de um efeito irmão que rodou antes na mesma passada. Sequência exata: usuário escolhe A (fetch resolve `{a, b:null}`) → usuário escolhe B → o efeito de fetch dispara de novo (novo fetch com A+B), MAS o efeito de "limpar inválido" também dispara nessa mesma passada, lendo ainda o `result` antigo (`b:null`, de quando B nem existia) → concluía "B não existe" e chamava `onChangeB(null)`, limpando o campo que acabara de ser preenchido.
**Fix**: a lógica de "limpar chave inválida" foi movida pra dentro do `.then()` do próprio fetch (única cópia do efeito), onde `agentAKey`/`agentBKey` da closure são garantidamente os mesmos que geraram aquela resposta — sem essa correlação errada, o `useEffect` extra foi removido.
**Onde**: `components/ingress/stats/IngressComparisonTab.tsx`
**Verificado**: `npx tsc --noEmit` limpo, `npx eslint` limpo, `npm test` 436/436, `npm run build` limpo. Correção de timing client-side, sem superfície testável por `curl` — verificada por rastreamento de código (a raiz do bug e a correção foram confirmadas linha a linha).
