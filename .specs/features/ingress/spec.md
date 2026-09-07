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
| Cálculo de recursão / projeção de AP futuro | Nice-to-have sem valor claro agora |

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
| INGR-01 | P1: Perfil renderizado | Design | Pending |
| INGR-02 | P1: Perfil — stats agrupadas em pt-BR | Design | Pending |
| INGR-03 | P1: Perfil — layout próprio, PT, fora do LanguageProvider | Design | Pending |
| INGR-04 | P1: Perfil — chave ausente não quebra render | Design | Pending |
| INGR-05 | P1: Perfil — zero chamadas à Niantic em runtime | Design | Pending |
| INGR-36 | P1: Perfil — mobile-first, usável a 360px sem scroll horizontal | Design | Pending |
| INGR-06 | P1: Script — export do app → JSON com chaves estáveis | Design | Pending |
| INGR-07 | P1: Script — valida colunas/linha, aborta sem gravar | Design | Pending |
| INGR-08 | P1: Script — dry-run é o padrão | Design | Pending |
| INGR-09 | P1: Script — diff + confirmação no `--apply` | Design | Pending |
| INGR-10 | P1: Script — idempotente | Design | Pending |
| INGR-11 | P1: Script — merge preserva seções do dump GDPR | Design | Pending |
| INGR-12 | P1: Badges — cálculo de tier a partir da tabela de limiares | Design | Pending |
| INGR-13 | P1: Badges — falta para o próximo tier | Design | Pending |
| INGR-14 | P1: Badges — indicação de Onyx (tier máximo) | Design | Pending |
| INGR-15 | P1: Badges — estatística ausente omite a badge | Design | Pending |
| INGR-16 | P1: Badges — limiares oficiais cobertos por teste | Design | Pending |
| INGR-17 | P1: Espera GDPR — placeholder de evolução de AP | Design | Pending |
| INGR-18 | P1: Espera GDPR — placeholder de mapa de portais | Design | Pending |
| INGR-19 | P1: Espera GDPR — seções em espera vêm de campo explícito | Design | Pending |
| INGR-20 | P1: Espera GDPR — seção real aparece sem mudar código | Design | Pending |
| INGR-21 | P2: Gráficos — radar do perfil | - | Pending |
| INGR-22 | P2: Gráficos — distribuição de ações | - | Pending |
| INGR-23 | P2: Gráficos — normalização do radar em lib testada | - | Pending |
| INGR-24 | P2: Gráficos — eixo sem dado vira 0 | - | Pending |
| INGR-25 | P2: S2 — mapa Leaflet/OSM centrado na coordenada do JSON | - | Pending |
| INGR-26 | P2: S2 — slider de nível redesenha a grade | - | Pending |
| INGR-27 | P2: S2 — arrastar o mapa recalcula as células | - | Pending |
| INGR-28 | P2: S2 — matemática de células em lib testada | - | Pending |
| INGR-29 | P2: S2 — fallback se o mapa não carrega | - | Pending |
| INGR-30 | P2: OG — imagem OpenGraph com dados do JSON | - | Pending |
| INGR-31 | P2: OG — title/description próprios da rota | - | Pending |
| INGR-32 | P3: Dump — ingestão de séries temporais e portais | - | Pending |
| INGR-33 | P3: Dump — merge preserva o mais recente e limpa `pending` | - | Pending |
| INGR-34 | P3: Dump — arquivo ausente/vazio não aborta | - | Pending |
| INGR-35 | P3: Dump — gráfico de evolução de AP substitui o placeholder | - | Pending |

**ID format:** `INGR-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 36 total, 36 mapped to tasks (T1–T23), todos implementados.
Verificação: 19 ACs de lógica pura ✅ Verified (evidência `file:line` em
`validation.md`); 17 ACs de UI implementados e com build-gate verde, UAT visual
do Luiz pendente. Ver `.specs/features/ingress/validation.md`.

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
