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
- **Phase / Task**: Execute — Fase 1 (T1–T7) COMPLETA. Próxima: Fase 2 (T8–T13), a UI.
- **Completed**: Specify, Discuss, Design, Tasks. Execute: T1 (deps), T2 (ingress-stats), T3 (ingress-badges), T4 (ingress-radar), T5 (ingress-profile), T6 (ingress-s2), T7 (semente JSON + loader). Cada uma com commit atômico; 40 testes novos (295 no total); build ✔.
- **In-progress** (file:line): nenhum — Fase 1 fechada em `28a3cb3`
- **Next step**: T8 — `app/ingress/layout.tsx` (layout próprio, fontes, metadata; Direção "Scanner"). Depois T9 page.tsx, T10–T13 seções server.
- **Blockers**: coordenada real da cidade do Luiz para `data/ingress/fencherlc.json` → `s2.center` (hoje: placeholder Brasília -15.7939,-47.8828). Trocar com `node scripts/ingress.mjs` quando o script existir (T19) ou à mão no JSON.
- **Uncommitted files**: nenhum (tudo commitado na branch)
- **Branch**: `feat/ingress` (7 commits de planejamento/docs + 8 de execução à frente de main)
