# Ingress Ranking Comparison Specification

## Problem Statement

Hoje, comparar dois agentes em `/ingress/ranking` exige colar dois exports de texto na mesma tela ("comparar com outro agente"), mesmo quando os dois já estão cadastrados no ranking — e existe um modo à parte, redundante, só pra comparar contra o FencherLC. A tabela principal do ranking também carrega tudo de uma vez (`LIMIT` fixo, sem paginação de verdade), o que tende a virar um payload pesado em celular à medida que o ranking cresce. Queremos simplificar a comparação (selecionar em vez de colar) e tornar a listagem/busca de agentes leve e escalável, tanto na tabela principal quanto no novo seletor de comparação.

## Goals

- [ ] Qualquer visitante compara dois agentes quaisquer já cadastrados em `casara.ingress_rankings` escolhendo-os por nickname, sem colar nenhum export
- [ ] Depois de enviar os próprios dados, o visitante tem um caminho direto (1 clique) até uma comparação pré-preenchida com o próprio agente
- [ ] O seletor de agentes da comparação funciona com o ranking crescendo além de 100 agentes (paginado por nickname, com busca por texto)
- [ ] A tabela principal do ranking pagina e busca no servidor (padrão 20 por página, até 100), mantendo o payload pequeno mesmo com o ranking crescendo
- [ ] Os modos antigos de comparação dentro de `/ingress/ranking` ("colar 2 exports", "comparar com FencherLC") deixam de existir ali, substituídos pela nova aba
- [ ] Toda a experiência nova (aba, selects, tabela paginada, comparação) é responsiva em mobile

## Out of Scope

| Feature | Reason |
| --- | --- |
| Colar um export avulso para comparar contra alguém que ainda não está no ranking | O pedido é explicitamente "comparar qualquer agente com qualquer agente que já esteja no ranking" — a nova comparação só lê dados já persistidos |
| Autenticação/identidade verificada de "meu agente" | O `localStorage` é só uma conveniência de pré-preenchimento, não uma prova de identidade — qualquer um pode escolher manualmente qualquer agente nos dois campos, igual já é possível hoje colando um export de qualquer nickname |
| Edição/remoção de linhas do ranking | Sem rota de admin em nenhum lugar do site (mesma filosofia de `/livros` e da feature `ingress-stats-ranking`) |
| Comparar mais de 2 agentes ao mesmo tempo | Mantém o modelo visual atual (radar sobreposto de exatamente 2 formas); comparar 3+ exigiria redesenhar a visualização |
| Ordenação por relevância na busca por codinome | A busca é só um filtro por substring (contém o texto digitado); o resultado continua na ordenação vigente (canônica ou a escolhida pelo visitante), sem rankeamento por "melhor match" |
| Auto-atualização da comparação enquanto a aba está aberta | A comparação é um retrato do momento da seleção; se um dos agentes reenviar dados depois, a tela não atualiza sozinha |
| Rate-limit por IP nos novos endpoints de leitura | Mesma decisão já tomada para os GETs públicos existentes de `/api/ingress-rankings` — cache curto + `LIMIT`/paginação bastam, sem infraestrutura nova |
| Mudar `ProfileRadar` `variant="default"` (usado em `/ingress/fencherlc`) | Fora de escopo — mantém os modos `'vs-me'`/`'two'` como estão hoje |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "AP lifetime" pedido pelo usuário é o campo `lifetime_ap` já existente | Usar `lifetime_ap` como o valor de AP exibido no seletor e na tabela | É o único campo do schema que representa "AP total"/lifetime AP; nenhum outro candidato existe em `casara.ingress_rankings` | n |
| Ordenação/paginação do seletor de agentes (comparação) | Keyset por `codename_key` (já é chave primária), ordem alfabética ascendente, páginas de 100 | Reproduz ordenação por nickname case-insensitive sem índice novo; cada linha é leve (nickname+país+facção+AP), então 100 por página continua um payload pequeno | n |
| Paginação da tabela principal do ranking | Offset (`page`/`pageSize`), não keyset | A tabela principal precisa combinar múltiplos critérios de ordenação (nota, AP, país, 5 eixos) e busca simultaneamente — um cursor por combinação de critério seria complexidade desproporcional; o volume da feature é baixo (nicho pessoal), então o custo típico de `OFFSET` (lentidão em tabelas grandes) não se aplica | y |
| Tamanho de página da tabela principal | Padrão 20, opções 20/50/100 | Proposta explícita do usuário, pensando em payload leve no celular por padrão, com opção de ver mais | y |
| Trocar página/tamanho de página/ordenação/busca/filtro de facção reinicia a listagem na página 1 | Sempre volta pra página 1 ao mudar qualquer critério | Evita mostrar uma "página 3" que não corresponde a nada no novo critério aplicado | n |
| Busca por codinome (tabela principal e seletor de agentes) é substring, case-insensitive | `ILIKE '%termo%'` no servidor, sem exigir prefixo exato | Cobre o caso comum de "lembro só parte do nome"; mais permissivo que busca por prefixo | n |
| Posição (`#`) na tabela principal sempre reflete o rank canônico (nota geral desc, AP total desc, data de registro asc) | Nunca a posição relativa ao filtro/ordenação/busca atualmente aplicado na tela | Preserva a decisão já tomada na feature `ingress-stats-ranking`: a coluna de posição nunca pode mentir a colocação real | y |
| Comparação é um retrato do momento da seleção, sem auto-refresh | Busca uma vez quando os dois campos ficam preenchidos/mudam; não faz polling enquanto a aba está aberta | Mantém a funcionalidade simples, como pedido; evita tráfego/polling adicional sem necessidade demonstrada | n |
| Precedência de pré-preenchimento do campo "Agente A"/"Agente B" ao abrir a aba Comparação | 1) parâmetros de URL válidos (se presentes) &gt; 2) atalho de linha da tabela recém-acionado &gt; 3) `localStorage` ("meu agente", só preenche Agente A, só se ele estiver vazio) &gt; 4) vazio | Encadeamento lógico das três fontes de preenchimento automático já confirmadas separadamente em conversa; um link explícito sempre deve vencer uma conveniência implícita | n |
| Sem rate-limit por IP nos novos endpoints (lista/busca paginada de agentes, tabela principal paginada e comparação) | Seguem o mesmo padrão dos GETs públicos já existentes de `/api/ingress-rankings` | Decisão já validada na feature `ingress-stats-ranking` para leitura pública sem token; cache curto + paginação cobrem o volume esperado | y |
| Novo evento de analytics ao completar uma comparação | `trackIngressComparisonViewed`, disparado só quando os dois agentes terminam de carregar e a comparação é de fato renderizada (não a cada tecla/seleção intermediária) | Segue o padrão do projeto ("toda feature nova ganha seu `trackX`"); é um gesto deliberado (2 escolhas completas), não um evento de rolagem/travessia contínua — o tipo de evento que `CLAUDE.md` pede pra evitar | n |
| Selecionar o mesmo agente em Agente A e Agente B | Bloqueado — comparação não é renderizada, mensagem inline explica que os dois campos precisam ser diferentes | Os dois lados seriam idênticos; não agrega valor e simplifica a lógica de renderização (não precisa tratar "comparar consigo mesmo" como o antigo caso de "evolução própria") | n |

**Open questions:** none — todas as ambiguidades foram resolvidas em conversa (estrutura da UI, identidade "meu agente", remoção dos modos antigos, regra do atalho de linha, link compartilhável, paginação/busca da tabela principal, ordenação server-side) ou registradas como assumption acima.

---

## User Stories

### P1: Comparar dois agentes quaisquer já cadastrados no ranking ⭐ MVP

**User Story**: Como visitante de `/ingress/ranking`, quero escolher dois agentes quaisquer que já estejam no ranking e ver o radar sobreposto com informações detalhadas dos dois lado a lado, para comparar qualquer dupla sem precisar colar um export de novo.

**Why P1**: é o pedido central da evolução — hoje só é possível comparar colando texto em ambas as telas.

**Acceptance Criteria**:

1. WHEN o visitante seleciona um agente no campo "Agente A" e um agente diferente no campo "Agente B" na aba "Comparação" THEN o sistema SHALL buscar os dados já armazenados de ambos em `casara.ingress_rankings` e renderizar o radar sobreposto (mesmo modelo visual de polígonos já usado hoje) mais um painel de informações detalhadas lado a lado (nota geral, selo de tier, nota de cada um dos 5 eixos, AP total, país, facção) para os dois agentes.
2. The system SHALL montar a comparação inteiramente a partir de `stat_values`, `axis_scores`, `overall_score`, `lifetime_ap`, `country_code` e `faction` já persistidos, e SHALL NOT exigir que o visitante cole nenhum export de texto para completar uma comparação entre dois agentes do ranking.
3. WHILE apenas um dos dois campos (Agente A ou Agente B) estiver preenchido THE system SHALL exibir um estado de espera (ex.: "escolha o segundo agente") em vez de tentar renderizar uma comparação parcial.
4. IF o visitante seleciona o mesmo agente em Agente A e Agente B THEN o sistema SHALL bloquear a comparação e exibir uma mensagem inline explicando que os dois campos precisam de agentes diferentes.
5. The system SHALL permitir comparar exatamente 2 agentes por vez.

**Independent Test**: com pelo menos 2 agentes no ranking, abrir a aba Comparação, escolher os dois nos selects, e ver o radar sobreposto + painel lado a lado sem colar nada.

---

### P1: Selecionar um agente por nickname, navegando por página ou buscando por texto ⭐ MVP

**User Story**: Como visitante, quero escolher um agente navegando por nickname num campo com no máximo 100 opções por vez, ou digitando parte do nome pra achar direto, para localizar rapidamente quem eu quero comparar mesmo com o ranking grande.

**Why P1**: é o mecanismo de entrada que viabiliza a história acima — sem ele não dá pra escolher ninguém.

**Acceptance Criteria**:

1. The system SHALL exibir, em cada opção do campo de seleção, o emblema de país, o emblema de facção, o nickname e o AP total (`lifetime_ap`) do agente, na ordem "&lt;emblema país&gt;&lt;emblema facção&gt; &lt;nickname&gt; &lt;AP total&gt;".
2. WHILE nenhum texto de busca foi digitado THE system SHALL ordenar as opções por nickname, case-insensitive, ordem alfabética, carregadas em páginas de até 100 agentes por vez.
3. WHEN o visitante chega ao final das opções carregadas (sem busca ativa) e ainda há mais agentes no ranking THEN o sistema SHALL exibir um controle "próxima página" que, ao ser acionado, SHALL acrescentar a próxima página de até 100 agentes às opções já carregadas, sem descartar as anteriores.
4. WHEN não houver mais agentes além dos já carregados THEN o sistema SHALL NOT exibir o controle "próxima página".
5. WHEN o visitante digita num campo de busca por texto dentro do seletor THEN o sistema SHALL substituir a navegação por página por uma busca no servidor que filtra os agentes cujo codinome contém o texto digitado (substring, case-insensitive).
6. WHEN o campo de busca é limpo THEN o sistema SHALL voltar à navegação por página em ordem alfabética, reiniciando da primeira página.
7. IF a busca por texto não encontrar nenhum agente THEN o campo de seleção SHALL exibir um estado vazio explicativo ("nenhum agente encontrado").
8. IF o ranking não tiver nenhum agente cadastrado THEN o campo de seleção SHALL exibir um estado vazio explicativo em vez de uma lista em branco.
9. IF a busca ou a navegação por página falhar (rede/banco indisponível) THEN o campo de seleção SHALL exibir um estado de erro com opção de tentar novamente, sem quebrar o resto da página.
10. The system SHALL permitir a leitura do seletor (navegação e busca) sem exigir nenhum token de autenticação, consistente com o restante das rotas de leitura de `/ingress/ranking`.

**Independent Test**: com mais de 100 agentes cadastrados (ou simulando via teste), abrir o campo de seleção, ver as 100 primeiras opções ordenadas por nickname, clicar "próxima página" e ver mais opções carregadas sem perder as primeiras; digitar parte do nickname de um agente que está fora das primeiras 100 posições alfabéticas e vê-lo aparecer direto.

---

### P1: Paginar e buscar a tabela principal do ranking ⭐ MVP

**User Story**: Como visitante de `/ingress/ranking`, quero navegar pela tabela principal em páginas menores e buscar por um agente específico, para não depender de um payload grande carregado de uma vez conforme o ranking cresce.

**Why P1**: pedido direto do usuário, motivado pelo crescimento esperado do ranking e pela preocupação explícita com desempenho em celular.

**Acceptance Criteria**:

1. The system SHALL paginar a tabela principal do ranking no servidor, com tamanho de página padrão de 20 agentes.
2. The system SHALL permitir ao visitante escolher o tamanho de página entre 20, 50 ou 100 agentes.
3. WHEN o visitante muda o tamanho de página, a ordenação, o filtro de facção ou o termo de busca THEN o sistema SHALL retornar a listagem para a primeira página do novo resultado.
4. The system SHALL exibir, em cada linha, a posição real do agente no ranking canônico (nota geral desc, AP total desc, data de registro asc) — SHALL NOT exibir uma posição relativa apenas à página, ordenação ou busca atualmente aplicada na tela.
5. WHEN o visitante aciona um cabeçalho de coluna ordenável (nota geral, AP total, país, ou qualquer um dos 5 eixos) THEN o sistema SHALL reordenar o ranking inteiro no servidor por esse critério e recarregar a primeira página já nessa ordem — SHALL NOT ordenar apenas as linhas já carregadas no cliente.
6. WHEN o visitante digita num campo de busca por codinome THEN o sistema SHALL filtrar o ranking no servidor por correspondência parcial (substring, case-insensitive) do codinome, mantendo a ordenação vigente sobre o resultado filtrado.
7. The system SHALL manter o filtro de facção (Enlightened/Resistance) já existente, aplicando-o no servidor junto com a busca e a ordenação, antes da paginação.
8. IF a combinação de busca e/ou filtro de facção não retornar nenhum agente THEN o sistema SHALL exibir um estado vazio explicativo ("nenhum agente encontrado") em vez de uma tabela em branco.

**Independent Test**: com mais de 20 agentes cadastrados, abrir `/ingress/ranking` com o tamanho de página padrão (20), trocar para 100 e ver mais linhas carregadas; buscar por um codinome que só existe fora das primeiras 20 posições e vê-lo aparecer; ordenar por AP total e ver o ranking inteiro reordenado, não só a página atual.

---

### P1: Ir direto para "comparar meu status" após enviar meus dados ⭐ MVP

**User Story**: Como visitante que acabou de enviar meus dados pro ranking, quero um caminho direto pra já me comparar com outro agente, sem precisar procurar meu próprio nickname manualmente depois.

**Why P1**: é o gatilho de uso mais comum descrito pelo usuário — "ao exportar e enviar, desse momento já posso ir pra comparar".

**Acceptance Criteria**:

1. WHEN o envio de dados pelo fluxo "Entrar no ranking" for concluído com sucesso THEN o sistema SHALL salvar o `codename_key` desse agente no `localStorage` do navegador (chave própria da feature) e SHALL exibir um botão/CTA "Comparar meu status".
2. WHEN o visitante aciona o CTA "Comparar meu status" THEN o sistema SHALL navegar para a aba "Comparação" com o campo "Agente A" já preenchido com o agente recém-enviado.
3. WHILE o campo "Agente A" da aba "Comparação" estiver vazio no momento em que a aba é aberta E existir um `codename_key` salvo no `localStorage` referente a um agente que ainda existe no ranking THE system SHALL pré-preencher o campo "Agente A" com esse agente.
4. IF o `codename_key` salvo no `localStorage` não corresponder a nenhum agente existente no ranking (ex.: dado corrompido/removido) THEN o sistema SHALL ignorar silenciosamente esse valor e deixar o campo "Agente A" vazio, sem exibir erro.

**Independent Test**: enviar dados pelo fluxo de "entrar no ranking", clicar "Comparar meu status", conferir que a aba Comparação abre com Agente A já preenchido; fechar e reabrir o navegador (mesmo perfil) mais tarde, abrir a aba Comparação direto — Agente A continua pré-preenchido.

---

### P1: Fluxo de envio simplificado (sem "comparar com FencherLC" nem "colar 2 exports") ⭐ MVP

**User Story**: Como visitante de `/ingress/ranking`, quero que a área de envio tenha só a ação de entrar no ranking, para não me confundir com modos de comparação que agora vivem na aba dedicada.

**Why P1**: elimina a duplicidade entre o fluxo antigo de comparação (colar texto) e o novo (selecionar do ranking); é a limpeza explicitamente pedida — "a comparação direto com FencherLC no painel de /ranking morre".

**Acceptance Criteria**:

1. The system SHALL exibir, em `ProfileRadar` quando `variant="ranking"`, apenas o fluxo de envio de dados (colar export + país + enviar), e SHALL NOT exibir os modos "Comparar com {FencherLC}" nem "Comparar com outro agente" nessa variante.
2. The system SHALL preservar `ProfileRadar` com `variant="default"` (usado em `/ingress/fencherlc`) exatamente como está hoje, incluindo os modos `'vs-me'` e `'two'`.
3. WHEN o envio de dados é concluído (com ou sem escrita real, incluindo o caso de debounce) THEN o sistema SHALL continuar exibindo a posição no ranking (toast) como já ocorre hoje.

**Independent Test**: abrir `/ingress/ranking` e ver que a área de envio só tem uma ação (entrar no ranking); abrir `/ingress/fencherlc` e confirmar que os 3 modos originais continuam lá, sem alteração visual/funcional.

---

### P2: Atalho "Comparar" nas linhas da tabela de ranking

**User Story**: Como visitante olhando a tabela de ranking, quero clicar num atalho na própria linha de um agente pra já ir comparar com ele, sem precisar abrir o seletor e procurar o nickname de novo.

**Why P2**: acelera o caso de uso mais comum (comparar com alguém que já estou vendo na tabela), mas a aba Comparação com os 2 selects já cobre a funcionalidade sozinha — não bloqueia o MVP.

**Acceptance Criteria**:

1. The system SHALL exibir um controle "Comparar" em cada linha da tabela de ranking.
2. WHEN o visitante aciona "Comparar" numa linha THEN o sistema SHALL navegar para a aba "Comparação" e, SE o campo "Agente A" estiver vazio, SHALL preenchê-lo com o agente daquela linha; SENÃO SHALL preencher o campo "Agente B" com o agente daquela linha, substituindo o valor anterior desse campo se houver.
3. The system SHALL manter esse controle utilizável por toque (tap) em telas estreitas, com alvo de toque de tamanho adequado (mínimo ~44×44px), consistente com o restante dos controles interativos da tabela.

**Independent Test**: na tabela de ranking, clicar "Comparar" numa linha com Agente A vazio → aba Comparação abre com Agente A preenchido; clicar "Comparar" em outra linha → Agente B agora preenchido, Agente A inalterado.

---

### P2: Comparação compartilhável por link

**User Story**: Como visitante que montou uma comparação interessante, quero copiar o link da página e mandar pra alguém, para que essa pessoa veja a mesma comparação sem precisar escolher os agentes de novo.

**Why P2**: valor de compartilhamento (ex. grupo do Telegram), mas a comparação funciona plenamente sem isso — não é MVP.

**Acceptance Criteria**:

1. WHEN os campos Agente A e/ou Agente B mudam de valor na aba "Comparação" THEN o sistema SHALL refletir esses valores como parâmetros de busca (query params) na URL, sem recarregar a página.
2. WHEN um visitante abre um link contendo a aba "Comparação" com Agente A e Agente B válidos nos parâmetros de busca THEN o sistema SHALL abrir diretamente nessa aba com os dois campos já preenchidos e a comparação já renderizada.
3. IF os parâmetros de busca referenciarem um `codename_key` que não existe mais no ranking THEN o sistema SHALL exibir um aviso ("agente não encontrado") no campo correspondente e SHALL NOT quebrar o carregamento do restante da página.

**Independent Test**: montar uma comparação, copiar a URL, abrir em uma aba anônima — mesma comparação aparece pronta; alterar manualmente o parâmetro de um dos agentes pra um valor inexistente — aviso aparece, resto da página funciona normalmente.

---

## Edge Cases

- IF o endpoint de comparação falhar (rede/banco indisponível) THEN o sistema SHALL exibir um erro inline na área da comparação, mantendo os selects preenchidos e permitindo tentar novamente, sem derrubar o resto da página.
- IF um agente selecionado for alterado (novo envio) entre o carregamento da lista de agentes e o momento da comparação THEN o sistema SHALL simplesmente refletir o estado mais recente lido no momento da comparação, SHALL NOT tentar reconciliar ou avisar sobre a mudança.
- IF o visitante limpar o `localStorage` do navegador (ou usar uma aba anônima) THEN a aba "Comparação" SHALL abrir com ambos os campos vazios, sem erro.
- WHEN o seletor de agentes ou a tabela principal são reabertos depois de uma nova submissão ter mudado a composição do ranking THEN o sistema SHALL NOT garantir que a paginação permaneça idêntica entre aberturas — comportamento aceito dado o baixo volume da feature.
- The system SHALL exibir a aba "Comparação", o seletor de agentes e a tabela paginada de forma responsiva em telas estreitas (mobile): os dois campos (Agente A/Agente B) empilham verticalmente, o radar sobreposto e o painel de detalhes se adaptam à largura disponível, e os controles de paginação/busca permanecem alcançáveis sem rolagem horizontal.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IRCMP-01 | P1: Comparar 2 agentes | - | Pending |
| IRCMP-02 | P1: Comparar 2 agentes | - | Pending |
| IRCMP-03 | P1: Comparar 2 agentes | - | Pending |
| IRCMP-04 | P1: Comparar 2 agentes | - | Pending |
| IRCMP-05 | P1: Comparar 2 agentes | - | Pending |
| IRCMP-06 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-07 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-08 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-09 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-10 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-11 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-12 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-13 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-14 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-15 | P1: Seletor por nickname | Tasks | Implementing |
| IRCMP-16 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-17 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-18 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-19 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-20 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-21 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-22 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-23 | P1: Paginar/buscar tabela principal | Tasks | Implementing |
| IRCMP-24 | P1: Comparar meu status | - | Pending |
| IRCMP-25 | P1: Comparar meu status | - | Pending |
| IRCMP-26 | P1: Comparar meu status | - | Pending |
| IRCMP-27 | P1: Comparar meu status | - | Pending |
| IRCMP-28 | P1: Fluxo simplificado | - | Pending |
| IRCMP-29 | P1: Fluxo simplificado | - | Pending |
| IRCMP-30 | P1: Fluxo simplificado | - | Pending |
| IRCMP-31 | P2: Atalho na linha | - | Pending |
| IRCMP-32 | P2: Atalho na linha | - | Pending |
| IRCMP-33 | P2: Atalho na linha | - | Pending |
| IRCMP-34 | P2: Link compartilhável | - | Pending |
| IRCMP-35 | P2: Link compartilhável | - | Pending |
| IRCMP-36 | P2: Link compartilhável | - | Pending |
| IRCMP-37 | Edge case: falha do endpoint de comparação | - | Pending |
| IRCMP-38 | Edge case: dado desatualizado | - | Pending |
| IRCMP-39 | Edge case: localStorage limpo | - | Pending |
| IRCMP-40 | Edge case: paginação inconsistente | - | Pending |
| IRCMP-41 | Edge case: responsividade mobile | - | Pending |

**ID format:** `IRCMP-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 41 total, 0 mapped to tasks, 41 unmapped ⚠️ (mapeamento ocorre na fase Design/Tasks)

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | IRCMP-17 (tamanho de página restrito a 20/50/100), IRCMP-20/21 (coluna de ordenação e termo de busca validados contra um allow-list — nunca interpolados direto em SQL), IRCMP-34/35/36 (validação de `codename_key` vindo de query params) |
| Failure / partial-failure states | IRCMP-09, IRCMP-37 — falha do seletor/tabela/comparação degrada graciosamente, nunca bloqueia o resto da página |
| Idempotency / retry / duplicate handling | N/A porque toda a feature é somente-leitura (nenhum novo POST/escrita é introduzido) — a única escrita envolvida (envio do "entrar no ranking") já é coberta pelo debounce existente da feature `ingress-stats-ranking`, inalterado aqui |
| Auth boundaries & rate limits | IRCMP-15 (seletor, leitura pública sem token) + assumption "sem rate-limit por IP", seguindo a mesma decisão já validada nos GETs existentes |
| Concurrency / ordering | IRCMP-40 — paginação (keyset no seletor, offset na tabela principal) não garante snapshot consistente se o ranking mudar entre páginas; aceito dado o baixo volume (mesmo espírito de "sem lock de aplicação" já usado no projeto) |
| Data lifecycle / expiry | N/A porque nada novo tem TTL — o `localStorage` de "meu agente" persiste indefinidamente (sem mecanismo de "esquecer"), mesma ausência de expiração que outras chaves de `localStorage` já usadas no site |
| Observability | Assumption "novo evento `trackIngressComparisonViewed`" — segue o padrão do projeto, disparado só por gesto deliberado completo |
| External-dependency failure | N/A — nenhuma API externa nova; falhas do próprio Neon já cobertas em Failure states (IRCMP-09, IRCMP-37) |
| State-transition integrity | IRCMP-24 a IRCMP-27 e IRCMP-31/32 — precedência explícita entre URL, atalho de linha e `localStorage` evita estados de pré-preenchimento ambíguos ou conflitantes; IRCMP-18 garante que a posição (#) nunca muda de significado conforme o estado de ordenação/busca da tela |

---

## Success Criteria

- [ ] Qualquer visitante compara 2 agentes quaisquer do ranking só selecionando-os, sem colar texto
- [ ] O seletor de agentes ordena por nickname, pagina em blocos de 100, e busca por substring do codinome quando o visitante digita
- [ ] A tabela principal do ranking pagina no servidor (padrão 20, até 100), busca por codinome e ordena por qualquer coluna sobre o ranking inteiro — nunca só sobre a página carregada
- [ ] Depois de enviar os próprios dados, "Comparar meu status" leva a uma comparação já com o próprio agente pré-selecionado, inclusive em visitas futuras (mesmo navegador)
- [ ] `/ingress/ranking` não tem mais os modos "colar 2 exports" nem "comparar com FencherLC"; `/ingress/fencherlc` continua idêntico
- [ ] A aba Comparação, o seletor paginado/buscável e a tabela paginada funcionam corretamente em largura de tela mobile (~375-400px), sem rolagem horizontal
