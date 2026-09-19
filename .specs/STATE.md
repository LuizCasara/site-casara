# STATE

## Decisions

### AD-001
- **Decision**: Uma feature de perfil/vitrine de um único dono pode ter como fonte de dados um arquivo versionado no repo (`data/<feature>/*.json`) alimentado por um script local, em vez de uma tabela no schema `casara` do Neon.
- **Reason**: Para a feature `ingress` o dado é de um agente só, pequeno (~2 KB), estável e público por natureza. Um arquivo importado no build deixa a página trivial e offline-safe, mantém o parsing todo em Node testável e evita abrir superfície de escrita — mesmo princípio de "sem rota de admin" de `/livros`.
- **Trade-off**: Abre mão da consulta agregada, do histórico incremental barato e da consistência com o resto do site (que põe tudo em `casara.*`). Atualizar exige rodar o script + commit + deploy, não um `INSERT`.
- **Scope**: Features de vitrine/portfólio de dono único (a `ingress`; potenciais futuras "diário de agente", perfis de outros jogos). NÃO se aplica a nada com múltiplos escritores, sessões ao vivo ou analytics — esses continuam em `casara.*`.
- **Date**: 2026-09-07
- **Status**: active

### AD-002
- **Decision**: `/ingress` (raiz) pode ler, além do JSON estático da AD-001, uma sobreposição pontual vinda de `casara.ingress_rankings` — só os 12 stats que alimentam o radar ("Padrão de jogo"), só para o codinome do FencherLC, só nessa seção da página. `lib/ingress-live-override.ts` isola essa leitura; `lib/ingress.ts` continua sem banco/rede, como a AD-001 documenta.
- **Reason**: o Luiz (dono do perfil e da conta real) quer que submeter seu próprio status via `/ingress/ranking` também reflita em `/ingress`. Reescrever o JSON versionado em runtime não é viável (filesystem read-only na Vercel, sem persistir entre deploys); ler de volta a linha que a própria submissão gravou é o equivalente prático.
- **Trade-off**: `/ingress` deixa de ser 100% estático — ganha `revalidate = 300` (ISR, não SSR por requisição) pra não perder o "trivial e offline-safe" da AD-001 por completo; falha de DB cai pro baseline estático (`null` da função de override), nunca derruba a página. Resto do perfil (medalhas, linha do tempo, portais, nível/recursões) continua só do arquivo — a tabela nem guarda esses campos.
- **Scope**: só o radar de `/ingress`. Não se estende a `/ingress/medalha/[slug]`, `/ingress/linha-do-tempo` nem às `opengraph-image`, que continuam 100% do JSON estático.
- **Date**: 2026-09-12
- **Status**: active

### AD-003
- **Decision**: A nota do "Padrão de jogo" (Ingress) cresce em **log₂** além do Onyx — `posição = 5 + log₂(valor ÷ Onyx)`, cada dobra soma 1 — em vez de linear; e o radar usa a mesma função e a mesma escala (nota do eixo, 100 = Onyx), com botões de escala `Onyx / ×4 / ×16 / Estilo` (padrão: Estilo).
- **Reason**: com a escala linear, uma única medalha (Mind Units, Onyx de só 4 M) chegava a 100–265× Onyx e decidia sozinha o ranking; radar (travado em 2×) e nota geral (sem trava) também se contradiziam na tela.
- **Trade-off**: some a diferença bruta entre quem tem 4× e quem tem 400× (continua contando, mas comprimida); `casara.ingress_ranking_history` não guarda os stats, então snapshots antigos ficam na escala antiga. Por que não "tirar o MU" nem "travar em N×": ver o ADR.
- **Scope**: nota geral, notas por eixo, radar, mensagem de comparação do Telegram. Detalhes, números antes/depois e operação do recálculo em `docs/adr/0005-escala-logaritmica-alem-do-onyx.md`.
- **Date**: 2026-09-18
- **Status**: active

## Handoff

- **Feature**: ingress-ranking-comparison (`.specs/features/ingress-ranking-comparison/`) — **FECHADA. Execute completo (T1-T17 + 1 fix pós-Verifier) + Verifier PASS na 2ª rodada** (`validate_state.py` confirma; a 1ª rodada achou 1 gap cosmético — ordem dos emblemas país/facção trocada em `AgentSelect` —, corrigido em `390bc89` e reverificado).
- **Completed**: nova aba "Comparação" em `/ingress/ranking` (seleção de 2 agentes já cadastrados por nickname, sem colar texto) substituindo os antigos modos "colar 2 exports"/"comparar com FencherLC"; tabela principal do ranking agora paginada/ordenada/buscada no servidor (antes carregava tudo de uma vez no cliente); CTA "Comparar meu status" após envio; comparação compartilhável por link (`?tab=compare&a=&b=`); atalho "Comparar" por linha da tabela. Spec's 41 ACs (IRCMP-01 a 41), todos `Verified`.
- **Arquitetura**: 3 rotas de API novas/reescritas (`GET /api/ingress-rankings` paginado, `/agents` pro seletor via keyset em `codename_key`, `/compare` pra resolver 1-2 agentes); `lib/ingress-rankings.mjs` ganhou os construtores de query puros (`buildRankingPageQuery`/`buildAgentOptionsQuery`, allow-lists) — única forma segura de ORDER BY dinâmico com o driver do Neon (`sql.query()`, coluna sempre de uma constante fixa, nunca do input); `RadarOverlay` extraído de `ProfileRadar` pra ser reaproveitado pela nova aba sem duplicar a matemática do polígono; `IngressRankingTabs` (client) virou o dono do estado compartilhado entre a tabela e a aba Comparação — o CTA de `StatsRadarSection` (Client Component irmão, fora dessa árvore) usa navegação real (`<a href>`) como único canal possível entre eles, mesma razão que já força o poll independente da tabela.
- **In-progress**: nenhum — feature code-complete e verificada.
- **Achado real do Verifier (corrigido antes de fechar)**: `AgentSelect.tsx` renderizava o ícone de facção antes da bandeira de país — a spec pede `<emblema país><emblema facção>`. Cosmético, mas era uma AC literal (IRCMP-06). Fix em `390bc89`. **Lições registradas** (`.specs/lessons.json`, ambas `candidate`): L-008 (quando a spec cita uma ordem literal de elementos, diffar a ordem renderizada contra a citação, não só checar presença) e L-009 (guard clause numa rota sem teste automatizado pode ser invertida por 1 caractere sem que test/tsc/lint/build pegue — `app/api/ingress-rankings/compare/route.ts:46`, o bloqueio "mesmo agente" — risco aceito, não bloqueante, convenção já documentada do projeto de não testar rotas).
- **UAT visual**: ainda não feito — o Luiz não revisou a aba/tabela na tela (por diretriz do projeto, nenhuma verificação visual automática foi tentada; toda a checagem funcional foi via `curl`/log do dev server contra dados reais).
- **Next step**: (1) UAT visual da feature; (2) decidir sobre push/PR (branch só local); (3) opcionalmente, uma rodada futura decidindo se vale introduzir o primeiro teste de rota do projeto (ver lição L-009).
- **Uncommitted files nesta feature**: nenhum — working tree limpo em relação a esta feature. **Existe, porém, trabalho não commitado ANTERIOR e não relacionado** já presente na branch quando esta sessão começou (ver Branch abaixo) — não foi tocado.
- **Branch**: `feat/ingress-ranking-comparison`, local, **não pushada**. Criada a partir da ponta de `feat/ingress-ranking-nerd-stats` (`2ddfe9d`), que por sua vez já trazia um trabalho em andamento e não commitado de um prompt de instalação PWA (`app/ingress/layout.tsx`, `components/ingress/IngressHub.tsx` modificados + `InstallPwaCard.tsx`/`InstallPwaRegister.tsx`/`public/ingress-sw.js`/`public/ingress/pwa/`/`scripts/generate-ingress-pwa-icons.mjs` não rastreados) — inteiramente alheio a esta feature, nunca tocado, ainda sentado no working tree.

---

### Handoff anterior (feature `ingress-ranking-nerd-stats`, arquivado — ver `.specs/features/ingress-ranking-nerd-stats/`)

- **Feature**: ingress-ranking-nerd-stats (`.specs/features/ingress-ranking-nerd-stats/`) — **FECHADA. Execute completo (T1-T18) + Verifier PASS na 1ª rodada** (`validate_state.py` confirma).
- **Completed**: terceira aba "Estatísticas para Nerds" em `/ingress/ranking` (`IngressRankingTabs`), MVP completo — spec's P1-P6 (`NERD-01`..`NERD-32`). Ao contrário das outras duas abas, é estática: sem poll, calculada uma vez no SSR. `lib/ingress-nerd-stats.mjs` (testado, `lib/ingress-nerd-stats.test.mjs`) agrega TODAS as linhas de `casara.ingress_rankings` (sem `LIMIT`, ao contrário da tabela principal) + `COUNT(*)` de `casara.ingress_ranking_history`, reaproveitando `computeStatTiers`/`RADAR_AXES` já existentes em vez de duplicar limiares de tier em SQL. Seis seções: totais da comunidade (6 stat tiles), comparativo Enlightened×Resistance (barras divergentes), médias/histograma de `overall_score`/radar consolidado (`CommunityRadarChart` novo, presentational-only, não importa `ProfileRadar`), hall da fama (recorde por cada um dos 12 stats + AP + recursões, empate resolvido por `created_at` mais antigo), engajamento em eventos sazonais (9 métricas de `extra_stats`, ausência ≠ zero), assinatura paga (nova coluna `months_subscribed`, nullable, aceita opcionalmente em `POST /api/ingress-rankings` com o mesmo tratamento não-rejeitante de `recursions`).
- **Fora desta rodada, de propósito**: P7-P9 da spec (geografia por país, crescimento semanal, correlação AP×nota/eixo mais fraco — `NERD-33`..`NERD-37`) não têm ⭐ MVP na spec e ficaram sem task própria em `tasks.md`. Se o Luiz quiser essa camada depois, é uma rodada nova de Tasks sobre a mesma spec/design (já cobrem P7-P9), não uma feature nova.
- **In-progress**: nenhum — feature code-complete e verificada.
- **Bloqueio operacional resolvido (16/09)**: migração `009-ingress-ranking-months-subscribed.sql` aplicada em produção no Neon com autorização explícita do Luiz; confirmado via query direta que a coluna (`INTEGER`, nullable) e o `CHECK` existem.
- **Autorizações concedidas pelo Luiz nesta feature**: aplicar a migração de coluna em produção (banco é sempre produção, sem diferença de ambiente — mesmo padrão já registrado nas features anteriores).
- **UAT visual**: ainda não feito — o Luiz não revisou a aba na tela.
- **Next step**: (1) UAT visual da aba; (2) decidir sobre push/PR (branch só local); (3) opcionalmente, uma rodada de Tasks pra P7-P9 (geografia, crescimento, correlação — ver spec/design já prontos).
- **Uncommitted files**: só `.specs/features/ingress-ranking-comparison/` (spec de uma feature IRMÃ, discutida na mesma sessão mas não implementada — comparação de agentes por seleção em vez de colar texto; continua não commitada, não faz parte desta feature).
- **Branch**: `feat/ingress-ranking-nerd-stats`, local, **não pushada**. Criada a partir de um `main` limpo, depois de commitar separadamente (`630bd2a`) uma reestruturação pré-existente do `/ingress` (hub em `/ingress`, perfil movido pra `/ingress/fencherlc`) que já estava no working tree quando a sessão começou.

---

### Handoff anterior (feature `ingress-ranking-country`, arquivado — ver `.specs/features/ingress-ranking-country/`)

- **Feature**: ingress-ranking-country (`.specs/features/ingress-ranking-country/`) — **FECHADA. Execute completo (T1-T10) + Verifier PASS na 2ª rodada** (`validate_state.py` confirma).
- **Completed**: seletor de país (`CountryPicker`, combobox com filtro por digitação PT/EN/código + bandeira, ARIA combobox+listbox) obrigatório em toda submissão nova de `/ingress/ranking`, um por textarea colada (A e B independentes no modo comparação); persistido em `casara.ingress_rankings.country_code` (CHAR(2), nullable, `CHECK` de formato — migração `lib/migrations/003-ingress-ranking-country.sql`); `POST /api/ingress-rankings` rejeita (400) submissão sem país válido; `GET`/SSR devolvem `country_code`; `IngressRankingTable` ganhou coluna de bandeira (célula vazia pra linhas legadas sem país). Dado de 250 países (ISO 3166-1, nomes PT/EN) e as 250 bandeiras SVG são gerados uma vez por `scripts/gen-ingress-countries.mjs` (usa `i18n-iso-countries`+`flag-icons` só como devDependencies, nunca em runtime) e versionados em `lib/ingress/countries.json`/`public/ingress/flags/`.
- **In-progress**: nenhum — feature code-complete e verificada.
- **Bloqueio operacional resolvido (13/09)**: migração `003-ingress-ranking-country.sql` aplicada em produção no Neon com autorização explícita do Luiz; confirmado via query direta que a coluna existe e a query real do ranking funciona.
- **Backfill pontual autorizado pelo Luiz (13/09)**: as 6 linhas que já existiam em `casara.ingress_rankings` antes da migração (todas com `country_code IS NULL`) foram atualizadas para `'BR'` via `UPDATE ... WHERE country_code IS NULL`, a pedido direto dele — os 6 agentes cadastrados até agora são todos brasileiros. Isso é uma correção pontual de dado, não uma mudança da spec: a Out of Scope original ("preencher retroativamente sem fonte confiável") continua valendo como regra padrão para o caso geral; aqui o Luiz é a fonte confiável para os 6 casos que existiam.
- **Bug real achado pelo Verifier na 1ª rodada (corrigido antes de fechar)**: `lib/ingress-countries.mjs` usava `readFileSync`+`createRequire` (API exclusiva de Node) para carregar o JSON de países — como esse módulo é importado por Client Components (`CountryPicker`, `IngressRankingTable`), o Turbopack não conseguia colocar isso no bundle do navegador e `npm run build` quebrava. A correção (`import ... with {type:'json'}`, já testada manualmente) tinha ficado só no working tree por várias tasks sem ser commitada — só foi pega porque o Verifier roda em worktree isolado a partir do HEAD real, não do working tree. **Lição registrada** (`.specs/lessons.json`): módulo `lib/*.mjs` alcançável por Client Component nunca pode usar API de Node (`node:fs`, `node:module`) — usar `import ... with {type:'json'}` pra dado estático.
- **Autorizações concedidas pelo Luiz nesta feature**: aplicar a migração de coluna em produção (banco é sempre produção, sem diferença de ambiente — mesmo padrão já registrado na feature anterior).
- **UAT visual confirmado pelo Luiz (13/09)**: revisou `/ingress/ranking` na tela e confirmou que está tudo ok.
- **Next step**: nenhum pendente no código nem na verificação — falta só decidir se/quando dar push e abrir PR (branch só local até agora).
- **Uncommitted files**: nenhum (working tree limpo).
- **Branch**: `feat/ingress-ranking-history` — **atenção**: esta branch já vinha com 2 commits de uma feature anterior não relacionada (histórico de AP no ranking, `81e0cf0`/`9fef370`) quando esta feature começou; não pushada ainda, não é `main`.

### Trabalho adicional na mesma branch (fora do fluxo tlc-spec-driven, 13/09/2026)

- **O quê**: filtros e ordenação em `/ingress/ranking` — busca por codinome, toggle de facção, e ordenação clicável (nota geral, AP total, país, e 5 colunas novas de nota por eixo `C/D/E/H/LF` — Construção/Destruição/Exploração/Hacking/Links e campos). Tudo client-side em `IngressRankingTable.tsx`, lendo `axis_scores` que já vinha na API — nenhuma mudança de schema/migração/rota.
- **Commit**: `7d1cee5` (`feat(ingress): add filters, sorting, and per-axis columns to ranking table`), na mesma branch `feat/ingress-ranking-history`.
- **Por que fora do fluxo**: classificado como bounded no brainstorming (mudança pequena num fluxo já existente, sem subsistema novo) — sem spec/design/tasks própria em `.specs/features/`.
- **Verificado**: `tsc --noEmit` limpo, lint sem erro novo, `npm test` (393 testes) passando, SSR de `/ingress/ranking` responde 200. UAT visual confirmado pelo Luiz em 13/09 (junto com a revisão da feature de país).

---

### Handoff anterior (feature `ingress-stats-ranking`, arquivado — ver `.specs/features/ingress-stats-ranking/`)

Rota `/ingress/ranking` (radar, tabela de ranking, hero), tabela `casara.ingress_rankings`, i18n PT/EN de `/ingress`. Mergeada em `main` (`dc2f539`, PR #40) antes desta sessão começar. 387 testes na época.

### Handoff anterior (feature `ingress` original, arquivado — ver `.specs/features/ingress/`)

Feature completa e mergeada antes da `ingress-stats-ranking` começar: perfil `/ingress`, linha do tempo, grade de medalhas (`MedalGrid`), `/ingress/medalha/[slug]`. 338 testes na época. Branch `feat/ingress` (histórica, já mergeada). Dívida técnica então pendente (CSS morto em `theme.css`, dump GDPR, `medal-lore.json` a calibrar) continua relevante e não foi tocada por nenhuma feature nova desde então.
