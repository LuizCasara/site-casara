# Blueprint: Dashboard `/stats` (Painel de Analytics "Terminal")

Documentação de referência para replicar a tela `/stats` deste projeto — visual,
estrutura de componentes e todo o pipeline de ingestão/agregação de eventos —
em outro site. Não é a documentação do que existe aqui (isso já está no
`CLAUDE.md`), é um **guia de replicação**: o que copiar, o que é específico
deste projeto (temperamento/linguagens do amor) e o que generalizar.

---

## 1. Conceito geral

Duas camadas independentes, que se somam:

1. **Vercel Analytics** (`@vercel/analytics`) — caixa-preta, sem query própria,
   só para o dashboard nativo da Vercel.
2. **Store própria em Postgres (Neon)** — uma única tabela `events` genérica,
   tipo "event log", que registra *qualquer* interação como uma linha com
   `event_name` + `payload` JSONB livre. O dashboard `/stats` lê **só** dessa
   tabela.

A ideia central é: **não existe uma tabela por funcionalidade**. Page views,
cliques, conversões de funil, sessões ao vivo — tudo vira uma linha na mesma
tabela `events`, diferenciada pelo `event_name` e por chaves dentro do
`payload`. Isso é o que permite o dashboard agregar tudo com poucas queries.

```
Componente da UI
   └─ trackEvent(name, payload)  (utils/analytics.ts)
        ├─ track() do Vercel Analytics (fire-and-forget)
        └─ POST /api/events        (fire-and-forget, grava no Postgres)

middleware.ts (roda em toda request)
   └─ INSERT direto na tabela events (event_name = 'page_view')

/stats (página)
   └─ GET /api/metrics/stats?period=7d|30d|all
        └─ várias queries agregadas na tabela events
```

---

## 2. Modelo de dados

Uma tabela única (`lib/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS events (
  id         BIGSERIAL    PRIMARY KEY,
  event_name TEXT         NOT NULL,
  route      TEXT,
  payload    JSONB        NOT NULL DEFAULT '{}',
  country    TEXT,
  city       TEXT,
  browser    TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_name       ON events (event_name);
CREATE INDEX idx_events_route      ON events (route);
CREATE INDEX idx_events_created_at ON events (created_at DESC);
CREATE INDEX idx_events_payload    ON events USING GIN (payload);
CREATE INDEX idx_events_country    ON events (country);
```

Pontos-chave para replicar:

- **`payload` é JSONB livre** — cada tipo de evento decide suas próprias
  chaves (`primary`, `duration_seconds`, `session_id`, etc). Isso evita
  migração de schema toda vez que se quer trackear um novo dado; o custo é
  que toda leitura de payload precisa de `(payload->>'chave')::tipo` e um
  `FILTER (WHERE event_name = '...')` para não misturar eventos diferentes.
- **`route` e geo/browser ficam em colunas próprias**, não no payload —
  são comuns a *todo* evento (inclusive `page_view`), então compensa indexar
  e não obrigar cada chamador a repassar isso.
- Índice GIN em `payload` é o que torna viável filtrar/agrupar por chaves
  arbitrárias do JSON sem full scan.
- Se o seu banco usa multi-tenant/schema custom (aqui é `geav` para as
  tabelas de sessões ao vivo), lembre de qualificar `schema.tabela`
  explicitamente — `search_path` não inclui schemas extras por padrão.

---

## 3. Pipeline de ingestão

### 3.1 `page_view` automático via middleware

`middleware.ts` roda em **toda** request (matcher exclui apenas
`_next/static`, `_next/image`, `favicon.ico`) e insere um evento
`page_view` de forma fire-and-forget (`.catch(() => {})`, nunca bloqueia a
resposta):

```ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (!REAL_ROUTE_RE.test(pathname)) return NextResponse.next(); // allowlist, ver 3.3
  if (!process.env.DATABASE_URL) return NextResponse.next();

  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) return NextResponse.next();

  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const city    = request.headers.get('x-vercel-ip-city')    ?? null;
  const browser = parseBrowser(ua);

  sql`INSERT INTO casara.events (event_name, route, country, city, browser)
      VALUES ('page_view', ${pathname}, ${country}, ${city}, ${browser})`
    .catch(() => {});

  return NextResponse.next();
}
```

`country`/`city` vêm de headers de geolocalização que a **Vercel injeta
automaticamente** na Edge (`x-vercel-ip-country`, `x-vercel-ip-city`) — fora
da Vercel isso precisa de outra fonte (ex.: MaxMind, Cloudflare headers).

### 3.2 Eventos customizados via `trackEvent`

`utils/analytics.ts` centraliza tudo num único wrapper, e cada evento de
domínio é uma função nomeada que só declara o payload:

```ts
const trackEvent = (name: string, payload: Record<string, string|number|boolean> = {}) => {
  track(name, payload);           // Vercel Analytics
  if (typeof window === 'undefined') return;
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: name,
      payload,
      route: window.location.pathname,
      resolution: `${window.screen.width}x${window.screen.height}`,
    }),
  }).catch(() => {});
};

export const trackCvDownload = () => trackEvent('cv_download');
export const trackProjectClick = (projectName: string) =>
  trackEvent('project_click', { project_name: projectName });
// ... uma função por evento de domínio
```

`POST /api/events` (`app/api/events/route.ts`) só valida `event_name`,
resolve `country`/`city`/`browser` a partir dos headers da própria request e
insere. Nada de lógica de negócio aqui — a agregação acontece só na leitura.

### 3.3 Allowlist de rotas reais

`lib/routes.ts` define um regex allowlist (`REAL_ROUTE_PATTERN`) das rotas
"de verdade" do site, compartilhado entre o middleware (o que vira
`page_view`) e a query de stats (o que conta como `TOP_ROTAS`/`page_views`).
Isso filtra tanto arquivos estáticos (`manifest.json`, `*.jpg`) quanto
sondas de bot/scanner (`/.env`, `/wp-admin`, etc.) — sem esse filtro o
dashboard fica poluído com lixo de tráfego automatizado.

```ts
export const REAL_ROUTE_PATTERN =
  `^/$` +
  `|^/(about|projects|app|stats)$` +
  `|^/app/(${APP_SLUGS.join("|")})$`;
export const REAL_ROUTE_RE = new RegExp(REAL_ROUTE_PATTERN);
```

Ao replicar, adapte essa lista às rotas reais do outro site (é o único lugar
que precisa saber a lista completa de rotas navegáveis).

### 3.4 Detecção de browser

`lib/request-meta.ts` — função `parseBrowser(ua)` simples baseada em regex
no User-Agent (`Edg/`, `OPR/`, `Chrome/`, `Firefox/`, `Safari/`, senão
`Other`), compartilhada entre middleware e `/api/events` para consistência.

---

## 4. Camada de agregação (API de métricas)

Tudo client-fetched, sem SSR — a página é `"use client"` e busca via
`fetch` no mount/troca de filtro.

### `GET /api/metrics/stats?period=7d|30d|all`

Endpoint principal, roda ~8 queries agregadas na mesma tabela e devolve um
único JSON:

- `overview`: `total_events`, `total_page_views`, `unique_routes` (com
  `COUNT(*) FILTER (WHERE ...)` para separar page_view de eventos custom,
  e `route ~ REAL_ROUTE_PATTERN` para excluir lixo — ver 3.3)
- `by_event`: `GROUP BY event_name` (exclui `page_view`)
- `by_route`: `GROUP BY route` (top 10, só `page_view`)
- `by_browser`: `GROUP BY browser`
- `by_country`: `GROUP BY country` (top 10)
- `timeline`: `GROUP BY DATE(created_at)` dos últimos 30 dias (fixo,
  independe do filtro de período escolhido)
- Blocos **específicos de domínio** (aqui: `temperament` e `love_languages`)
  — cada um é essencialmente um mini-funil: `COUNT(*) FILTER (WHERE
  event_name = 'x_started')`, `.._completed`, médias de `payload->>'campo'`,
  e uma distribuição `GROUP BY payload->>'primary'`.

O padrão de filtro por período é sempre o mesmo: `WHERE created_at > NOW() -
INTERVAL '1 day' * ${days}`, com `days = 7 | 30 | 36500` (`"all"` vira "36500
dias" em vez de tratar como caso especial — evita duplicar toda query).

### `GET /api/metrics/geo-breakdown?route=X|event_name=Y&period=`

Endpoint **sob demanda**, chamado só quando o usuário expande uma linha
(rota ou evento) na UI — evita mandar geo-breakdown de tudo no payload
principal. Recebe `route` OU `event_name`, devolve `{ total, by_country[] }`
filtrado por esse único evento/rota.

### Endpoints "funil dedicado" (`/api/metrics/temperament`,
`/api/metrics/love-languages`)

Existem paralelamente ao bloco embutido em `/api/metrics/stats` — são a
versão "isolada" da mesma query, usada por quem só precisa daquele funil
específico sem o resto do dashboard. Ao replicar, isso é opcional: só vale a
pena se algum outro consumidor (não o `/stats`) precisar só desse recorte.

**Padrão geral de funil-por-evento** (o que replicar para qualquer nova
feature com etapas):

```sql
SELECT
  COUNT(*) FILTER (WHERE event_name = 'x_started')   AS total_started,
  COUNT(*) FILTER (WHERE event_name = 'x_completed')  AS total_completed,
  ROUND(AVG((payload->>'campo_numerico')::numeric)
        FILTER (WHERE event_name = 'x_completed'))    AS avg_campo
FROM casara.events
WHERE created_at > NOW() - INTERVAL '1 day' * ${days};

SELECT payload->>'categoria' AS categoria, COUNT(*) AS count
FROM casara.events
WHERE event_name = 'x_completed'
GROUP BY payload->>'categoria'
ORDER BY count DESC;
```

Conversão é sempre calculada no client (`completed / started * 100`), nunca
em SQL — mais simples e evita divisão por zero em SQL.

---

## 5. Estrutura visual da página (`app/stats/page.tsx`)

Estética: **terminal/hacker retrô** — fundo preto, monoespaçada, tudo em
tons de verde, scanlines sutis, prompt de terminal no topo. É só CSS/Tailwind
(sem lib de terminal), replicável em qualquer stack com Tailwind.

### 5.1 Camadas fixas

- **Scanlines**: `<div>` `fixed inset-0 z-50 pointer-events-none opacity-[0.025]`
  com `background: repeating-linear-gradient(0deg,#000 0px,#000 1px,transparent 1px,transparent 2px)`.
- **Header "janela de terminal"**: barra superior com 3 bolinhas
  (vermelha/amarela/verde, imitando macOS), `luiz@portfolio:~/stats` como
  breadcrumb, e um relógio `HH:MM:SS` ao vivo (`setInterval` de 1s,
  `toLocaleString('pt-BR')`).
- **Título com prompt**: `$ SYSTEM_ANALYTICS` + cursor piscando (`▮`
  com `animate-pulse`).
- **Filtro de período**: 3 botões (`7D`, `30D`, `TOTAL`) — o ativo ganha
  borda/fundo/glow verde (`shadow-[0_0_8px_rgba(74,222,128,0.2)]`).

### 5.2 Componentes reutilizáveis internos

- `Panel({ title, children })` — card com borda verde escura,
  `bg-green-950/10`, título uppercase precedido de `>` (visual de comando de
  terminal). É o container-padrão de toda seção.
- `KpiCard({ label, value, sub })` — número grande (`text-3xl font-bold`)
  com rótulo pequeno acima e nota opcional abaixo.
- `HBar({ value, max })` — barra horizontal fininha (`h-1`/`h-1.5`),
  largura proporcional a `value/max`, com `transition-all duration-700` (o
  "crescer" ao trocar de período).
- `TimelineChart` — SVG **feito à mão** (sem lib de gráfico): polígono de
  área com gradiente + polyline + pontos, `viewBox` fixo `800x64`,
  `preserveAspectRatio="none"` para esticar. Tooltip via hover com círculo
  invisível maior (`r=10`) sobreposto ao ponto visível, mostra dia/valor
  numa linha de texto acima do gráfico (não é um `<title>`/popup).
- `GeoBreakdownInline` — painel expansível (`border-l` recuado) que só
  aparece quando uma linha de evento/rota é clicada; states de loading e
  "sem dados" tratados explicitamente.

### 5.3 Layout de conteúdo (ordem de cima para baixo)

1. **Grid de KPIs** (`grid-cols-2 lg:grid-cols-5`): totais gerais +
   completions dos dois funis de domínio, cada um com sub-texto de
   conversão.
2. **Grid 2 colunas** com os dois painéis de funil (`TEMPERAMENTO_ANALYSIS`,
   `LINGUAGENS_DO_AMOR_ANALYSIS`) — cada um: 3 mini-KPIs (iniciaram /
   completaram / conversão) → barras de distribuição por categoria
   principal (com cor fixa por categoria) → grid de médias por
   sub-dimensão → tempo médio de conclusão.
3. **Painel único** `EVENTOS_BREAKDOWN` — lista de todos os `event_name`
   (via `EVENT_LABELS`/`EVENT_DESCRIPTIONS`, dicionários de tradução
   técnica→humana), cada linha clicável para expandir geo-breakdown
   daquele evento, com seta `›` que rotaciona 90° quando expandida.
4. **Grid 2 colunas**: `TOP_ROTAS` (mesma mecânica de expandir→geo) ao
   lado de uma coluna com dois painéis empilhados, `GEO_ORIGEM` e
   `BROWSERS`.
5. **Timeline** (últimos 30 dias, gráfico de linha).
6. **Rodapé** discreto: `// END_OF_REPORT · <domínio> · <ano> · v1.0`.

### 5.4 Estados de carregamento/erro

- Loading: barras verticais pulsando (5 barras de alturas crescentes,
  `animationDelay` escalonado) + texto `FETCHING_DATA...`.
- Erro: bloco vermelho (`border-red-900`, `text-red-500`) com
  `ERR: FAILED_TO_FETCH_STATS`.
- Ao trocar de período, os caches de geo-breakdown expandido são
  descartados (`setGeoCache({})`) — o breakdown por país é sempre relativo
  ao período selecionado, não faz sentido manter cache entre períodos.

### 5.5 Paleta / tokens usados

- Fundo: `bg-black`.
- Texto/bordas em degradê de verde: `text-green-200` (destaque/valor) →
  `green-400/500/600` (texto normal) → `green-700/800/900` (label/mudo) →
  `green-950` (fundo de barra vazia).
- Fonte mono via classe utilitária do projeto (`font-mono` — aqui usa
  `Space Mono` carregada por `next/font`, ver seção Fontes do
  `CLAUDE.md`).
- Cores de categoria (temperamento/linguagens) são fixas por chave num
  dicionário `Record<string,string>` (`TEMP_BAR_COLOR`,
  `LOVE_LANG_BAR_COLOR`) — abordagem generalizável para qualquer variável
  categórica que precise de cor consistente entre painéis diferentes.

---

## 6. Passo a passo para replicar em outro site (Next.js App Router)

1. **Banco**: criar a tabela `events` (seção 2) no Postgres do novo projeto.
   Se usar Neon/Vercel Postgres, rodar o SQL manualmente no console — este
   projeto não usa migrations automatizadas para isso.
2. **`lib/db.ts`**: cliente lazy do Neon (ou driver equivalente), para não
   conectar em build time.
3. **`middleware.ts`**: copiar o padrão de `page_view` fire-and-forget +
   allowlist de rotas reais + filtro de bot por User-Agent.
4. **`utils/analytics.ts`**: um `trackEvent` central + uma função exportada
   por evento de domínio que você quer medir (nome do evento e payload
   específicos do novo site).
5. **`POST /api/events`**: rota fina que só valida e insere.
6. **Endpoints de leitura**: pelo menos um `GET /api/metrics/stats` que
   agregue overview + by_event + by_route + by_browser + by_country +
   timeline; endpoints de funil (`started`/`completed` por
   `payload->>'campo'`) são só necessários se o novo site tiver algo
   parecido com um "teste"/"formulário em etapas" a medir — senão pule essa
   parte.
7. **Página `/stats`**: montar com os componentes da seção 5.2
   (`Panel`, `KpiCard`, `HBar`, `TimelineChart`, breakdown expansível),
   trocando só os textos/rótulos/cores de domínio. A estética
   terminal/scanlines é 100% Tailwind + um `<div>` de gradiente, não exige
   nenhuma dependência nova.
8. **Opcional**: se o novo site também tiver "sessões ao vivo" ou qualquer
   feature multi-tabela, mantenha essas tabelas **fora** de `events` (como
   aqui `word_sessions`/`quiz_sessions` vivem à parte) — `events` deve
   continuar sendo só o log de interações, não o dado operacional da
   feature.

---

## 7. O que é específico deste projeto (não replicar ao pé da letra)

- Os blocos `temperament`/`love_languages` dentro de `/api/metrics/stats` e
  os dicionários `TEMP_*`/`LOVE_LANG_*` no `page.tsx` — são os dois funis
  deste site. No outro site, isso vira os funis que fizerem sentido lá (ou
  nenhum, se não houver "teste em etapas" para medir).
- `EVENT_LABELS`/`EVENT_DESCRIPTIONS` — lista de todos os eventos deste site
  traduzidos para um "código" tipo log de sistema (`TEMP_STARTED`,
  `QUIZ_JOIN` etc.) e uma descrição em português. Recriar do zero com os
  eventos do novo site.
- `REAL_ROUTE_PATTERN` — específico das rotas deste site; no outro site,
  listar as rotas reais dele.
- `luiz@portfolio:~/stats` no header — trocar pelo domínio/usuário do novo
  site (é só texto).
