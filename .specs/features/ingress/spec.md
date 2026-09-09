# Ingress — Perfil de Agente Specification

## Problem Statement

Luiz (agente **FencherLC**, Enlightened) quer apresentar seu perfil de Ingress no
site de forma muito visual e interativa — um "biocard" digital mais completo que
os cartões que a comunidade troca — para compartilhar com outros agentes. Hoje só
existe um export de estatísticas em TSV (um snapshot, sem série temporal) e
nenhum lugar no site onde esse perfil viva. O dump GDPR completo (com histórico)
ainda não foi solicitado, então a feature precisa entregar valor com o snapshot e
enriquecer depois sem retrabalho.

## Goals

- [ ] Página `/ingress` pública, em português, com layout próprio e tema
      Enlightened, que renderiza o perfil **a partir de um único JSON versionado**
      — sem dados ao vivo da Niantic, sem banco.
- [ ] Script local de ingestão que converte o export de estatísticas do app (e,
      quando chegar, o dump GDPR) nesse JSON, de forma idempotente, com
      `--dry-run` e confirmação antes de gravar.
- [ ] Seções no MVP: identidade essencial, cards de estatísticas agrupadas,
      badges com tier calculado, gráficos do perfil (radar + distribuição),
      explorador S2 simples sobre mapa.
- [ ] Seções que dependem do dump GDPR (evolução de AP no tempo, mapa de portais)
      renderizam um **estado "aguardando dump"** explícito — nunca dado falso.
- [ ] Imagem OpenGraph para o link renderizar bem quando compartilhado em
      Telegram / COMM / redes.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Rota multi-agente `/ingress/[agente]` | Luiz decidiu MVP só com o próprio perfil; refatora se a monetização virar real |
| Pagamento, formulário de pedido, self-service para outros agentes | Ideia de monetização ainda é hipótese, não requisito |
| Qualquer consulta ao Intel Map / scraping / hospedar IITC | Viola os Termos de Serviço da Niantic (ver `docs/ingress-contexto-e-restricoes.md`) |
| Solicitar / processar o dump GDPR real | Ainda não pedido; as seções dependentes ficam em estado de espera |
| Mapa de calor de portais com dados reais | Depende do dump GDPR |
| Foto/avatar e bio longa do agente | Luiz escolheu "só o essencial" para identidade no MVP |
| Edição via navegador / rota de admin | Mesmo princípio de `/livros`: sem superfície de escrita pública |
| Alternância de facção / temas de cor | Só o Luiz (Enlightened) no MVP |
| Projeção de AP futuro | Nice-to-have sem valor claro agora (projeção de tier de badge foi feita — MED-08; progresso além do Onyx — MED-10) |
| Contagem **real** de recursão por medalha | O export não traz — MED-16 mostra as asinhas com base em `valor ÷ limiar Onyx` (aproximação honesta, rotulada como tal); a contagem oficial por medalha aguarda o dump GDPR |
| Colecionáveis e Personagens no catálogo | Não dá pra identificar com segurança pelos thumbnails; `MedalGrid` já tem os grupos prontos, populados quando o dump GDPR chegar |

---

## Assumptions & Open Questions

| Assumption / decisão | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte de dados da página | Um arquivo JSON versionado no repo (ex.: `data/ingress/fencherlc.json`), atualizado por script rodado localmente pelo Luiz | Sem dados ao vivo; mesmo espírito de "sem rota admin" de `/livros`; não usa o schema `casara` nem `DATABASE_URL` | y |
| Seções que dependem do dump GDPR quando não há dado | Renderizam um estado "aguardando dump GDPR" (placeholder explicativo), sem gráfico e sem número inventado | Mockar com dado falso enganaria quem recebe o link compartilhado | y |
| Série temporal no MVP | Não existe (o snapshot não tem). A seção de evolução de AP entra estruturalmente mas em estado de espera | Só o dump GDPR traz histórico; ver `docs/ingress-gdpr-dump-estrutura.md` | y |
| Mapa do explorador S2 | Leaflet + tiles OpenStreetMap, centrado na cidade do Luiz (coordenada num campo do JSON; valor real fornecido pelo Luiz), sem busca/geocoding no MVP | Luiz optou por centrar na região real; suficiente para "desenhar a grade S2 sobre um mapa da minha região" | y |
| Biblioteca de geometria S2 | Lib S2 em JS no lado cliente (ex.: `s2-geometry`), a confirmar disponibilidade/manutenção no Design | S2 é open-source do Google, não é dado proprietário da Niantic | n |
| Limiares de badge por tier | Tabela mantida à mão em `lib/ingress-badges.mjs`, copiada da wiki oficial do Ingress na implementação e coberta por teste | Valores de memória saem errados; é dado que corrompe o resultado se estiver errado | y |
| Formatação de números | pt-BR (`Intl.NumberFormat('pt-BR')`) | Consistente com o resto do site PT-only | y |
| Idioma | `/ingress` é só português, fora do `LanguageProvider` | Igual a `/livros` e às dinâmicas | y |
| Lógica pura (parsing, badges, S2 helpers, completude de dados) | Em `lib/*.mjs` com testes `lib/*.test.mjs` (`npm test` = `node --test`) | Mesmo padrão de `lib/book-utils.mjs`; o CLI é Node puro e não importa `.ts` | y |
| Analytics | Só o `page_view` automático do middleware; sem `trackEvent` custom no MVP | CLAUDE.md desencoraja eventos que um `page_view` já responde | y |
| Gráficos | Biblioteca a decidir no Design (o protótipo usa Chart.js; o site já usa outras libs de viz em `/stats`) | Decisão de arquitetura, não de produto | n |
| Identidade do agente no card | codinome + facção + nível + recursões + meses de assinatura; sem foto, sem bio | Escolha "só o essencial" do Luiz | y |
| Dados de exemplo até o export real ser processado | O JSON inicial é populado com os números **reais** do export de 07/09/2026 (já temos esse dado em `docs/ingress-perfil-fencherlc.md`) | Não é mock — é o dado real do snapshot | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Perfil renderizado a partir do JSON ⭐ MVP

**User Story**: Como agente FencherLC, quero uma página `/ingress` que mostre
minha identidade e minhas estatísticas agrupadas de forma visual, para
compartilhar meu perfil de Ingress com outros agentes.

**Why P1**: É o núcleo da feature — sem isto não há o que compartilhar.

**Acceptance Criteria**:

1. WHEN um visitante acessa `/ingress` THEN o sistema SHALL renderizar codinome,
   facção, nível, recursões e meses de assinatura lidos do JSON de perfil.
2. WHEN a página monta a seção de estatísticas THEN o sistema SHALL exibir os
   valores numéricos do JSON agrupados por categoria (AP/XM, portais,
   links/campos, hacking, drones, Machina, exploração/eventos, scanner/OPR/Scout),
   cada número formatado em pt-BR.
3. The system SHALL servir `/ingress` em português com layout próprio (sem o
   header/footer padrão do site), fora do `LanguageProvider`.
4. IF o JSON de perfil não contém uma chave de estatística esperada THEN o
   sistema SHALL omitir aquele item sem quebrar o restante da renderização.
5. The system SHALL renderizar `/ingress` sem nenhuma chamada de rede a domínios
   da Niantic em tempo de execução.
6. The system SHALL ser mobile-first: em viewport de 360px de largura, todas as
   seções (identidade, stats, badges, gráficos, mapa S2) SHALL ser plenamente
   legíveis e utilizáveis sem scroll horizontal na página.

**Independent Test**: Com o JSON real do snapshot no repo, abrir `/ingress` e ver
o cabeçalho de identidade e todos os grupos de stats com os números de
`docs/ingress-perfil-fencherlc.md`.

---

### P1: Script de ingestão do export do app ⭐ MVP

**User Story**: Como Luiz, quero rodar um script local que pega meu export de
estatísticas do app e monta o JSON base da tela, para atualizar meu perfil sem
editar JSON à mão.

**Why P1**: É o mecanismo de atualização; o Luiz vai mandar exports novos ao
longo do tempo.

**Acceptance Criteria**:

1. WHEN o script recebe o caminho de um arquivo de export de estatísticas do app
   (TSV com a linha `ALL TIME`) THEN o sistema SHALL produzir um objeto JSON com
   `agent`, `capturedAt`, `source: "app-export"` e `stats` com todas as
   estatísticas da linha mapeadas para chaves estáveis.
2. IF o arquivo de export tem número de colunas diferente do cabeçalho, ou não
   tem a linha de dados THEN o sistema SHALL abortar com mensagem de erro
   identificando o problema e SHALL NOT gravar o JSON.
3. WHEN o script roda sem `--apply` (ou com `--dry-run`) THEN o sistema SHALL
   imprimir o que gravaria e SHALL NOT escrever no disco.
4. WHEN o script roda com `--apply` THEN o sistema SHALL exibir um diff/resumo do
   que muda em relação ao JSON atual e gravar o arquivo só após confirmação.
5. WHEN o script processa o mesmo export duas vezes THEN o sistema SHALL produzir
   um JSON idêntico (idempotente).
6. IF o JSON de perfil já contém seções derivadas do dump GDPR THEN o sistema
   SHALL preservá-las ao regravar a partir de um export do app (merge, não
   sobrescrita total).

**Independent Test**: Rodar o script sobre o TSV de 07/09/2026 duas vezes;
comparar os dois JSONs (idênticos) e conferir os valores contra
`docs/ingress-perfil-fencherlc.md`.

---

### P1: Badges com tier ⭐ MVP

**User Story**: Como agente, quero ver minhas medalhas com o tier atual e quanto
falta para o próximo, porque é a parte mais reconhecível de um perfil de Ingress.

**Why P1**: Badges são identidade central de um biocard; derivam direto dos stats
que já teremos.

**Acceptance Criteria**:

1. WHEN a página monta a seção de badges THEN o sistema SHALL, para cada badge
   suportada, calcular o tier atual (Sem medalha / Bronze / Silver / Gold /
   Platinum / Onyx) a partir do valor da estatística correspondente e da tabela
   de limiares em `lib/ingress-badges.mjs`.
2. WHEN uma badge não está no tier máximo THEN o sistema SHALL exibir o valor que
   falta para o próximo tier.
3. WHILE uma badge está em Onyx o sistema SHALL indicar tier máximo atingido e
   não exibir "falta para o próximo".
4. IF a estatística de origem de uma badge está ausente no JSON THEN o sistema
   SHALL omitir aquela badge da seção.
5. The system SHALL definir cada limiar de tier em `lib/ingress-badges.mjs` com
   os valores oficiais do Ingress e cobrir o cálculo de tier com testes.

**Independent Test**: Teste unitário de `computeBadgeTier` com valores nas
fronteiras de cada tier; visualmente, a seção de badges de `/ingress` bate com os
tiers esperados para os números do FencherLC.

---

### P1: Estado "aguardando dump GDPR" ⭐ MVP

**User Story**: Como Luiz, quero que as seções que dependem do histórico completo
apareçam como "em breve" em vez de sumirem ou mostrarem dado falso, para que
quem recebe o link entenda que o perfil vai crescer.

**Why P1**: Define o comportamento honesto da página no estado inicial (o único
estado que existe no lançamento).

**Acceptance Criteria**:

1. WHILE o JSON de perfil não tem série temporal de AP o sistema SHALL renderizar
   a seção "evolução de AP" como um placeholder explicando que depende do dump
   GDPR, sem eixos nem dados.
2. WHILE o JSON de perfil não tem lista de portais o sistema SHALL renderizar a
   seção "mapa de portais" como um placeholder equivalente.
3. The system SHALL derivar quais seções estão em espera de um campo explícito do
   JSON (ex.: `pending: [...]`) e não de valores mágicos como zero ou null
   espalhados.
4. WHEN o JSON passa a conter os dados de uma seção antes em espera THEN o
   sistema SHALL renderizar a seção real sem mudança de código.

**Independent Test**: Com o JSON só-snapshot, as duas seções mostram placeholder;
injetando um JSON de teste com série temporal, a seção de evolução renderiza o
gráfico.

---

### P2: Gráficos do perfil (snapshot)

**User Story**: Como agente, quero um gráfico de radar do meu perfil e uma
distribuição das minhas ações, para enxergar meu estilo de jogo num relance.

**Why P2**: Aumenta muito o apelo visual, mas o perfil já é compartilhável sem
isso.

**Acceptance Criteria**:

1. WHEN a página monta a seção de gráficos THEN o sistema SHALL renderizar um
   radar com eixos derivados do snapshot (ex.: construção, destruição,
   exploração, hacking, links/campos) normalizados por uma referência definida em
   código.
2. WHEN a página monta a seção de gráficos THEN o sistema SHALL renderizar uma
   distribuição (barras ou rosca) de uma família de contagens do snapshot (ex.:
   capturas vs. neutralizações vs. ressonadores destruídos).
3. The system SHALL calcular os valores normalizados do radar em `lib/*.mjs`
   coberto por teste, separado do componente de renderização.
4. IF falta uma estatística usada por um eixo do radar THEN o sistema SHALL
   tratar aquele eixo como 0 e continuar renderizando os demais.

**Independent Test**: Teste unitário da normalização do radar; visualmente os
dois gráficos aparecem em `/ingress` coerentes com os números do snapshot.

---

### P2: Explorador de células S2

**User Story**: Como agente, quero um mini-mapa com um slider de nível de célula
S2 desenhando a grade, para ilustrar o sistema que o Ingress usa para
portais/links.

**Why P2**: É interativo e "de Ingress", mas independente do resto do perfil.

**Acceptance Criteria**:

1. WHEN a seção S2 monta THEN o sistema SHALL exibir um mapa interativo (Leaflet +
   tiles OSM) centrado na coordenada configurada no JSON.
2. WHEN o usuário move o slider de nível (faixa mínima–máxima definida em código)
   THEN o sistema SHALL redesenhar as bordas das células S2 daquele nível
   visíveis na viewport.
3. WHEN o usuário arrasta o mapa THEN o sistema SHALL recalcular as células
   visíveis para a nova viewport.
4. The system SHALL manter a matemática de células S2 (cobrir uma viewport,
   gerar polígonos de borda) em `lib/*.mjs` coberta por teste, separada do
   componente de mapa.
5. IF a biblioteca de mapa falha ao carregar THEN o sistema SHALL exibir uma
   mensagem de fallback na seção sem quebrar o resto da página.

**Independent Test**: Testes unitários dos helpers S2 (uma viewport conhecida num
nível conhecido produz o conjunto esperado de tokens de célula); visualmente o
slider muda a densidade da grade no mapa.

---

### P2: Imagem OpenGraph

**User Story**: Como Luiz, quero que colar o link `/ingress` no Telegram/COMM
mostre um cartão bonito, para o perfil circular bem.

**Why P2**: Amplifica o compartilhamento, mas não bloqueia o uso.

**Acceptance Criteria**:

1. WHEN um crawler busca os metadados de `/ingress` THEN o sistema SHALL servir
   uma imagem OpenGraph gerada com codinome, facção, nível e alguns números de
   destaque do JSON.
2. The system SHALL definir `title` e `description` OpenGraph/Twitter próprios
   para a rota.

**Independent Test**: `curl` nos metadados da rota mostra as tags og:*; a rota
`opengraph-image` responde 200 com uma imagem.

---

### P3: Ingestão do dump GDPR

**User Story**: Como Luiz, quando o dump GDPR chegar, quero rodar o mesmo script
apontando para a pasta do dump e ver a evolução de AP e o mapa de portais
preenchidos.

**Why P3**: Depende de um insumo externo que ainda não existe (~30 dias após
solicitar).

**Acceptance Criteria**:

1. WHEN o script recebe o caminho de uma pasta de dump GDPR THEN o sistema SHALL
   ler os arquivos de série temporal (`*.tsv` no formato `timestamp → valor`) e
   as listas de portais com coordenadas e adicioná-los ao JSON de perfil.
2. WHEN o script mescla o dump ao JSON THEN o sistema SHALL preservar os campos
   `agent`/`stats` vindos do export do app se forem mais recentes, e remover das
   `pending` as seções agora preenchidas.
3. IF um arquivo esperado do dump está ausente ou vazio THEN o sistema SHALL
   registrar um aviso e continuar com os demais, sem abortar.
4. WHEN a série temporal de AP existe no JSON THEN a página SHALL renderizar o
   gráfico de evolução de AP no lugar do placeholder.

**Independent Test**: Com uma pasta de dump de exemplo (fixtures pequenos), rodar
o script e ver a série temporal e os portais no JSON e o gráfico na página.

---

# Expansão — Medalhas (Onda 1)

Segunda rodada, em cima da feature entregue. Objetivo: as medalhas viram o centro
da rota `/ingress`, com página de detalhe própria, seção de conquistas
(anomalias/eventos/colecionáveis), timeline de quando cada uma foi conquistada, e
o hover no KPI mostrando a badge relacionada. Análise completa e as ondas
seguintes: `docs/ingress-medalhas-analise.md`.

Fatos que mudam o desenho:
- O catálogo de badges do **ingress.plus** (API PocketBase aberta) traz, para 26
  medalhas de contagem, o `stat_line` (que casa com uma coluna do export),
  `tier_values` e o texto do requisito. Ou seja, além das 14 atuais entram mais
  12 (Translator, Seer, Recruiter, Guardian, Recon, Scout, Scout Controller,
  NL-1331 Meetups, Mission Day, First Saturday, Second Sunday, Operation Clear
  Field) — **todas pelo mesmo mecanismo** (`stat` → tier).
- O scanner do jogo mostra a **data de conquista de cada tier**. O Luiz manda
  prints; a transcrição vai para o perfil. A timeline de conquistas já renderiza
  com o que houver, sem esperar o dump.
- Badges que não são de contagem (anomalias, personagens, colecionáveis,
  Recursion, Founder, Verified) vêm de um print do perfil para um campo
  `eventBadges`.

## Assumptions & Open Questions (expansão)

| Assumption / decisão | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte dos limiares e do catálogo | ingress.plus (`/api/collections/i37o5ykupb5voix/records`), conferido contra o Fev Games | Fonte viva, atualizada em 2026-03, bateu em 13/14 no cruzamento anterior | y |
| Forma do detalhe da badge | Rota própria `/ingress/medalha/[slug]`, server-rendered, `generateStaticParams` do catálogo | Compartilhável ("peguei Trekker Onyx"), combina com o propósito da feature | y |
| Badges de contagem no MVP | As 26 com `stat_line` mapeável; badge sem a stat no perfil aparece com tier "Sem medalha" | Mesmo mecanismo, custo marginal zero | y |
| Datas de conquista | Campo esparso no perfil (`medalDates` para as de stat, `eventBadges[].dates` para eventos); transcritas de prints, completadas pelo dump depois | O jogo mostra as datas; não faz sentido esperar o dump para começar | y |
| Catálogo navegável das ~391 badges | Fora da Onda 1 — onda futura, com a arte linkada do ingress.plus | Não inchar; a maioria não é do Luiz | y |
| Arte das 26 badges (5 tiers cada) | Baixada do ingress.plus por `scripts/ingress.mjs medals --fetch` (thumbs ~96px), versionada em `public/ingress/medals/` | A página de detalhe precisa da escada de tiers offline; ~1 MB é aceitável (comparável a `public/livros/capas/`) | y |
| `history[]` no perfil | `build` adiciona um snapshot `{t, stats}` por export com `capturedAt` novo | Destrava a projeção (Onda 2) sem retrabalho | y |
| Projeção de próximo tier | Estruturada agora (P3), só calcula com ≥2 snapshots em `history` | Precisa de taxa; hoje só há 1 ponto | y |
| Ordem das seções | hero (com globo no desktop) → grade de medalhas → resumo da linha do tempo → radar "Padrão de jogo" → grupos de stats (AP e XM…) → distribuição → AP/portais/S2 | Medalhas na frente e o radar antes dos números foram pedidos do Luiz | y |

## User Stories (expansão)

### MED-01: Medalhas como centro da página ⭐ P1

**User Story**: Como agente, quero que minhas medalhas sejam a primeira coisa
depois do meu codinome, porque elas dão vida aos números.

**Acceptance Criteria**:

1. WHEN a página `/ingress` monta THEN o sistema SHALL renderizar a seção de
   medalhas imediatamente após o hero e antes dos painéis de estatística.
2. WHEN a seção de medalhas monta THEN o sistema SHALL exibir as 26 badges de
   contagem, cada uma com a arte do tier atual (ou um estado "Sem medalha"), e um
   resumo de contagem por tier (ex.: "6 Onyx · 4 Platina · …").
3. WHEN a seção de medalhas monta THEN o sistema SHALL destacar a "próxima
   medalha": a badge não-máxima com o maior percentual de progresso até o próximo
   tier.
4. IF a estatística de origem de uma badge está ausente no perfil THEN o sistema
   SHALL exibir a badge com tier "Sem medalha", não omiti-la.

**Independent Test**: Abrir `/ingress`; a seção de medalhas vem antes dos KPIs,
mostra 26 badges, o resumo de tiers e a "próxima medalha".

---

### MED-02: Página de detalhe da medalha ⭐ P1

**User Story**: Como agente, quero clicar numa medalha e ver a escada de tiers,
o requisito, onde estou e quando peguei cada tier.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/ingress/medalha/[slug]` de uma badge do catálogo THEN
   o sistema SHALL renderizar a escada dos 5 tiers (arte + limiar de cada), o
   tier atual do agente, o valor exato da estatística, o texto do requisito e o
   que falta para o próximo tier.
2. IF o slug não corresponde a nenhuma badge do catálogo THEN o sistema SHALL
   responder com `notFound()` (404).
3. WHERE o perfil tem data de conquista de um tier THEN o sistema SHALL exibi-la;
   caso contrário SHALL exibir um traço.
4. WHEN o usuário clica numa badge na seção de medalhas THEN o sistema SHALL
   navegar para a página de detalhe correspondente.
5. The system SHALL gerar as rotas de detalhe estaticamente
   (`generateStaticParams`) a partir do catálogo.

**Independent Test**: `/ingress/medalha/trekker` mostra os 5 tiers de Trekker com
limiares 10/100/300/1000/2500, marca Onyx como atual; `/ingress/medalha/xpto` dá
404.

---

### MED-03: Seção "Conquistas" (badges que não são de contagem) ⭐ P1

**User Story**: Como agente, quero que minhas anomalias, badges de evento e
colecionáveis apareçam no perfil.

**Acceptance Criteria**:

1. WHERE o perfil tem `eventBadges` THEN o sistema SHALL exibi-las com a arte do
   catálogo, agrupadas por categoria (anomalia / evento / personagem /
   colecionável / outros).
2. IF uma entrada de `eventBadges` referencia um slug fora do catálogo THEN o
   sistema SHALL omiti-la sem quebrar a seção.
3. WHERE uma `eventBadge` tem `count` THEN o sistema SHALL exibi-lo (ex.:
   "Recursion ×2").
4. WHEN não há nenhuma `eventBadge` THEN o sistema SHALL exibir um convite para
   adicioná-las via `scripts/ingress.mjs badges`, não uma seção vazia.

**Independent Test**: Com 2-3 `eventBadges` no perfil de teste, a seção mostra as
artes agrupadas por categoria e as contagens.

---

### MED-04: Histórico de snapshots ⭐ P1

**User Story**: Como Luiz, quero que cada export que eu mandar seja guardado,
para destravar a evolução e a projeção depois.

**Acceptance Criteria**:

1. WHEN o `build` recebe um export cujo `capturedAt` difere do último snapshot em
   `history` THEN o sistema SHALL adicionar `{t, stats}` a `history`, preservando
   os anteriores.
2. IF o `capturedAt` do export já é o último snapshot de `history` THEN o sistema
   SHALL NÃO duplicar a entrada.
3. The system SHALL manter `history` ordenado por `t` ascendente.
4. WHEN o `gdpr` roda THEN o sistema SHALL poder inserir snapshots anteriores ao
   primeiro `history` sem quebrar a ordem.

**Independent Test**: Rodar `build` com dois exports de datas diferentes;
`history` tem 2 entradas ordenadas. Rodar de novo com o mesmo; continua 2.

---

### MED-05: CLI para conquistas e arte ⭐ P1

**User Story**: Como Luiz, quero um comando para registrar minhas badges de
evento (e as datas dos tiers) e para baixar a arte que falta.

**Acceptance Criteria**:

1. WHEN o usuário roda `scripts/ingress.mjs badges` THEN o sistema SHALL listar
   as `eventBadges` e as `medalDates` atuais e aceitar adicionar/remover
   (slug do catálogo + `count`/`tier` + datas por tier), gravando com o mesmo
   fluxo dry-run/`--apply` dos outros comandos.
2. IF um slug informado não está no catálogo THEN o sistema SHALL avisar e não
   gravar aquela entrada.
3. WHEN o usuário roda `scripts/ingress.mjs medals --fetch` THEN o sistema SHALL
   baixar do ingress.plus a arte ausente das 26 badges (5 tiers) e das
   `eventBadges`, para `public/ingress/medals/`, pulando o que já existe.
4. IF o download de uma imagem falha ou devolve algo que não é PNG THEN o sistema
   SHALL avisar e seguir para a próxima, sem gravar arquivo inválido.

**Independent Test**: `medals --fetch` baixa os PNGs que faltam e reporta o
total; rodar de novo não baixa nada.

---

### MED-06: Timeline de conquistas — P2

**User Story**: Como agente, quero uma linha do tempo mostrando quando conquistei
cada medalha/tier.

**Acceptance Criteria**:

1. WHEN o perfil tem 2 ou mais datas de conquista (entre `medalDates` e
   `eventBadges[].dates`) THEN o sistema SHALL renderizar uma linha do tempo com
   um marcador por (badge, tier) na data respectiva, ordenada.
2. WHILE há menos de 2 datas o sistema SHALL renderizar um placeholder explicando
   que a timeline cresce conforme as datas forem transcritas dos prints ou vier o
   dump.
3. WHEN o usuário passa o mouse (ou foca) num marcador THEN o sistema SHALL
   mostrar qual badge, tier e data.

**Independent Test**: Perfil de teste com 4 datas → timeline com 4 marcadores
ordenados; perfil sem datas → placeholder.

---

### MED-07: Hover no KPI mostra a badge — P2

**User Story**: Como agente, quero que passar o mouse num número mostre a medalha
que aquele número alimenta.

**Acceptance Criteria**:

1. WHEN o usuário passa o mouse ou foca num `StatValue` cuja `statKey` alimenta
   uma badge THEN o sistema SHALL exibir a mini-arte e o tier daquela badge.
2. WHERE não há badge para aquela `statKey` THEN o sistema SHALL não exibir nada
   extra.
3. The system SHALL, sem hover disponível (touch), exibir um indicador pequeno da
   badge junto ao KPI.

**Independent Test**: Hover em "Ressonadores implantados" mostra Builder no tier
atual; hover em "XM coletado" (sem badge) não mostra nada.

---

### MED-08: Projeção de próximo tier — P3

**User Story**: Como Luiz, quando eu tiver mandado 2+ exports, quero uma
estimativa de quando bato os próximos tiers.

**Acceptance Criteria**:

1. WHEN `history` tem 2 ou mais snapshots THEN o sistema SHALL calcular a taxa
   (por dia) de cada estatística com badge e estimar a data do próximo tier.
2. WHILE `history` tem menos de 2 snapshots o sistema SHALL indicar que a
   projeção precisa de mais um export.
3. IF a taxa de uma estatística é zero ou negativa THEN o sistema SHALL indicar
   "sem progresso recente" em vez de uma data.

**Independent Test**: `history` com 2 pontos e uma taxa conhecida → data estimada
plausível; `history` com 1 ponto → mensagem de "precisa de mais um export".

---

## User Stories — Iteração de UI (09/09/2026)

Rodadas de feedback do Luiz sobre o visual, depois da feature original + expansão.
Cada uma foi tratada como mudança BOUNDED (brainstorming → design curto no chat →
aprovação → implementação). Substituem/estendem MED-06.

### MED-09: Linha do tempo estruturada e navegável ⭐ P2

**User Story**: Como agente, quero uma linha do tempo que dê pra tirar informação
— com hover, filtros, zoom e drill-down — não só um enxame de pontos.

**Why**: A timeline é um diferencial do biocard; a versão de MED-06 era ilegível.

**Acceptance Criteria**:

1. WHEN o perfil tem 2+ datas de conquista THEN o sistema SHALL renderizar em
   `/ingress/linha-do-tempo` uma visão "combo": uma curva acumulada do total no
   topo e uma swimlane com uma raia por medalha embaixo.
2. WHEN o usuário arrasta na curva acumulada THEN o sistema SHALL recortar a
   janela de tempo da swimlane (zoom por brush) e SHALL oferecer um controle para
   voltar ao período inteiro.
3. WHEN o usuário aciona os filtros de categoria (estatística / anomalia /
   evento) ou de tier THEN o sistema SHALL restringir as raias e pontos exibidos
   sem repintar os demais.
4. WHERE a viewport é estreita (mobile) THEN o sistema SHALL manter os rótulos
   das raias fixos à esquerda e rolar apenas a área do gráfico na horizontal,
   nunca a página.
5. WHEN o usuário toca num ponto THEN o sistema SHALL abrir um painel de detalhe
   acima do gráfico com a arte da medalha, um mini gráfico dos tiers nas datas
   reais, a escada de tiers com o intervalo entre cada data, e — para badge de
   estatística — o valor exigido em cada tier, o valor atual e o link para a
   página da medalha.
6. WHEN a página `/ingress` monta THEN o sistema SHALL exibir um resumo da linha
   do tempo (curva acumulada + as medalhas mais recentes) que leva para
   `/ingress/linha-do-tempo`.
7. The system SHALL gerar uma imagem OpenGraph própria para `/ingress/linha-do-tempo`.

**Independent Test**: `/ingress/linha-do-tempo` com o perfil real → combo com
brush funcional, filtros, e toque num ponto abre o painel; a 360px o gráfico rola
só na horizontal dentro do card. `groupLanes`/`annotateLaneGaps`/`formatGap`
cobertos por teste.

---

### MED-10: Progresso além do Onyx ⭐ P2

**User Story**: Como agente recursado, quero ver o % até a próxima "dobra" de uma
Onyx, não só "tier máximo".

**Acceptance Criteria**:

1. WHILE uma badge está em Onyx o sistema SHALL calcular a próxima dobra
   (`Onyx ×2`, `×3`, …) como o próximo múltiplo do limiar de Onyx, com o quanto
   falta e o percentual de progresso.
2. WHEN a home e as telas de detalhe exibem uma badge THEN o sistema SHALL
   mostrar o percentual até o próximo tier ou, se em Onyx, até a próxima dobra.
3. The system SHALL manter o cálculo de `beyond` em `lib/ingress-badges.mjs` e
   cobri-lo com testes (inclusive no limiar exato de Onyx).

**Independent Test**: `computeBadge` de uma badge com valor = 2,5× o limiar Onyx →
`beyond` = `Onyx ×3` em 50%.

---

### MED-11: "Plus" editorial por medalha de estatística ⭐ P3

**User Story**: Como agente, na página de uma medalha de estatística quero ver o
número reenquadrado em algo humano — "andei X maratonas", "Y voltas ao planeta".

**Acceptance Criteria**:

1. WHERE existe uma entrada para o slug em `data/ingress/medal-lore.json` THEN a
   página `/ingress/medalha/[slug]` SHALL exibir a frase que descreve a métrica e
   as comparações calculadas a partir do valor atual (razão por referência e/ou
   média por dia desde a primeira conquista).
2. WHERE não há entrada de lore para o slug THEN o sistema SHALL simplesmente não
   renderizar a seção, sem espaço vazio.
3. IF uma comparação resulta em valor não-finito ou ≤ 0 THEN o sistema SHALL
   descartá-la.
4. The system SHALL manter a matemática das comparações em `lib/ingress-lore.mjs`
   com testes; o arquivo de lore é conteúdo editável sem mudança de código.

**Independent Test**: `/ingress/medalha/trekker` mostra "≈ 94 maratonas" e
"0,88 km por dia"; `medalLore` cobre razão, média por dia e descarte.

---

### MED-12: Home como grade hexagonal de medalhas ⭐ P2

**User Story**: Como agente, quero que a home mostre as medalhas como o app —
uma grade densa só com a arte, e o detalhe aparece no clique.

**Acceptance Criteria**:

1. WHEN a página `/ingress` monta THEN o sistema SHALL renderizar uma seção única
   "Medalhas" — uma grade de hexágonos exibindo só a arte de cada medalha —, no
   lugar das seções separadas de badges de contagem e de conquistas.
2. WHEN o usuário alterna o modo de ordenação THEN o sistema SHALL reordenar a
   grade por cronologia (primeira conquista) ou agrupá-la por categoria.
3. WHEN o usuário toca num hexágono THEN o sistema SHALL abrir o mesmo painel de
   detalhe usado na linha do tempo (MED-09.5).
4. WHERE ainda não há dado de Colecionáveis e Personagens THEN o sistema SHALL
   exibir esses grupos como um estado "chegam com o dump GDPR", não omiti-los.
5. WHEN a seção monta THEN o sistema SHALL destacar a "próxima medalha" com barra
   de progresso e projeção, acima da grade.
6. IF a estatística de origem de uma badge está ausente THEN o sistema SHALL
   exibir o hexágono esmaecido, não omiti-lo.

**Independent Test**: `/ingress` → grade de hexágonos, toggle Cronologia↔Categoria
reordena, toque abre o painel; os grupos Colecionáveis/Personagens aparecem como
placeholder.

---

### MED-13: Tokens de tier neutros ⭐ P3

**User Story**: Como Luiz, quero que Onyx e Platina não usem o verde e o azul do
tema — atrapalha a leitura das facções e dos acentos.

**Acceptance Criteria**:

1. The system SHALL renderizar o tier Onyx com um grafite escuro e o tier Platina
   com um cinza, em `/ingress` e nas telas de detalhe, sem reutilizar
   `--ing-green` / `--ing-cyan` para esses tiers.
2. WHILE uma badge Onyx tem arte THEN o sistema SHALL NOT aplicar brilho verde
   sobre ela.

**Independent Test**: Inspecionar `.ing-medal--onyx` / `.ing-medal--platinum` e a
grade — cores neutras, sem verde/azul.

---

### MED-14: Radar ancorado no limiar de Onyx ⭐ P2

**User Story**: Como Luiz, quero que o radar "Padrão de jogo" tenha uma base
consistente e defensável — pensando em comparar agentes no futuro —, com o
cálculo visível.

**Why**: O agente de Ingress é o próprio jogador (RPG no mundo real); o radar é a
"ficha de personagem" e precisa de uma âncora real, não de números escolhidos a
dedo.

**Acceptance Criteria**:

1. WHEN o radar monta THEN cada eixo SHALL ser a **média** das razões das suas
   estatísticas, cada razão normalizada pelo **limiar de Onyx** da medalha
   correspondente (`1,0×` = nível Onyx) — ou, quando não há medalha para a stat,
   por uma conversão de unidade explícita a partir de um limiar de Onyx que
   exista (nunca um valor estimado).
2. WHEN uma razão de componente passa de `RADAR_DRAW_MAX` (2×) THEN o sistema
   SHALL travá-la nesse teto antes de entrar na média, mas SHALL preservar a
   razão real para exibição.
3. WHEN o usuário troca a escala do desenho (`½× · Onyx · 2× · Forma`) THEN o
   sistema SHALL redesenhar as fichas e os anéis nessa escala: `2×` é o padrão
   (anel do meio = "Onyx", borda destacada); `Forma` normaliza **cada** ficha
   pelo seu próprio eixo mais forte (compara o formato, não a magnitude) e mostra
   um aviso disso.
4. WHEN o radar monta THEN o sistema SHALL rotular o `%` do nível Onyx em cada
   vértice.
5. WHEN o usuário passa o mouse ou toca num eixo THEN o sistema SHALL exibir o
   cálculo: cada estatística do eixo, `valor / limiar`, a razão, e a nota de
   derivação quando houver.
6. The system SHALL manter `computeRadarAxes` e `RADAR_AXES` em
   `lib/ingress-radar.mjs` com testes (âncora = Onyx da medalha declarada,
   média-não-soma, trava no teto).
7. The system SHALL dar folga lateral ao `viewBox` do SVG para os rótulos de eixo
   não serem cortados pela borda do painel.

**Independent Test**: `computeRadarAxes` do perfil real → Exploração e Hacking
acima do Onyx, Construção/Destruição/Links abaixo; toda `part` com `badge` tem
`ref` == limiar de Onyx daquela badge.

---

### MED-15: Comparar fichas de agentes ⭐ P3

**User Story**: Como agente, quero colar o export do app de outro agente (ou dois
exports) e ver as fichas sobrepostas no radar, na hora.

**Acceptance Criteria**:

1. WHEN o usuário abre "Comparar" THEN o sistema SHALL oferecer dois modos:
   "Contra o dono do perfil" (1 export → agente B roxo, dono = A verde) e "Dois
   agentes" (2 exports colados → A verde, B roxo), sem envolver o perfil.
2. WHEN o usuário submete THEN o sistema SHALL ler cada texto com o mesmo parser
   do CLI (`parseAppExport`) e sobrepor as fichas; o parser SHALL tolerar export
   colado que perdeu os tabs (vira separado por espaço), reconstruindo o
   cabeçalho pelos nomes de coluna conhecidos.
3. IF um texto não é um export válido THEN o sistema SHALL exibir a mensagem de
   erro do parser inline, sem quebrar o radar.
4. WHILE há comparação ativa o sistema SHALL pôr o radar de um lado e uma
   **tabela** do outro (empilha no mobile) com o `%` de cada eixo dos dois
   agentes + os valores/razões de cada estatística, o líder destacado na cor de
   cada um; o hover num eixo SHALL mostrar as duas colunas.
5. WHEN o usuário aciona "Limpar" THEN o sistema SHALL remover a comparação.
6. The system SHALL NOT persistir, exportar nem enviar nada — é cola-e-vê local.

**Independent Test**: Colar um export (com ou sem tabs) → duas formas no radar +
tabela com o líder marcado; modo "Dois agentes" compara os dois sem o perfil;
colar lixo → erro inline; "Limpar" volta ao estado de um agente.
`compareRadar` e o parser tolerante a espaço cobertos por teste.

---

### MED-16: "Asinhas" da recursão nas medalhas ≥ 2× Onyx ⭐ P3

**User Story**: Como agente recursado, quero que as medalhas cujo total passou de
2× o limiar de Onyx tenham os chevrons vermelhos do scanner com o multiplicador.

**Acceptance Criteria**:

1. WHERE `computeBadge().beyond.multiple` de uma medalha é ≥ 2 THEN o sistema
   SHALL exibir chevrons vermelhos + `×N` (N = multiple) no hexágono da grade, no
   painel de detalhe e no herói da página da medalha.
2. WHILE `multiple` é 1 ou a medalha não é Onyx o sistema SHALL NOT exibir a
   marca.
3. The system SHALL rotular a marca como "N× o limiar de Onyx" (não afirma
   recursão oficial por medalha — dado que só vem no dump GDPR).

**Independent Test**: Para o perfil real, Illuminator ×4 / Recharger ×3 /
Sojourner ×2 recebem a marca; as demais não.

---

### MED-17: Globo decorativo no hero (desktop) ⭐ P3

**User Story**: Como Luiz, quero um elemento visual "de Ingress" no cabeçalho do
perfil — um globo girando, como no app.

**Acceptance Criteria**:

1. WHERE a viewport é desktop (≥ 60rem) THEN o sistema SHALL renderizar um globo
   decorativo animado sangrando pela direita do hero, com `pointer-events: none`,
   sem cobrir o conteúdo (o corpo do hero limita a ~52% da largura).
2. WHILE a viewport é menor o sistema SHALL NOT renderizar o globo.
3. The system SHALL respeitar `prefers-reduced-motion`.

**Independent Test**: `/ingress` no desktop mostra o globo girando atrás do
codinome; em 360px o globo não aparece.

---

## Edge Cases (expansão)

- IF a arte de um tier específico não existe em `public/ingress/medals/` THEN a
  escada de tiers SHALL mostrar aquele degrau com um placeholder, não quebrar.
- IF `history` está ausente no perfil (perfil antigo) THEN o `build` SHALL
  criá-lo com o snapshot atual.
- WHEN duas badges empatam no percentual de progresso THEN a "próxima medalha"
  SHALL desempatar por ordem do catálogo (determinístico).
- IF uma data em `medalDates`/`eventBadges` não é uma data válida THEN o sistema
  SHALL ignorá-la na timeline sem quebrar.

---

## Edge Cases

- IF o export do app tem números com separador de milhar ou aspas THEN o parser
  SHALL normalizar antes de converter para número.
- IF `capturedAt` do novo export é mais antigo que o do JSON atual THEN o script
  SHALL avisar e pedir confirmação extra antes de sobrescrever.
- WHEN o JSON de perfil está ausente por completo THEN `/ingress` SHALL
  renderizar um estado vazio informativo (não um erro 500).
- IF a coordenada central do S2 não está no JSON THEN a seção S2 SHALL usar um
  fallback definido em código.
- WHEN a viewport do mapa S2 está muito afastada para um nível de célula alto
  (milhares de células) THEN o sistema SHALL limitar a quantidade desenhada a um
  teto definido em código.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| INGR-01 | P1: Perfil renderizado | Feito | Verified |
| INGR-02 | P1: Perfil — stats agrupadas em pt-BR | Feito | Verified |
| INGR-03 | P1: Perfil — layout próprio, PT, fora do LanguageProvider | Feito | Verified |
| INGR-04 | P1: Perfil — chave ausente não quebra render | Feito | Verified |
| INGR-05 | P1: Perfil — zero chamadas à Niantic em runtime | Feito | Verified |
| INGR-36 | P1: Perfil — mobile-first, usável a 360px sem scroll horizontal | Feito | Verified |
| INGR-06 | P1: Script — export do app → JSON com chaves estáveis | Feito | Verified |
| INGR-07 | P1: Script — valida colunas/linha, aborta sem gravar | Feito | Verified |
| INGR-08 | P1: Script — dry-run é o padrão | Feito | Verified |
| INGR-09 | P1: Script — diff + confirmação no `--apply` | Feito | Verified |
| INGR-10 | P1: Script — idempotente | Feito | Verified |
| INGR-11 | P1: Script — merge preserva seções do dump GDPR | Feito | Verified |
| INGR-12 | P1: Badges — cálculo de tier a partir da tabela de limiares | Feito | Verified |
| INGR-13 | P1: Badges — falta para o próximo tier | Feito | Verified |
| INGR-14 | P1: Badges — indicação de Onyx (tier máximo) | Feito | Verified |
| INGR-15 | P1: Badges — estatística ausente omite a badge | Feito | Verified |
| INGR-16 | P1: Badges — limiares oficiais cobertos por teste | Feito | Verified |
| INGR-17 | P1: Espera GDPR — placeholder de evolução de AP | Feito | Verified |
| INGR-18 | P1: Espera GDPR — placeholder de mapa de portais | Feito | Verified |
| INGR-19 | P1: Espera GDPR — seções em espera vêm de campo explícito | Feito | Verified |
| INGR-20 | P1: Espera GDPR — seção real aparece sem mudar código | Feito | Verified |
| INGR-21 | P2: Gráficos — radar do perfil | Feito | Verified |
| INGR-22 | P2: Gráficos — distribuição de ações | Feito | Verified |
| INGR-23 | P2: Gráficos — normalização do radar em lib testada | Feito | Verified |
| INGR-24 | P2: Gráficos — eixo sem dado vira 0 | Feito | Verified |
| INGR-25 | P2: S2 — mapa Leaflet/OSM centrado na coordenada do JSON | Feito | Verified |
| INGR-26 | P2: S2 — slider de nível redesenha a grade | Feito | Verified |
| INGR-27 | P2: S2 — arrastar o mapa recalcula as células | Feito | Verified |
| INGR-28 | P2: S2 — matemática de células em lib testada | Feito | Verified |
| INGR-29 | P2: S2 — fallback se o mapa não carrega | Feito | Verified |
| INGR-30 | P2: OG — imagem OpenGraph com dados do JSON | Feito | Verified |
| INGR-31 | P2: OG — title/description próprios da rota | Feito | Verified |
| INGR-32 | P3: Dump — ingestão de séries temporais e portais | Feito | Verified |
| INGR-33 | P3: Dump — merge preserva o mais recente e limpa `pending` | Feito | Verified |
| INGR-34 | P3: Dump — arquivo ausente/vazio não aborta | Feito | Verified |
| INGR-35 | P3: Dump — gráfico de evolução de AP substitui o placeholder | Feito | Verified |
| MED-01 | P1: Medalhas como centro da página (26 badges, resumo, próxima) | Tasks | Verified |
| MED-02 | P1: Página de detalhe `/ingress/medalha/[slug]` | Tasks | Verified |
| MED-03 | P1: Seção "Conquistas" (eventBadges por categoria) | Tasks | Verified |
| MED-04 | P1: Histórico de snapshots (`history[]` no build) | Tasks | Verified |
| MED-05 | P1: CLI `badges` + `medals --fetch` | Tasks | Verified |
| MED-06 | P2: Timeline de conquistas (versão simples) | Tasks | Superada por MED-09 |
| MED-07 | P2: Hover no KPI mostra a badge | Tasks | Implementado |
| MED-08 | P3: Projeção de próximo tier | Tasks | Implementado |
| MED-09 | P2: Linha do tempo estruturada (`/ingress/linha-do-tempo`, combo, brush, filtros, painel) | Iteração UI | Implementado — lógica pura testada, UAT visual pendente |
| MED-10 | P2: Progresso além do Onyx (`beyond`) | Iteração UI | Implementado + testado |
| MED-11 | P3: "Plus" editorial por medalha (`medal-lore.json` + `lib/ingress-lore.mjs`) | Iteração UI | Implementado + testado (math), conteúdo a calibrar |
| MED-12 | P2: Home como grade hexagonal (`MedalGrid`, substitui BadgeShelf/AchievementsShelf) | Iteração UI | Implementado — UAT visual pendente |
| MED-13 | P3: Tokens de tier neutros (Onyx grafite, Platina cinza) | Iteração UI | Implementado |
| MED-14 | P2: Radar ancorado no Onyx (média-de-razões, escala ½×/Onyx/2×/Forma, hover com o cálculo, % nos vértices) | Iteração UI | Implementado + testado |
| MED-15 | P3: Comparar fichas — 1 export vs perfil ou 2 exports entre si, radar + tabela lado a lado; parser tolera tabs perdidos | Iteração UI | Implementado + testado |
| MED-16 | P3: "Asinhas" da recursão (`RecursionMark`) nas medalhas ≥ 2× Onyx | Iteração UI | Implementado |
| MED-17 | P3: Globo decorativo no hero (desktop) | Iteração UI | Implementado |

**ID format:** `INGR-[NUMBER]` (feature original) · `MED-[NUMBER]` (expansão de
medalhas + iteração de UI)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 36 `INGR-*` + 17 `MED-*` = 53 requisitos, todos implementados no
branch `feat/ingress`. Verificação: as ACs de lógica pura estão ✅ Verified com
evidência `file:line` em `validation.md` (parsing incl. tabs perdidos, badges
incl. `beyond`, S2, history, timeline
`collectAcquisitions`/`annotateLaneGaps`/`groupLanes`/`formatGap`, lore
`medalLore`/`formatLoreNumber`, radar `computeRadarAxes`/`compareRadar`); **344
testes**, 2 passagens de Verifier (feature + expansão). As ACs de UI (grade
hexagonal, painel de detalhe, brush, filtros, toggles, "plus", tokens de cor,
radar interativo + escalas + comparar 2 agentes, asinhas da recursão, globo do
hero) estão implementadas com `npm run build` / `npm run lint` verdes mas **sem
teste automatizado e sem UAT visual do Luiz** — esse é o gate aberto. Ver
`.specs/features/ingress/validation.md`.

**Fechamento (10/09/2026):** demanda encerrada "por hora" pelo Luiz. Branch
`feat/ingress` pushado, PR aberto contra `main`. Falta o UAT visual dele + o
merge. Itens que aguardam o dump GDPR: Colecionáveis/Personagens na grade,
recursão real por medalha, série de AP, mapa de portais, `medal-lore.json` a
calibrar. Ver `docs/ingress-proximos-passos.md`.

---

## Success Criteria

- [ ] Luiz consegue compartilhar `https://<site>/ingress` e o link mostra seu
      perfil de agente com identidade, stats reais do snapshot, badges com tier e
      dois gráficos, mais o explorador S2.
- [ ] Atualizar o perfil é um comando local (`node scripts/ingress.mjs ...`) +
      commit, sem editar JSON à mão e sem tocar em banco.
- [ ] As seções que dependem do dump GDPR são visivelmente "em breve", nunca dado
      falso.
- [ ] `npm run build`, `npm run lint` e `npm test` passam.
- [ ] Nenhuma requisição a domínios da Niantic em runtime; nada de scraping/IITC.
- [ ] A rota funciona e impressiona num celular (360px) tão bem quanto no
      desktop — é a primeira tela para a maioria de quem recebe o link.
