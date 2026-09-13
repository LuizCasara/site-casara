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

- **Feature**: ingress-stats-ranking (`.specs/features/ingress-stats-ranking/`) — **FECHADA, PR aberto contra `main`**.
- **Phase / Task**: Execute COMPLETO (37 tasks + 6 fix tasks, Verifier PASS) + rodada extensa de refinamento iterativo pós-launch com o Luiz (UAT ao vivo, ~24 commits extras). `validate_state.py` confirma o relatório original.
- **Completed**: internacionalização PT/EN de toda `/ingress`; rota `/ingress/ranking` (renomeada de `/ingress/stats`) com radar, explicação dos 5 eixos, nota geral tier-based, tabela de ranking completa (facção com logo, colunas reordenadas/alinhadas, expansão em grid de 5 colunas + mini-radar de forma), hero dedicado; tabela `casara.ingress_rankings` (upsert guardado por debounce de 5 min, desempate nota→AP→data, **sem guarda especial pro FencherLC** — corrigida em 12/09 pra ele conseguir se auto-atualizar); ponte de leitura AD-002 (`/ingress` raiz reflete a última submissão do próprio FencherLC no radar, via ISR de 5 min); 3 caminhos de entrada com "só entrar no ranking" como padrão/principal; alerta de Telegram por submissão (top 3 + posição); botão de compartilhar em `/ingress/ranking`; painel dedicado de analytics do Ingress em `/stats`; tutorial de exportação com print real. 387 testes, gate lint/build/test verde.
- **In-progress**: nenhum — feature code-complete, verificada e fechada nesta versão.
- **Achados registrados como lição** (`.specs/lessons.json`): i18n retrofit deve recobrir os componentes NOVOS da própria feature, não só as páginas pré-existentes; componente forçado a virar Client Component não pode manter cálculo dependente de `node:fs` — precisa receber via prop do Server Component pai.
- **Gap de baixa severidade, não-bloqueante (L-006)**: fallback "Sinal perdido" de `/ingress/ranking` ficou hardcoded PT. Praticamente inalcançável em produção (perfil do FencherLC sempre committado); polish futuro se entrar um segundo perfil.
- **Bloqueio operacional resolvido (12/09)**: `casara.ingress_rankings` criada em produção com autorização explícita do Luiz; smoke test real (upsert, debounce) passou contra o banco real.
- **Autorizações concedidas pelo Luiz nesta feature** (ver `.specs/features/ingress-stats-ranking/tasks.md` → `## Execution Notes` e memória `project_ingress_feature.md`): Playwright autorizado pra ver/testar telas (escopado a esta feature); banco é sempre produção, sem diferença de ambiente.
- **Next step**: revisão do PR pelo Luiz no GitHub e merge quando aprovado.
- **Uncommitted files**: nenhum (working tree limpo).
- **Branch**: `feat/ingress-stats-ranking`, pushada, PR aberto contra `main`.

---

### Handoff anterior (feature `ingress` original, arquivado — ver `.specs/features/ingress/`)

Feature completa e mergeada antes desta (`ingress-stats-ranking`) começar: perfil `/ingress`, linha do tempo, grade de medalhas (`MedalGrid`), `/ingress/medalha/[slug]`. 338 testes na época. Branch `feat/ingress` (histórica, já mergeada). Dívida técnica então pendente (CSS morto em `theme.css`, dump GDPR, `medal-lore.json` a calibrar) continua relevante e não foi tocada por esta feature nova.
