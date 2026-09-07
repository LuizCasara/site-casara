# Ingress — Perfil de Agente Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and
follow its Execute flow and Critical Rules.** Do not search for skill files by
filesystem path. The skill is the source of truth for the full flow (per-task
cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed
without it.**

---

**Design**: `.specs/features/ingress/design.md`
**Status**: In Progress (aprovado 2026-09-07; execução inline, fase a fase)

**Validação estrutural:** `validate_tasks.py` → 0 erros. Warnings restantes: 17×
"Tests: none" (todos confirmados pela Test Coverage Matrix — camadas React/CLI/
imagem não têm infra de teste no projeto) + 1× "Where multiplos arquivos" em T7
(JSON semente + loader coeso, um commit só).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute.
> Guidelines found: `CLAUDE.md` (project conventions; diz "no test suite" mas
> está desatualizado — `package.json` tem `test: node --test "lib/**/*.test.mjs"`
> e há ~30 arquivos `lib/*.test.mjs` adicionados no trabalho de `/livros`).
> Amostras: `lib/book-utils.test.mjs`, `lib/bookshelf-model.test.mjs`,
> `lib/cor-lombada.test.mjs`, `lib/coisas-da-sala.test.mjs`,
> `lib/book-status.test.mjs`. Nenhum teste de componente React ou de rota existe
> no projeto — a verificação de UI é build + lint + olho humano (o Luiz valida na
> tela; ver memória "Sem verificação visual automática").

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura de domínio (`lib/ingress-*.mjs`: stats, badges, radar, profile, s2) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `lib/ingress-*.test.mjs` | `npm test` |
| Loader / tipos Next (`lib/ingress.ts`) | none | build gate (o runner `node --test` só roda `.mjs`; nenhum `.ts` é testado no projeto) | `lib/ingress.ts` | build gate |
| CLI (`scripts/ingress.mjs`) | none | build gate — toda a lógica não-I/O é extraída para `lib/ingress-profile.mjs` (que É testada); o script só orquestra fs + prompt, igual `scripts/livros.mjs` | `scripts/ingress.mjs` | build gate |
| Dado (`data/ingress/fencherlc.json`) | none | build gate — o loader valida `schemaVersion` em runtime | `data/ingress/*.json` | build gate |
| Componentes React (`app/ingress/**`, `components/ingress/**`) | none | build gate (`next build` + `next lint`); sem infra de teste de componente no projeto | `app/ingress/**`, `components/ingress/**` | build gate |
| OpenGraph image (`app/ingress/opengraph-image.tsx`) | none | build gate | `app/ingress/opengraph-image.tsx` | build gate |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks que só criam/alteram `lib/ingress-*.mjs` | `npm test` |
| Full | Igual ao Quick (não há e2e/integration neste projeto) | `npm test` |
| Build | Depois de tasks de componente, CLI, config, dado, ou fim de fase | `npm run lint && npm test && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next
begins, and tasks within a phase execute in order.

Ordem de execução dentro da fase: T1..T7, T8..T13, etc. (sequencial). Os blocos
abaixo mostram só as **dependências reais de dado** (arestas do DAG); tasks sem
aresta não dependem de nada além da ordem sequencial.

### Phase 1: Fundação — dependências, dado e lógica pura

Ordem: T1 · T2 · T3 · T4 · T5 · T6 · T7

```
T2 -> T5
T1 -> T6
T2 -> T7
T5 -> T7
```

### Phase 2: Página base e seções server (Direção "Scanner")

Ordem: T8 · T9 · T10 · T11 · T12 · T13

```
T7 -> T8
T8 -> T9
T9 -> T10
T9 -> T11
T3 -> T12
T9 -> T12
T9 -> T13
```

### Phase 3: Gráficos e explorador S2

Ordem: T14 · T15 · T16 · T17 · T18

```
T4 -> T14
T9 -> T14
T9 -> T15
T6 -> T16
T9 -> T16
T6 -> T17
T16 -> T17
T9 -> T18
```

### Phase 4: Compartilhamento, CLI e integração final

Ordem: T19 · T20 · T21 · T22 · T23

```
T5 -> T19
T7 -> T20
T8 -> T21
T11 -> T22
T10 -> T23
T11 -> T23
T12 -> T23
T13 -> T23
T14 -> T23
T15 -> T23
T16 -> T23
T17 -> T23
T18 -> T23
T22 -> T23
```

---

## Task Breakdown

### T1: Adicionar dependências de S2 e mapa

**What**: Adicionar `s2js`, `leaflet`, `react-leaflet` a `dependencies` e
`@types/leaflet` a `devDependencies`, instalar, e confirmar que o lockfile
atualiza sem erro.
**Where**: `package.json`
**Depends on**: None
**Reuses**: —
**Requirement**: INGR-25, INGR-28

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] As 4 dependências aparecem em `package.json` com versão pinada (`s2js@^1.44`,
      `leaflet@^1.9`, `react-leaflet@^5`, `@types/leaflet@^1.9`)
- [x] `npm install` conclui sem erro; `package-lock.json` atualizado
- [x] `npm run build` ainda passa (nenhum import novo ainda)
- [x] Gate check passes: `npm run lint && npm test && npm run build` (lint ✔, 256 testes ✔, build ✔)

**Tests**: none
**Gate**: build
**Commit**: `chore(ingress): adiciona s2js, leaflet e react-leaflet`
**Status**: ✅ Complete

---

### T2: `lib/ingress-stats.mjs` — colunas, grupos e parser do export

**What**: Fonte única do mapeamento coluna-do-export → chave estável/label
pt-BR/grupo/formato, a ordem dos grupos, e `parseAppExport(tsvText)` que valida e
converte a linha `ALL TIME` num objeto `{ agent, capturedAt, stats }`.
**Where**: `lib/ingress-stats.mjs`
**Depends on**: None
**Reuses**: padrão de `lib/coisas-da-sala.mjs` (lista em arquivo único);
`docs/ingress-perfil-fencherlc.md` (cabeçalho TSV e valores de referência)
**Requirement**: INGR-02, INGR-06, INGR-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `STAT_COLUMNS` cobre as 62 colunas do cabeçalho do export, cada uma com
      `col`, `key` (camelCase), `label`, `group`, `kind` (`meta`|`identity`|`stat`)
- [x] `STAT_GROUPS` define AP/XM, portais, links/campos, hacking, drones,
      Machina, exploração/eventos, scanner/OPR/Scout (8 grupos — spec AC atualizada)
- [x] `parseAppExport` casa colunas **por nome no cabeçalho** (não por posição);
      normaliza números (separador de milhar, aspas); lança `Error` com
      linha/contagem se o nº de colunas diverge ou falta a linha de dados;
      coluna desconhecida vira warning, não erro
- [x] Testes: parsing do TSV real de 07/09 bate com `docs/ingress-perfil-fencherlc.md`;
      export com coluna faltando → erro; número com `.`/aspas → convertido;
      cabeçalho reordenado → ainda parseia
- [x] Gate check passes: `npm test` (265 testes ✔)
- [x] Test count: 9 tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ingress): mapa de estatísticas e parser do export do app`
**Status**: ✅ Complete

---

### T3: `lib/ingress-badges.mjs` — tabela de tiers e cálculo

**What**: `BADGES[]` com os limiares **oficiais** de cada tier
(Bronze/Silver/Gold/Platinum/Onyx) transcritos da wiki do Ingress, e
`computeBadge` / `computeAllBadges` que derivam o tier atual e o que falta para o
próximo a partir de um valor de estatística.
**Where**: `lib/ingress-badges.mjs`
**Depends on**: None
**Reuses**: chaves de `lib/ingress-stats.mjs` (referência de `statKey`)
**Requirement**: INGR-12, INGR-13, INGR-14, INGR-15, INGR-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `BADGES` cobre 14 medalhas (Builder, Connector, Mind Controller,
      Illuminator, Liberator, Pioneer, Explorer, Trekker, Purifier, Hacker,
      Sojourner, Recharger, Engineer, SpecOps), `statKey` válido, `tiers` de 5
- [x] Cada limiar transcrito da Fev Games (comentário com a URL da fonte)
- [x] `computeBadge` retorna `{ tier, atMax, next: {tier, remaining} | null }`;
      valor 0 → `tier: 'none'`; valor ≥ Onyx → `atMax: true`, `next: null`
- [x] `computeAllBadges(stats)` omite badge cuja `statKey` não está em `stats`
- [x] Testes: limiar exato → aquele tier; um a menos → o anterior; acima de Onyx
      → `atMax`; `statKey` ausente → omitida; números reais do FencherLC → tiers
- [x] Gate check passes: `npm test` (274 testes ✔)
- [x] Test count: 9 tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ingress): tabela de badges e cálculo de tier`
**Status**: ✅ Complete

---

### T4: `lib/ingress-radar.mjs` — eixos do radar do perfil

**What**: `RADAR_AXES[]` (cada eixo = soma de 1+ stats / referência em código) e
`computeRadarAxes(stats)` → `[{ id, label, raw, value 0..1 }]`.
**Where**: `lib/ingress-radar.mjs`
**Depends on**: None
**Reuses**: chaves de `lib/ingress-stats.mjs`
**Requirement**: INGR-21, INGR-23, INGR-24

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `RADAR_AXES` define construção, destruição, exploração, hacking,
      links/campos — cada um com `statKeys` e `reference`
- [x] `computeRadarAxes` satura `value` em 1; stat ausente conta como 0 sem
      quebrar os demais eixos
- [x] Testes: valores altos → `value` 1; zero → 0; `statKey` ausente → eixo usa 0
      e os outros continuam finitos; soma de múltiplas stats confere; perfil real
      → eixos variados em (0,1)
- [x] Gate check passes: `npm test`
- [x] Test count: 6 tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ingress): normalização dos eixos do radar de perfil`
**Status**: ✅ Complete

---

### T5: `lib/ingress-profile.mjs` — build e merge do perfil

**What**: `SCHEMA_VERSION`, `buildProfile(parsedExport, { previous })` e
`mergeGdprDump(profile, dumpData)` — montam/atualizam o objeto `Profile`,
preservam `timeSeries`/`portals` já existentes, recalculam `pending`.
**Where**: `lib/ingress-profile.mjs`
**Depends on**: T2
**Reuses**: `lib/ingress-stats.mjs`; shape `Profile` do `design.md`
**Requirement**: INGR-10, INGR-11, INGR-19, INGR-32, INGR-33, INGR-34

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `buildProfile` produz o `Profile` completo do `design.md`
- [x] `buildProfile` duas vezes com o mesmo export → objetos idênticos
      (idempotência; sem `Date.now()`; stats com ordem de chave estável)
- [x] `previous` com `timeSeries`/`portals` → preservados e `pending` limpo
- [x] `mergeGdprDump` funde séries temporais + portais, mantém `agent`/`stats`
      mais recentes por `capturedAt`, limpa `pending`; `dumpData` vazio → no-op
      seguro (a leitura de arquivo ausente/vazio fica no CLI, T19)
- [x] Testes: idempotência; merge preserva dump anterior; fixture parcial;
      `capturedAt` antigo não sobrescreve / novo sobrescreve
- [x] Gate check passes: `npm test` (289 testes ✔)
- [x] Test count: 9 tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ingress): build e merge do perfil de agente`
**Status**: ✅ Complete

---

### T6: `lib/ingress-s2.mjs` — cobertura S2 de uma viewport

**What**: `coverViewport({north,south,east,west}, level, {cap})` usando `s2js`
`RegionCoverer` (nível fixo) → `[{ token, ring: [lat,lng][] }]`, e `LEVEL_RANGE`.
**Where**: `lib/ingress-s2.mjs`
**Depends on**: T1
**Reuses**: `s2js` (`RegionCoverer`, `Cell`/`CellId`)
**Requirement**: INGR-26, INGR-27, INGR-28

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `coverViewport` devolve células de nível `level` (RegionCoverer grosso +
      BFS de subdivisão) com o anel de 4 vértices de cada uma
- [x] Nunca devolve mais que `cap` células (default 400); bbox continental não
      trava (BFS para no `cap`)
- [x] `LEVEL_RANGE = { min, max, default }` exportado; nível fora da faixa é
      clampeado
- [x] Todo uso de `s2js` fica **só** neste arquivo
- [x] Testes: bbox de cidade no nível 12 → conjunto determinístico de tokens;
      bbox continental (cap 50) → ≤50 e rápido; nível 99/1 → clampeado; anel de 4
      vértices na vizinhança da bbox
- [x] Gate check passes: `npm test` (295 testes ✔)
- [x] Test count: 6 tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ingress): cobertura de células S2 para uma viewport`
**Status**: ✅ Complete

---

### T7: Semente `data/ingress/fencherlc.json` + loader `lib/ingress.ts`

**What**: Gerar o JSON inicial com os números **reais** do export de 07/09/2026 e
o loader tipado `loadProfile()` que importa o JSON, valida `schemaVersion` e
retorna `Profile | null`.
**Where**: `data/ingress/fencherlc.json` (+ o loader coeso `lib/ingress.ts`, mesma task/commit)
**Depends on**: T2, T5
**Reuses**: `buildProfile` (T5) para gerar o JSON; tipos do `design.md`
**Requirement**: INGR-01, INGR-04, INGR-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `data/ingress/fencherlc.json` gerado por `buildProfile(parseAppExport(tsv))`
      com os 54 stats reais; `timeSeries`/`portals` null; `pending:
      ["apTimeline","portalMap"]`; `s2.center` = fallback (Brasília; coordenada
      real pendente do Luiz — ver STATE.md handoff)
- [x] `lib/ingress.ts` exporta tipos `Profile` e `loadProfile()`:
      `schemaVersion` desconhecido ou JSON ausente → `null`
- [x] `loadProfile` não faz nenhuma chamada de rede (import estático)
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): semente do perfil e loader tipado`
**Status**: ✅ Complete

---

### T8: `app/ingress/layout.tsx` — layout e metadados da rota

**What**: Layout próprio de `/ingress` — fontes via `next/font/google` (display
técnico p/ números + corpo), `metadata` (título/descrição OG/Twitter próprios),
tema "Scanner", sem header/footer do site, fora do `LanguageProvider`.
**Where**: `app/ingress/layout.tsx` (+ `app/ingress/theme.css` tokens da direção
Scanner; + stub mínimo `app/ingress/page.tsx` p/ o gate de build, substituído em
T9; + `components/Header.tsx` / `components/Footer.tsx`: esconder em `/ingress`)
**Depends on**: T7
**Reuses**: `app/casamento/layout.tsx` (estrutura de fonte + metadata)
**Requirement**: INGR-03, INGR-31

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] Layout carrega Chakra Petch + Barlow com `variable`, aplica no wrapper
      `.ingress-scanner`, sem `'use client'`
- [x] `metadata` exporta OG + Twitter com título/descrição da rota
- [x] Header e Footer retornam `null` em `/ingress` (LanguageProvider fica no
      root mas nenhum componente da rota o consome e o toggle vive no Header)
- [x] `/ingress` compila como rota estática; `npm run build` ✔
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): layout e metadados da rota /ingress`
**Status**: ✅ Complete

---

### T9: `app/ingress/page.tsx` — Server Component e composição

**What**: Página server que chama `loadProfile()`, renderiza estado vazio
informativo se `null`, e monta o esqueleto das seções (ordem da Direção Scanner),
computando badges/radar e passando como props.
**Where**: `app/ingress/page.tsx` (+ `components/ingress/Panel.tsx` primitiva de
moldura). T10–T18 trocam cada placeholder pela seção real.
**Depends on**: T8
**Reuses**: `lib/ingress.ts`, `lib/ingress-badges.mjs`, `lib/ingress-radar.mjs`
**Requirement**: INGR-01, INGR-05

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] `loadProfile() === null` → estado vazio ("Sinal perdido"), não erro 500
- [x] Com perfil, renderiza placeholders das 7 seções na ordem da Direção Scanner
- [x] Nenhum `'use client'` (page nem Panel)
- [x] `.ing-shell` centralizado, sem scroll horizontal a 360px
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): página server e composição das seções`
**Status**: ✅ Complete

---

### T10: `AgentHeader` + `HeroMesh` — identidade e hero

**What**: `AgentHeader.tsx` (server: codinome, facção, nível, recursões, meses) e
`HeroMesh.tsx` (client leaf: malha de células S2 que se desenha uma vez no load,
`prefers-reduced-motion` → estática).
**Where**: `components/ingress/AgentHeader.tsx`,
`components/ingress/HeroMesh.tsx`
**Depends on**: T9
**Reuses**: `framer-motion`; `lib/ingress-s2.mjs` (grade da malha)
**Requirement**: INGR-01, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] `AgentHeader` server-only; codinome + facção + nível (hexágono) + recursões
      + meses; malha S2 real da região calculada no server
- [x] `HeroMesh`: animação de draw-in **por CSS escalonado, sem JS** — ficou
      server component (melhor que client leaf; reduced-motion já neutralizado no
      theme.css, polígonos terminam visíveis via `forwards`)
- [x] `/ingress` volta a 103 kB (sem framer-motion); sem scroll horizontal a
      360px (`clamp()` no codinome, `flex-wrap` no meta)
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): cabeçalho de identidade e malha do hero`
**Status**: ✅ Complete

---

### T11: `StatGroups` + `StatValue` — estatísticas agrupadas

**What**: `StatGroups.tsx` percorre `STAT_GROUPS` e renderiza cada stat presente
em `stats` (número pt-BR via `Intl.NumberFormat('pt-BR')`), omitindo chaves
ausentes; `StatValue.tsx` é o item número+label.
**Where**: `components/ingress/StatGroups.tsx`,
`components/ingress/StatValue.tsx`
**Depends on**: T9
**Reuses**: `lib/ingress-stats.mjs` (`STAT_GROUPS`)
**Requirement**: INGR-02, INGR-04, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] Um `Panel` por grupo (8 grupos), números formatados `Intl.NumberFormat('pt-BR')`
- [x] Chave de stat ausente → item omitido; grupo vazio → `Panel` não renderiza
- [x] Server-only (sem `'use client'`)
- [x] `.ing-grid` (2 col mobile / 3 col ≥32rem), `overflow-wrap:anywhere` nos
      números grandes, sem scroll horizontal a 360px
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): seções de estatísticas agrupadas`
**Status**: ✅ Complete

---

### T12: `BadgeShelf` + `BadgeMedal` — medalhas hexagonais

**What**: `BadgeShelf.tsx` recebe as badges já computadas e renderiza `BadgeMedal`
(hexágono, cor do tier, "falta X para o próximo", marca de Onyx/tier máximo).
**Where**: `components/ingress/BadgeShelf.tsx`,
`components/ingress/BadgeMedal.tsx`
**Depends on**: T3, T9
**Reuses**: saída de `computeAllBadges` (T3)
**Requirement**: INGR-12, INGR-13, INGR-14, INGR-15, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] Cada medalha: hexágono, nome, tier (cor por tier) e "faltam X para <tier>"
- [x] Badge em Onyx → "tier máximo", hexágono com brilho, sem "falta para"
- [x] Badge sem stat de origem não aparece (filtrada em T3); `badges` vazio →
      `BadgeShelf` não renderiza
- [x] Server-only; grade `auto-fill minmax(min(100%,15rem),1fr))` sem scroll
      horizontal a 360px
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): prateleira de medalhas com tier`
**Status**: ✅ Complete

---

### T13: `PendingSection` — estado "aguardando dump GDPR"

**What**: Componente que renderiza um placeholder explicativo (sem eixos, sem
dados) para as seções listadas em `profile.pending` — "evolução de AP" e "mapa de
portais".
**Where**: `components/ingress/PendingSection.tsx`
**Depends on**: T9
**Reuses**: —
**Requirement**: INGR-17, INGR-18, INGR-19

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] `PendingSection kind="apTimeline"|"portalMap"` → `Panel` com hint
      "aguardando dump GDPR" e texto explicando a dependência
- [x] A página decide por `profile.pending` (Set), não por zero/null espalhados
- [x] Server-only; `.ing-pending` sem scroll horizontal a 360px
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔) —
      **fim da Fase 2**

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): placeholder de seção aguardando dump GDPR`
**Status**: ✅ Complete

---

### T14: `ProfileRadar` — SVG do radar de perfil

**What**: Componente SVG (server) que desenha o radar a partir dos eixos já
normalizados por `computeRadarAxes`.
**Where**: `components/ingress/ProfileRadar.tsx`
**Depends on**: T4, T9
**Reuses**: padrão SVG de `app/stats/page.tsx:248`; `computeRadarAxes` (T4)
**Requirement**: INGR-21, INGR-24, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`, `dataviz`

**Done when**:
- [x] Polígono com um vértice por eixo (5), anéis 0.25/0.5/0.75/1, spokes
      recessivos, série única sem legenda (título nomeia)
- [x] Eixo com valor 0 → vértice quase no centro (clamp 0.02), desenho não quebra
- [x] SVG responsivo (`viewBox`, `overflow:visible` p/ rótulos), server-only,
      tooltip via `<title>` nativo, legível a 360px (`max-width:20rem`)
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): radar de perfil em SVG`
**Status**: ✅ Complete

---

### T15: `ActionsBreakdown` — SVG de distribuição de ações

**What**: Componente SVG (server) — barras ou rosca de uma família de contagens
do snapshot (ex.: capturas vs. neutralizações vs. ressonadores destruídos vs.
mods).
**Where**: `components/ingress/ActionsBreakdown.tsx`
**Depends on**: T9
**Reuses**: padrão SVG de `/stats`; `lib/ingress-stats.mjs`
**Requirement**: INGR-22, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`, `dataviz`

**Done when**:
- [x] 6 contagens (construir vs. derrubar), barras horizontais de série única,
      rótulo + valor pt-BR, `border-radius` 4px na ponta
- [x] Contagem ausente → linha omitida; nenhuma presente → não renderiza
- [x] Barras CSS responsivas (rótulo acima da barra), server-only, 360px ok
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): distribuição de ações em barras`
**Status**: ✅ Complete

---

### T16: `S2Preview` — grade S2 estática + gatilho

**What**: Componente server que desenha em SVG a grade S2 da viewport default
(via `coverViewport`, calculado no server) sobre um fundo estilizado, com um
controle "tocar para explorar as células" que monta o `S2Explorer`.
**Where**: `components/ingress/S2Preview.tsx`
**Depends on**: T6, T9
**Reuses**: `lib/ingress-s2.mjs` (T6)
**Requirement**: INGR-25, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [x] Preview SVG da grade S2 do nível default centrada em `profile.s2.center`
      (calculada no server via `coverViewport`), com marcador do centro
- [x] `S2ExplorerLoader` (client, único do par) tem o botão "tocar para explorar
      as células"; ao abrir cede espaço p/ o mapa (ligado em T17)
- [x] `.ing-s2__grid` com `aspect-ratio`, caption, sem scroll horizontal a 360px;
      `:focus-visible` no botão
- [x] Gate check passes: `npm run lint && npm test && npm run build` (✔ ✔ ✔)

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): preview estático da grade S2`
**Status**: ✅ Complete

---

### T17: `S2Explorer` — mapa Leaflet interativo (sob toque)

**What**: Ilha cliente montada só após o toque no preview:
`dynamic(() => import('./S2Explorer'), { ssr: false })`, Leaflet + tiles OSM +
slider de nível que redesenha a grade via `coverViewport`; fallback se o mapa
não carregar.
**Where**: `components/ingress/S2Explorer.tsx`
**Depends on**: T6, T16
**Reuses**: `react-leaflet`, `leaflet`, `lib/ingress-s2.mjs`
**Requirement**: INGR-26, INGR-27, INGR-29

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `'use client'`; importado por `dynamic` com `ssr: false`; CSS do Leaflet
      importado aqui
- [ ] Slider (faixa `LEVEL_RANGE`) redesenha a grade; arrastar o mapa recalcula
      as células da nova viewport
- [ ] Erro ao carregar mapa/tiles → mensagem de fallback; o preview de T16
      permanece; resto da página intacto
- [ ] Mapa utilizável a 360px
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): explorador de células S2 sobre mapa`

---

### T18: `ApTimeline` — evolução de AP quando houver série

**What**: Componente SVG (server) que renderiza a linha do tempo de
`timeSeries.lifetimeAp` quando ela existe; a página usa `PendingSection` quando
não existe (INGR-20).
**Where**: `components/ingress/ApTimeline.tsx`
**Depends on**: T9
**Reuses**: `TimelineChart` de `app/stats/page.tsx:248` (mesmo tipo de gráfico)
**Requirement**: INGR-20, INGR-35, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`, `dataviz`

**Done when**:
- [ ] Recebe `{ t, v }[]` e desenha a linha com eixos e rótulos pt-BR
- [ ] Série vazia/ausente → componente não é renderizado (a página cai no
      `PendingSection`), sem erro
- [ ] SVG responsivo, server-only, legível a 360px
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): gráfico de evolução de AP`

---

### T19: `scripts/ingress.mjs` — CLI de ingestão

**What**: CLI com `build <export.tsv>`, `gdpr <dump-dir>`, `show`; dry-run por
padrão, `--apply` grava após mostrar o diff e confirmar; avisa se `capturedAt`
novo é mais antigo que o atual.
**Where**: `scripts/ingress.mjs`
**Depends on**: T5
**Reuses**: estilo de `scripts/livros.mjs` (args, confirmação, `--dry-run`);
`lib/ingress-profile.mjs`, `lib/ingress-stats.mjs`
**Requirement**: INGR-06, INGR-07, INGR-08, INGR-09, INGR-11, INGR-32, INGR-33, INGR-34

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `build` sem `--apply` imprime o que gravaria e não escreve
- [ ] `build --apply` mostra diff vs. JSON atual e grava só após confirmação
- [ ] `gdpr <dir>` lê os `.tsv` de série temporal + listas de portais e chama
      `mergeGdprDump`; arquivo ausente → warning, não aborta
- [ ] `capturedAt` retrocedendo → confirmação extra
- [ ] `node scripts/ingress.mjs build <tsv>` roda a partir do TSV real de 07/09 e
      reproduz o `data/ingress/fencherlc.json` de T7 (idempotência ponta a ponta)
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): CLI de ingestão do export e do dump GDPR`

---

### T20: `app/ingress/opengraph-image.tsx` — imagem de compartilhamento

**What**: Rota `opengraph-image` que gera (via `ImageResponse`) um cartão com
codinome, facção, nível e 3-4 números de destaque do perfil.
**Where**: `app/ingress/opengraph-image.tsx`
**Depends on**: T7
**Reuses**: `app/casamento/opengraph-image.tsx`
**Requirement**: INGR-30

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Rota responde 200 com uma imagem (tamanho OG padrão)
- [ ] A imagem contém codinome, facção, nível e destaques lidos do JSON
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): imagem OpenGraph da rota /ingress`

---

### T21: `app/ingress/icon.tsx` — favicon da rota

**What**: Ícone próprio de `/ingress` (hexágono Enlightened) via `ImageResponse`.
**Where**: `app/ingress/icon.tsx`
**Depends on**: T8
**Reuses**: `app/casamento/icon.tsx`
**Requirement**: INGR-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Rota `icon` responde com o ícone; aparece na aba do navegador em `/ingress`
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): favicon da rota /ingress`

---

### T22: `CountUp` — contador animado (leaf client)

**What**: Componente leaf `'use client'` que anima um número de 0 até o valor
final ao entrar na viewport; `prefers-reduced-motion` ou sem JS → mostra o valor
final direto. Aplicado em `StatValue`.
**Where**: `components/ingress/CountUp.tsx`
**Depends on**: T11
**Reuses**: `framer-motion`
**Requirement**: INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] `CountUp` é o único `'use client'`; recebe o valor final como prop e sempre
      renderiza esse valor no fallback
- [ ] `prefers-reduced-motion: reduce` → sem animação
- [ ] `StatValue` usa `CountUp` sem virar client component ele mesmo (composição)
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): contadores animados dos números`

---

### T23: Integração final da página

**What**: Montar `app/ingress/page.tsx` com todas as seções na ordem final da
Direção Scanner, fiação de `ApTimeline` vs `PendingSection` por
`profile.pending`, e revisão de build/lint + varredura mobile 360px.
**Where**: `app/ingress/page.tsx` (modify)
**Depends on**: T10, T11, T12, T13, T14, T15, T16, T17, T18, T22
**Reuses**: todos os componentes das fases 2-3
**Requirement**: INGR-01, INGR-20, INGR-36

**Tools**:
- MCP: NONE
- Skill: `nextjs-use-client`

**Done when**:
- [ ] Todas as seções renderizam na ordem: hero → stats → badges → radar →
      distribuição → evolução AP (real ou pending) → mapa de portais (pending) →
      explorador S2
- [ ] `timeSeries.lifetimeAp` presente → `ApTimeline`; ausente → `PendingSection`
      (sem mudança de código entre os dois casos além do dado)
- [ ] `npm run build` sem warning novo; página sem scroll horizontal a 360px
- [ ] Gate check passes: `npm run lint && npm test && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ingress): integração final da página /ingress`

---

## Phase Execution Map

```
Fase 1 (Fundação):        T1  T2  T3  T4  T5  T6  T7
Fase 2 (Página + seções): T8  T9  T10  T11  T12  T13
Fase 3 (Gráficos + S2):   T14  T15  T16  T17  T18
Fase 4 (Share + CLI):     T19  T20  T21  T22  T23
```

Execução estritamente sequencial, fase após fase, task após task. As arestas de
dependência estão nos blocos da seção "Execution Plan" acima.

23 tasks → 4 batches nas fronteiras de fase: `[T1-T7]` · `[T8-T13]` ·
`[T14-T18]` · `[T19-T23]` (~6 tasks cada).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 arquivo (`package.json`) | ✅ Granular |
| T2 | 1 módulo lib + teste | ✅ Granular |
| T3 | 1 módulo lib + teste | ✅ Granular |
| T4 | 1 módulo lib + teste | ✅ Granular |
| T5 | 1 módulo lib + teste | ✅ Granular |
| T6 | 1 módulo lib + teste | ✅ Granular |
| T7 | 1 JSON + 1 loader (coesos: dado + acesso ao dado) | ✅ Granular |
| T8 | 1 arquivo (`layout.tsx`) | ✅ Granular |
| T9 | 1 arquivo (`page.tsx`) | ✅ Granular |
| T10 | 1 componente + seu leaf client (coesos) | ✅ Granular |
| T11 | 1 componente + seu item (coesos) | ✅ Granular |
| T12 | 1 componente + sua medalha (coesos) | ✅ Granular |
| T13 | 1 componente | ✅ Granular |
| T14 | 1 componente | ✅ Granular |
| T15 | 1 componente | ✅ Granular |
| T16 | 1 componente | ✅ Granular |
| T17 | 1 componente | ✅ Granular |
| T18 | 1 componente | ✅ Granular |
| T19 | 1 arquivo (`scripts/ingress.mjs`) | ✅ Granular |
| T20 | 1 arquivo | ✅ Granular |
| T21 | 1 arquivo | ✅ Granular |
| T22 | 1 componente + uso em `StatValue` (coeso) | ✅ Granular |
| T23 | 1 arquivo (`page.tsx` modify) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | T1→T2 (ordem de fase) | ✅ Match (fase sequencial, sem dep de dado) |
| T3 | None | ordem | ✅ Match |
| T4 | None | ordem | ✅ Match |
| T5 | T2 | T2→…→T5 | ✅ Match |
| T6 | T1 | T1→…→T6 | ✅ Match |
| T7 | T2, T5 | fase 1 | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T9 | ordem | ✅ Match |
| T12 | T3, T9 | fase 1→2 | ✅ Match |
| T13 | T9 | ordem | ✅ Match |
| T14 | T4, T9 | fase 1/2→3 | ✅ Match |
| T15 | T9 | ordem | ✅ Match |
| T16 | T6, T9 | fase 1/2→3 | ✅ Match |
| T17 | T6, T16 | T16→T17 | ✅ Match |
| T18 | T9 | ordem | ✅ Match |
| T19 | T5 | fase 1→4 | ✅ Match |
| T20 | T7 | fase 1→4 | ✅ Match |
| T21 | T8 | fase 2→4 | ✅ Match |
| T22 | T11 | fase 2→4 | ✅ Match |
| T23 | T10-T18, T22 | fase 2/3/4 → T23 | ✅ Match |

Nenhuma dependência aponta para fase posterior. Deps cruzam só para trás.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | dependências (`package.json`) | none | none | ✅ OK |
| T2 | lógica pura `lib/ingress-stats.mjs` | unit | unit | ✅ OK |
| T3 | lógica pura `lib/ingress-badges.mjs` | unit | unit | ✅ OK |
| T4 | lógica pura `lib/ingress-radar.mjs` | unit | unit | ✅ OK |
| T5 | lógica pura `lib/ingress-profile.mjs` | unit | unit | ✅ OK |
| T6 | lógica pura `lib/ingress-s2.mjs` | unit | unit | ✅ OK |
| T7 | dado + loader `.ts` | none | none | ✅ OK |
| T8-T18, T22, T23 | componentes React | none (build gate) | none | ✅ OK |
| T19 | CLI (`scripts/*.mjs`, só I/O) | none | none | ✅ OK (lógica testada em T5) |
| T20, T21 | rotas de imagem Next | none | none | ✅ OK |

Todas as camadas de lógica pura têm `Tests: unit` na task que as cria. Nenhum
`Tests: none` cobre uma camada que a matriz exige testar.

---

## Requirement Traceability (spec → tasks)

| Req | Tasks | Req | Tasks |
| --- | --- | --- | --- |
| INGR-01 | T7, T9, T10, T23 | INGR-19 | T5, T13 |
| INGR-02 | T2, T11 | INGR-20 | T18, T23 |
| INGR-03 | T8, T21 | INGR-21 | T4, T14 |
| INGR-04 | T2, T7, T11 | INGR-22 | T15 |
| INGR-05 | T7, T9 | INGR-23 | T4 |
| INGR-06 | T2, T19 | INGR-24 | T4, T14 |
| INGR-07 | T2, T19 | INGR-25 | T1, T16 |
| INGR-08 | T19 | INGR-26 | T6, T17 |
| INGR-09 | T19 | INGR-27 | T6, T17 |
| INGR-10 | T5 | INGR-28 | T1, T6 |
| INGR-11 | T5, T19 | INGR-29 | T17 |
| INGR-12 | T3, T12 | INGR-30 | T20 |
| INGR-13 | T3, T12 | INGR-31 | T8 |
| INGR-14 | T3, T12 | INGR-32 | T5, T19 |
| INGR-15 | T3, T12 | INGR-33 | T5, T19 |
| INGR-16 | T3 | INGR-34 | T5, T19 |
| INGR-17 | T13 | INGR-35 | T18 |
| INGR-18 | T13 | INGR-36 | T9-T18, T22, T23 |

Todos os 36 requisitos mapeados para ≥1 task.
