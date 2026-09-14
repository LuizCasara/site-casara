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

## Handoff

- **Feature**: ingress-ranking-country (`.specs/features/ingress-ranking-country/`) — **FECHADA. Execute completo (T1-T10) + Verifier PASS na 2ª rodada** (`validate_state.py` confirma).
- **Completed**: seletor de país (`CountryPicker`, combobox com filtro por digitação PT/EN/código + bandeira, ARIA combobox+listbox) obrigatório em toda submissão nova de `/ingress/ranking`, um por textarea colada (A e B independentes no modo comparação); persistido em `casara.ingress_rankings.country_code` (CHAR(2), nullable, `CHECK` de formato — migração `lib/migrations/003-ingress-ranking-country.sql`); `POST /api/ingress-rankings` rejeita (400) submissão sem país válido; `GET`/SSR devolvem `country_code`; `IngressRankingTable` ganhou coluna de bandeira (célula vazia pra linhas legadas sem país). Dado de 250 países (ISO 3166-1, nomes PT/EN) e as 250 bandeiras SVG são gerados uma vez por `scripts/gen-ingress-countries.mjs` (usa `i18n-iso-countries`+`flag-icons` só como devDependencies, nunca em runtime) e versionados em `lib/ingress/countries.json`/`public/ingress/flags/`.
- **In-progress**: nenhum — feature code-complete e verificada.
- **Bloqueio operacional resolvido (13/09)**: migração `003-ingress-ranking-country.sql` aplicada em produção no Neon com autorização explícita do Luiz; confirmado via query direta que a coluna existe e a query real do ranking funciona.
- **Backfill pontual autorizado pelo Luiz (13/09)**: as 6 linhas que já existiam em `casara.ingress_rankings` antes da migração (todas com `country_code IS NULL`) foram atualizadas para `'BR'` via `UPDATE ... WHERE country_code IS NULL`, a pedido direto dele — os 6 agentes cadastrados até agora são todos brasileiros. Isso é uma correção pontual de dado, não uma mudança da spec: a Out of Scope original ("preencher retroativamente sem fonte confiável") continua valendo como regra padrão para o caso geral; aqui o Luiz é a fonte confiável para os 6 casos que existiam.
- **Bug real achado pelo Verifier na 1ª rodada (corrigido antes de fechar)**: `lib/ingress-countries.mjs` usava `readFileSync`+`createRequire` (API exclusiva de Node) para carregar o JSON de países — como esse módulo é importado por Client Components (`CountryPicker`, `IngressRankingTable`), o Turbopack não conseguia colocar isso no bundle do navegador e `npm run build` quebrava. A correção (`import ... with {type:'json'}`, já testada manualmente) tinha ficado só no working tree por várias tasks sem ser commitada — só foi pega porque o Verifier roda em worktree isolado a partir do HEAD real, não do working tree. **Lição registrada** (`.specs/lessons.json`): módulo `lib/*.mjs` alcançável por Client Component nunca pode usar API de Node (`node:fs`, `node:module`) — usar `import ... with {type:'json'}` pra dado estático.
- **Autorizações concedidas pelo Luiz nesta feature**: aplicar a migração de coluna em produção (banco é sempre produção, sem diferença de ambiente — mesmo padrão já registrado na feature anterior).
- **Next step**: nenhum pendente no código; UAT visual (o Luiz testar `/ingress/ranking` na tela) é o único passo que falta, e não bloqueia o fechamento desta feature.
- **Uncommitted files**: nenhum (working tree limpo).
- **Branch**: `feat/ingress-ranking-history` — **atenção**: esta branch já vinha com 2 commits de uma feature anterior não relacionada (histórico de AP no ranking, `81e0cf0`/`9fef370`) quando esta feature começou; não pushada ainda, não é `main`.

### Trabalho adicional na mesma branch (fora do fluxo tlc-spec-driven, 13/09/2026)

- **O quê**: filtros e ordenação em `/ingress/ranking` — busca por codinome, toggle de facção, e ordenação clicável (nota geral, AP total, país, e 5 colunas novas de nota por eixo `C/D/E/H/LF` — Construção/Destruição/Exploração/Hacking/Links e campos). Tudo client-side em `IngressRankingTable.tsx`, lendo `axis_scores` que já vinha na API — nenhuma mudança de schema/migração/rota.
- **Commit**: `7d1cee5` (`feat(ingress): add filters, sorting, and per-axis columns to ranking table`), na mesma branch `feat/ingress-ranking-history`.
- **Por que fora do fluxo**: classificado como bounded no brainstorming (mudança pequena num fluxo já existente, sem subsistema novo) — sem spec/design/tasks própria em `.specs/features/`.
- **Verificado**: `tsc --noEmit` limpo, lint sem erro novo, `npm test` (393 testes) passando, SSR de `/ingress/ranking` responde 200. UAT visual ainda pendente (o Luiz testar na tela), mesmo passo que já estava em aberto pra feature de país.

---

### Handoff anterior (feature `ingress-stats-ranking`, arquivado — ver `.specs/features/ingress-stats-ranking/`)

Rota `/ingress/ranking` (radar, tabela de ranking, hero), tabela `casara.ingress_rankings`, i18n PT/EN de `/ingress`. Mergeada em `main` (`dc2f539`, PR #40) antes desta sessão começar. 387 testes na época.

### Handoff anterior (feature `ingress` original, arquivado — ver `.specs/features/ingress/`)

Feature completa e mergeada antes da `ingress-stats-ranking` começar: perfil `/ingress`, linha do tempo, grade de medalhas (`MedalGrid`), `/ingress/medalha/[slug]`. 338 testes na época. Branch `feat/ingress` (histórica, já mergeada). Dívida técnica então pendente (CSS morto em `theme.css`, dump GDPR, `medal-lore.json` a calibrar) continua relevante e não foi tocada por nenhuma feature nova desde então.
