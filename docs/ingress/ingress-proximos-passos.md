# Ingress — próximos passos (fila)

Itens levantados durante a construção da feature que ficaram de fora do escopo
imediato. Sem ordem rígida.

## Recursão / medalhas "recursadas" (pedido do Luiz, 08/09/2026)

No jogo, ao recursar (nível 16 → volta ao 1) o agente ganha a medalha
**Recursion**, e as medalhas conquistadas em Onyx podem ser "recursadas" de novo,
aparecendo no scanner como **"Onyx 3x"** com marcas/assinhas vermelhas (chevrons)
sobre a arte.

Trazer para o site:

- **Ênfase na medalha Recursion** — ela é um marco, não uma badge de evento
  qualquer. Merece destaque no perfil e na linha do tempo.
- **Contador de recursão por medalha** — mostrar "Onyx ×N" com os chevrons
  vermelhos na arte, tanto no card da medalha quanto no ponto/tooltip da linha
  do tempo.
- **Dado**: não vem dos prints atuais nem do export do app. Provavelmente sai do
  dump GDPR (ou de um print dedicado por medalha recursada). Precisa de um campo
  novo no modelo — algo como `medalRecursions: {slug: n}` ou `recursedAt` por
  tier em `medalDates`.

## Badges decorativas / colecionáveis / aniversário (pedido do Luiz, 08/09/2026)

Personagens, Limited Editions, Anniversaries. Entram no histórico e no perfil,
mas de forma resumida — um grupo que expande (`<details>`) ou atrás de um
filtro/order by em `AchievementsShelf`. Falta o Luiz mandar os prints ou uma
lista do que ele tem (não há popup dessas nos 56 prints de 08/09).

## Itens que já estavam pendentes

- **Dump GDPR** — `GDPR_SERIES` em `scripts/ingress.mjs` a ajustar quando o
  formato real chegar; alimenta `history` e destrava a série temporal de AP.
- **Mapa de calor de portais** — `/ingress` tem o placeholder; depende do dump.
- **Segundo export** — destrava a projeção de próximo tier de verdade (hoje
  `projectNextTier` só tem 1 snapshot).

## Adiado do code review de 09/09/2026 (fechamento da v1)

Levantado no review de fechamento, deixado de fora por risco/porte alto demais
para a rodada de higiene:

- **`AchievementTimeline.tsx` é um `'use client'` monolítico** — a variante
  `resumo` (mostrada em `/ingress`) é 100% estática mas arrasta todo o
  `Completo` (brush/drag/tooltip) para o bundle. Separar `Resumo` +
  `annotateLaneGaps` num server component; só `Completo` fica client. Regra do
  `nextjs-use-client`, mas o arquivo tem ~490 linhas e o split é delicado.
- **`RADAR_AXES` em `lib/ingress-radar.mjs`** — cada `ref` é o limiar de Onyx do
  badge copiado à mão (verificado: hoje bate 11/11 com o catálogo). Se o
  `TIER_OVERRIDES` do gerador mudar um limiar, o radar normaliza contra o número
  velho sem erro. Resolver `ref` de `catalogEntry(part.badge).tiers.at(-1)` em
  tempo de cálculo; precisa de teste cruzado.
- **`STAT_GROUPS` em `lib/ingress-stats.mjs`** duplica o campo `group` que
  `STAT_COLUMNS` já carrega — derivar um do outro para uma stat nova não sumir
  de `/ingress` por esquecerem de editar as duas listas.
- **`parseAppExport` / `toNumber`** (`lib/ingress-stats.mjs`): tira o `.` de
  valores decimais (colunas de km), o que num export em locale `.`-decimal
  infla o número. Não é trivial — no locale `.`-milhar o mesmo ponto é
  separador (o teste `"94.990.303" → 94990303` trava). Precisa de parsing
  ciente de locale. Caminho do "colar export do app", não afeta o dado atual
  (veio do dump).
- **`parseAppExport`** rejeita export com colunas finais vazias por "contagem de
  colunas" em vez de completar com 0 — mesmo arquivo; resolver junto com o de
  cima, com teste.
- **`HeroGlobe.tsx`** recalcula land/coast (~11k células) e os `arcPoints`
  (slerp) a cada frame; só a projeção depende do `yaw`. Pré-computar a cena uma
  vez. Puramente decorativo e desktop-only, roda ok hoje.
- **`medalArt()` / `existsSync`** (`lib/ingress-medal-art.mjs`) — checagem de
  arquivo em runtime que sempre dá `false` numa função serverless (assets vão
  para a CDN, não para o bundle). Latente enquanto as rotas são estáticas; se
  alguma virar dinâmica, trocar por um manifesto gerado no build.
