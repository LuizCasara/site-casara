# 0002 — Sanitização de notificações (Telegram/e-mail) em vez de reescrita para HTML

## Status

Aceito (12/09/2026, mesma auditoria do ADR-0001)

## Contexto

Duas rotas públicas sem autenticação interpolavam campos de request direto
em conteúdo formatado, sem escapar nada:

- `/api/send-email` monta um e-mail HTML (via nodemailer/Gmail) com `name`,
  `age`, `browserInfo` e campos de `results` inseridos direto no HTML. Um
  visitante podia injetar HTML/links arbitrários na caixa de entrada pessoal
  do dono do site.
- `/api/telegram` monta mensagens com `parse_mode: 'Markdown'` (o modo
  legado, v1, da API do Telegram) interpolando `codename`/`name` sem
  escapar. Um `codename` com `` ` ``, `_`, `*` ou `[` conseguia fechar um
  bloco de código antes da hora, virar negrito/itálico fora de contexto, ou
  se passar por um link.

Para o Telegram, a alternativa "correta" no sentido de robustez total seria
migrar `parse_mode` de `'Markdown'` para `'HTML'`, que tem regras de escape
bem definidas (`&amp;`, `&lt;`, `&gt;`) e não tem a ambiguidade "dentro de um
code span, escape não funciar" que o Markdown legado tem. Isso foi
descartado para esta rodada: exigiria reescrever a formatação de **todas**
as mensagens (`sendIngressCompare`, `sendIngressRankingEntry`,
`sendTemperamentTestMessage`, `sendLoveLanguageTestMessage`, e o
`lib/ingress-compare-message.mjs` que monta parte do conteúdo), incluindo as
tabelas ASCII em blocos `` ``` `` que dependem de espaçamento monoespaçado —
uma mudança de formatação visível em toda notificação existente, arriscada
de fazer sem o dono do site revisar como cada mensagem passa a aparecer.

## Decisão

**Neutralizar a entrada, não reescrever o destino.**

- `lib/telegram-markdown.mjs` exporta `escapeTelegramMarkdown`: troca
  `` ` `` por aspas simples (dentro de um code span um backtick cru sempre
  fecha o bloco antes da hora, escapá-lo com `\` não funciona ali — a única
  forma confiável de neutralizar é não deixá-lo passar) e escapa `_`, `*`,
  `[` com `\` (que o modo Markdown legado *reconhece* como escape — ao
  contrário do que se poderia supor por analogia com o MarkdownV2, que tem
  regras diferentes). Aplicado em todo campo de request interpolado nas 4
  mensagens de `app/api/telegram/route.js` e nos codinomes de
  `lib/ingress-compare-message.mjs`.
- `escapeHtml` (`lib/sanitize.ts`) escapa as 5 entidades HTML básicas,
  aplicado nos campos livres do e-mail (`name`, `age`, `browserInfo`,
  `formattedDate`). Os campos de `results` (`temp.name`, `char.name`) não
  precisam de escape separado: `isValidResults()` valida cada um contra um
  `Set` fechado dos únicos valores que o teste realmente produz — um valor
  fora desse conjunto já é rejeitado com 400 antes de chegar perto do
  template, então o fallback que antigamente exibia o valor cru nunca mais é
  alcançado com dado não confiável.
- `escapeTelegramMarkdown` vive em `.mjs` puro (não `.ts`) porque também é
  importado por `lib/ingress-compare-message.mjs`, que precisa continuar
  rodando direto via `node --test` (ver `lib/ingress-compare-message.test.mjs`),
  sem passar pelo bundler do Next.

## Consequências

Um `codename`/`name` com esses caracteres especiais aparece com uma barra
invertida visível quando cai dentro de um bloco monoespaçado (efeito
colateral cosmético do escape funcionar mesmo onde não teria efeito) — raro
na prática, já que codinomes de agente do Ingress são tipicamente
alfanuméricos.

Isto é uma correção pontual, não uma arquitetura à prova de reescrita. Se
`/api/telegram` ganhar um quinto tipo de mensagem no futuro, quem escrever
precisa lembrar de aplicar `escapeTelegramMarkdown`/`esc()` manualmente em
todo campo vindo do body — nada aqui impede esquecer. Se isso incomodar o
suficiente, a migração para `parse_mode: 'HTML'` descartada acima continua
sendo o caminho mais robusto — valeria revisitar se o número de mensagens
crescer o bastante para o custo de reescrever a formatação de uma vez valer
a pena.
