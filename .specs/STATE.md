# STATE

## Decisions

### AD-001
- **Decision**: Uma feature de perfil/vitrine de um único dono pode ter como fonte de dados um arquivo versionado no repo (`data/<feature>/*.json`) alimentado por um script local, em vez de uma tabela no schema `casara` do Neon.
- **Reason**: Para a feature `ingress` o dado é de um agente só, pequeno (~2 KB), estável e público por natureza. Um arquivo importado no build deixa a página trivial e offline-safe, mantém o parsing todo em Node testável e evita abrir superfície de escrita — mesmo princípio de "sem rota de admin" de `/livros`.
- **Trade-off**: Abre mão da consulta agregada, do histórico incremental barato e da consistência com o resto do site (que põe tudo em `casara.*`). Atualizar exige rodar o script + commit + deploy, não um `INSERT`.
- **Scope**: Features de vitrine/portfólio de dono único (a `ingress`; potenciais futuras "diário de agente", perfis de outros jogos). NÃO se aplica a nada com múltiplos escritores, sessões ao vivo ou analytics — esses continuam em `casara.*`.
- **Date**: 2026-09-07
- **Status**: active

## Handoff

- **Feature**: ingress (`.specs/features/ingress/`)
- **Phase / Task**: Execute — Fases 1–3 COMPLETAS (T1–T18). Próxima: Fase 4 (T19–T23).
- **Completed**: Specify, Discuss, Design, Tasks. Execute T1–T18 + `refactor(ingress): direção visual Prime` (Luiz pediu Ingress Prime, não o clássico 2013 — theme.css/fonte Sora/wrapper `.ingress-prime`). Fase 3: T14 ProfileRadar, T15 ActionsBreakdown, T16 S2Preview, T17 S2Explorer (Leaflet `dynamic ssr:false` no toque + MapErrorBoundary), T18 ApTimeline. Commits atômicos; 295 testes; build ✔; /ingress 105 kB.
- **In-progress** (file:line): nenhum — Fase 3 fechada em `e78a9d9`
- **Next step**: T19 — `scripts/ingress.mjs` (CLI build/gdpr/show). Depois T20 opengraph-image, T21 icon, T22 CountUp, T23 integração final → **Verifier obrigatório**.
- **Blockers**: verificação visual do mapa S2 (T17) e da direção Prime pendente do Luiz.
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress` (tudo à frente de main; nada pushed)
