# 0004 — Remoção do bloco `env` do `next.config.ts`

## Status

Aceito (12/09/2026, mesma auditoria do ADR-0001)

## Contexto

`next.config.ts` declarava `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` e
`TELEGRAM_THREAD_ID` dentro de um bloco `env`. Esse bloco existe no Next
especificamente para **inlinar** valores no bundle enviado ao navegador —
não é necessário para uma API route enxergar uma variável de ambiente do
servidor, que já tem acesso direto a `process.env.*` sem precisar disso.

Na prática, hoje, essas três variáveis só são lidas dentro de
`app/api/telegram/route.js` (server-only, nunca é bundlado para o cliente),
então não havia vazamento de fato acontecendo. O risco era estrutural: os
nomes não têm o prefixo `NEXT_PUBLIC_` (o sinal usual de "isto é seguro
expor"), então nada no código sinalizava visualmente que declará-las ali
tinha esse efeito. Bastava alguém, no futuro, referenciar
`process.env.TELEGRAM_BOT_TOKEN` dentro de um componente `"use client"` — um
erro fácil de cometer por copy-paste, já que o nome da variável não avisa —
para o token do bot vazar publicamente no JavaScript servido a qualquer
visitante do site.

## Decisão

Remover o bloco `env` inteiro do `next.config.ts`. Nenhuma outra mudança
necessária: `app/api/telegram/route.js` continua lendo
`process.env.TELEGRAM_*` normalmente, porque toda API route roda
server-side e sempre teve acesso direto a essas variáveis.

## Consequências

Nenhuma perda de funcionalidade — o bloco nunca foi necessário para o uso
atual. O ganho é puramente eliminar uma armadilha de configuração antes que
alguém caísse nela. Se um dia uma variável realmente precisar chegar ao
cliente, o caminho correto é o prefixo `NEXT_PUBLIC_*`, que o Next já inlina
automaticamente sem precisar de nenhuma entrada em `next.config.ts`.
