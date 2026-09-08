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
- **Phase / Task**: Feature original + expansão de medalhas COMPLETAS (T1–T43 + 2 Verifiers). Luiz pediu p/ adiantar tudo enquanto dormia — Fases 7-8 (UI) feitas com o snapshot; Conquistas/timeline em estado convite/placeholder até os prints.
- **Completed**: T1–T24 (feature) + T25–T43 (expansão). Fase 5-6: catálogo das 26 badges do ingress.plus, `lib/ingress-catalog/-history/-timeline.mjs`, `ingress-badges` data-driven, `history[]`/`medalDates`/`eventBadges` no perfil, CLI `badges`/`medals --fetch`, 130 PNGs baixados. Fase 7-8: BadgeShelf 26 + resumo + próxima medalha, `/ingress/medalha/[slug]` (detalhe + TierLadder + OG por badge, 26 rotas prerender), AchievementsShelf, AchievementTimeline, hover KPI→badge (CSS puro), projeção. 325 testes, 8/8 mutantes mortos, gate verde.
- **In-progress** (file:line): nenhum
- **Prints TRANSCRITOS (08/09)**: 56 prints → 27 `medalDates`, 25 `eventBadges`, 3 badges core novas (Maverick/Reclaimer/Epoch, core = 29), 2 correções de limiar (Illuminator/Guardian), 40 PNGs. Timeline de conquistas com 126 marcadores. + `fix` do "voltar" (BackLink). 325 testes, gate verde. Ver adendo em `validation.md`.
- **Linha do tempo REDESENHADA (08/09)**: brainstorming (bounded) → combo. `components/ingress/AchievementTimeline.tsx` agora client, com `variant="resumo"` (curva no `/ingress`) e `variant="completo"` (nova rota `/ingress/linha-do-tempo`: overview+brush de zoom, filtros categoria/tier, swimlane por medalha, tooltip com arte PNG + intervalo desde o tier anterior, drill-down). `lib/ingress-timeline.mjs` +`annotateLaneGaps`/`formatGap` (+testes, 329). `artPath` → `lib/ingress-art.mjs` (sem `node:fs`). Fix: cor prata/onyx dos pontos; arte de badge de evento no tooltip (usa `<slug>.png` único). Commits `09dfa1c`, `3609362`. Lint/build verdes.
- **Next step (quando o Luiz voltar)**: (1) UAT visual — inclui agora `localhost:3000/ingress/linha-do-tempo` (brush, filtros, scroll da swimlane, tooltip, drill) desktop + 360px, e o teaser novo no `/ingress`. (2) Se aprovado: `git push origin feat/ingress` + PR (**precisa OK dele**).
- **Blockers**: UAT visual. GDPR_SERIES a ajustar quando o dump chegar. Fila em `docs/ingress-proximos-passos.md`: recursão/"Onyx ×N" com chevrons + ênfase na medalha Recursion (precisa de dado novo), badges decorativas/colecionáveis/aniversário (precisa prints/lista do Luiz).
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress`, ~65 commits à frente de main. **Nada pushed.**
