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
- **Phase / Task**: Feature original COMPLETA (T1–T24 + Verifier). **Expansão de medalhas** aprovada (MED-01..MED-08, T25–T43). Executando **Fases 5-6 (T25–T32)** agora, para no fim delas.
- **Completed**: feature original + Verifier + T24. Expansão: brainstorming → spec/design/tasks (`6f10ef9`), catálogo `data/ingress/badge-catalog.json` (26 badges) gerado do ingress.plus.
- **In-progress** (file:line): iniciando T25
- **Next step**: T25 (script gerador do catálogo) → T26–T30 (libs `ingress-catalog/-history/-timeline`, badges data-driven, migração do perfil) → T31 (CLI) → T32 (baixar ~130 PNGs). **Parar aí.** Fases 7-8 (UI) depois que o Luiz mandar os prints (amanhã, 1 por medalha — trazem arte + datas de cada tier → alimentam `eventBadges` + `medalDates`).
- **Blockers**: prints do perfil pendentes do Luiz (para Conquistas + timeline). UAT visual pendente.
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress`, 36 commits à frente de main. **Nada pushed.**
