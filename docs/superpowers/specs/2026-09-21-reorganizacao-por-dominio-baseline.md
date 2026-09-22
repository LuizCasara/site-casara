# Baseline de verificação — antes de mover qualquer arquivo

Capturado em 2026-09-22, no início da execução do plano
[`2026-09-22-reorganizacao-por-dominio.md`](../plans/2026-09-22-reorganizacao-por-dominio.md),
Task 0.5. Nada de arquivo do site foi tocado até este ponto — só o ferramental descartável
em `scripts/superpowers/`.

## 1. `tsc --noEmit`

Exit code 0. **Zero erros.**

## 2. `npm run lint`

Exit code 1 — **127 problemas pré-existentes (94 erros, 33 warnings)**, nenhum relacionado a
este refactor (é um refactor de lugar, não de código, e essas regras já falhavam antes de
qualquer coisa ser movida). Quebra por regra:

| Regra | Ocorrências |
|---|---|
| `react-hooks/set-state-in-effect` | 31 |
| `next/no-img-element` | 25 |
| `@typescript-eslint/no-explicit-any` | 22 |
| `react-hooks/refs` | 13 |
| `react-hooks/immutability` | 10 |
| `react-hooks/purity` | 7 |
| `@typescript-eslint/no-unused-vars` | 7 |
| `react/no-unescaped-entities` | 6 |
| `@typescript-eslint/no-require-imports` | 4 |
| `react-hooks/exhaustive-deps` | 3 |
| `react-hooks/static-components` | 1 |

**Critério de comparação em cada fase:** a contagem total (127) e a quebra por regra devem
permanecer idênticas — só os caminhos de arquivo nas mensagens mudam, porque os arquivos se
moveram. Se a contagem mudar (pra mais ou pra menos), investigar antes de commitar a fase —
pode ser um import quebrado mascarado como outro erro, ou uma correção acidental.

## 3. `npm test`

Exit code 0. **553 testes, 553 passando, 0 falhas.**

## 4. `npm run build`

Exit code 0. Lista de rotas (`next build`, formato preservado do output real):

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ƒ /api/caderno
├ ƒ /api/events
├ ƒ /api/ingress-rankings
├ ƒ /api/ingress-rankings/[codenameKey]/history
├ ƒ /api/ingress-rankings/[codenameKey]/history/changes
├ ƒ /api/ingress-rankings/activity
├ ƒ /api/ingress-rankings/agents
├ ƒ /api/ingress-rankings/compare
├ ƒ /api/livros/capa-radio
├ ƒ /api/metrics/geo-breakdown
├ ƒ /api/metrics/love-languages
├ ƒ /api/metrics/stats
├ ƒ /api/metrics/temperament
├ ƒ /api/quiz-sessions
├ ƒ /api/quiz-sessions/[id]
├ ƒ /api/quiz-sessions/[id]/answers
├ ƒ /api/quiz-sessions/[id]/join
├ ƒ /api/quiz-sessions/[id]/results
├ ƒ /api/send-email
├ ƒ /api/telegram
├ ƒ /api/word-sessions
├ ƒ /api/word-sessions/[id]
├ ƒ /api/word-sessions/[id]/fixed-words
├ ƒ /api/word-sessions/[id]/responses
├ ƒ /api/word-sessions/[id]/results
├ ○ /app
├ ƒ /app/[app_name]
├ ƒ /app/[app_name]/opengraph-image
├ ○ /casamento
├ ○ /casamento/icon.svg
├ ƒ /casamento/opengraph-image
├ ○ /ingress
├ ○ /ingress/fencherlc
├ ○ /ingress/fencherlc/linha-do-tempo
├ ○ /ingress/fencherlc/linha-do-tempo/opengraph-image
├   /ingress/fencherlc/medalha/[slug]                        (29 caminhos estáticos)
├   /ingress/fencherlc/medalha/[slug]/opengraph-image         (29 caminhos estáticos)
├ ƒ /ingress/fencherlc/opengraph-image
├ ƒ /ingress/manifest.webmanifest
├ ƒ /ingress/ranking
├ ○ /ingress/ranking/opengraph-image
├ ○ /livros
├ ƒ /livros/(.)[slug]
├ ƒ /livros/[slug]
├ ƒ /livros/lista
├ ƒ /opengraph-image
├ ○ /projects
├ ƒ /q/[id]
├ ƒ /q/[id]/resultados/[token]
├ ○ /robots.txt
├ ○ /sitemap.xml
├ ○ /stats
├ ƒ /w/[id]
└ ƒ /w/[id]/resultados/[token]

ƒ Proxy (Middleware)
```

**Critério de comparação:** esta lista de rotas (nomes e tipo ○/ƒ/●) tem que ser **idêntica**
depois de cada fase — só a estrutura de pastas por trás de cada rota muda, nunca a rota em si.

## 5. Snapshot visual — piso de ruído (duas capturas "antes" seguidas)

Ferramenta: `npx playwright@1.60 screenshot` por rota×viewport (CLI, não o test runner —
ver decisão abaixo), rodando contra `next build && next start -p 4173` (produção local, sem
gravar analytics — `VERCEL_ENV` ausente). 18 rotas × 2 viewports (desktop 1280×800, mobile
390×844) = 36 capturas. Scripts e imagens ficam só na scratchpad da sessão, **não commitados**
(spec seção 10.2) — só este resumo é registrado aqui.

**Desvio do spec original, decidido com o Luiz durante a execução:** a seção 10.2 do spec
previa `npx playwright test <arquivo>.spec.mjs` (test runner completo, com `page.clock`,
captura de `console.error`/erro de rede, injeção de CSS pra matar animação). Testado ao vivo
neste ambiente: **não funciona** — tanto `npx -y playwright test` quanto
`npx -y --package=@playwright/test playwright test` falham com
`Cannot find package '@playwright/test'`, porque a resolução de módulo ESM do Node não permite
que um arquivo fora de qualquer `node_modules` resolva um pacote instalado só no cache do
`npx`. Optamos pelo CLI `playwright screenshot` (funciona de verdade, sem baixar nada, usa os
browsers já em cache) — em troca, perde-se: captura de `console.error`/erro de rede por rota
(mitigado parcialmente por status HTTP via `fetch()` puro do Node, sem depender do
playwright), congelamento fino de relógio (mitigado por `--wait-for-timeout 1500`), e injeção
de CSS pra desligar animação (não mitigado — ver ruído abaixo).

Todas as 36 capturas: status HTTP 200 nas duas rodadas, 0 falha de captura.

| Rota | Desktop | Mobile |
|---|---|---|
| `/casamento` | 0.1269% | 0.0591% |
| `/ingress/ranking` | 0.1226% | 0.0000% |
| `/ingress/fencherlc` | 0.0928% | 0.0000% |
| `/` | 0.0049% | 0.0158% |
| `/stats` | 0.0045% | 0.0158% |
| `/about` | 0.0003% | 0.0005% |
| demais 12 rotas | 0.0000% | 0.0000% |

**Máximo observado: 0,1269%. Média: 0,0123%.** O ruído concentra em `/casamento` (contador
regressivo ao vivo), `/ingress/ranking` e `/ingress/fencherlc` (dado ao vivo do banco), `/` (quote
aleatória do gerador da home) e `/stats` (dado ao vivo). Nenhuma rota estática de conteúdo fixo
teve qualquer diferença.

**Critério de passagem para o Task 9 ("depois"):** rota fica OK se a diferença contra este
baseline ficar **≤ 0,5%** (margem de ~4x sobre o máximo observado de ruído natural, cobrindo
folga de fonte/renderização sem mascarar uma mudança real de layout). Acima disso, e para as
rotas de `/livros/*` com canvas 3D (que não fazem parte da amostra atual porque a intercepting
route de detalhe de livro não foi incluída nesta rodada — nenhum slug real foi testado para não
adicionar acoplamento a um livro específico do catálogo), o critério é canvas não-vazio + zero
erro de status HTTP, marcado para o Luiz olhar pessoalmente.

## 6. Onde ficam os artefatos

- Scripts: `<scratchpad>/snapshot/capture.mjs`, `<scratchpad>/snapshot/diff.mjs` (sessão local,
  não commitados)
- Screenshots "antes-1"/"antes-2": `<scratchpad>/snapshot/out/antes-{1,2}/*.png` (não commitados)
- Este resumo é o único registro persistente do resultado.
