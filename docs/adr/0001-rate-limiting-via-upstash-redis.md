# 0001 — Rate limiting via Upstash Redis

## Status

Aceito (12/09/2026, auditoria de segurança pré-divulgação do `/ingress/ranking`)

## Contexto

Nenhuma rota de API tinha limite de requisições. Isso ficou crítico no
momento em que o dono do site decidiu divulgar `/ingress/ranking` numa
comunidade pública (Reddit) e pediu uma auditoria de segurança — o risco real
não era SQL injection (todas as queries já são parametrizadas via o tagged
template do `@neondatabase/serverless`), era volume: um script sem limite
algum podia inflar `casara.ingress_rankings` com codinomes forjados, esgotar
a cota de envio do Gmail pessoal via `/api/send-email`, ou inundar o grupo do
Telegram do dono via `/api/telegram` — inclusive de forma composta, já que
cada escrita nova em `ingress_rankings` dispara sozinha um POST para
`/api/telegram`.

O site roda em funções serverless da Vercel. Isso descarta a solução mais
óbvia (um contador em memória do processo): cada invocação pode cair numa
instância diferente, então "lembrar quantas vezes esse IP já chamou" só
funciona com um armazenamento compartilhado fora do processo.

Alternativas consideradas:
- **Vercel KV / Edge Config** — ficaria no mesmo ecossistema do hosting, mas
  o free tier é mais limitado que o do Upstash e não havia motivo para
  acoplar isso à Vercel especificamente (o projeto já não depende de nenhum
  outro produto Vercel além do hosting em si e do Analytics).
- **Rate limit best-effort em memória** — zero custo, zero conta nova, mas
  não é confiável em serverless (ver acima); serviria como mitigação parcial
  na melhor das hipóteses.
- **Não fazer nada e confiar em revisão manual** — inviável dado o motivo do
  pedido: o tráfego de divulgação pública é exatamente o cenário em que
  ninguém está olhando em tempo real.

## Decisão

Rate limiting por IP via **Upstash Redis** (REST, `@upstash/ratelimit` +
`@upstash/redis`), free tier. Um helper único —
[`lib/rate-limit.ts`](../../lib/rate-limit.ts) — expõe
`rateLimitOrNull(request, name)`, chamado no topo do handler antes de
qualquer trabalho.

Duas escolhas de design dentro disso:

1. **Fail-open, sempre.** Sem `UPSTASH_REDIS_REST_URL`/`_TOKEN` configuradas
   (dev local, ou antes do primeiro deploy com isso), ou se a chamada ao
   Redis falhar por qualquer motivo (rede, Upstash fora do ar), a rota segue
   normalmente — só loga um aviso. Um rate limiter é uma camada de defesa
   extra, nunca deveria ser o único motivo de uma rota real cair.
2. **Aplicado seletivamente, não em tudo.** As rotas de criação/escrita
   pública que causam dano real sem limite (`/api/send-email`,
   `/api/telegram`, `/api/ingress-rankings`, criação de sessão de
   quiz/nuvem-de-palavras, `/api/events`) têm limite. As ações de um
   participante *dentro* de uma sessão já criada (`join`, `answers`,
   `responses`) foram deixadas de fora deliberadamente: várias pessoas no
   mesmo Wi-Fi/evento presencial compartilham IP, e o dano de abuso ali fica
   contido a uma sessão que o host já controla — rate limitar essas rotas
   trocaria um risco pequeno por um bug reprodutível toda vez que uma escola
   ou empresa rodar a dinâmica.

## Consequências

Escrever mais que um punhado de vezes por hora numa rota protegida agora
retorna `429` com `Retry-After` em vez de aceitar silenciosamente. Isso é
bom contra abuso automatizado, mas significa que qualquer ajuste de limite
futuro (ex: se um evento legítimo gerar mais tráfego que o esperado numa
rota de criação de sessão) precisa editar `RATE_LIMITS` em
`lib/rate-limit.ts`, não é auto-ajustável.

Isso introduz uma dependência de infraestrutura externa nova (Upstash) e
duas env vars a mais para configurar em cada ambiente (local + Vercel). O
design fail-open significa que esquecer de configurar isso em produção não
quebra nada visivelmente — o que é a intenção, mas também é fácil de
esquecer que a proteção está desativada. Vale conferir de vez em quando que
as env vars realmente estão setadas na Vercel, já que nada vai alertar se
elas sumirem.
