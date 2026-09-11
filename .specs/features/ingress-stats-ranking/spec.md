# Ingress Stats & Ranking Specification

## Problem Statement

`/ingress` hoje é uma vitrine estática (perfil, linha do tempo, medalhas), sem banco de dados e só em português. A seção "Padrão de jogo" (radar de 5 pontas) é o elemento mais forte da página — mas vive só dentro do perfil, sem explicação persistente de cada ponta e sem nenhum registro histórico de quem já se comparou. Queremos dar a essa seção uma rota própria (`/ingress/stats`), transformar o radar num "placar" comparável entre qualquer agente (não só "eu vs. quem colou"), e abrir a página pra visitantes de fora do Brasil.

## Goals

- [ ] `/ingress` (perfil, linha do tempo, medalhas) e a nova `/ingress/stats` ficam disponíveis em PT/EN com uma chave de troca de idioma visível
- [ ] `/ingress/stats` mostra o radar "Padrão de jogo" com explicação fixa de cada uma das 5 pontas, uma nota geral 0-100+ calculada a partir delas, e um ranking de todos os agentes já medidos
- [ ] Qualquer um dos 3 caminhos de entrada (comparar com FencherLC, comparar com outro agente, só entrar no ranking) grava/atualiza o agente colado em `casara.ingress_rankings`, protegido por debounce de 5 min por agente
- [ ] Ao gravar, o visitante recebe um toast com sua posição atual no ranking

## Out of Scope

| Feature | Reason |
| --- | --- |
| Dado ao vivo da API do Ingress / scraping | Contra os Termos de Serviço da Niantic — já documentado em `docs/ingress-contexto-e-restricoes.md`; esta feature continua 100% dependente de paste manual do export |
| Autenticação/identidade verificada do agente | Não existe API oficial pra confirmar que quem colou um export é o dono daquele codinome — mesmo risco que a comparação atual já aceita, não é uma regressão desta feature |
| Edição/remoção de uma linha do ranking | Sem rota de admin em lugar nenhum do site (mesma filosofia de `/livros`); uma linha errada exige intervenção manual no banco, fora do escopo desta feature |
| Atualização automática do registro do FencherLC via rota pública | Decisão explícita — ver Assumptions; o canônico continua vindo só de `data/ingress/fencherlc.json` |
| Paginação do ranking | Volume esperado é baixo (feature de nicho pessoal); lista completa capada por `LIMIT` é suficiente por agora |
| Rate-limit por IP | Decisão explícita — cache curto + `LIMIT` na query cobrem o cenário atual sem nova infraestrutura |
| Recepção/armazenamento de texto de sugestão | O campo de sugestão é só um link pro Telegram do Luiz, sem formulário nem backend novo |
| Print real do tutorial de exportação | Luiz fornece depois; a feature entrega o placeholder |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Persistência do idioma escolhido em `/ingress` | Sem persistência — reseta a cada carregamento, como o `LanguageProvider` atual do resto do site | Consistência com o comportamento já existente (`context/LanguageContext.tsx`, `useState` sem storage); evita introduzir um mecanismo novo sem pedido explícito | n |
| Tamanho/paginação da lista de ranking | Lista completa (sem paginação), capada por `LIMIT` (ex. 100) na query — a mesma proteção já decidida pro GET | Volume esperado é baixo (feature pessoal de nicho); paginação seria complexidade prematura | n |
| Identidade do agente (chave de unicidade) | Normalizada (`trim` + `lower(codename)`) como chave única; casing original do codinome preservado só pra exibição | Mesmo padrão já usado em `quiz_participants` (`lower(name)`) pra unicidade case-insensitive | n |
| Toast de posição quando dois agentes são colados no caminho "comparar com outro agente" | Mostra a posição só do primeiro agente colado (tratado como "você" nesse fluxo), mesmo que os dois sejam upsertados | Evita dois toasts simultâneos/spam visual; mantém o foco em quem está operando a tela | n |
| Nome da tabela/rota nova | `casara.ingress_rankings`, `POST`/`GET /api/ingress-rankings` | Segue a convenção de nomenclatura já usada (`casara.quiz_sessions`, `/api/quiz-sessions`) | n |
| Registro de analytics da feature | Novas funções `trackIngress*` em `utils/analytics.ts`, sob uma seção `// ─── Ingress ───` nova (hoje não existe nenhuma) | Segue o padrão de "toda feature nova ganha `trackX` própria" já documentado no `CLAUDE.md` | n |
| Destaque da própria linha no ranking ao reabrir a página | `localStorage` guarda o(s) codinome(s) já submetidos neste navegador pra destacar a linha correspondente | Mesmo espírito do dedupe por hash em `localStorage` que `ProfileRadar.tsx` já usa hoje pro Telegram; não exige conta/login | n |
| Validação anti-fraude do conteúdo colado | Nenhuma validação além da já existente em `parseAppExport` (tipos/formato) — sem verificação de autenticidade | Não há como confirmar autenticidade sem API oficial; mesmo risco que a comparação client-side já aceita hoje, só que agora persistido | n |
| "Data de início de jogo" | `created_at` da linha (primeira medição no NOSSO ranking), rotulada na UI como "medido desde" | Nenhuma fonte de dado disponível (export nem `badge-catalog.json`) contém a data real de criação da conta no Ingress | y |
| Escopo do hover "olho" na tabela de ranking | Só os 12 valores brutos usados nas 5 pontas do radar (mesmo dado já gravado em `stat_values`) | Confirmado explicitamente — não o catálogo completo de ~54 medalhas, que exigiria guardar dado fora do escopo desta feature | y |
| Selo de tier (Bronze..Onyx) | Aparece só na visão do próprio perfil/radar (P1a), não como coluna na tabela de ranking | O usuário listou as colunas exatas da tabela (nome, atualização, medido desde, AP, nota geral) sem incluir selo de tier ali | y |

**Open questions:** none — todas as ambiguidades foram resolvidas em conversa (i18n, fórmula da nota, política do FencherLC, proteção de GET, UX do debounce, biblioteca de toast, desempate) ou registradas como assumption acima.

---

## User Stories

### P1: Rota `/ingress/stats` com radar detalhado e nota geral ⭐ MVP

**User Story**: Como visitante de `/ingress` (eu ou outro agente), quero ver a seção "Padrão de jogo" numa rota própria, com a explicação de cada ponta sempre visível e uma nota geral única, para entender o que cada eixo mede sem depender de hover/tooltip.

**Why P1**: é o elemento mais elogiado da feature atual e a base de cálculo (nota geral) de que o ranking depende.

**Acceptance Criteria**:

1. WHEN um visitante abre `/ingress/stats` THEN o sistema SHALL renderizar o mesmo radar de 5 eixos "Padrão de jogo" já usado em `/ingress`, com o perfil publicado do FencherLC como referência inicial.
2. The system SHALL exibir, fixo abaixo do gráfico, um texto explicando o que cada um dos 5 eixos mede (Construção, Destruição, Exploração, Hacking, Links e campos).
3. The system SHALL calcular e exibir uma "nota geral" derivada dos 5 eixos: para cada stat, interpola a posição entre os 5 limiares oficiais (Bronze/Prata/Ouro/Platina/Onyx, lidos de `data/ingress/badge-catalog.json`) como valores 1-5; além do limiar Onyx, estende linearmente (`5 + (razão − 1)`); a nota do eixo é a média das posições dos seus stats; a nota geral é a média das 5 notas de eixo × 20 (100 = Onyx em todas as pontas).
4. The system SHALL exibir, junto da nota geral, um selo de tier (Bronze/Prata/Ouro/Platina/Onyx/"Onyx +N") derivado do piso da média das posições, reaproveitando `TIER_LABELS`/`TIER_COLOR` de `lib/ingress-tiers.mjs`.
5. WHERE o stat "Portais neutralizados" não tem badge oficial própria THEN o sistema SHALL derivar seus 5 limiares de tier dividindo os 5 limiares do badge Purifier por 8, mantendo a mesma aproximação já usada pelo `ref` atual do radar.
6. The system SHALL exibir três controles de entrada visivelmente distintos: "Comparar com FencherLC", "Comparar com outro agente", "Só entrar no ranking".
7. The system SHALL exibir, junto do radar, a nota individual de cada um dos 5 eixos (não só a nota geral agregada) — é o que permite ler o "formato"/"padrão de jogo" do agente (ex. mais forte em ataque/destruição do que em exploração), e não só um número único.

**Independent Test**: abrir `/ingress/stats` sem colar nada — radar do FencherLC aparece, as 5 explicações, a nota de cada eixo e a nota geral dele são exibidas, e os 3 botões de entrada estão visíveis.

---

### P1: Persistência do ranking por agente (upsert + debounce) ⭐ MVP

**User Story**: Como visitante que colou meu export, quero que meus dados fiquem salvos num ranking compartilhado, para me comparar com todo mundo que já foi medido, sem poder inflar meu próprio registro repetidamente.

**Why P1**: é o pedido central — "metrificar" e comparar agentes de forma persistente, com segurança básica contra abuso.

**Acceptance Criteria**:

1. WHEN um visitante envia stats por qualquer um dos 3 caminhos de entrada THEN o sistema SHALL fazer upsert de uma linha por agente colado (chave = codinome normalizado) em `casara.ingress_rankings`, gravando: codinome (normalizado + casing original), facção (`Enlightened`/`Resistance`, do campo `faction` do export), AP total (`lifetimeAp`), nota geral, a nota individual de cada um dos 5 eixos, e os valores brutos dos 12 stats usados nas 5 pontas do radar (`resonatorsDeployed`, `modsDeployed`, `resonatorsDestroyed`, `portalsNeutralized`, `uniquePortalsVisited`, `distanceWalkedKm`, `uniqueMissionsCompleted`, `hacks`, `glyphHackPoints`, `linksCreated`, `controlFieldsCreated`, `mindUnitsCaptured`).
2. IF a linha existente de um agente foi atualizada há menos de 5 minutos THEN o sistema SHALL NOT atualizar essa linha na nova submissão, e SHALL usar os dados já armazenados desse agente para exibir o resultado.
3. The system SHALL registrar, em cada linha, a data da primeira vez que aquele agente foi medido (`created_at`, exibida como "medido desde" — não é a data de criação da conta no Ingress, que não existe em nenhuma fonte de dado disponível) e a data da última atualização (`updated_at`).
4. The system SHALL tratar o codinome do FencherLC como somente-leitura nesta tabela — nenhum caminho da API pública SHALL gravar ou atualizar a linha do FencherLC.
5. WHILE dois codinomes diferentes são enviados na mesma submissão (caminho "comparar com outro agente") THE system SHALL avaliar o debounce de 5 minutos de forma independente por codinome, de modo que o debounce de um agente SHALL NOT bloquear o upsert do outro.
6. The system SHALL executar cada upsert como uma única instrução SQL atômica e guardada (`INSERT ... ON CONFLICT (codename_key) DO UPDATE ... WHERE casara.ingress_rankings.updated_at < NOW() - INTERVAL '5 minutes'`), seguindo o padrão já usado no projeto para transições guardadas (sem leitura-depois-escrita, sem lock de aplicação).
7. WHEN um upsert efetivamente insere ou atualiza a linha de um agente THEN o sistema SHALL recalcular a posição desse agente no ranking e exibir um toast com a posição atual (ex.: "Você está em 12º lugar no ranking!").
8. IF o debounce bloqueou a escrita (AC-2) THEN o sistema SHALL mesmo assim exibir o toast com a posição já armazenada do agente, sem estado de erro visível.
9. The system SHALL ordenar o ranking por nota geral (desc), desempatando por `lifetimeAp` — AP total (desc) e, se ainda empatado, por `created_at` (asc, quem se registrou primeiro).

**Independent Test**: colar um export novo em qualquer um dos 3 caminhos → linha nova aparece no ranking com a posição correta; colar o mesmo export de novo em menos de 5 min → nenhuma nova escrita ocorre (posição/nota não recalculada com dado diferente), mas o toast ainda mostra a posição salva.

---

### P1: Ranking visível de todos os agentes medidos ⭐ MVP

**User Story**: Como qualquer visitante, quero ver a lista de todos os agentes já medidos, ordenados por nota geral, para saber onde me encaixo.

**Why P1**: é o outro lado do mesmo pedido — sem visibilidade do ranking completo, a persistência não tem propósito visível.

**Acceptance Criteria**:

1. WHEN um visitante abre `/ingress/stats` THEN o sistema SHALL exibir uma tabela com todas as linhas de `casara.ingress_rankings`, ordenadas conforme a regra de desempate acima, mostrando: posição, codinome (com um indicador visual de facção — Enlightened/Resistance), data de atualização, data da primeira medição ("medido desde"), AP total e nota geral.
2. The system SHALL exibir, em cada linha da tabela, um ícone de "olho" que, ao hover/toque, mostra em um popover os 12 valores brutos usados nas 5 pontas do radar daquele agente, organizados pelos 5 eixos (Construção, Destruição, Exploração, Hacking, Links e campos).
3. `GET /api/ingress-rankings` SHALL responder usando uma janela curta de cache/revalidate (15-30s) e SHALL limitar o número de linhas retornadas por um `LIMIT` explícito (ex. 100), sem rate-limit por IP.
4. The system SHALL permitir a leitura do ranking sem exigir nenhum token de autenticação, consistente com o restante de `/ingress` (rota pública).

**Independent Test**: com pelo menos 2 agentes já registrados, abrir `/ingress/stats` numa aba anônima (sem `localStorage`) e ver a tabela completa, ordenada corretamente, sem precisar de login/token.

---

### P1: Internacionalização PT/EN de toda a área `/ingress` ⭐ MVP

**User Story**: Como visitante que não lê português, quero trocar `/ingress` (perfil, linha do tempo, medalhas, stats) para inglês, para entender o conteúdo.

**Why P1**: pedido explícito #1, e `/ingress/stats` (que é P1) já nasce dentro dessa área — não dá pra ter uma rota nova bilíngue dentro de uma área que continua só em português.

**Acceptance Criteria**:

1. The system SHALL envolver toda a árvore de rotas de `/ingress` (`page.tsx`, `linha-do-tempo`, `medalha/[slug]`, `stats`) com o `LanguageProvider` já existente, oferecendo uma chave de troca PT/EN visível e consistente com o resto do site.
2. WHEN o visitante troca o idioma THEN o sistema SHALL traduzir todo o texto estático dessas páginas (rótulos, descrições, explicações dos eixos do radar, tutorial, cabeçalhos da tabela de ranking) sem recarregar a página.
3. WHILE nenhuma escolha explícita foi feita THE system SHALL exibir o conteúdo em português por padrão, igual ao comportamento atual do site.
4. The system SHALL resetar para português a cada novo carregamento de página, independente de uma escolha feita anteriormente na mesma sessão (sem persistência entre recarregamentos — ver Assumptions).

**Independent Test**: abrir `/ingress`, trocar pra inglês, navegar pra `/ingress/linha-do-tempo` e `/ingress/stats` — conteúdo aparece em inglês nas três; recarregar a página — volta pro português.

---

### P2: Tutorial de exportação (placeholder de print)

**User Story**: Como visitante de primeira vez, quero um passo-a-passo de como exportar meus dados do app do Ingress, para saber o que colar.

**Why P2**: importante pra conversão, mas não bloqueia o núcleo (radar/ranking/i18n) — o print real só chega depois.

**Acceptance Criteria**:

1. The system SHALL exibir um tutorial numerado explicando como exportar as estatísticas do app do Ingress.
2. WHERE o print real ainda não foi fornecido THEN o sistema SHALL renderizar uma área de imagem placeholder no lugar, sem quebrar o layout.

---

### P2: Campo de sugestão de melhorias

**User Story**: Como visitante com uma ideia, quero um jeito claro de falar com o Luiz no Telegram, para sugerir melhorias.

**Why P2**: nice-to-have de baixo risco, não bloqueia o núcleo da feature.

**Acceptance Criteria**:

1. The system SHALL exibir um link/botão visível de sugestão que abre `https://t.me/FencherLC` em uma nova aba.
2. The system SHALL NOT coletar nem armazenar texto de sugestão em nenhum lugar da aplicação (é só um link, sem formulário nem backend).

---

## Edge Cases

- IF o texto colado falhar ao ser parseado (`parseAppExport`) THEN o sistema SHALL exibir a mensagem de erro inline já existente e SHALL NOT tentar nenhum upsert.
- IF o codinome parseado vier vazio/só espaços THEN o sistema SHALL rejeitar a submissão no client antes de chamar a API.
- IF a tabela `casara.ingress_rankings` estiver vazia (instalação nova) THEN `/ingress/stats` SHALL exibir um estado vazio explicativo em vez de uma tabela em branco.
- IF a escrita no Neon falhar (rede/banco indisponível) THEN o sistema SHALL continuar renderizando o radar/comparação localmente e SHALL exibir um toast de falha suave (ex.: "não foi possível atualizar seu registro agora"), sem bloquear a UI.
- IF os dois codinomes colados no caminho "comparar com outro agente" forem iguais (case-insensitive) THEN o sistema SHALL tratar como o caso de "evolução própria" já existente (`lib/ingress-compare-message.mjs`) e fazer upsert de uma única linha.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ISTATS-01 | P1: Rota /stats | Design | Implementing |
| ISTATS-02 | P1: Rota /stats | Design | Implementing |
| ISTATS-03 | P1: Rota /stats | Design | Implementing |
| ISTATS-04 | P1: Rota /stats | Design | Implementing |
| ISTATS-05 | P1: Rota /stats | Design | Implementing |
| ISTATS-06 | P1: Rota /stats | Design | Implementing |
| ISTATS-27 | P1: Rota /stats | Design | Implementing |
| ISTATS-07 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-08 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-09 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-10 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-11 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-12 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-13 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-14 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-28 | P1: Persistência do ranking | Design | Implementing |
| ISTATS-15 | P1: Ranking visível | Design | Pending |
| ISTATS-29 | P1: Ranking visível | Design | Pending |
| ISTATS-16 | P1: Ranking visível | Design | Implementing |
| ISTATS-17 | P1: Ranking visível | Design | Implementing |
| ISTATS-18 | P1: i18n /ingress | Design | Pending |
| ISTATS-19 | P1: i18n /ingress | Design | Pending |
| ISTATS-20 | P1: i18n /ingress | Design | Pending |
| ISTATS-21 | P1: i18n /ingress | Design | Pending |
| ISTATS-22 | P2: Tutorial | Design | Pending |
| ISTATS-23 | P2: Sugestão Telegram | Design | Pending |
| ISTATS-24 | Edge case: parse falho | Design | Implementing |
| ISTATS-25 | Edge case: falha de escrita no Neon | Design | Implementing |
| ISTATS-26 | Edge case: codinomes idênticos | Design | Implementing |

**ID format:** `ISTATS-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 29 total, 0 mapped to tasks, 29 unmapped ⚠️ (mapeamento ocorre na fase Design/Tasks)

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | ISTATS-24 + assumption "validação anti-fraude" — reaproveita `parseAppExport` existente, sem validação nova além de tipo/formato |
| Failure / partial-failure states | ISTATS-25 — falha de escrita no Neon degrada graciosamente, nunca bloqueia a UI local |
| Idempotency / retry / duplicate handling | ISTATS-08, ISTATS-11 — upsert guardado por `WHERE updated_at < NOW() - 5min` é idempotente por construção |
| Auth boundaries & rate limits | ISTATS-08 (debounce de escrita por agente), ISTATS-16/17 (GET público, sem token, cache+LIMIT em vez de rate-limit por IP — decisão explícita) |
| Concurrency / ordering | ISTATS-11 — instrução atômica guardada evita corrida entre submissões concorrentes do mesmo codinome, mesmo padrão já usado nas transições do quiz |
| Data lifecycle / expiry | N/A porque as linhas do ranking são permanentes por design — sem sessão, sem TTL, sem rota de exclusão/admin (mesma filosofia do resto do site: não existe superfície de escrita pública além do upsert guardado) |
| Observability | Assumption "registro de analytics" — novas funções `trackIngress*` em `utils/analytics.ts` |
| External-dependency failure | N/A porque a feature não chama nenhuma API externa em runtime — todo dado vem de paste manual do visitante; falhas de escrita no próprio Neon já cobertas em Failure states |
| State-transition integrity | N/A porque não há máquina de estados explícita como a do quiz (`lobby→question→...`) — cada linha só existe/atualiza via upsert, já coberto por Idempotency |

---

## Success Criteria

- [ ] `/ingress/stats` existe, mostra o radar + 5 explicações fixas + nota geral + selo de tier, e os 3 botões de entrada
- [ ] Qualquer um dos 3 caminhos grava/atualiza `casara.ingress_rankings`, respeitando debounce de 5 min por agente, sem nunca escrever o FencherLC
- [ ] O ranking completo aparece ordenado corretamente (nota → AP total → data de registro) e o toast de posição dispara em toda submissão (inclusive quando bloqueada pelo debounce)
- [ ] `/ingress` inteiro (perfil, linha do tempo, medalhas, stats) alterna PT/EN sem reload
