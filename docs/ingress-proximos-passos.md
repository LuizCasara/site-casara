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
