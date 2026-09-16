# Estatísticas para Nerds Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/ingress-ranking-nerd-stats/design.md`
**Status**: Approved

**Scope of this file**: MVP only — spec's P1-P6 (`NERD-01` a `NERD-32`, todas marcadas ⭐ MVP). P7-P9 (geografia, crescimento, correlação — `NERD-33` a `NERD-37`) ficam deliberadamente de fora, sem tarefa própria: não têm ⭐ MVP na spec e o design já as trata como fast-follow.

---

## Test Coverage Matrix

> Gerado por amostragem do repositório (nenhum `AGENTS.md`/guia de teste dedicado encontrado — convenção observada diretamente no código). Amostras: `lib/ingress-tier-score.test.mjs`, `lib/ingress-badges.test.mjs`, `lib/ingress-rankings.test.mjs`, `lib/ingress-countries.test.mjs`. Confirmado por busca: **nenhum** `app/api/**/*.test.*` nem `components/**/*.test.*` existe no projeto inteiro — rotas e componentes React não têm teste automatizado; são verificados por typecheck + lint + build + checagem manual (padrão já registrado em handoffs anteriores de `.specs/STATE.md`, ex. "tsc --noEmit limpo, lint sem erro novo, npm test passando, SSR responde 200").

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | --------------------- | ----------------- | ----------- |
| Domain logic (`lib/*.mjs`) | unit | Todas as branches; 1:1 com os ACs da spec (`NERD-01`..`NERD-32`); todo edge case listado (chave ausente, empate, amostra vazia) | `lib/ingress-nerd-stats.test.mjs` | `npm test` |
| Migration SQL (`lib/migrations/*.sql`) | none | Verificação manual (query comentada no próprio arquivo, aplicada no Neon) — mesmo padrão de `005`/`006` | `lib/migrations/*.sql` | build gate only + verificação manual |
| API route (`route.ts`) | none | Nenhuma rota do projeto tem teste automatizado — convenção existente, não uma lacuna desta feature | `app/api/ingress-rankings/route.ts` | build gate only |
| SSR loader / page (`page.tsx`) | none | Mesma convenção — `loadInitialRows`/`loadInitialActivity` também não têm teste próprio | `app/ingress/ranking/page.tsx` | build gate only |
| React component (`.tsx`) | none | Nenhum componente do projeto tem teste automatizado; validação visual é do Luiz (UAT manual), não automatizada | `components/ingress/stats/*.tsx` | build gate only |

## Gate Check Commands

> Confirmar antes do Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks que só tocam `lib/*.mjs` (lógica pura + teste) | `npm test` |
| Full | Após tasks que tocam rota/página/componente (sem teste automatizado, mas não podem quebrar tipo/lint) | `npm test && npx tsc --noEmit && npm run lint` |
| Build | Ao fechar a última fase (integração completa) | `npm run build` |
| Manual | Tasks só de SQL (migration) | Colar no Neon SQL Editor (com autorização explícita do Luiz) + rodar a query de verificação comentada no próprio arquivo `.sql` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Fundação de dados

```
T1 → T2
```

### Phase 2: Núcleo puro (`lib/ingress-nerd-stats.mjs`)

```
T3 → T9
T4 → T9
T5 → T9
T6 → T9
T7 → T9
T8 → T9
```

### Phase 3: Componentes de seção (apresentacionais)

```
T9 → T10
T9 → T11
T9 → T12 → T13
T9 → T14
T9 → T15
T9 → T16
```

### Phase 4: Integração

```
T10 → T17
T11 → T17
T13 → T17
T14 → T17
T15 → T17
T16 → T17
T17 → T18
T1 → T18
```

---

## Task Breakdown

### T1: Migration `months_subscribed` ✅

**What**: Cria `lib/migrations/009-ingress-ranking-months-subscribed.sql`, adicionando `months_subscribed INTEGER` (nullable, `CHECK >= 0`) a `casara.ingress_rankings` — mesmo padrão exato de `005-ingress-ranking-recursions.sql`.
**Where**: `lib/migrations/009-ingress-ranking-months-subscribed.sql`
**Depends on**: None
**Reuses**: `lib/migrations/005-ingress-ranking-recursions.sql` (template quase idêntico)
**Requirement**: NERD-28 (infra)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Arquivo criado seguindo o cabeçalho/formato das migrations 005/006 (contexto, o que faz, o que não toca, como rodar, query de verificação comentada)
- [ ] `ADD COLUMN IF NOT EXISTS` (idempotente)

**Tests**: none
**Gate**: Manual (aplicação real em produção fica pendente de autorização explícita do Luiz — não faz parte deste task, só a criação do arquivo)

**Commit**: `chore(ingress): migration para months_subscribed em ingress_rankings`

---

### T2: `POST /api/ingress-rankings` aceita `monthsSubscribed` ✅

**What**: Adiciona parsing opcional de `body.monthsSubscribed` (mesmo tratamento não-rejeitante de `recursions`: finito e ≥0 → `Math.floor`, senão `null`), grava em `months_subscribed` no INSERT/UPDATE.
**Where**: `app/api/ingress-rankings/route.ts` (modifica)
**Depends on**: T1
**Reuses**: bloco `recursionsRaw`/`recursions` já existente (linhas 184-185) como template direto
**Requirement**: NERD-28, NERD-29

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `monthsSubscribed` ausente ou inválido (não-finito, negativo) grava `NULL`, sem rejeitar a requisição (400 só pelos campos já obrigatórios hoje)
- [ ] `monthsSubscribed` válido grava o inteiro truncado
- [ ] `ON CONFLICT ... DO UPDATE` também atualiza `months_subscribed`
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): aceita monthsSubscribed opcional em POST /api/ingress-rankings`

---

### T3: `computeCommunityTotals` (P1 — totais) ✅

**What**: Função pura que recebe as linhas do ranking e devolve `{totalAgents, totalLifetimeAp, badgeTiersGranted, onyxBadgesGranted, onyxClubCount}` — soma AP, conta tiers concedidos nos 12 stats via `computeStatTiers` (excluindo `'none'`), conta agentes com os 12 stats em onyx.
**Where**: `lib/ingress-nerd-stats.mjs` (cria o arquivo), `lib/ingress-nerd-stats.test.mjs` (cria)
**Depends on**: None
**Reuses**: `computeStatTiers` (`lib/ingress-tier-score.mjs`), `RADAR_STAT_KEYS` (`lib/ingress-compare-message.mjs`)
**Requirement**: NERD-01, NERD-02, NERD-04, NERD-05, NERD-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `totalAgents`/`totalLifetimeAp` batem com soma manual num fixture de teste
- [ ] `badgeTiersGranted` exclui tier `'none'` da contagem (teste com um agente sem nenhum stat)
- [ ] `onyxClubCount` só conta agente com os 12/12 stats em onyx (teste com agente 11/12)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeCommunityTotals para a aba de estatísticas`

---

### T4: `computeFactionComparison` (P2 — facção) ✅

**What**: Função pura `{enlightened, resistance} -> {agentCount, totalAp, avgOverallScore, onyxBadges}` por facção; facção sem nenhum agente devolve zeros (nunca omite a chave).
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: None
**Reuses**: `computeStatTiers` (mesmo uso de T3, por agente da facção)
**Requirement**: NERD-08, NERD-09, NERD-10, NERD-11, NERD-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Com dado só de `enlightened`, `resistance` devolve `{agentCount: 0, totalAp: 0, avgOverallScore: 0, onyxBadges: 0}` (não `undefined`)
- [ ] Médias batem com cálculo manual num fixture com 2+ agentes por facção
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeFactionComparison para a aba de estatísticas`

---

### T5: `computeAveragesSection` (P3 — médias/distribuição)

**What**: Função pura devolvendo `{avgApPerAgent, overallScoreHistogram, communityAxisAverage, recursions: {avg, max, reportedCount}}` — histograma em 6 faixas fixas de 20 pontos sobre `overall_score`; `recursions` só entre `recursions IS NOT NULL`.
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: None
**Reuses**: `RADAR_AXES` (`lib/ingress-radar.mjs`) para os ids dos 5 eixos
**Requirement**: NERD-14, NERD-15, NERD-16, NERD-17, NERD-18, NERD-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Histograma com um agente em cada faixa (incluindo <20 e 120+) bate 1:1 com os cortes da spec
- [ ] `communityAxisAverage` é a média simples de cada eixo entre todos os agentes (fixture com 2+ agentes)
- [ ] Nenhum agente com `recursions` preenchido → `{avg: null, max: null, reportedCount: 0}` em vez de média sobre zero
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeAveragesSection para a aba de estatísticas`

---

### T6: `computeHallOfFame` (P4 — recordes)

**What**: Função pura devolvendo, para cada um dos 12 `RADAR_STAT_KEYS` + `lifetime_ap` + `recursions`, `{codenameKey, codename, value} | null` — maior valor vence, empate exato resolvido pelo `created_at` mais antigo (mesmo critério de `compareRankingRows`).
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: None
**Reuses**: `RADAR_STAT_KEYS`
**Requirement**: NERD-20, NERD-21, NERD-22, NERD-23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Empate exato num stat → agente com `created_at` mais antigo vence (teste com 2 agentes empatados)
- [ ] `recursions` recorde ignora agentes com `recursions IS NULL`
- [ ] Nenhum agente cadastrado → todos os campos `null`, sem lançar
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeHallOfFame para a aba de estatísticas`

---

### T7: `computeSeasonalEngagement` (P5 — eventos sazonais)

**What**: Função pura que soma, para cada uma das 9 chaves (`firstSaturdayEvents`, `secondSundayEvents`, `clearFieldsEvents`, `battleBeaconCombatant`, `apolloTokens`, `apolloModBattlePoints`, `seerPoints`, `xmRecharged`, `agentsRecruited`) lidas de `extra_stats`, devolvendo `{sum, reportedCount}` por chave — ausência OU valor não-numérico exclui o agente do somatório E do divisor daquela métrica especificamente (nunca vira 0).
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: None
**Reuses**: nada externo — `extra_stats` é lido cru
**Requirement**: NERD-24, NERD-25, NERD-26

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Agente sem `firstSaturdayEvents` em `extra_stats` não conta no `sum` nem no `reportedCount` dessa chave (mas conta normalmente nas outras 8, se presentes)
- [ ] Valor não-numérico (string, objeto) na chave é tratado como ausente, nunca coagido/lançado
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeSeasonalEngagement para a aba de estatísticas`

---

### T8: `computeSubscription` (P6 — assinatura paga)

**What**: Função pura devolvendo `{hasData, percentSubscribed, avgMonthsAmongSubscribed}` a partir de `months_subscribed` — `hasData: false` quando nenhum agente tem o campo preenchido; percentual é `agentes com months_subscribed > 0` sobre `agentes com months_subscribed IS NOT NULL`.
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: None
**Reuses**: nada externo
**Requirement**: NERD-30, NERD-31, NERD-32

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Todos os agentes com `months_subscribed = null` → `{hasData: false, percentSubscribed: null, avgMonthsAmongSubscribed: null}`
- [ ] Percentual e média batem com cálculo manual num fixture misto (alguns `null`, alguns `0`, alguns `>0`)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeSubscription para a aba de estatísticas`

---

### T9: `computeNerdStats` — orquestrador

**What**: Função pública `computeNerdStats(rows, totalSubmissions) -> NerdStats` que chama T3-T8 e monta o objeto único `NerdStats`; trata explicitamente `rows.length === 0` (todos os totais zerados, sem lançar).
**Where**: `lib/ingress-nerd-stats.mjs` (modifica), `lib/ingress-nerd-stats.test.mjs` (modifica)
**Depends on**: T3, T4, T5, T6, T7, T8
**Reuses**: as 6 funções das tasks anteriores
**Requirement**: NERD-03, NERD-07 (total de envios + estado vazio)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `totalSubmissions` (passado como parâmetro, não calculado aqui) aparece no objeto final sem alteração
- [ ] `rows = []` → objeto com todos os totais zerados/`null`, sem exceção
- [ ] Formato do retorno bate com o `NerdStats` do design.md
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(ingress): computeNerdStats orquestra a aba de estatísticas para nerds`

---

### T10: `NerdStatTiles` (P1 — UI)

**What**: Componente apresentacional que recebe `NerdStats['totals']` e renderiza os 6 tiles (agentes, AP total, envios, tiers concedidos por cor, Onyx concedidos, clube Onyx).
**Where**: `components/ingress/stats/NerdStatTiles.tsx`
**Depends on**: T9
**Reuses**: `fmtStat` (`lib/ingress-format.mjs`), padrão visual de tile já usado em `/stats` (`app/stats/page.tsx`) como referência de classe CSS
**Requirement**: NERD-01, NERD-02, NERD-03, NERD-04, NERD-05, NERD-06

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client` (avaliar se o componente precisa ser client — provavelmente não, é puramente apresentacional sobre props já resolvidas no servidor)

**Done when**:
- [ ] Renderiza os 6 valores sem exigir `useLang`/estado (Server Component, a menos que precise de texto bilíngue — nesse caso, client leaf mínimo como o resto de `/ingress`)
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdStatTiles — totais da comunidade`

---

### T11: `NerdFactionCompare` (P2 — UI)

**What**: Componente que recebe `NerdStats['byFaction']` e renderiza as barras divergentes (rótulo central, Enlightened cresce à esquerda em verde, Resistance à direita em azul), uma linha por métrica (agentes, AP, nota média, Onyx).
**Where**: `components/ingress/stats/NerdFactionCompare.tsx`
**Depends on**: T9
**Reuses**: `FACTION_ICON`/cores de facção já usadas em `IngressActivityFeed.tsx`
**Requirement**: NERD-08, NERD-09, NERD-10, NERD-11, NERD-12, NERD-13

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Facção zerada renderiza a barra em zero, sem omitir a linha da métrica
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdFactionCompare — comparativo Enlightened x Resistance`

---

### T12: `CommunityRadarChart` (P3 — UI, radar consolidado)

**What**: Componente SVG presentational-only (sem paste, sem comparação) que desenha o polígono do radar a partir de `Record<string,number>` (médias dos 5 eixos), reaproveitando as classes CSS `ing-radar__*` de `theme.css` para paridade visual com o radar individual de `ProfileRadar`, sem importar esse componente.
**Where**: `components/ingress/stats/CommunityRadarChart.tsx`
**Depends on**: T9
**Reuses**: classes `ing-radar__shape`/`ing-radar__ring` de `app/ingress/theme.css`; estrutura de polígono de `ProfileRadar.tsx:352-379` como referência visual (não como import)
**Requirement**: NERD-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Não importa `ProfileRadar` (verificação: nenhum `import ProfileRadar` no arquivo)
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): CommunityRadarChart — radar médio da comunidade`

---

### T13: `NerdAverages` (P3 — UI)

**What**: Componente que compõe `CommunityRadarChart` + histograma (barras SVG simples) + bloco de recursões (média/máximo/"sem dados suficientes"), a partir de `NerdStats['averages']`.
**Where**: `components/ingress/stats/NerdAverages.tsx`
**Depends on**: T12
**Reuses**: `CommunityRadarChart` (T12), padrão de barra do histograma inspirado em `AgentHistoryChart.tsx`
**Requirement**: NERD-14, NERD-15, NERD-16, NERD-17, NERD-18, NERD-19

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `recursions.reportedCount === 0` renderiza "sem dados suficientes" em vez de `null`/`NaN`
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdAverages — médias, histograma e radar consolidado`

---

### T14: `NerdHallOfFame` (P4 — UI)

**What**: Componente que lista os 12 recordes por stat + AP + recursões a partir de `NerdStats['hallOfFame']`, cada linha com codinome + valor (ou "-" quando `null`).
**Where**: `components/ingress/stats/NerdHallOfFame.tsx`
**Depends on**: T9
**Reuses**: `RADAR_AXES` para rótulos/agrupamento por eixo dos 12 stats
**Requirement**: NERD-20, NERD-21, NERD-22, NERD-23

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Entrada `null` (0 agentes) renderiza um placeholder, não quebra
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdHallOfFame — recordes por stat`

---

### T15: `NerdSeasonalEngagement` (P5 — UI)

**What**: Componente que lista as 9 métricas sazonais a partir de `NerdStats['seasonalEngagement']`, cada uma com soma + "N agentes informaram", mais um aviso fixo de que os números são parciais.
**Where**: `components/ingress/stats/NerdSeasonalEngagement.tsx`
**Depends on**: T9
**Reuses**: nada externo além de `fmtStat`
**Requirement**: NERD-24, NERD-25, NERD-26, NERD-27

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Aviso de "dado parcial" sempre visível na seção (não condicional)
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdSeasonalEngagement — engajamento em eventos sazonais`

---

### T16: `NerdSubscription` (P6 — UI)

**What**: Componente que renderiza `%` e média de `NerdStats['subscription']`, ou "sem dados suficientes" quando `hasData === false`.
**Where**: `components/ingress/stats/NerdSubscription.tsx`
**Depends on**: T9
**Reuses**: nada externo
**Requirement**: NERD-30, NERD-31, NERD-32

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `hasData: false` nunca renderiza "0%"
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): NerdSubscription — assinatura paga`

---

### T17: `IngressNerdStats` — orquestrador visual

**What**: Componente que recebe `NerdStats | null` inteiro e renderiza as 6 seções (T10-T11, T13-T16) em ordem, ou o painel "Sinal perdido" quando `stats === null` ou `stats.totals.totalAgents === 0`.
**Where**: `components/ingress/stats/IngressNerdStats.tsx`
**Depends on**: T10, T11, T13, T14, T15, T16
**Reuses**: padrão `Panel label="Sinal perdido"` de `app/ingress/ranking/page.tsx:164-170`
**Requirement**: NERD-07 (estado vazio) + integra todas as anteriores

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `stats === null` e `stats.totals.totalAgents === 0` renderizam o mesmo estado vazio (não dois tratamentos diferentes)
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint`

**Tests**: none
**Gate**: Full

**Commit**: `feat(ingress): IngressNerdStats — orquestra as seções da aba`

---

### T18: Integração final — SSR + terceira aba

**What**: Adiciona `loadNerdStats()` a `app/ingress/ranking/page.tsx` (SELECT sem `LIMIT` em `casara.ingress_rankings`, incluindo `months_subscribed`, + `COUNT(*)` de `casara.ingress_ranking_history`, chamando `computeNerdStats`); `IngressRankingTabs` ganha a aba `'nerd'` (terceiro botão + só monta `IngressNerdStats` quando ativa, mesmo padrão de `'ranking'`/`'activity'`).
**Where**: `app/ingress/ranking/page.tsx` (modifica), `components/ingress/stats/IngressRankingTabs.tsx` (modifica)
**Depends on**: T17, T1
**Reuses**: `loadInitialRows`/`loadInitialActivity` como template do `try/catch` de `loadNerdStats`; estrutura de `role="tablist"` já existente em `IngressRankingTabs`
**Requirement**: Success Criteria da spec (aba aparece, carrega sem poll, sem round-trip extra)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `loadNerdStats` degrada para `null` em erro de conexão, sem derrubar a página (mesmo padrão das duas funções irmãs)
- [ ] Só a aba ativa fica montada (continua vendo `tab === 'ranking' ? ... : tab === 'activity' ? ... : ...`)
- [ ] `npm run build` conclui sem erro
- [ ] Gate check passa: `npm test && npx tsc --noEmit && npm run lint && npm run build`

**Tests**: none
**Gate**: Build

**Commit**: `feat(ingress): liga a aba "Estatísticas para Nerds" em /ingress/ranking`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2

Phase 2:  T3 → T9
          T4 → T9
          T5 → T9
          T6 → T9
          T7 → T9
          T8 → T9

Phase 3:  T9 → T10
          T9 → T11
          T9 → T12 → T13
          T9 → T14
          T9 → T15
          T9 → T16

Phase 4:  T10 → T17
          T11 → T17
          T13 → T17
          T14 → T17
          T15 → T17
          T16 → T17
          T17 → T18
          T1  → T18
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Migration months_subscribed | 1 arquivo SQL | ✅ Granular |
| T2: POST aceita monthsSubscribed | 1 rota, 1 campo novo | ✅ Granular |
| T3: computeCommunityTotals | 1 função pura | ✅ Granular |
| T4: computeFactionComparison | 1 função pura | ✅ Granular |
| T5: computeAveragesSection | 1 função pura | ✅ Granular |
| T6: computeHallOfFame | 1 função pura | ✅ Granular |
| T7: computeSeasonalEngagement | 1 função pura | ✅ Granular |
| T8: computeSubscription | 1 função pura | ✅ Granular |
| T9: computeNerdStats | 1 função (orquestra as 6 anteriores) | ✅ Granular |
| T10: NerdStatTiles | 1 componente | ✅ Granular |
| T11: NerdFactionCompare | 1 componente | ✅ Granular |
| T12: CommunityRadarChart | 1 componente | ✅ Granular |
| T13: NerdAverages | 1 componente (compõe T12) | ✅ Granular |
| T14: NerdHallOfFame | 1 componente | ✅ Granular |
| T15: NerdSeasonalEngagement | 1 componente | ✅ Granular |
| T16: NerdSubscription | 1 componente | ✅ Granular |
| T17: IngressNerdStats | 1 componente (orquestra 6 seções) | ✅ Granular |
| T18: Integração final | 2 arquivos, 1 concern só (ligar a aba) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ----------------------- | -------------- | ------ |
| T1 | None | (nenhuma seta de entrada) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | (nenhuma seta de entrada) | ✅ Match |
| T4 | None | (nenhuma seta de entrada) | ✅ Match |
| T5 | None | (nenhuma seta de entrada) | ✅ Match |
| T6 | None | (nenhuma seta de entrada) | ✅ Match |
| T7 | None | (nenhuma seta de entrada) | ✅ Match |
| T8 | None | (nenhuma seta de entrada) | ✅ Match |
| T9 | T3, T4, T5, T6, T7, T8 | T3/T4/T5/T6/T7/T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T9 | T9 → T11 | ✅ Match |
| T12 | T9 | T9 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T9 | T9 → T14 | ✅ Match |
| T15 | T9 | T9 → T15 | ✅ Match |
| T16 | T9 | T9 → T16 | ✅ Match |
| T17 | T10, T11, T13, T14, T15, T16 | T10/T11/T13/T14/T15/T16 → T17 | ✅ Match |
| T18 | T17, T1 | T17 → T18 (T1 já concluído na Phase 1, cruza fases — dependência real, sem ciclo) | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ----------------------------- | ----------------- | ---------- | ------ |
| T1 | Migration SQL | none | none | ✅ OK |
| T2 | API route | none | none | ✅ OK |
| T3 | Domain logic (`lib/*.mjs`) | unit | unit | ✅ OK |
| T4 | Domain logic | unit | unit | ✅ OK |
| T5 | Domain logic | unit | unit | ✅ OK |
| T6 | Domain logic | unit | unit | ✅ OK |
| T7 | Domain logic | unit | unit | ✅ OK |
| T8 | Domain logic | unit | unit | ✅ OK |
| T9 | Domain logic | unit | unit | ✅ OK |
| T10 | React component | none | none | ✅ OK |
| T11 | React component | none | none | ✅ OK |
| T12 | React component | none | none | ✅ OK |
| T13 | React component | none | none | ✅ OK |
| T14 | React component | none | none | ✅ OK |
| T15 | React component | none | none | ✅ OK |
| T16 | React component | none | none | ✅ OK |
| T17 | React component | none | none | ✅ OK |
| T18 | SSR page + React component | none | none | ✅ OK |

---

## Tips

(seção de referência da skill, não repetida aqui)

---

## Task Verification Standards

(seção de referência da skill, não repetida aqui — cada task acima já segue `Done when` + `Tests` + `Gate`)
