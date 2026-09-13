# Ingress Ranking Country Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/ingress-ranking-country/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling (`lib/ingress-rankings.test.mjs` e os demais `lib/ingress-*.test.mjs`, `package.json`). Guidelines found: nenhum `AGENTS.md`/`CONTRIBUTING.md` no repo — sem guideline formal escrito.
>
> **Floor observado (não é hipótese, é o estado real do repo em toda feature anterior de Ingress/livros/dinâmicas):** só a camada de lógica pura `.mjs` tem testes automatizados (`node --test`). Nenhum componente React e nenhuma rota `app/api/**/route.ts` do projeto tem teste automatizado — validação é manual (smoke test contra o banco real, ou uso da tela), documentada no Handoff (`.specs/STATE.md`) em vez de um arquivo de teste. Elevar essas duas camadas para testes automatizados introduziria infraestrutura nova (test runner de componente, cliente HTTP de teste) não pedida por esta feature e inconsistente com o resto do projeto — por isso a Coverage Expectation abaixo segue o floor real, com validação manual explícita no `Done when` de cada task dessas camadas.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / lógica pura (`lib/*.mjs`) | unit | Todos os branches de `isValidCountryCode`/`normalizeCountryCode`; 1:1 com RKCTY-04/05 | `lib/ingress-countries.test.mjs` | `npm test` |
| Dado estático / config (`lib/ingress/countries.json`, `lib/schema.sql`, `lib/migrations/*.sql`) | none | build gate only | — | `npm run build` |
| Script gerador one-off (`scripts/gen-ingress-countries.mjs`) | none | build gate only (mesmo floor de `scripts/livros.mjs`, também sem teste) | — | `npm run lint` |
| Rota API (`app/api/ingress-rankings/route.ts`) | none (floor real do projeto) | build gate + validação manual documentada no `Done when` | — | `npm run build` |
| Componente React (`CountryPicker.tsx`, `ProfileRadar.tsx`, `StatsRadarSection.tsx`, `IngressRankingTable.tsx`, `page.tsx`) | none (floor real do projeto) | build gate + validação manual documentada no `Done when` | — | `npm run build` |

## Gate Check Commands

> Generated from `package.json` scripts (`dev`, `build`, `lint`, `test`) — confirmar antes do Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks que só tocam `lib/*.mjs` (lógica pura com teste unitário) | `npm test` |
| Build | Depois de qualquer task que toque componentes React, rotas de API, schema SQL, ou ao fechar cada fase | `npm run lint && npm run build && npm test` |

Não existe gate "full" (e2e/integration) configurado neste repo — não há Playwright nem cliente HTTP de teste instalado como dependência de teste automatizado.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Dado e lógica pura

```
T1 → T2
```

### Phase 2: Schema

```
T3
```

### Phase 3: API

```
T4, T5, T6
```

(Ordem de execução dentro da fase; as dependências reais entre tasks estão listadas na seção "Phase Execution Map" abaixo.)

### Phase 4: Componente novo

```
T7
```

### Phase 5: Integração no formulário de submissão

```
T8 → T9
```

### Phase 6: Exibição na tabela

```
T10
```

---

## Task Breakdown

### T1: Gerar dado estático de países + assets de bandeira ✅ Done

**What**: Criar `scripts/gen-ingress-countries.mjs` (script one-off, Node puro) que usa `i18n-iso-countries` para produzir `lib/ingress/countries.json` (250 entradas `{code, namePt, nameEn}`, ordenado por `namePt`) e copia os SVGs 4×3 de `flag-icons` para `public/ingress/flags/<cc>.svg` (código em minúsculas). Adicionar `i18n-iso-countries` e `flag-icons` como `devDependencies` em `package.json`. Rodar o script uma vez e versionar os artefatos gerados.
**Where**: `scripts/gen-ingress-countries.mjs`, `package.json`, `lib/ingress/countries.json` (gerado), `public/ingress/flags/*.svg` (gerado)
**Depends on**: None
**Reuses**: Estilo de comentário/estrutura de `scripts/livros.mjs` (script CLI Node puro, devDependency usada só ali)
**Requirement**: RKCTY-01 (fonte de dado para filtro+bandeira)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `lib/ingress/countries.json` existe com exatamente 250 entradas, cada uma com `code` (2 letras maiúsculas), `namePt`, `nameEn`
- [x] `public/ingress/flags/` contém um `.svg` por código de `countries.json` (mesma contagem)
- [x] `package.json` lista `i18n-iso-countries` e `flag-icons` em `devDependencies`
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T2: Lógica pura de validação de país ✅ Done

**What**: Criar `lib/ingress-countries.mjs` exportando `normalizeCountryCode(code)` (trim + uppercase, mesmo padrão de `normalizeCodenameKey`), `isValidCountryCode(code)` (contra um `Set` construído de `countries.json`) e `COUNTRIES` (reexport do JSON). Criar `lib/ingress-countries.test.mjs` cobrindo os dois branches de `isValidCountryCode` (válido/inválido) e a normalização (trim, lower→upper, vazio/ausente).
**Where**: `lib/ingress-countries.mjs`, `lib/ingress-countries.test.mjs`
**Depends on**: T1
**Reuses**: `lib/ingress-rankings.mjs` (modelo direto de função pura + teste, ver `lib/ingress-rankings.test.mjs`)
**Requirement**: RKCTY-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `isValidCountryCode('BR')` e `isValidCountryCode('br')`-normalizado retornam `true`; um código de 2 letras fora da lista (ex. `'ZZ'`) e um código malformado (ex. `'BRA'`, `''`, `undefined`) retornam `false`
- [x] `normalizeCountryCode` replica o comportamento de `normalizeCodenameKey` para trim/caixa, mas para uppercase
- [x] Gate check passa: `npm test`
- [x] Test count: 5 novos testes passam (393 no total, nenhuma deleção silenciosa dos testes já existentes)

**Tests**: unit
**Gate**: quick

---

### T3: Migração de schema — coluna `country_code` ✅ Done

**What**: Criar `lib/migrations/003-ingress-ranking-country.sql` com `ALTER TABLE casara.ingress_rankings ADD COLUMN IF NOT EXISTS country_code CHAR(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');`, seguindo o estilo de comentário de `lib/migrations/001-schema-casara.sql` (contexto + o que faz + o que não toca). Atualizar `lib/schema.sql` para que a `CREATE TABLE casara.ingress_rankings` de uma instalação nova já inclua a coluna e o `CHECK`.
**Where**: `lib/migrations/003-ingress-ranking-country.sql`, `lib/schema.sql`
**Depends on**: None
**Reuses**: Estilo de `lib/migrations/001-schema-casara.sql`
**Requirement**: RKCTY-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `lib/migrations/003-ingress-ranking-country.sql` existe, é idempotente (`ADD COLUMN IF NOT EXISTS`) e não reescreve nenhuma linha existente
- [x] `lib/schema.sql` reflete o estado final da tabela (coluna presente numa instalação nova)
- [x] Esta task **não** roda a migração em produção — isso fica para um passo manual explícito, com autorização, depois de T4-T6 estarem prontos
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T4: `POST /api/ingress-rankings` exige e grava país ✅ Done

**What**: Estender `app/api/ingress-rankings/route.ts` para ler `countryCode` do body, normalizar via `normalizeCountryCode`, responder 400 (sem gravar linha) se ausente ou `!isValidCountryCode(...)`, e incluir a coluna `country_code` no `INSERT ... ON CONFLICT DO UPDATE` existente.
**Where**: `app/api/ingress-rankings/route.ts` (função `POST`)
**Depends on**: T2, T3
**Reuses**: Validações já existentes no mesmo handler (`codename`/`faction`/`lifetimeAp`) como modelo de estilo
**Requirement**: RKCTY-04, RKCTY-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Um POST sem `countryCode`, ou com um valor que não é um código válido, recebe 400 e nenhuma linha é gravada/atualizada — confirmado manualmente via `curl` contra `npm run dev`: sem `countryCode` e com `"ZZ"` (fora da lista) ambos retornam 400 com a mensagem esperada, sem chegar a nenhuma query SQL
- [x] Um POST com `countryCode` válido inclui `country_code` no `INSERT`/`ON CONFLICT DO UPDATE` (código implementado e revisado); a escrita real só é testável depois que a migração `003-ingress-ranking-country.sql` for aplicada em produção (autorização pendente, ver seção final deste arquivo) — confirmado que, sem a coluna em produção ainda, o mesmo POST com `countryCode: "BR"` chega a tentar o INSERT e falha no banco (500 "internal error"), não na validação, prova de que o caminho de validação->SQL está correto
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T5: `GET /api/ingress-rankings` devolve país ✅ Done

**What**: Estender a função `GET` do mesmo arquivo para incluir `country_code` no `SELECT` e no objeto serializado da resposta (`rows`).
**Where**: `app/api/ingress-rankings/route.ts` (função `GET`)
**Depends on**: T3
**Reuses**: Serialização já existente no mesmo `GET`
**Requirement**: RKCTY-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GET /api/ingress-rankings` inclui `country_code` (string ou `null`) em cada item de `rows` — mesma ressalva de T4: só funciona contra o banco real depois que a migração pendente for aplicada em produção
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T6: SSR inicial de `/ingress/ranking` devolve país ✅ Done

**What**: Estender `loadInitialRows()` em `app/ingress/ranking/page.tsx` para incluir `country_code` no `SELECT` e no objeto `RankingRow` retornado (mesmo formato do T5, para a consulta SSR direta ao banco).
**Where**: `app/ingress/ranking/page.tsx`
**Depends on**: T3
**Reuses**: A mesma query SQL de T5 como referência de colunas selecionadas
**Requirement**: RKCTY-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `loadInitialRows()` inclui `country_code` no `SELECT` e no objeto mapeado para `RankingRow[]`
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T7: Componente `CountryPicker` ✅ Done

**What**: Criar `components/ingress/CountryPicker.tsx` — combobox controlado (`id`, `value: string | null`, `onChange: (code: string | null) => void`, `invalid?: boolean`) com filtro por digitação (nome PT/EN ou código, sem diferenciar caixa/acento — normalizar via `.normalize('NFD').replace(...)` antes de comparar), lista de opções com bandeira (`<img src="/ingress/flags/<cc>.svg">`) ao lado de cada nome, navegação por teclado (setas para mover, Enter para selecionar, Esc para fechar), e a bandeira do país escolhido visível no próprio campo depois de selecionado. Bilíngue via `useLang()`, seguindo o padrão `T = {pt, en}` do resto de `components/ingress/`.
**Where**: `components/ingress/CountryPicker.tsx`
**Depends on**: T1
**Reuses**: Padrão bilíngue `T = {pt, en}`; classes `ing-radar__btn`/`ing-radar__textarea` como base visual
**Requirement**: RKCTY-01, RKCTY-02

**Tools**:

- MCP: NONE
- Skill: `nextjs-use-client` (componente novo interativo — confirmar que o `"use client"` fica só nesta folha, não sobe para o pai)

**Done when**:

- [x] Digitar no campo filtra a lista por nome (PT quando `lang==='pt'`, EN quando `lang==='en'`) ou código, sem diferenciar maiúsculas/minúsculas nem acentos — implementado via `fold()` (NFD + strip diacritics + lowercase)
- [x] Cada opção da lista mostra a bandeira correspondente
- [x] Selecionar uma opção chama `onChange(code)` e preenche o campo com o nome do país escolhido, mostrando a bandeira no campo
- [x] Apagar o texto do campo já preenchido chama `onChange(null)` (qualquer edição do texto enquanto havia seleção já invalida, não só apagar tudo — mais amplo que o mínimo pedido)
- [x] Navegação por teclado funciona: seta para baixo/cima move o item ativo, Enter seleciona, Esc fecha a lista sem selecionar
- [x] `invalid={true}` aplica um estado visual de erro (borda), sem exigir nenhuma outra prop
- [x] Validação manual: sem harness de isolamento de componente neste projeto (sem Storybook); a verificação visual/interativa fica para o Luiz testar na tela em `/ingress/ranking` depois de T8 integrar o componente (preferência já registrada — não faço verificação visual automática no navegador)
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T8: Integrar `CountryPicker` e validação obrigatória em `ProfileRadar` ✅ Done

**What**: Em `components/ingress/ProfileRadar.tsx`: estender `type Agent` com `countryCode?: string`; adicionar estados `countryA`/`countryB` (`string | null`, iniciam `null`, resetados em `clear()`); renderizar um `<CountryPicker>` abaixo de cada textarea visível, só quando `variant === 'ranking'` (textarea A sempre; textarea B só quando `mode === 'two'`); em `runCompare`, antes do `try` de parse existente, se `variant === 'ranking'` e faltar país para qualquer agente que será submetido (considerando o mesmo remapeamento que o texto já sofre entre os modos `vs-me`/`two`/`solo`), setar `error` com uma mensagem bilíngue nova e `return` sem chamar `onCompare`; quando a validação passa, incluir `countryCode` nos objetos `Agent` montados (`a`/`b`), aplicando o mesmo remapeamento.
**Where**: `components/ingress/ProfileRadar.tsx`
**Depends on**: T7
**Reuses**: Estados/handlers já existentes (`textA`/`textB`/`setTextA`/`setTextB`, `clear`, `runCompare`, o bloco `T`/`T.pt`/`T.en` de textos, o `<p className="ing-radar__compare-error">` já existente para exibir `error`)
**Requirement**: RKCTY-02, RKCTY-03, RKCTY-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Em `variant === 'ranking'`, o campo de país aparece abaixo de cada textarea visível (A sempre, B só em modo `two`); em `variant === 'default'` (uso em `/ingress`) nenhum seletor aparece — condicionado por `variant === 'ranking'` no JSX
- [x] Clicar "Comparar"/"Enviar" sem ter escolhido país para um agente que seria submetido não chama `onCompare` e mostra a mensagem de erro bilíngue no lugar já usado por erros de parse — bloqueio no topo de `runCompare`, antes do `try` de parse
- [x] Escolher o(s) país(es) e clicar de novo funciona normalmente, e o `Agent` passado a `onCompare` carrega o `countryCode` certo — inclusive o remapeamento do modo `vs-me` (o país do campo A vai para o agente `b`, não `a`) — revisado linha a linha contra o remapeamento de texto já existente
- [x] `clear()` reseta `countryA`/`countryB` para `null`
- [x] Validação manual: revisão de código completa + gate de build/lint verde; a verificação visual/interativa dos três modos em `/ingress/ranking` fica para o Luiz testar na tela (preferência já registrada — não abro o navegador para conferir visualmente)
- [x] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T9: `StatsRadarSection` envia `countryCode` no POST

**What**: Em `components/ingress/stats/StatsRadarSection.tsx`, incluir `countryCode: agent.countryCode ?? ''` no body do `fetch('/api/ingress-rankings', ...)` dentro de `postAgent`.
**Where**: `components/ingress/stats/StatsRadarSection.tsx`
**Depends on**: T8
**Reuses**: `postAgent` já existente
**Requirement**: RKCTY-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O body do POST inclui `countryCode` vindo do `Agent` recebido de `ProfileRadar`
- [ ] Validação manual: submeter um agente de teste em `/ingress/ranking` e confirmar (via T4's checagem, ou pela linha aparecer com bandeira depois de T10) que o país chega gravado
- [ ] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

### T10: Coluna de bandeira em `IngressRankingTable`

**What**: Em `components/ingress/stats/IngressRankingTable.tsx`: estender `RankingRow` com `country_code: string | null`; adicionar `<th data-col="country">` (ícone/label acessível, mesmo padrão da coluna `faction` existente) e a célula correspondente, renderizando `<img src="/ingress/flags/<code.toLowerCase()>.svg" alt={countryName} title={countryName} width={20} height={15}>` quando `country_code` existe (nome do país vindo de um lookup em `lib/ingress/countries.json` pelo `lang` ativo), e uma célula vazia quando `country_code` é `null`.
**Where**: `components/ingress/stats/IngressRankingTable.tsx`
**Depends on**: T5, T6, T7
**Reuses**: Padrão visual/acessível já usado para a coluna `faction` (`FACTION_ICON`, `<th aria-label>`)
**Requirement**: RKCTY-07, RKCTY-08, RKCTY-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Uma linha com `country_code` preenchido mostra a bandeira certa, com `alt`/`title` no nome do país no idioma ativo
- [ ] Uma linha com `country_code: null` mostra a célula vazia, sem ícone quebrado nem erro de console
- [ ] As colunas e a ordenação já existentes continuam inalteradas — a coluna de país é só adicionada
- [ ] Validação manual: `/ingress/ranking` renderiza corretamente tanto uma linha com país (a submetida em T9) quanto qualquer linha legada sem país
- [ ] Gate check passa: `npm run build`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

Phases run in sequence (1→2→3→4→5→6); dentro de cada fase as tasks também executam em ordem. As setas abaixo são exatamente as dependências reais declaradas em cada task (`Depends on`), incluindo as que cruzam fases:

```
T1 → T2
T1 → T7
T2 → T4
T3 → T4
T3 → T5
T3 → T6
T7 → T8
T7 → T10
T8 → T9
T5 → T10
T6 → T10
```

Leitura por fase (ordem de execução, não necessariamente dependência):

```
Phase 1:  T1, T2
Phase 2:  T3
Phase 3:  T4, T5, T6
Phase 4:  T7
Phase 5:  T8, T9
Phase 6:  T10
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Gerar dado + assets de bandeira | 1 script + 2 conjuntos de artefatos gerados por ele | ✅ Granular (1 deliverable coeso: a fonte de dado) |
| T2: Lógica pura de validação | 1 módulo + seu teste | ✅ Granular |
| T3: Migração de schema | 2 arquivos SQL diretamente relacionados (migração + schema-alvo) | ✅ Granular (mesma mudança, dois lugares) |
| T4: POST valida e grava país | 1 função (`POST`) em 1 arquivo | ✅ Granular |
| T5: GET devolve país | 1 função (`GET`) no mesmo arquivo, mudança independente do T4 | ✅ Granular |
| T6: SSR devolve país | 1 função em 1 arquivo | ✅ Granular |
| T7: Componente `CountryPicker` | 1 componente novo | ✅ Granular |
| T8: Integração no `ProfileRadar` | 1 componente (mudança coesa: estado + render + validação, todas a mesma responsabilidade "país no formulário") | ✅ Granular (coesivo, ver regra "2-3 coisas relacionadas no mesmo arquivo = OK") |
| T9: `StatsRadarSection` envia país | 1 função (`postAgent`) em 1 arquivo | ✅ Granular |
| T10: Coluna na tabela | 1 componente | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (nenhuma seta entrante) | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | None | (nenhuma seta entrante) | ✅ Match |
| T4 | T2, T3 | T2→T4, T3→T4 | ✅ Match |
| T5 | T3 | T3→T5 | ✅ Match |
| T6 | T3 | T3→T6 | ✅ Match |
| T7 | T1 | T1→T7 | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T5, T6, T7 | T5→T10, T6→T10, T7→T10 | ✅ Match |

Nenhuma task depende de uma task de fase posterior — todas as dependências apontam para fases já concluídas ou para a task anterior dentro da mesma fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Gerar dado + assets | Dado estático / config | none | none | ✅ OK |
| T2: Lógica pura de validação | Domain / lógica pura | unit | unit | ✅ OK |
| T3: Migração de schema | Dado estático / config | none | none | ✅ OK |
| T4: POST valida e grava país | Rota API | none (floor do projeto) | none | ✅ OK |
| T5: GET devolve país | Rota API | none (floor do projeto) | none | ✅ OK |
| T6: SSR devolve país | Componente React (Server Component) | none (floor do projeto) | none | ✅ OK |
| T7: Componente `CountryPicker` | Componente React | none (floor do projeto) | none | ✅ OK |
| T8: Integração no `ProfileRadar` | Componente React | none (floor do projeto) | none | ✅ OK |
| T9: `StatsRadarSection` envia país | Componente React | none (floor do projeto) | none | ✅ OK |
| T10: Coluna na tabela | Componente React | none (floor do projeto) | none | ✅ OK |

Nenhuma violação — apenas T2 tem `Tests: unit`, exatamente onde a matriz exige (lógica pura).

---

## Autorização pendente (fora das tasks)

Depois de T3-T6 estarem implementadas e o gate de build passar, a migração `lib/migrations/003-ingress-ranking-country.sql` precisa ser **aplicada manualmente em produção no Neon**, com autorização explícita antes de rodar — mesmo processo já usado para criar `casara.ingress_rankings` originalmente. Isto NÃO é uma task de código; é um passo operacional que será proposto separadamente quando o código estiver pronto.
