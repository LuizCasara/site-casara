# Estatísticas para Nerds (aba em /ingress/ranking) Specification

## Problem Statement

`/ingress/ranking` hoje mostra duas visões individuais — a tabela de ranking (linha por agente) e o radar de atividade (eventos recentes). Não existe nenhuma visão agregada da comunidade como um todo: quantos agentes existem, quantas medalhas a comunidade já conquistou, como as duas facções se comparam, quem detém os recordes, quanto a galera participa de eventos sazonais. Essa é a camada que falta para transformar o ranking de "planilha comparável" em "retrato da comunidade" — o público que o Luiz quer atingir aqui gosta de número, então a entrega é uma terceira aba densa em KPIs e gráficos, calculada sobre **todos** os agentes cadastrados (não só o top 100 que a tabela expõe).

## Goals

- [ ] Nova aba "Estatísticas para Nerds" em `/ingress/ranking`, seguindo o mesmo padrão de abas já existente (`IngressRankingTabs`)
- [ ] KPIs e gráficos agregados sobre a tabela `casara.ingress_rankings` inteira (e o histórico de escritas em `casara.ingress_ranking_history`), não limitados pelo `LIMIT 100` que a tabela de ranking usa
- [ ] Retrato estático (calculado uma vez no carregamento da página/aba) — sem poll contínuo, diferente das outras duas abas
- [ ] Visual consistente com o resto do site: gráficos em SVG feitos à mão, sem introduzir lib de gráfico nova (nenhuma parte do projeto usa uma hoje)

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Poll/atualização ao vivo dessa aba | Decisão explícita do Luiz — é um retrato, calculado no load, não precisa parecer "ao vivo" como a tabela e o radar de atividade |
| Tabela/view materializada compilada, atualizada a cada POST | Decisão explícita — o volume atual de `casara.ingress_rankings` (dezenas de linhas, não milhões) torna uma query `SUM`/`COUNT`/`AVG` direta instantânea; uma view materializada seria complexidade sem ganho real hoje |
| Coluna/seção de "anomalias" nomeadas (Cassandra, Darsana Prime, etc.) | O parser do export (`lib/ingress-stats.mjs`) não extrai essas colunas — não há esse dado por agente, só o catálogo estático de badges (`data/ingress/badge-catalog.json`) que nunca foi ligado a stats individuais |
| Linha do tempo por evento sazonal específico (ex: "First Saturday de agosto") | O export só traz contadores cumulativos (`firstSaturdayEvents` etc.), sem timestamp de quando cada ocorrência aconteceu |
| Identificação de qual medalha específica foi "comprada" vs. conquistada | O catálogo de badges não marca isso, e a maioria das medalhas do Ingress (Onyx incluso) se conquista jogando, não comprando — não existe esse dado |
| Edição/curadoria manual dos KPIs (admin) | Sem rota de admin em lugar nenhum do site — mesma filosofia de `/livros` e do resto do ranking |
| Paginação ou filtro de período (7d/30d/all) nesta aba | Não pedido — a aba mostra o estado atual acumulado da comunidade, diferente do `/stats` interno que já tem filtro de período para outro propósito |
| Exportar/baixar os dados agregados (CSV, imagem, link compartilhável dedicado) | Não pedido nesta rodada |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Definição de "medalha" agregada | Duas métricas: (a) total de tiers concedidos, somando bronze..onyx nos 12 stats do radar × todos os agentes; (b) contagem de agentes com os 12/12 stats em tier Onyx ("clube Onyx total") | Confirmado explicitamente pelo Luiz — cobre tanto "quanto a comunidade já conquistou" quanto "quem é excepcional" | y |
| Atualização da aba | Estática — calculada no carregamento SSR da página, sem poll | Confirmado explicitamente | y |
| Escopo do MVP | Lista ampla (ver User Stories P1-P3) | Confirmado explicitamente — Luiz pediu a lista completa | y |
| Layout do comparativo por facção | Barras divergentes: rótulo da métrica no centro, barra crescendo para a esquerda (Enlightened, verde) e para a direita (Resistance, azul), uma linha por métrica | Confirmado explicitamente | y |
| Seção de eventos sazonais | Entra como "Engajamento em eventos sazonais" (não "anomalias"), somando `firstSaturdayEvents`, `secondSundayEvents`, `clearFieldsEvents`, `battleBeaconCombatant`, `apolloTokens`, `apolloModBattlePoints`, `seerPoints`, `xmRecharged`, `agentsRecruited` a partir de `extra_stats` | Confirmado explicitamente — são dados reais do export, mas vivem no balde `extra_stats` (JSONB solto, nunca validado) | y |
| Ausência de chave em `extra_stats` | Tratada como "agente não informou esse dado" — excluída do somatório e do divisor de médias, nunca convertida em zero | Confirmado explicitamente — um export incompleto/antigo não pode arrastar a média pra baixo artificialmente | y |
| "Pay to win" / assinatura paga | Incluir `monthsSubscribed` como KPI ("% de agentes com assinatura", "média de meses entre quem assina"), estendendo o payload do `POST /api/ingress-rankings` (hoje esse campo só existe no perfil pessoal do FencherLC) | Confirmado explicitamente — é o único dado real e honesto de monetização disponível; não existe marcação de "medalha comprada" | y |
| Onde `monthsSubscribed` é persistido | Nova coluna dedicada `months_subscribed` (INTEGER, NULL, CHECK >= 0) via migration, mesmo padrão já usado para `recursions` (não misturado em `extra_stats`) | Mesmo raciocínio que já levou `recursions` a ganhar coluna própria: é um dado que a aba precisa agregar (`AVG`/`COUNT`) via SQL direto — um JSONB solto exigiria iterar toda a tabela em JS pra cada carregamento | n |
| Agentes cadastrados antes dessa mudança | `months_subscribed` nasce `NULL` para linhas existentes, só populado quando o agente reenviar um export após o deploy — mesmo tratamento de "não informado" que `extra_stats` e `recursions` já têm | Consequência direta do padrão já estabelecido em `recursions` (coluna nova sempre nasce NULL em linhas antigas) — não é uma escolha nova, é a mesma mecânica já em produção | n |
| Bandas do histograma de nota geral (`overall_score`) | 6 faixas de 20 pontos: abaixo de Bronze (<20), Bronze (20-40), Silver (40-60), Gold (60-80), Platinum (80-100), Onyx (100-120), Onyx+ (120+) | `overall_score` já é `avg(posição de tier) × 20`, com posição 1=Bronze..5=Onyx (`lib/ingress-tier-score.mjs`) — as faixas de 20 pontos são a tradução direta dessa escala, sem inventar um corte novo | n |
| Tier `'none'` na contagem de medalhas | Não conta como medalha — só bronze/silver/gold/platinum/onyx entram no total de tiers concedidos | `computeBadge` (`lib/ingress-badges.mjs`) retorna `tier: 'none'` quando o agente não atingiu nem o limiar de Bronze; contar isso como "medalha" inflaria o número com "medalha nenhuma" | n |
| Desempate no "recorde por stat" (Hall da fama) | Maior valor vence; em empate exato, o agente com `created_at` mais antigo (primeiro a registrar aquele valor) aparece como o recorde | Mesma lógica de desempate já usada na ordenação do ranking (`ORDER BY ... created_at ASC`) — consistência com o critério existente | n |
| "Total de envios" | `COUNT(*)` de `casara.ingress_ranking_history` (cada escrita real e não-debounced), distinto de "total de agentes" (`COUNT(*)` de `casara.ingress_rankings`, um por codinome) | O Luiz pediu "total de envios" separado de outros totais — `ingress_ranking_history` é literalmente "um snapshot por escrita bem-sucedida", a tabela feita pra essa pergunta | n |
| Recursões — divisor da média | Só entre agentes com `recursions IS NOT NULL`; a aba também mostra quantos agentes informaram esse dado, para dar contexto ao percentual | Campo é opcional desde a origem (migração 005) — mesmo raciocínio de "ausência ≠ zero" aplicado a `extra_stats` | n |
| Estado vazio (nenhum agente cadastrado ainda) | A aba mostra uma mensagem graciosa em vez de gráficos zerados/quebrados, mesmo padrão de "Sinal perdido" já usado alhures no `/ingress` | Consistência com o tratamento de ausência de dado já usado em `IngressRankingPage` quando `loadProfile()` falha | n |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Totais da comunidade (stat tiles) ⭐ MVP

**User Story**: Como visitante nerd do ranking, quero ver contadores gerais da comunidade inteira, para ter uma noção de escala (quantos agentes, quanto AP, quantas medalhas) antes de entrar em detalhe.

**Why P1**: É a primeira coisa que qualquer painel "de números" precisa mostrar — sem isso não há contexto para o resto da aba.

**Acceptance Criteria**:

1. WHEN o visitante abre a aba "Estatísticas para Nerds" THEN o sistema SHALL exibir o total de agentes cadastrados (`COUNT(*)` de `casara.ingress_rankings`)
2. WHEN o visitante abre a aba THEN o sistema SHALL exibir a soma de `lifetime_ap` de todos os agentes cadastrados
3. WHEN o visitante abre a aba THEN o sistema SHALL exibir o total de envios registrados (`COUNT(*)` de `casara.ingress_ranking_history`), rotulado de forma distinguível do total de agentes
4. WHEN o visitante abre a aba THEN o sistema SHALL exibir o total de medalhas concedidas por tier (Bronze, Silver, Gold, Platinum, Onyx), somando os tiers atingidos nos 12 stats do radar entre todos os agentes, excluindo tier `'none'` da contagem
5. WHEN o visitante abre a aba THEN o sistema SHALL destacar separadamente o total de medalhas Onyx concedidas (subconjunto do item 4)
6. WHEN o visitante abre a aba THEN o sistema SHALL exibir quantos agentes têm os 12 stats do radar em tier Onyx simultaneamente ("clube Onyx total")
7. IF nenhum agente está cadastrado em `casara.ingress_rankings` THEN o sistema SHALL exibir uma mensagem de estado vazio em vez de contadores zerados ou gráficos quebrados

**Independent Test**: Abrir a aba com o banco populado e conferir que os 6 contadores batem com uma query manual (`SUM`/`COUNT` direto no Neon); zerar a tabela num ambiente de teste e conferir a mensagem de estado vazio.

---

### P2: Comparativo por facção ⭐ MVP

**User Story**: Como visitante nerd, quero comparar Enlightened e Resistance lado a lado nas mesmas métricas, para ver qual facção está "ganhando" em cada dimensão.

**Why P1**: É o comparativo mais natural do jogo (as duas facções são o eixo central do Ingress) e foi pedido explicitamente.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de facção THEN o sistema SHALL exibir, para cada facção, o número de agentes cadastrados
2. WHEN o visitante visualiza a seção de facção THEN o sistema SHALL exibir, para cada facção, a soma de `lifetime_ap`
3. WHEN o visitante visualiza a seção de facção THEN o sistema SHALL exibir, para cada facção, a média de `overall_score`
4. WHEN o visitante visualiza a seção de facção THEN o sistema SHALL exibir, para cada facção, o total de medalhas Onyx concedidas (mesma definição do requisito NERD-05)
5. WHEN o visitante visualiza a seção de facção THEN o sistema SHALL renderizar cada métrica como uma barra divergente única: o rótulo da métrica no centro, a barra de Enlightened crescendo para a esquerda e a de Resistance para a direita, uma linha por métrica
6. WHILE uma facção não tem nenhum agente cadastrado o sistema SHALL exibir a barra dessa facção como zero, não omitir a linha da métrica

**Independent Test**: Com dados de ambas as facções, conferir visualmente que a barra mais longa corresponde à facção com o maior valor bruto em cada métrica; testar com uma facção zerada (ex.: banco de teste só com Enlightened) e confirmar que a métrica ainda aparece, com o lado da Resistance em zero.

---

### P3: Médias, distribuição e ficha média da comunidade ⭐ MVP

**User Story**: Como visitante nerd, quero ver como a "ficha típica" da comunidade se parece — médias, distribuição de nota geral, e um radar consolidado — para entender o nível geral do grupo, não só extremos.

**Why P1**: Complementa os totais (que não dizem nada sobre distribuição) e reaproveita o componente de radar que já existe no site.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de médias THEN o sistema SHALL exibir o AP médio por agente (`total_ap / total_agentes`)
2. WHEN o visitante visualiza a seção de médias THEN o sistema SHALL exibir um histograma de `overall_score` em 6 faixas de 20 pontos (abaixo de Bronze, Bronze, Silver, Gold, Platinum, Onyx, Onyx+), com a contagem de agentes em cada faixa
3. WHEN o visitante visualiza a seção de médias THEN o sistema SHALL exibir um radar com a média dos 5 eixos (`axis_scores`) entre todos os agentes cadastrados, no mesmo formato visual do radar individual já usado na página
4. WHEN o visitante visualiza a seção de médias THEN o sistema SHALL exibir a média de recursões, calculada apenas entre agentes com `recursions IS NOT NULL`
5. WHEN o visitante visualiza a seção de médias THEN o sistema SHALL exibir o maior valor de recursões registrado e quantos agentes informaram esse dado
6. IF nenhum agente tem `recursions` preenchido THEN o sistema SHALL exibir "sem dados suficientes" nessa métrica em vez de uma média calculada sobre zero registros

**Independent Test**: Comparar o histograma com uma contagem manual das faixas a partir dos `overall_score` retornados por `GET /api/ingress-rankings`; comparar a média de recursões com `AVG(recursions) WHERE recursions IS NOT NULL` direto no banco.

---

### P4: Hall da fama (recordes por stat) ⭐ MVP

**User Story**: Como visitante nerd, quero ver quem detém o maior valor em cada stat do radar, para reconhecer os "recordistas" da comunidade.

**Why P1**: É o tipo de conteúdo mais compartilhável/divertido de um painel de estatísticas — pedido implícito no "informações legais" do Luiz.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção Hall da fama THEN o sistema SHALL exibir, para cada um dos 12 stats do radar (`RADAR_STAT_KEYS`), o codinome e o valor do agente com o maior valor registrado nesse stat
2. IF dois ou mais agentes empatam no maior valor de um stat THEN o sistema SHALL exibir o agente cujo `created_at` é mais antigo entre os empatados
3. WHEN o visitante visualiza a seção Hall da fama THEN o sistema SHALL exibir o maior `lifetime_ap` registrado e o codinome correspondente
4. WHEN o visitante visualiza a seção Hall da fama THEN o sistema SHALL exibir o maior número de recursões registrado (entre agentes com `recursions IS NOT NULL`) e o codinome correspondente

**Independent Test**: Para um stat específico, conferir manualmente qual linha tem o maior `stat_values->>'chave'` na tabela e comparar com o que a aba exibe.

---

### P5: Engajamento em eventos sazonais ⭐ MVP

**User Story**: Como visitante nerd, quero ver o quanto a comunidade participa coletivamente de eventos recorrentes do jogo (First Saturday, Second Sunday, Clear Fields, etc.), para sentir que existe uma comunidade viva por trás dos números.

**Why P1**: Pedido explicitamente pelo Luiz como forma de dar a ideia de "comunidade dentro do jogo" — dado real, ainda que parcial.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de eventos sazonais THEN o sistema SHALL exibir a soma de `firstSaturdayEvents`, `secondSundayEvents`, `clearFieldsEvents`, `battleBeaconCombatant`, `apolloTokens`, `apolloModBattlePoints`, `seerPoints`, `xmRecharged` e `agentsRecruited`, cada um lido de `extra_stats` entre os agentes que o informaram
2. IF um agente não tem uma dessas chaves em `extra_stats` THEN o sistema SHALL excluir esse agente do somatório e do divisor dessa métrica específica, nunca tratar a ausência como zero
3. WHEN o visitante visualiza a seção de eventos sazonais THEN o sistema SHALL exibir, ao lado de cada métrica, quantos agentes informaram aquele dado (numerador do quão completa é a amostra)
4. WHEN o visitante visualiza a seção de eventos sazonais THEN o sistema SHALL exibir um aviso visível de que esses números são parciais (dependem do que cada agente colou no export), não um censo completo

**Independent Test**: Popular um agente de teste sem `extra_stats.firstSaturdayEvents` e confirmar que ele não reduz a média nem é contado como "0 First Saturdays"; conferir que o contador "N agentes informaram" bate com `COUNT(*) WHERE extra_stats ? 'firstSaturdayEvents'`.

---

### P6: Assinatura paga ⭐ MVP

**User Story**: Como visitante nerd, quero saber que fração da comunidade tem/teve assinatura paga do Ingress, para ter uma leitura honesta do componente de monetização do jogo, sem inventar uma métrica de "medalha comprada" que não existe.

**Why P1**: Resposta direta ao pedido de "pay to win" — o único dado real e defensável disponível.

**Acceptance Criteria**:

1. The system SHALL aceitar um campo opcional `monthsSubscribed` no corpo de `POST /api/ingress-rankings`, gravando-o na nova coluna `months_subscribed`
2. IF `monthsSubscribed` está ausente ou não é um número finito ≥ 0 THEN o sistema SHALL gravar `NULL` nessa coluna, sem rejeitar a requisição (mesmo tratamento já dado a `recursions`)
3. WHEN o visitante visualiza a seção de assinatura THEN o sistema SHALL exibir o percentual de agentes com `months_subscribed IS NOT NULL AND months_subscribed > 0` sobre o total de agentes com `months_subscribed IS NOT NULL`
4. WHEN o visitante visualiza a seção de assinatura THEN o sistema SHALL exibir a média de `months_subscribed` entre agentes com `months_subscribed > 0`
5. IF nenhum agente tem `months_subscribed` preenchido (todas as linhas anteriores à migration) THEN o sistema SHALL exibir "sem dados suficientes" em vez de 0%/média zerada

**Independent Test**: Enviar um `POST /api/ingress-rankings` com `monthsSubscribed: 14` e conferir que a coluna grava 14; enviar sem o campo e conferir `NULL`; comparar o percentual exibido com uma contagem manual.

---

### P7: Geografia — top países

**User Story**: Como visitante nerd, quero ver de quais países vêm os agentes cadastrados, para ter uma ideia do alcance geográfico da comunidade.

**Why P2**: Dado já existe (`country_code`) e é barato de agregar, mas é secundário ao core analítico acima.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de geografia THEN o sistema SHALL exibir os países com mais agentes cadastrados, ordenados por contagem decrescente
2. IF um agente não tem `country_code` preenchido THEN o sistema SHALL excluí-lo da contagem por país (sem inventar uma categoria "desconhecido" nesta versão)

**Independent Test**: Comparar a lista exibida com `SELECT country_code, COUNT(*) FROM casara.ingress_rankings WHERE country_code IS NOT NULL GROUP BY country_code ORDER BY 2 DESC`.

---

### P8: Crescimento da comunidade no tempo

**User Story**: Como visitante nerd, quero ver como o número de agentes cadastrados cresceu ao longo do tempo, para sentir a trajetória do ranking, não só o estado atual.

**Why P2**: Usa dado que já existe (`created_at`), mas exige agregação por período (bucket de tempo), mais trabalho que os KPIs pontuais do P1.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de crescimento THEN o sistema SHALL exibir a contagem cumulativa de agentes cadastrados, agrupada por semana, a partir do `created_at` de `casara.ingress_rankings`

**Independent Test**: Comparar a série exibida com uma contagem cumulativa manual por semana a partir de `created_at`.

---

### P9: Correlação e curiosidades

**User Story**: Como visitante nerd, quero ver relações menos óbvias entre métricas (AP x nota geral, eixo mais fraco da comunidade), para ter algo "de verdade nerd" pra explorar.

**Why P3**: É o tipo de conteúdo exploratório que enriquece a aba, mas não é essencial — só faz sentido depois que o core (P1-P6) está sólido.

**Acceptance Criteria**:

1. WHEN o visitante visualiza a seção de correlação THEN o sistema SHALL exibir um gráfico de dispersão com `lifetime_ap` no eixo X e `overall_score` no eixo Y, um ponto por agente
2. WHEN o visitante visualiza a seção de correlação THEN o sistema SHALL identificar qual dos 5 eixos do radar tem a menor média entre todos os agentes ("o eixo mais fraco da comunidade")

**Independent Test**: Conferir visualmente que o ponto de um agente conhecido (ex.: FencherLC) aparece na posição correspondente ao seu `lifetime_ap`/`overall_score` reais.

---

## Edge Cases

- IF a consulta a `casara.ingress_rankings` falhar (tabela ainda não existe, erro de conexão) THEN o sistema SHALL degradar para o mesmo estado vazio gracioso já usado em `loadInitialRows`/`loadInitialActivity`, sem derrubar a página
- IF `casara.ingress_ranking_history` estiver vazia mas `casara.ingress_rankings` tiver linhas (banco migrado sem histórico retroativo) THEN "total de envios" SHALL exibir 0 sem quebrar as demais seções
- IF um agente tem `stat_values` com uma chave do radar ausente ou não numérica THEN o sistema SHALL tratar essa chave como 0 nos recordes/agregações (mesmo comportamento já usado por `computeStatTiers`/`computeRadarAxes` hoje)
- WHEN o número de agentes cadastrados é 1 THEN as seções de facção, médias e hall da fama SHALL exibir esse único agente normalmente (sem exigir um mínimo artificial de amostra)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --------------- | ----------------------------------- | ------ | ------- |
| NERD-01 | P1: Totais da comunidade | - | Pending |
| NERD-02 | P1: Totais da comunidade | - | Pending |
| NERD-03 | P1: Totais da comunidade | - | Pending |
| NERD-04 | P1: Totais da comunidade | - | Pending |
| NERD-05 | P1: Totais da comunidade | - | Pending |
| NERD-06 | P1: Totais da comunidade | - | Pending |
| NERD-07 | P1: Totais da comunidade | - | Pending |
| NERD-08 | P2: Comparativo por facção | - | Pending |
| NERD-09 | P2: Comparativo por facção | - | Pending |
| NERD-10 | P2: Comparativo por facção | - | Pending |
| NERD-11 | P2: Comparativo por facção | - | Pending |
| NERD-12 | P2: Comparativo por facção | - | Pending |
| NERD-13 | P2: Comparativo por facção | - | Pending |
| NERD-14 | P3: Médias e distribuição | - | Pending |
| NERD-15 | P3: Médias e distribuição | - | Pending |
| NERD-16 | P3: Médias e distribuição | - | Pending |
| NERD-17 | P3: Médias e distribuição | - | Pending |
| NERD-18 | P3: Médias e distribuição | - | Pending |
| NERD-19 | P3: Médias e distribuição | - | Pending |
| NERD-20 | P4: Hall da fama | - | Pending |
| NERD-21 | P4: Hall da fama | - | Pending |
| NERD-22 | P4: Hall da fama | - | Pending |
| NERD-23 | P4: Hall da fama | - | Pending |
| NERD-24 | P5: Eventos sazonais | - | Pending |
| NERD-25 | P5: Eventos sazonais | - | Pending |
| NERD-26 | P5: Eventos sazonais | - | Pending |
| NERD-27 | P5: Eventos sazonais | - | Pending |
| NERD-28 | P6: Assinatura paga | - | Pending |
| NERD-29 | P6: Assinatura paga | - | Pending |
| NERD-30 | P6: Assinatura paga | - | Pending |
| NERD-31 | P6: Assinatura paga | - | Pending |
| NERD-32 | P6: Assinatura paga | - | Pending |
| NERD-33 | P7: Geografia | - | Pending |
| NERD-34 | P7: Geografia | - | Pending |
| NERD-35 | P8: Crescimento no tempo | - | Pending |
| NERD-36 | P9: Correlação e curiosidades | - | Pending |
| NERD-37 | P9: Correlação e curiosidades | - | Pending |

**ID format:** `NERD-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 37 total, 0 mapped to tasks, 37 unmapped ⚠️ (esperado nesta fase — Tasks ainda não rodou)

---

## Success Criteria

- [ ] A aba "Estatísticas para Nerds" aparece em `/ingress/ranking`, ao lado de "Ranking" e "Radar de atividade", seguindo o mesmo padrão de troca de aba (`IngressRankingTabs`)
- [ ] Todos os KPIs do P1-P6 batem com uma query manual equivalente rodada direto no Neon
- [ ] A aba carrega sem poll (uma única leitura no SSR da página), sem round-trip extra ao trocar de aba
- [ ] Nenhum gráfico novo usa uma lib externa — tudo em SVG, consistente com `/stats` e o radar existente
- [ ] `POST /api/ingress-rankings` continua aceitando requisições sem `monthsSubscribed` sem rejeitar (compatibilidade com clientes antigos)
