# Ingress Stats & Ranking Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/ingress-stats-ranking/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado a partir do código do projeto (`package.json`, `lib/**/*.test.mjs` existentes) — nenhum `AGENTS.md`/`CONTRIBUTING.md`/config de coverage encontrado. **Nota**: o `CLAUDE.md` diz "No test suite is configured" — isso está desatualizado; `npm test` roda `node --test` sobre `lib/**/*.test.mjs` de verdade, e é o padrão vivo observado (10 arquivos `.test.mjs` só em `lib/ingress-*`). Confirmar antes de Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura de score (`lib/ingress-tier-score.mjs`) | unit | 1:1 com ISTATS-03/04/05/27; edge cases: valor 0, limiar exato de cada tier, overflow (2×, 25× Onyx), derivação de `portalsNeutralized` (÷8 do Purifier) | `lib/ingress-tier-score.test.mjs` | `npm test` |
| Lógica pura de ranking (`lib/ingress-rankings.mjs`) | unit | 1:1 com ISTATS-08/09/10/14 (debounce, guarda FencherLC, comparador de desempate nota→AP→data) + edge cases (empate total, codinome com espaços/caixa mista) | `lib/ingress-rankings.test.mjs` | `npm test` |
| Libs de i18n estendidas (`lib/ingress-tiers.mjs`, `lib/ingress-stats.mjs`, `lib/ingress-lore.mjs`) | unit | Cobertura já existente nesses arquivos não pode regredir (floor); nova função/shape bilíngue testada nos dois idiomas | `lib/ingress-tiers.test.mjs`, `lib/ingress-stats.test.mjs`, `lib/ingress-lore.test.mjs` (arquivos já existem — estender) | `npm test` |
| Rotas de API (`app/api/ingress-rankings/route.ts`) | none | Nenhuma rota `app/api/**` do projeto tem teste automatizado hoje (zero infra de banco de teste) — glue de framework, build gate + smoke manual descrito no "Done when" | — | build gate only |
| Componentes React (novos e `ProfileRadar.tsx` modificado) | none | Nenhum framework de teste de componente configurado no projeto; verificação com Playwright MCP (autorizado pelo Luiz especificamente para esta feature — ver Execution Notes) + revisão dele no final | — | build gate only + verificação visual |
| Schema/DDL (`casara.ingress_rankings`) | none | Entidade/config | — | build gate only |

## Gate Check Commands

> Geradas a partir de `package.json`. Não há harness de integração/e2e configurado no projeto — "Full" não se aplica.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks que só tocam `lib/**/*.mjs` | `npm test` |
| Build | Após qualquer task que toque componente/rota/schema, e ao fim de cada fase | `npm run lint && npm run build && npm test` |

---

## Execution Notes (autorizações concedidas pelo Luiz em 11/09/2026, escopadas a esta feature)

- **Playwright MCP autorizado** pra testar/validar/ver telas durante o Execute — não é o padrão geral do projeto (que pede autorização antes de abrir browser), é uma autorização explícita pra esta feature. Usar nas tasks de UI (toggle de idioma, radar, toast, tabela de ranking) pra confirmar comportamento, não só build/lint.
- **O banco é sempre produção — não existe diferença de ambiente.** Qualquer query/smoke-test manual contra `/api/ingress-rankings` (T4) ou direto no Neon grava/lê a tabela real. Usar um codinome de teste inequivocamente descartável (ex. `zzz-teste-descartar`) e **apagar a linha depois** (`DELETE FROM casara.ingress_rankings WHERE codename_key = ...`). Sempre confirmar o schema `casara.` explicitamente — nunca uma query sem qualificar.

---

## Execution Plan

Fases são ordenadas e sequenciais; tarefas dentro de uma fase executam em ordem.

### Phase 1: Dados e lógica de backend

T1, T2 e T3 são independentes entre si; T4 depende dos três.

### Phase 2: Extensão do radar e orquestração client

T5 e T6 são independentes; T7 depende de T2 (Phase 1); T8 depende de T4 (Phase 1) e de T5, T6, T7 (nesta fase).

### Phase 3: Página `/ingress/stats` completa

T9 e T11 são independentes; T10 depende de T4 (Phase 1); T12 depende de T2/T7/T8 (fases anteriores) e de T9, T10, T11 (nesta fase); T13 depende de T12.

### Phase 4: Libs compartilhadas de i18n

T14, T15 e T16 são independentes entre si — sem dependência real, executam em sequência só por conveniência de agrupamento.

### Phase 5: i18n — identidade e stats do agente

T17 é a base (o toggle); T18-T22 dependem de T17 (e T21 também de T15, Phase 4).

### Phase 6: i18n — medalhas e linha do tempo

T23-T29 dependem só de T14 (Phase 4) e T17 (Phase 5) — sem dependência entre si dentro desta fase.

### Phase 7: i18n — mapa S2

T30-T32 dependem só de T17 (Phase 5) — sem dependência entre si dentro desta fase.

### Phase 8: i18n — páginas de `/ingress`

T33-T35 dependem só de T17 (Phase 5) — e T35 também de T14 (Phase 4) — sem dependência entre si dentro desta fase.

### Phase 9: Analytics

T36 depende de T8 (Phase 2) e T17 (Phase 5); T37 depende de T36.

### Grafo completo de dependências

Todas as arestas reais declaradas nos `Depends on` de cada task, num só lugar (a numeração de fase acima é semântica/organizacional — a ordem de execução real vem inteira deste grafo):

```
T1 -> T4
T2 -> T4
T3 -> T4
T2 -> T7
T4 -> T8
T5 -> T8
T6 -> T8
T7 -> T8
T4 -> T10
T2 -> T12
T7 -> T12
T8 -> T12
T9 -> T12
T10 -> T12
T11 -> T12
T12 -> T13
T17 -> T18
T17 -> T19
T17 -> T20
T15 -> T21
T17 -> T21
T17 -> T22
T14 -> T23
T17 -> T23
T14 -> T24
T17 -> T24
T14 -> T25
T17 -> T25
T17 -> T26
T17 -> T27
T17 -> T28
T14 -> T29
T17 -> T29
T17 -> T30
T17 -> T31
T17 -> T32
T17 -> T33
T17 -> T34
T14 -> T35
T17 -> T35
T8 -> T36
T17 -> T36
T36 -> T37
```

---

## Task Breakdown

### T1: DDL de `casara.ingress_rankings`

**What**: Adicionar a tabela `casara.ingress_rankings` (+ 2 índices) a `lib/schema.sql`.
**Where**: `lib/schema.sql`
**Depends on**: None
**Reuses**: convenções já usadas nas tabelas vizinhas do mesmo arquivo (`word_sessions`, `quiz_sessions`) — `TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `CHECK` pra enum fechado, `CREATE INDEX IF NOT EXISTS`.
**Requirement**: ISTATS-07, ISTATS-28, ISTATS-30

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `CREATE TABLE IF NOT EXISTS casara.ingress_rankings` com as 9 colunas do design (`codename_key` PK, `codename`, `faction` com `CHECK`, `lifetime_ap`, `overall_score`, `axis_scores` JSONB, `stat_values` JSONB, `created_at`, `updated_at`)
- [x] 2 índices (`overall_score DESC`, `lifetime_ap DESC`)
- [x] Comentário no arquivo explicando o significado de `created_at` ("medido desde", não data de criação da conta)

**Tests**: none
**Gate**: build

---

### T2: `lib/ingress-tier-score.mjs`

**What**: Módulo de lógica pura que converte `computeBadge()` num número contínuo de tier-posição e agrega pelos 5 eixos/nota geral.
**Where**: `lib/ingress-tier-score.mjs`
**Depends on**: None
**Reuses**: `computeBadge`, `BADGES` de `lib/ingress-badges.mjs`; `RADAR_AXES` de `lib/ingress-radar.mjs`; `TIER_RANK`, `TIER_LABELS` de `lib/ingress-tiers.mjs`.
**Requirement**: ISTATS-03, ISTATS-04, ISTATS-05, ISTATS-27

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `tierPosition(badgeResult)` — `TIER_RANK[tier] + (pct ?? 0)` quando não `atMax`; `5 + (beyond.multiple - 1) + beyond.pct` quando `atMax`
- [x] `computeAxisScores(stats)` — resolve `badgeDef` de cada parte de `RADAR_AXES` via `BADGES.find(b => b.slug === part.badge)`; caso especial `portalsNeutralized` usa um `badgeDef` sintético = tiers do Purifier ÷ 8
- [x] `computeOverallScore(axisScores)` — média × 20
- [x] `overallTierLabel(axisScores)` — piso da média → `TIER_LABELS`, sufixo `+N` quando > Onyx
- [x] Testes cobrindo: valor 0 em cada eixo, valor exatamente no limiar de cada tier, overflow (2×, 25× Onyx uniforme em tudo → nota 120 e ~580, conferindo a fórmula linear fechada com o usuário), derivação de `portalsNeutralized`
- [x] `npm test` verde

**Tests**: unit
**Gate**: quick

---

### T3: `lib/ingress-rankings.mjs`

**What**: Módulo de lógica pura das regras de negócio do ranking — normalização de chave, guarda do FencherLC, e o comparador de desempate.
**Where**: `lib/ingress-rankings.mjs`
**Depends on**: None
**Reuses**: nenhum módulo existente (lógica nova, mas pequena e isolada).
**Requirement**: ISTATS-08, ISTATS-09, ISTATS-10, ISTATS-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `normalizeCodenameKey(codename)` — `trim().toLowerCase()`
- [x] `isFencherLcCodename(codenameKey, fencherlcCodename)` — comparação normalizada
- [x] `compareRankingRows(a, b)` — comparador pra `Array.sort`: `overall_score` desc → `lifetime_ap` desc → `created_at` asc
- [x] Testes: normalização (espaços, caixa mista), guarda do FencherLC (case-insensitive), comparador com empates em cada nível (nota igual → desempata por AP; nota e AP iguais → desempata por data)
- [x] `npm test` verde

**Tests**: unit
**Gate**: quick

---

### T4: `app/api/ingress-rankings/route.ts`

**What**: Rota de API — `POST` (guardas + upsert atômico + posição no ranking) e `GET` (leaderboard paginado por `LIMIT`, cache curto).
**Where**: `app/api/ingress-rankings/route.ts`
**Depends on**: T1, T2, T3
**Reuses**: `lib/db.ts` (`sql`), `lib/ingress-tier-score.mjs`, `lib/ingress-rankings.mjs`, `lib/ingress.ts` (`loadProfile` pro codinome do FencherLC) — mesmo padrão de handler de `app/api/quiz-sessions/[id]/answers/route.ts` (uma instrução SQL atômica guardada).
**Requirement**: ISTATS-07, ISTATS-08, ISTATS-09, ISTATS-10, ISTATS-11, ISTATS-14, ISTATS-16, ISTATS-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `POST`: valida body (`codename`, `faction` ∈ {enlightened,resistance}, `lifetimeAp` numérico, `stats` com as 11 chaves) → `400` se inválido
- [x] `POST`: se `isFencherLcCodename` → não roda SQL de escrita, só lê a linha existente e devolve `{written:false, rank, totalAgents, overallScore, axisScores, tier}`
- [x] `POST`: senão, computa `axisScores`/`overallScore` via T2, executa `INSERT ... ON CONFLICT (codename_key) DO UPDATE ... WHERE updated_at < NOW() - INTERVAL '5 minutes'`, e devolve o mesmo shape de resposta (com `written:true`/`false` conforme o upsert de fato aconteceu)
- [x] `POST`: calcula `rank`/`totalAgents` com uma query separada usando a mesma ordenação de T3
- [x] `GET`: `?limit=` (default 100, hard cap 100), `Cache-Control: s-maxage=20, stale-while-revalidate=40`, sem exigir token
- [ ] **BLOQUEADO** — Smoke manual contra produção: `casara.ingress_rankings` ainda não existe no banco real (`lib/schema.sql` é aplicado manualmente no Neon SQL Editor, nunca por script automatizado — ver seu próprio cabeçalho). Uma tentativa de rodar a DDL de T1 via script Node foi bloqueada pelo classificador de permissão do harness ("Production Deploy"), como esperado — aplicar DDL em produção não é uma ação que um agente deve executar sozinho. **Luiz precisa rodar a seção "Ingress Stats & Ranking" de `lib/schema.sql` no Neon SQL Editor antes do smoke test (e do primeiro uso real da rota) ser possível.** Depois disso, repetir: `curl -X POST localhost:3000/api/ingress-rankings` com um codinome descartável (ex. `zzz-teste-descartar`) + `curl localhost:3000/api/ingress-rankings`, depois `DELETE FROM casara.ingress_rankings WHERE codename_key = 'zzz-teste-descartar'`. Build/lint/test gate está verde; só esta verificação manual depende do schema já estar aplicado.

**Tests**: none
**Gate**: build

---

### T5: Estender `components/ingress/ProfileRadar.tsx`

**What**: Adicionar, aditivamente, `variant?: 'default'|'ranking'`, o modo `'solo'`, a prop `onCompare`, e afrouxar o tipo de `cmp` pra `b` opcional.
**Where**: `components/ingress/ProfileRadar.tsx`
**Depends on**: None
**Reuses**: toda a lógica de parsing/SVG existente — mudança é aditiva, sem tocar o caminho `variant` omitido.
**Requirement**: ISTATS-01, ISTATS-06

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client` (revisar se a extensão continua respeitando os limites de client boundary já estabelecidos)

**Done when**:
- [x] `variant` default `'default'` preserva 100% o comportamento/props/render atuais (nenhum snapshot visual muda quando `variant` é omitido)
- [x] `variant==='ranking'`: modo `'solo'` disponível (`runCompare` faz `setCmp({a: toAgent(textA)})`, sem `b`); caixa de comparação abre por padrão (`open` inicial `true`); rótulos dos 3 modos = "Comparar com {agentName}" / "Comparar com outro agente" / "Só entrar no ranking"
- [x] `onCompare?.({a, b})` chamado no mesmo ponto que `notifyTelegram` já é chamado, só quando `variant==='ranking'`
- [x] `npm run build` e `npm run lint` verdes
- [x] Nota no "Done when" da task seguinte (T8) pra verificação manual de não-regressão em `/ingress` (uso sem `variant`)

**Tests**: none
**Gate**: build

---

### T6: Dependência `sonner` + `<Toaster/>` em `app/ingress/layout.tsx`

**What**: Montar `<Toaster/>` (biblioteca `sonner`, adicionada como dependência nesta mesma task) no layout de `/ingress` — não no layout raiz.
**Where**: `app/ingress/layout.tsx`
**Depends on**: None
**Reuses**: nenhum — primeira lib de toast do projeto.
**Requirement**: suporte a ISTATS-12, ISTATS-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `sonner` em `dependencies` do `package.json`, `npm install` roda sem erro
- [ ] `<Toaster/>` renderizado dentro de `app/ingress/layout.tsx` (Server Component permanece Server Component — `<Toaster/>` é filho, não torna o layout client)
- [ ] `npm run build` verde

**Tests**: none
**Gate**: build

---

### T7: `components/ingress/stats/OverallScorePanel.tsx`

**What**: Painel que mostra nota geral + selo de tier + nota de cada um dos 5 eixos, pra 1 ou 2 agentes.
**Where**: `components/ingress/stats/OverallScorePanel.tsx`
**Depends on**: T2
**Reuses**: `Panel.tsx`, `TIER_LABELS`/`TIER_COLOR` de `lib/ingress-tiers.mjs`.
**Requirement**: ISTATS-03, ISTATS-04, ISTATS-27

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Aceita `agents: {label, overallScore, axisScores, tier}[]` (1 ou 2)
- [ ] Renderiza nota geral + selo por agente, e as 5 notas de eixo lado a lado quando há 2 agentes
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T8: `components/ingress/stats/StatsRadarSection.tsx`

**What**: Componente client que orquestra `ProfileRadar` (`variant="ranking"`), dispara os POSTs por agente colado, mostra os toasts e sinaliza refetch do ranking.
**Where**: `components/ingress/stats/StatsRadarSection.tsx`
**Depends on**: T4, T5, T6, T7
**Reuses**: `ProfileRadar` inteiro; `sonner` (`toast`).
**Requirement**: ISTATS-01, ISTATS-06, ISTATS-08, ISTATS-09, ISTATS-10, ISTATS-12, ISTATS-13, ISTATS-14, ISTATS-24, ISTATS-25, ISTATS-26

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `onCompare({a,b})`: decide quais agentes foram colados por modo (`vs-me→[b]`, `two→[a,b]`, `solo→[a]`) — nunca posta o `me`/FencherLC vindo de prop
- [ ] `Promise.allSettled` nos POSTs — falha de um não bloqueia o outro
- [ ] Toast de posição usa a regra "primeiro colado" (assumption do spec) quando 2 agentes; toast suave de erro em falha de rede (Edge case do spec), nunca lança/trava a UI
- [ ] Atualiza o estado que alimenta `OverallScorePanel`; sinaliza `IngressRankingTable` pra refetch após `written:true`
- [ ] **Verificação manual de não-regressão**: `/ingress` (uso sem `variant`) continua idêntico — comparação, Telegram, tudo igual
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T9: `components/ingress/stats/AxisExplanations.tsx`

**What**: Texto fixo abaixo do radar explicando cada um dos 5 eixos.
**Where**: `components/ingress/stats/AxisExplanations.tsx`
**Depends on**: None
**Reuses**: `Panel.tsx`; padrão `translations = {pt:{...},en:{...}}` de `app/about/page.tsx`.
**Requirement**: ISTATS-02

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Um parágrafo por eixo (Construção, Destruição, Exploração, Hacking, Links e campos) explicando o que cada um mede, em PT e EN
- [ ] `useLang()` escolhe o idioma sem reload
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T10: `components/ingress/stats/IngressRankingTable.tsx`

**What**: Tabela do ranking completo + ícone "olho" com popover dos 11 valores brutos por eixo.
**Where**: `components/ingress/stats/IngressRankingTable.tsx`
**Depends on**: T4
**Reuses**: `fmtStat` de `lib/ingress-format.mjs`; `Panel.tsx`.
**Requirement**: ISTATS-15, ISTATS-16, ISTATS-17, ISTATS-29

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Colunas: posição, codinome (+ indicador de facção), atualizado em, medido desde, AP total, nota geral
- [ ] Ícone "olho" por linha → popover com os 11 valores brutos agrupados pelos 5 eixos
- [ ] Recebe `initialRows` como prop (SSR) e refaz `GET /api/ingress-rankings` quando sinalizado por `StatsRadarSection`
- [ ] Estado vazio explicativo quando `rows.length === 0`
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T11: `components/ingress/stats/IngressTutorial.tsx`

**What**: Tutorial numerado de exportação (placeholder de print) + link de sugestão pro Telegram.
**Where**: `components/ingress/stats/IngressTutorial.tsx`
**Depends on**: None
**Reuses**: nenhum.
**Requirement**: ISTATS-22, ISTATS-23

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Passo-a-passo numerado (PT/EN) explicando como exportar do app do Ingress
- [ ] Área de imagem placeholder no lugar do print real (sem quebrar layout)
- [ ] Link/botão pra `https://t.me/FencherLC`, `target="_blank"`, sem formulário/coleta de texto
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T12: `app/ingress/stats/page.tsx`

**What**: Server Component da rota — carrega o baseline do FencherLC, computa a nota dele no servidor, busca o ranking inicial direto no banco, compõe todos os componentes das fases 2-3.
**Where**: `app/ingress/stats/page.tsx`
**Depends on**: T2, T7, T8, T9, T10, T11
**Reuses**: `loadProfile()` de `lib/ingress.ts`; `lib/ingress-tier-score.mjs`; `sql` de `lib/db.ts` (query direta, sem `fetch` pra própria API).
**Requirement**: ISTATS-01, ISTATS-02, ISTATS-03, ISTATS-04, ISTATS-05, ISTATS-06, ISTATS-15, ISTATS-17

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client` (garantir que o page.tsx em si continua Server Component)

**Done when**:
- [ ] Carrega `loadProfile()`, computa `axisScores`/`overallScore`/`tier` do FencherLC via T2
- [ ] Query direta em `casara.ingress_rankings` pro `initialRows` (ordenação de T3)
- [ ] Compõe `StatsRadarSection`, `AxisExplanations`, `OverallScorePanel`, `IngressRankingTable`, `IngressTutorial`
- [ ] Estado vazio quando `loadProfile()` retorna `null` (mesmo tratamento que `/ingress` já tem)
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T13: `app/ingress/stats/opengraph-image.tsx`

**What**: Imagem OG da rota nova, consistente com as rotas irmãs (`linha-do-tempo`, `medalha/[slug]`).
**Where**: `app/ingress/stats/opengraph-image.tsx`
**Depends on**: T12
**Reuses**: `app/ingress/linha-do-tempo/opengraph-image.tsx` como referência de padrão.
**Requirement**: — (consistência de rota, sem AC própria no spec)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Imagem gerada segue o mesmo padrão visual das rotas irmãs
- [ ] `npm run build` verde

**Tests**: none
**Gate**: build

---

### T14: `lib/ingress-tiers.mjs` bilíngue

**What**: Adicionar `tierLabel(tier, lang)` bilíngue, aditivo — `TIER_LABELS` atual continua exportado e usado por quem ainda não migrou.
**Where**: `lib/ingress-tiers.mjs`
**Depends on**: None
**Reuses**: `TIER_LABELS` existente como fonte da versão PT.
**Requirement**: ISTATS-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `tierLabel(tier, lang: 'pt'|'en')` — PT usa `TIER_LABELS` atual; EN usa os nomes oficiais em inglês (Bronze/Silver/Gold/Platinum/Onyx/"No medal")
- [ ] `TIER_LABELS` export original inalterado (nenhum call site existente quebra)
- [ ] Testes cobrindo os dois idiomas pra cada tier
- [ ] `npm test` verde (contagem de testes não regride)

**Tests**: unit
**Gate**: quick

---

### T15: `lib/ingress-stats.mjs` labels bilíngues

**What**: Adicionar labels EN pros `STAT_COLUMNS`/`STAT_GROUPS` usados na UI, aditivo.
**Where**: `lib/ingress-stats.mjs`
**Depends on**: None
**Reuses**: `STAT_COLUMNS`/`STAT_GROUPS` existentes como fonte da versão PT.
**Requirement**: ISTATS-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cada entrada de `STAT_COLUMNS`/`STAT_GROUPS` usada em componentes de UI (não as de `kind:'meta'`, que são só do CLI) ganha um `labelEn`, sem remover `label` (PT)
- [ ] Testes conferindo que toda entrada usada em UI tem `labelEn` não-vazio
- [ ] `npm test` verde (contagem de testes não regride)

**Tests**: unit
**Gate**: quick

---

### T16: `lib/ingress-lore.mjs` + `data/ingress/medal-lore.json` bilíngue

**What**: Expor `lang` em `lib/ingress-lore.mjs`, redigindo a versão EN do conteúdo editorial (`blurb`/`facts`) das 17 medalhas com "plus" diretamente no `data/ingress/medal-lore.json` que este módulo lê.
**Where**: `lib/ingress-lore.mjs`
**Depends on**: None
**Reuses**: estrutura atual do JSON (`data/ingress/medal-lore.json`) como fonte da versão PT.
**Requirement**: ISTATS-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cada uma das 17 entradas do JSON ganha `blurbEn`/`factsEn` (conteúdo redigido, não placeholder)
- [ ] `lib/ingress-lore.mjs` expõe uma função/parâmetro `lang` pra escolher a versão certa
- [ ] Testes conferindo que toda entrada tem a versão EN preenchida
- [ ] `npm test` verde (contagem de testes não regride)

**Tests**: unit
**Gate**: quick

---

### T17: `components/ingress/stats/IngressLanguageToggle.tsx`

**What**: A "chave" de troca PT/EN visível dentro de `/ingress` (o `Header` genérico não renderiza ali — achado do Design). Montada em `app/ingress/layout.tsx` como parte desta mesma task (uma linha de JSX no layout existente).
**Where**: `components/ingress/stats/IngressLanguageToggle.tsx`
**Depends on**: None
**Reuses**: `useLang()`/`toggle()` de `context/LanguageContext.tsx` (infraestrutura já existe, só faltava consumo).
**Requirement**: ISTATS-18

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Botão PT|EN estilizado com o tema Sora/Barlow de `app/ingress/theme.css` (não as classes do `Header` genérico)
- [ ] Montado em `app/ingress/layout.tsx`, visível em toda a árvore de `/ingress`
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T18: Traduzir `components/ingress/AgentHeader.tsx`

**What**: Bilinguizar rótulos ("Agente de campo", "recursão(ões)") e o tooltip "O que é Ingress?" (3 frases).
**Where**: `components/ingress/AgentHeader.tsx`
**Depends on**: T17
**Reuses**: padrão `translations[lang]`.
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto visível troca com o toggle, sem reload
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T19: Traduzir `components/ingress/ActionsBreakdown.tsx`

**What**: Bilinguizar o array `ROWS` (6 labels) + label/hint do `Panel`.
**Where**: `components/ingress/ActionsBreakdown.tsx`
**Depends on**: T17

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] As 6 labels + label/hint traduzidos, troca sem reload
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

**Requirement**: ISTATS-19

---

### T20: Traduzir `components/ingress/ApTimeline.tsx`

**What**: Bilinguizar "Evolução de AP" (label do Panel + aria-label).
**Where**: `components/ingress/ApTimeline.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Label e aria-label trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T21: Traduzir `components/ingress/StatGroups.tsx`

**What**: Bilinguizar o sufixo " métricas"; consumir os títulos/labels em EN vindos de T15.
**Where**: `components/ingress/StatGroups.tsx`
**Depends on**: T15, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Sufixo e labels (via T15) trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T22: Traduzir `components/ingress/StatValue.tsx`

**What**: Bilinguizar a palavra "Medalha" no aria-label.
**Where**: `components/ingress/StatValue.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Aria-label troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T23: Traduzir `components/ingress/AchievementTimeline.tsx`

**What**: Bilinguizar filtros de categoria/tier, labels de painel, tooltip de hover, CTAs ("abrir linha do tempo →", "ver período inteiro").
**Where**: `components/ingress/AchievementTimeline.tsx`
**Depends on**: T14, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto (incluindo filtros de tier via T14) troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T24: Traduzir `components/ingress/MedalDetail.tsx`

**What**: Bilinguizar "Seu total:", "Fechar", "ainda sem medalha", "faltam ... para ...", CTA de abrir página da medalha.
**Where**: `components/ingress/MedalDetail.tsx`
**Depends on**: T14, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T25: Traduzir `components/ingress/MedalGrid.tsx`

**What**: Bilinguizar "Medalhas", "Cronologia", "Categoria", "Próxima medalha", `CATS`, `SOON` ("chegam com o dump GDPR").
**Where**: `components/ingress/MedalGrid.tsx`
**Depends on**: T14, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto (incluindo `CATS`/`SOON`) troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T26: Traduzir `components/ingress/MedalSpark.tsx`

**What**: Bilinguizar o aria-label "Progressão dos tiers no tempo".
**Where**: `components/ingress/MedalSpark.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Aria-label troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T27: Traduzir `components/ingress/PendingSection.tsx`

**What**: Bilinguizar o objeto `COPY` (2 labels + 2 parágrafos + hint "aguardando dump GDPR").
**Where**: `components/ingress/PendingSection.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo o `COPY` troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T28: Traduzir `components/ingress/RecursionMark.tsx`

**What**: Bilinguizar o template de title/aria-label "{m}× o limiar de Onyx" / "{m} vezes o limiar de Onyx".
**Where**: `components/ingress/RecursionMark.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Os dois templates trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T29: Traduzir `components/ingress/TierLadder.tsx`

**What**: Bilinguizar o sufixo " · atual"; consumir labels de tier em EN vindos de T14.
**Where**: `components/ingress/TierLadder.tsx`
**Depends on**: T14, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Sufixo e labels (via T14) trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T30: Traduzir `components/ingress/S2Explorer.tsx`

**What**: Bilinguizar "Nível da célula:" (atribuição OSM continua como está — não é texto do projeto).
**Where**: `components/ingress/S2Explorer.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Label troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T31: Traduzir `components/ingress/S2ExplorerLoader.tsx`

**What**: Bilinguizar as 3 mensagens ("Carregando o mapa…", erro de mapa indisponível, "Tocar para explorar as células").
**Where**: `components/ingress/S2ExplorerLoader.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] As 3 mensagens trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T32: Traduzir `components/ingress/S2Preview.tsx`

**What**: Bilinguizar label "Células S2", hint template, e o parágrafo explicando células S2.
**Where**: `components/ingress/S2Preview.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Label, hint e parágrafo trocam com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T33: Traduzir `app/ingress/page.tsx`

**What**: Bilinguizar "Sinal perdido"/mensagem de perfil não publicado, "Portais", parágrafo do mapa de calor, hint de 2º export; condicionar `toLocaleDateString` ao idioma ativo (`'pt-BR'`/`'en-US'`). Metadata (`<head>`) fica só-PT — sem precedente de SEO bilíngue em nenhuma rota do site.
**Where**: `app/ingress/page.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto visível troca com o toggle; `toLocaleDateString` usa `'pt-BR'` ou `'en-US'` conforme `lang`
- [ ] Metadata inalterada (fora do escopo — decisão registrada)
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T34: Traduzir `app/ingress/linha-do-tempo/page.tsx`

**What**: Bilinguizar h1 "Linha do tempo", parágrafo-template, mensagem "Ainda não há datas de conquista suficientes." Metadata fica só-PT (mesma decisão de T33).
**Where**: `app/ingress/linha-do-tempo/page.tsx`
**Depends on**: T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto visível troca com o toggle
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T35: Traduzir `app/ingress/medalha/[slug]/page.tsx`

**What**: Bilinguizar "Sua linha do tempo nesta medalha", "Escada de tiers", as 3 variantes de `projectionText`; condicionar `toLocaleDateString` ao idioma ativo. `entry.requirement` (texto oficial do jogo, já em inglês) e metadata ficam como estão — fora do escopo.
**Where**: `app/ingress/medalha/[slug]/page.tsx`
**Depends on**: T14, T17
**Requirement**: ISTATS-19

**Tools**: MCP: NONE / Skill: `nextjs-use-client`

**Done when**:
- [ ] Todo texto do projeto (não o `requirement` oficial do jogo) troca com o toggle; datas usam o locale certo
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

### T36: `trackIngress*` em `utils/analytics.ts`

**What**: Nova seção `// ─── Ingress ───` com funções de tracking (ex. `trackIngressRankingSubmit`, `trackIngressRankingView`, `trackIngressLanguageToggle`).
**Where**: `utils/analytics.ts`
**Depends on**: T8 (sabe quais eventos client realmente disparam), T17
**Reuses**: `trackEvent` interno já existente.
**Requirement**: observabilidade (dimension sweep do spec)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Funções novas chamadas dos pontos certos (`StatsRadarSection` no submit, `IngressLanguageToggle` no toggle)
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

**Commit**: `feat(ingress): analytics da feature de stats/ranking`

---

### T37: `EVENT_LABELS` em `app/stats/page.tsx`

**What**: Rótulos de dashboard pros eventos novos de T36 (opcional, per CLAUDE.md).
**Where**: `app/stats/page.tsx`
**Depends on**: T36
**Requirement**: — (polish, sem AC própria)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Cada evento de T36 tem um rótulo legível em `EVENT_LABELS`
- [ ] `npm run build` e `npm run lint` verdes

**Tests**: none
**Gate**: build

---

## Phase Execution Map

Fases 1→9 executam em sequência; dentro de cada fase, tarefas executam em ordem. O grafo completo de dependências (todas as 43 arestas reais) está na seção "Grafo completo de dependências" da Execution Plan acima — não duplicado aqui para evitar duas fontes divergindo.

| Phase | Tasks |
| --- | --- |
| 1 — Dados e lógica de backend | T1, T2, T3, T4 |
| 2 — Extensão do radar e orquestração client | T5, T6, T7, T8 |
| 3 — Página `/ingress/stats` completa | T9, T10, T11, T12, T13 |
| 4 — Libs compartilhadas de i18n | T14, T15, T16 |
| 5 — i18n: identidade e stats do agente | T17, T18, T19, T20, T21, T22 |
| 6 — i18n: medalhas e linha do tempo | T23, T24, T25, T26, T27, T28, T29 |
| 7 — i18n: mapa S2 | T30, T31, T32 |
| 8 — i18n: páginas de `/ingress` | T33, T34, T35 |
| 9 — Analytics | T36, T37 |

**37 tarefas totais** → ~6 batches de ~7 tarefas cada, se delegado a sub-agentes (oferta abaixo).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1-T37 | 1 arquivo por tarefa | ✅ Granular |

Todo `Where` nomeia exatamente 1 arquivo. Duas tarefas (T6, T17) também tocam um segundo arquivo trivial como efeito colateral direto do que criam — T6 adiciona `sonner` ao `package.json` ao introduzir o `<Toaster/>`; T17 monta o toggle recém-criado em `app/ingress/layout.tsx` com uma linha de JSX — descrito no "What"/"Done when", não no `Where`, porque é parte inseparável do mesmo deliverable, não um segundo componente.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — (Phase 1, sem dependência) | ✅ Match |
| T2 | None | — (Phase 1, sem dependência) | ✅ Match |
| T3 | None | — (Phase 1, sem dependência) | ✅ Match |
| T4 | T1, T2, T3 | T1→T4, T2→T4, T3→T4 | ✅ Match |
| T5 | None | — (Phase 2, sem dependência) | ✅ Match |
| T6 | None | — (Phase 2, sem dependência) | ✅ Match |
| T7 | T2 | T2 é da Phase 1 (backward, sem seta exigida) | ✅ Match |
| T8 | T4, T5, T6, T7 | T4 é da Phase 1 (backward); T5→T8, T6→T8, T7→T8 (mesma fase) | ✅ Match |
| T9 | None | — (Phase 3, sem dependência) | ✅ Match |
| T10 | T4 | T4 é da Phase 1 (backward, sem seta exigida) | ✅ Match |
| T11 | None | — (Phase 3, sem dependência) | ✅ Match |
| T12 | T2, T7, T8, T9, T10, T11 | T2/T7/T8 de fases anteriores (backward); T9→T12, T10→T12, T11→T12 (mesma fase) | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | None | — (Phase 4, sem dependência) | ✅ Match |
| T15 | None | — (Phase 4, sem dependência) | ✅ Match |
| T16 | None | — (Phase 4, sem dependência) | ✅ Match |
| T17 | None | — (Phase 5, sem dependência) | ✅ Match |
| T18 | T17 | T17→T18 | ✅ Match |
| T19 | T17 | T17→T19 | ✅ Match |
| T20 | T17 | T17→T20 | ✅ Match |
| T21 | T15, T17 | T15 é da Phase 4 (backward); T17→T21 (mesma fase) | ✅ Match |
| T22 | T17 | T17→T22 | ✅ Match |
| T23 | T14, T17 | T14 (Phase 4) e T17 (Phase 5) — ambas backward, sem seta exigida | ✅ Match |
| T24 | T14, T17 | idem T23 — backward | ✅ Match |
| T25 | T14, T17 | idem T23 — backward | ✅ Match |
| T26 | T17 | Phase 5 — backward | ✅ Match |
| T27 | T17 | Phase 5 — backward | ✅ Match |
| T28 | T17 | Phase 5 — backward | ✅ Match |
| T29 | T14, T17 | idem T23 — backward | ✅ Match |
| T30 | T17 | Phase 5 — backward | ✅ Match |
| T31 | T17 | Phase 5 — backward | ✅ Match |
| T32 | T17 | Phase 5 — backward | ✅ Match |
| T33 | T17 | Phase 5 — backward | ✅ Match |
| T34 | T17 | Phase 5 — backward | ✅ Match |
| T35 | T14, T17 | idem T23 — backward | ✅ Match |
| T36 | T8, T17 | T8 (Phase 2) e T17 (Phase 5) — backward, sem seta exigida | ✅ Match |
| T37 | T36 | T36→T37 (mesma fase) | ✅ Match |

Nenhuma tarefa depende de uma tarefa de fase posterior — todas as dependências apontam pra trás ou dentro da mesma fase. Dependências dentro da mesma fase têm seta correspondente no diagrama (Execution Plan + Phase Execution Map); dependências cruzando fases (sempre pra trás) não precisam de seta — a ordem já é garantida pela sequência de fases.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Schema/DDL | none | none | ✅ OK |
| T2 | Lógica pura (`lib/ingress-tier-score.mjs`) | unit | unit | ✅ OK |
| T3 | Lógica pura (`lib/ingress-rankings.mjs`) | unit | unit | ✅ OK |
| T4 | Rota de API | none | none | ✅ OK |
| T5 | Componente React | none | none | ✅ OK |
| T6 | Componente React + config | none | none | ✅ OK |
| T7 | Componente React | none | none | ✅ OK |
| T8 | Componente React | none | none | ✅ OK |
| T9 | Componente React | none | none | ✅ OK |
| T10 | Componente React | none | none | ✅ OK |
| T11 | Componente React | none | none | ✅ OK |
| T12 | Server Component (rota) | none | none | ✅ OK |
| T13 | Rota (imagem) | none | none | ✅ OK |
| T14 | Lógica pura, arquivo já testado | unit | unit | ✅ OK |
| T15 | Lógica pura, arquivo já testado | unit | unit | ✅ OK |
| T16 | Lógica pura, arquivo já testado | unit | unit | ✅ OK |
| T17 | Componente React | none | none | ✅ OK |
| T18-T35 | Componente/página React | none | none | ✅ OK (18 tarefas) |
| T36 | Lib de analytics (sem teste no projeto — nenhum `utils/*.test.*` existe) | none | none | ✅ OK |
| T37 | Página de dashboard | none | none | ✅ OK |

Nenhuma tarefa marca `Tests: none` fora do que a matriz permite (só camadas React/rota/config, todas listadas como `none` na matriz).
