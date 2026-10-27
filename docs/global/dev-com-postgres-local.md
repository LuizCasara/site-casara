# Dev com Postgres local (proposta, não implementada)

**Status:** proposta de 27/10/2026, não testada. Nada no código depende disto
ainda; o `.env.local` continua apontando para PRODUÇÃO.

## Por que

O Neon Free mede **tempo de compute acordado**, e o compute só suspende depois
de 5 min sem nenhuma query. Hoje o `npm run dev` e os scripts locais
(`livros.mjs`, `aplicar-leitura.mjs`, `ingress-rescore.mjs`) leem do banco de
produção: cada sessão de dev mantém o compute acordado enquanto você navega, e
isso não deixa rastro em `casara.events` (o gate `VERCEL_ENV` só barra a
*escrita* de eventos — ver `lib/global/analytics-env.ts`).

## O que NÃO resolve

- **Branch do Neon.** O limite de 100 CU-h é por *projeto*, e o compute de uma
  branch soma no mesmo saldo.
- **Neon Local (`neondatabase/neon_local`).** Apesar do nome, é um proxy para
  uma branch efêmera *na nuvem* do mesmo projeto — mesmo saldo, mesmo problema.

## O que resolve

Postgres comum em Docker. O detalhe é que este site usa o driver **HTTP** do
`@neondatabase/serverless`, que não fala o protocolo TCP do Postgres: ele
precisa de um proxy que traduza HTTP → Postgres. O guia do Neon
([Local development with Neon](https://neon.com/guides/local-development-with-neon))
usa o `local-neon-http-proxy` (projeto comunitário de TimoWilhelm) para isso.

### 1. `docker-compose.yml` (na raiz, só para dev)

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: main
    ports: ['5432:5432']
    volumes: ['db_data:/var/lib/postgresql/data']
  neon-proxy:
    image: ghcr.io/timowilhelm/local-neon-http-proxy:main
    environment:
      PG_CONNECTION_STRING: postgres://postgres:postgres@postgres:5432/main
    ports: ['4444:4444']
    depends_on: [postgres]
volumes:
  db_data:
```

### 2. `lib/global/db.ts` — apontar o driver para o proxy só em dev

```ts
import {neon, neonConfig} from '@neondatabase/serverless';

// `db.localtest.me` resolve para 127.0.0.1 (DNS público), e é o host que o
// guia do Neon usa para distinguir o banco local do da nuvem.
if (process.env.NODE_ENV === 'development') {
    neonConfig.fetchEndpoint = (host) =>
        host === 'db.localtest.me' ? `http://${host}:4444/sql` : `https://${host}/sql`;
}
```

Conferir a forma exata no guia acima antes de aplicar: a API de
`fetchEndpoint` é do driver e pode mudar entre versões.

### 3. Dado inicial: um dump do schema `casara`, uma vez

```bash
# Acorda o compute de produção UMA vez (~5 min). Só leitura.
pg_dump "$PROD_DATABASE_URL" --schema=casara --no-owner --no-privileges -f casara.sql
docker compose exec -T postgres psql -U postgres -d main < casara.sql
```

`--schema=casara` é obrigatório: o banco é compartilhado com o site-geav, e o
schema `geav` não é deste repositório. Atualizar o dump é raro — o dado de
dev não precisa ser o de hoje.

### 4. `.env.local` — o passo perigoso

```
DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main
PROD_DATABASE_URL=<a URL atual de produção>
```

**Os scripts precisam mudar junto, antes desta troca.** `livros.mjs`,
`aplicar-leitura.mjs`, `ingress-rescore.mjs` e `migrate-casara.mjs` leem
`DATABASE_URL` do `.env.local` e existem justamente para escrever em
produção. Trocar o `.env.local` sem mudar os scripts faria um `livros.mjs add`
gravar no Postgres local e o livro nunca aparecer no site — sem erro nenhum.
A mudança proposta: os scripts passam a ler `PROD_DATABASE_URL` (e recusam
rodar se só houver `DATABASE_URL` apontando para `localtest.me`).

## Custo e o que se perde

- Docker Desktop rodando durante o dev.
- O dev deixa de ver dado real ao vivo: ranking, livros e o `/stats` mostram o
  dump. Para conferir algo em produção, o site publicado é a fonte.
- `/stats` (que só existe no `npm run dev`, ver `lib/global/dev-only.ts`)
  passaria a mostrar os eventos do dump, não os de produção. Se o painel for o
  motivo de abrir o dev, apontar só ele para `PROD_DATABASE_URL` é uma opção.
