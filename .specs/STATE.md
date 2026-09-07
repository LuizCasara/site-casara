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
- **Phase / Task**: Execute — Fases 1 e 2 COMPLETAS (T1–T13). Próxima: Fase 3 (T14–T18).
- **Completed**: Specify, Discuss, Design, Tasks. Execute Fase 1: T1–T7 (lib pura + semente JSON + loader). Fase 2: T8 (layout + theme.css "Scanner" + esconde Header/Footer), T9 (page.tsx + Panel), T10 (AgentHeader + HeroMesh), T11 (StatGroups + StatValue), T12 (BadgeShelf + BadgeMedal), T13 (PendingSection). Commits atômicos; 295 testes; build ✔; /ingress 103 kB estático.
- **In-progress** (file:line): nenhum — Fase 2 fechada
- **Next step**: T14 — `components/ingress/ProfileRadar.tsx` (SVG radar de `computeRadarAxes`). Depois T15 ActionsBreakdown, T16 S2Preview, T17 S2Explorer (client, Leaflet sob toque), T18 ApTimeline.
- **Blockers**: nenhum. `s2.center` = Cascavel - PR (-24.9573, -53.459).
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress` (planejamento + Fase 1 + Fase 2 à frente de main; nada pushed)
