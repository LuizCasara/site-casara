# ADRs (Architecture Decision Records)

**O que é isto:** o registro do *porquê* por trás de uma decisão técnica —
não da arquitetura atual (isso é o `CLAUDE.md`) nem do contexto de produto de
uma feature (isso são os outros arquivos soltos em `docs/`). Um ADR existe
para que, daqui a um ano, ninguém — nem uma sessão futura desta IA — reabra
uma pergunta já respondida sem saber que ela já foi considerada e descartada
por um motivo específico.

## Quando escrever um

Quando uma decisão técnica tinha alternativas reais e você escolheu uma com
um trade-off consciente. Não escreva um ADR para:
- Seguir uma migração mecânica de uma ferramenta (ex: renomear um arquivo
  porque a doc oficial pediu) — isso é registro de mudança, não decisão.
- Uma escolha óbvia sem alternativa real considerada.
- Algo que já está bem coberto como contexto de produto num doc de feature.

Escreva um quando alguém razoável poderia perguntar "por que não X em vez
disso?" e a resposta não for óbvia lendo só o código.

## Como numerar

Sequencial, sem reaproveitar números: `0001-titulo-curto-em-kebab-case.md`,
`0002-...`. Um ADR nunca é editado para dizer outra coisa depois de aceito —
se uma decisão muda, cria-se um novo ADR com status `Substitui ADR-000X` e
marca-se o antigo como `Substituído por ADR-000Y`. A numeração é a linha do
tempo; reescrever o passado destrói o que o ADR existe para preservar.

## Formato

Copie [`template.md`](./template.md). Seções: **Status**, **Contexto**,
**Decisão**, **Consequências** — nessa ordem, sempre. Curto é o objetivo: se
um ADR precisa de mais de uma tela pra dizer o essencial, o "porquê" está se
perdendo em detalhe de implementação (isso pertence ao código/comentário, não
ao ADR).

## Índice

| ADR | Título | Status |
|---|---|---|
| [0001](./0001-rate-limiting-via-upstash-redis.md) | Rate limiting via Upstash Redis | Aceito |
| [0002](./0002-sanitizacao-de-notificacoes-telegram-e-email.md) | Sanitização de notificações (Telegram/e-mail) em vez de reescrita para HTML | Aceito |
| [0003](./0003-upgrade-para-nextjs-16.md) | Upgrade para Next.js 16, com React travado em 19.2.x | Aceito |
| [0004](./0004-remocao-do-bloco-env-do-next-config.md) | Remoção do bloco `env` do `next.config.ts` | Aceito |
| [0005](./0005-escala-logaritmica-alem-do-onyx.md) | Escala logarítmica (log₂) para a nota do Ingress além do Onyx | Aceito |
