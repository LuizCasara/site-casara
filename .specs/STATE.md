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

- **Feature**: ingress-stats-ranking (`.specs/features/ingress-stats-ranking/`)
- **Phase / Task**: Execute COMPLETO — 37 tasks + 6 fix tasks (Verifier round 1 → FAIL → fix → round 2 → **PASS**). `validate_state.py` confirma o relatório. Branch `feat/ingress-stats-ranking` **NÃO pushada ainda** — falta autorização explícita do Luiz pra push/PR (blast radius: Execute só autoriza commit local).
- **Completed**: internacionalização PT/EN de toda `/ingress` (toggle novo, já que o `Header` genérico esconde a si mesmo nessas rotas); nova rota `/ingress/stats` (radar + explicação fixa dos 5 eixos + nota geral tier-based com overflow linear pós-Onyx + ranking); tabela `casara.ingress_rankings` (upsert atômico guardado por debounce de 5 min, guarda do FencherLC, desempate nota→AP→data); 3 caminhos de entrada (`ProfileRadar` estendido, aditivo, sem regressão no uso existente de `/ingress`); toast (`sonner`, escopado ao layout de `/ingress`); analytics (`trackIngress*`). 383 testes (349 baseline → 379 pós-37-tasks → 383 pós-fix), gate lint/build/test verde, 2 mutantes/sensor mortos em cada rodada do Verifier.
- **In-progress**: nenhum — feature code-complete e verificada.
- **Achados registrados como lição** (`.specs/lessons.json`): i18n retrofit deve recobrir os componentes NOVOS da própria feature, não só as páginas pré-existentes (foi o que o Verifier round 1 pegou); componente forçado a virar Client Component não pode manter cálculo dependente de `node:fs` — precisa receber via prop do Server Component pai (padrão repetido em T21/T29/T33-35/FIX-4).
- **Gap de baixa severidade, não-bloqueante (L-006)**: `app/ingress/stats/page.tsx` — o fallback "Sinal perdido" (perfil vazio) ficou hardcoded PT, ao contrário do fallback equivalente em `/ingress`. Praticamente inalcançável em produção (o perfil do FencherLC é sempre committado), mas fica como polish futuro se algum dia entrar um segundo perfil.
- **Bloqueio operacional resolvido (12/09)**: com autorização explícita do Luiz, `casara.ingress_rankings` foi criada em produção (script pontual não-versionado, não `lib/schema.sql` automatizado) e o smoke test real do `POST/GET /api/ingress-rankings` passou: upsert, debounce (mesmo codinome, dados diferentes, negado) — tudo confirmado contra o banco real, linha de teste apagada depois. `T4` em `tasks.md` marcado `[x]` por completo agora.
- **Guarda do FencherLC removida (12/09)**: o Luiz reportou que sua própria submissão não gravava — a guarda de somente-leitura (cliente inferia pelo codinome, servidor bloqueava a chave) impedia até o dono real de se auto-atualizar. Removida `isFencherLcCodename()` e o bloqueio na rota; FencherLC agora grava como qualquer agente, sujeito ao mesmo debounce de 5 min. Ver **AD-002** acima para a ponte que isso abriu de volta pro `/ingress` (raiz).
- **Autorizações concedidas pelo Luiz nesta feature** (ver `.specs/features/ingress-stats-ranking/tasks.md` → `## Execution Notes` e memória `project_ingress_feature.md`): Playwright autorizado pra ver/testar telas (escopado a esta feature, não é o padrão geral do projeto); banco é sempre produção, sem diferença de ambiente.
- **Next step**: (1) UAT visual do Luiz — nada foi aberto em browser pelos agentes por padrão, exceto o que os batch workers tenham verificado via Playwright quando autorizado. (2) Se aprovado: pedir autorização explícita pra push + abrir PR contra `main`.
- **Uncommitted files**: nenhum (working tree limpo na branch).
- **Branch**: `feat/ingress-stats-ranking`, ~41 commits à frente de `main`, **NÃO pushada**.

---

### Handoff anterior (feature `ingress` original, arquivado — ver `.specs/features/ingress/`)

Feature completa e mergeada antes desta (`ingress-stats-ranking`) começar: perfil `/ingress`, linha do tempo, grade de medalhas (`MedalGrid`), `/ingress/medalha/[slug]`. 338 testes na época. Branch `feat/ingress` (histórica, já mergeada). Dívida técnica então pendente (CSS morto em `theme.css`, dump GDPR, `medal-lore.json` a calibrar) continua relevante e não foi tocada por esta feature nova.
