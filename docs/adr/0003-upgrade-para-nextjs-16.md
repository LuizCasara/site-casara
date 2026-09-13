# 0003 — Upgrade para Next.js 16, com React travado em 19.2.x

## Status

Aceito (13/09/2026)

## Contexto

O Next.js 15.5.19 instalado tinha duas vulnerabilidades **críticas**
publicadas (RCE na API de Image Optimization com AVIF, RCE em servidor
hospedado em Windows) além de SSRFs altos em Server Actions e rewrites —
descobertas ao instalar dependências novas para o ADR-0001 e rodar
`npm audit`. Ficar parado não era uma opção real; a escolha era entre
aplicar só o patch de segurança dentro da linha 15.x (`15.5.25`, via a tag
`backport` do pacote) ou já ir para o major 16.

A escolha inicial foi o patch dentro do 15.x, para resolver o crítico sem o
risco de um major bump sem supervisão (a pessoa dona do projeto estava
offline nesse momento). O upgrade para o 16 só aconteceu depois, com
autorização explícita para revisar breaking changes e aplicar.

Ao instalar `next@latest` + `react@latest` + `react-dom@latest` juntos (como
a doc de upgrade recomenda), o `npm install` sinalizou `react-dom@19.3.0`
como peer dependency inválida para `@react-three/fiber@9.6.1` — a lib por
trás da sala 3D de `/livros`, a peça visualmente mais elaborada do site.
`@react-three/fiber` (mesmo na versão `latest` publicada) só aceita
`react: '>=19 <19.3'`; não existe ainda uma versão estável que aceite 19.3.
O Next 16 em si só exige `^19.0.0` como peer — a doc menciona "React 19.2"
como o canary que o App Router usa internamente, mas isso não é um piso
imposto ao userland.

## Decisão

Upgrade completo para Next.js `16.3.5`, com React e React DOM fixados em
`19.2.8` (a última patch da linha 19.2, dentro do range que o
`@react-three/fiber` aceita) — não na tag `latest`. Dentro do mesmo
upgrade, três migrações mecânicas seguidas conforme a documentação oficial,
sem desvio:

- `middleware.ts`/`export function middleware` → `proxy.ts`/`export function
  proxy` — o nome antigo fica deprecated e sem suporte a edge runtime; o
  arquivo já fazia uma query fire-and-forget ao Neon via fetch, que funciona
  igual em runtime nodejs.
- `next lint` (removido no 16) → `eslint .` direto, com `eslint.config.mjs`
  reescrito para importar `eslint-config-next/core-web-vitals` e
  `/typescript` nativamente como flat config — a forma antiga (via
  `FlatCompat` envolvendo os presets legados) quebra com o
  `eslint-config-next@16` porque o pacote passou a exportar flat config
  nativo, e o wrapper de compatibilidade não sabe lidar com isso.
- `"engines": {"node": ">=20.9.0"}` adicionado ao `package.json` (mínimo
  exigido pelo Next 16).

## Consequências

O `eslint-config-next` novo trouxe regras bem mais rígidas
(`react-hooks/set-state-in-effect`, `react-hooks/static-components`,
`@typescript-eslint/no-explicit-any` como erro) que passaram a sinalizar
~94 problemas em código pré-existente não relacionado a este upgrade
(`text-scramble.tsx`, `pdf-generator.tsx`, `tailwind.config.ts`, ...). Não
são regressões — `npm run lint` só ficou mais rigoroso — mas ficam como
débito técnico visível até alguém revisar cada um (a maior parte exige
olhar componentes de animação na tela, não é seguro corrigir só lendo
código).

A trava do React em 19.2.x é uma decisão **temporária por natureza**: existe
só porque `@react-three/fiber` ainda não suporta 19.3+. Isso precisa ser
revisitado quando o `@react-three/fiber` publicar uma versão compatível —
até lá, um `npm install react@latest` desavisado neste projeto volta a
quebrar o peer dependency da sala 3D, silenciosamente (o `npm install` avisa
mas não falha).

`next dev` também passou a inserir sozinho um bloco gerenciado no fim do
`CLAUDE.md` (`<!-- BEGIN:nextjs-agent-rules -->`) — comportamento oficial do
Next 16 para agentes de IA, documentado para ser commitado (reaparece se
removido). Não é um efeito colateral deste projeto especificamente, mas vale
não estranhar.
