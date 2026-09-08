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
- **Phase / Task**: Feature COMPLETA no código (T1–T43 + 2 Verifiers + transcrição dos 56 prints + redesign da linha do tempo). Branch pushado, PR aberto contra `main`. Falta só UAT visual do Luiz + merge.
- **Completed**: T1–T24 (feature) + T25–T43 (expansão). Fase 5-6: catálogo das 26 badges do ingress.plus, `lib/ingress-catalog/-history/-timeline.mjs`, `ingress-badges` data-driven, `history[]`/`medalDates`/`eventBadges` no perfil, CLI `badges`/`medals --fetch`, 130 PNGs baixados. Fase 7-8: BadgeShelf 26 + resumo + próxima medalha, `/ingress/medalha/[slug]` (detalhe + TierLadder + OG por badge, 26 rotas prerender), AchievementsShelf, AchievementTimeline, hover KPI→badge (CSS puro), projeção. 325 testes, 8/8 mutantes mortos, gate verde.
- **In-progress** (file:line): nenhum
- **Prints TRANSCRITOS (08/09)**: 56 prints → 27 `medalDates`, 25 `eventBadges`, 3 badges core novas (Maverick/Reclaimer/Epoch, core = 29), 2 correções de limiar (Illuminator/Guardian), 40 PNGs. Timeline de conquistas com 126 marcadores. + `fix` do "voltar" (BackLink). 325 testes, gate verde. Ver adendo em `validation.md`.
- **Linha do tempo REDESENHADA (08/09)**: brainstorming (bounded) → combo. `components/ingress/AchievementTimeline.tsx` agora client, com `variant="resumo"` (curva no `/ingress`) e `variant="completo"` (nova rota `/ingress/linha-do-tempo`: overview+brush de zoom, filtros categoria/tier, swimlane por medalha, tooltip com arte PNG + intervalo desde o tier anterior, drill-down). `lib/ingress-timeline.mjs` +`annotateLaneGaps`/`formatGap` (+testes, 329). `artPath` → `lib/ingress-art.mjs` (sem `node:fs`). Fix: cor prata/onyx dos pontos; arte de badge de evento no tooltip (usa `<slug>.png` único). Commits `09dfa1c`, `3609362`. Lint/build verdes.
- **Pushed + PR (08/09)**: branch pushado, Luiz abriu o PR contra `main`. `gh` CLI não instalado nesta máquina. PR acumula os commits novos automaticamente.
- **Iteração de UI (09/09)** — várias rodadas de feedback do Luiz, tudo pushado:
  - Progresso %: `computeBadge` +`beyond` (Onyx ×2/×3…); barra+% em toda medalha; tabela de limiares+valor atual no painel da linha do tempo.
  - Painel de detalhe acima da swimlane, com faixa "Bronze→Onyx · Xa Ym", mini gráfico (`MedalSpark`) e escada com intervalo entre datas (colunas alinhadas).
  - Cores: Onyx grafite `#626873`, Platina cinza `#8d949d` (sem verde/azul do tema) em `/ingress`.
  - **"Plus" por medalha de estatística**: `data/ingress/medal-lore.json` (17 medalhas) + `lib/ingress-lore.mjs` (+testes) + `MedalLore`. Página `/ingress/medalha/[slug]` reorganizada (herói→plus→requisito→MedalSpark→TierLadder com gaps+%→projeção).
  - **Home = grade hexagonal** (`MedalGrid`): substitui BadgeShelf+AchievementsShelf (removidos). Toggle Cronologia|Categoria, "próxima medalha", toque→`MedalDetail` (painel extraído e compartilhado com a linha do tempo). Grupos Colecionáveis/Personagens = placeholder "chegam com o dump GDPR".
  - 338 testes, lint/build verdes.
- **Next step**: (1) UAT visual do Luiz (nada renderizado num browser ainda) — `/ingress` (grade, toggle, próxima, detalhe), `/ingress/linha-do-tempo`, `/ingress/medalha/[slug]` (o plus, o spark, a escada), desktop + 360px. (2) Se aprovado: mergear o PR.
- **Dívida técnica**: CSS morto em `theme.css` (`.ing-medal*`, `.ing-next-medal*`, `.ing-achv*` dos componentes removidos) — limpar depois. `scratchpad/` agora gitignored (dump da API do ingress.plus caiu no repo por engano no commit `5834abf`, removido no `3a663b5`).
- **Blockers**:
  - UAT visual (só Luiz — memória: não abrir browser).
  - Interações novas (grade, toggle, painéis, brush) sem teste — só lógica pura testada.
  - Dado externo: dump GDPR (AP, portais, recursão por medalha, lista de Colecionáveis/Personagens pra `MedalGrid`) + `GDPR_SERIES`; 2º export (projeção real).
  - `docs/ingress-proximos-passos.md`: recursão/"Onyx ×N" com chevrons + ênfase na medalha Recursion.
  - `medal-lore.json` a calibrar com o Luiz (referências de comparação).
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress`, ~74 commits à frente de `main`, **pushed**, PR aberto.
