# Reorganização do repositório por domínio

**Data:** 2026-09-21 · **Branch:** `refactor/estrutura-por-dominio` (criada a partir de `feat/ingress-evolution-changes` @ `c83981e`)

## 1. Objetivo

O site cresceu em três frentes grandes (`/app`, `/livros`, `/ingress`) e as pastas não acompanharam:
`lib/` tem 140 arquivos soltos (~45 de ingress, ~50 de livros), `components/` tem peças de apps soltas na raiz,
`utils/` mistura analytics com geradores de PDF de domínios diferentes. O objetivo é que quem procura algo
saiba em qual pasta olhar **sem abrir o arquivo**.

**Isto é um refactor de lugar, não de comportamento.** Nenhuma URL, nenhum contrato de API, nenhum visual muda.

## 2. Decisões do Luiz (2026-09-21)

| Decisão | Escolha |
|---|---|
| `app/` | route groups por domínio: `(global)`, `(apps)`, `(livros)`, `(ingress)` |
| Nomes dos arquivos | **só mover, manter os nomes** (`lib/ingress/stats/ingress-stats.mjs`, sem tirar o prefixo) |
| `public/` | **não mexer** |
| Atalhos npm para os CLIs | sim, documentados |
| README.md | atualizar no final |
| Teste no navegador | snapshot (print) de cada rota antes/depois, comparados por pixel + erros de console/rede; o Luiz testa tudo de novo depois |
| Rede de segurança | trabalhar em branch nova a partir do ponto atual |

## 3. Regras

1. **Quatro domínios.**
   - `global`: home, about, projects, casamento, stats, header/footer, db, analytics, rate-limit, notificações.
   - `apps`: mini-apps, Nuvem de Palavras, Quiz ao Vivo, Sorteio, testes de personalidade.
   - `livros`: acervo e sala 3D.
   - `ingress`.
2. **Dono do arquivo = quem o usa.** Nome genérico usado por um domínio só vai para esse domínio
   (`MotionProvider` → ingress, `QuizPodium` → apps, `lib/radio.ts` → livros). Só vai para `global` o que mais de um domínio usa.
3. **Direção das dependências:** domínio pode importar `global`; `global` não importa domínio; um domínio não importa outro.
   As exceções que existem **hoje** estão na seção 6 — foram medidas, não estimadas.

## 4. Estrutura alvo

```
app/                 layout.tsx, globals.css, favicon.ico, robots.ts, sitemap.ts, opengraph-image.tsx (ficam na raiz)
  (global)/          page.tsx (home), about, projects, casamento, stats, api/{events,metrics,telegram,send-email}
  (apps)/            app/, w/, q/, api/{quiz-sessions,word-sessions}
  (livros)/          livros/ (layout.tsx + @livro + [slug] + lista), api/{livros,caderno}
  (ingress)/         ingress/, api/ingress-rankings

lib/
  global/            analytics, analytics-env, db, rate-limit, request-meta, routes, sanitize,
                     site-preferences, use-site-preferences, telegram-markdown, sound, utils, pdf-engine (novo, §7)
  apps/              quiz, sorteio, word-cloud, session-ids, pdf/
  livros/            acervo/    books, book-*, busca-livros, ficha-do-acervo, reading-dates, whatsapp-livros, book-sources/
                     sala/      modelos 3D (gaveta, janela, poltrona, relógio, lanterna, luz-do-dia, parede-do-fundo,
                                book-dimensions, bookshelf-model), cenas, shelf, shelf-years, routing, spine-canvas,
                                cor-lombada, contraste, radio
                     segredos/  "Coisas que ninguém repara": coisas-da-sala, progresso-da-sala, carteira, bilhete, marcador-pdf
  ingress/           catalog/   catálogo, lore, badges, tiers, países (+countries.json), arte
                     stats/     stats, nerd-stats, nerd-records, tier-position, tier-score, radar, country-chart
                     ranking/   rankings, rescore, compare-message, history-diff, my-agent
                     profile/   profile, ingress.ts, live-override, links, history, timeline
                     map/       globe, s2
                     (raiz)     ingress-format, ingress-lang  (cruzam as subpastas)

components/
  global/            Header, Footer, LanguageContext (sai de context/), ui/
  apps/              AppFooter, quiz/{QuizCountdown,QuizLeaderboard,QuizPodium}, word-cloud/{WordCloud,WordBarChart}
  livros/            sala/ · overlays/ · acervo/ · hooks/ · decor/ (já existia, não muda)
  ingress/           hero/ · medals/ · profile/ · map/ · shell/ · stats/ (já existia, não muda)

scripts/{global,livros,ingress}/       docs/{global,apps,livros,ingress}/  (adr/ e superpowers/ ficam)
db/                  schema.sql, migrations/, seed-temperament.sql   (saem de lib/; numeração intacta)
```

Testes (`*.test.mjs`) ficam ao lado do módulo; o glob `lib/**/*.test.mjs` do `npm test` já é recursivo.

**Mapeamento completo:** [`2026-09-21-reorganizacao-por-dominio-mapa.tsv`](./2026-09-21-reorganizacao-por-dominio-mapa.tsv)
(antigo → novo → domínio, 311 linhas — eram 318, ver seção 5.1). O TSV é a fonte do script de mover.
**1067 arquivos rastreados: 311 movem, 756 ficam.**

## 5. O que NÃO muda (e por quê)

- **`public/`** — decisão do Luiz. (`public/livros/capas/…` também está gravado no banco de produção.)
- **`apps/`** — uma tela por mini-app; o import dinâmico do `[app_name]` (`@/apps/<categoria>/<slug>`) é um contrato do CLAUDE.md.
  Não confundir: `apps/` = telas; `components/apps/` = peças reutilizáveis entre elas.
- **`data/ingress/` e `content/caderno/`** — lidos por `process.cwd()` e listados em `outputFileTracingIncludes` do
  `next.config.ts`. Já são separados por domínio; mover só traria risco de "funciona no dev, quebra em produção".
- **`proxy.ts`**, `next.config.ts` (nenhum caminho em string dele muda), `eslint.config.mjs`, `tsconfig.json` (alias `@/*` e `include` por glob seguem válidos).
- **`.specs/`, `.superpowers/`, `docs/adr/`** — registro histórico: mantêm os caminhos da época.
  Atualizo caminhos só em CLAUDE.md, README.md, `docs/<domínio>/` e comentários do código.

### 5.1 Descoberto durante a execução: arquivo de convenção especial não pode entrar no route group

**7 arquivos removidos do TSV depois de já commitados como parte das fases 1/2/6** (achado ao rodar a
fase 2 de verdade, 2026-09-22, e de novo na fase 6): `app/app/[app_name]/opengraph-image.tsx`,
`app/casamento/opengraph-image.tsx`, `app/casamento/icon.svg`, `app/ingress/fencherlc/opengraph-image.tsx`,
`app/ingress/fencherlc/linha-do-tempo/opengraph-image.tsx`,
`app/ingress/fencherlc/medalha/[slug]/opengraph-image.tsx`, `app/ingress/ranking/opengraph-image.tsx`.

O Next 16 adiciona um sufixo de hash de 6 caracteres à URL pública de **qualquer** arquivo de
convenção especial de metadata — tanto os gerados dinamicamente (`opengraph-image.tsx`,
`twitter-image.tsx`) quanto os **estáticos** (`icon.svg`, confirmado ao vivo na fase 6: não é só
`.tsx`, a suposição inicial de que arquivo estático escapava dessa lógica estava errada) — que tenha
**qualquer** route group `(...)` na cadeia de pastas ancestrais, mesmo sem colisão real nenhuma
acontecendo, como precaução genérica
(`node_modules/next/dist/lib/metadata/get-metadata-route.js`, função `getMetadataRouteSuffix`,
comentário: *"If there's special convention like (...) or @ in the page path, Give it a unique hash
suffix to avoid conflicts"*). Confirmado ao vivo duas vezes: `opengraph-image.tsx` de `[app_name]`
virou `/app/[app_name]/opengraph-image-spti35`; `casamento/icon.svg` virou
`/casamento/icon-xjqhts.svg`. Mudança de URL real, violando a regra central da seção 1 ("nenhuma URL
muda"), e grave porque `opengraph-image` é imagem de preview social (WhatsApp/Telegram/X cacheiam a
URL) e `icon.svg` é o favicon servido pelo navegador/PWA.

**Decisão do Luiz:** esses 7 arquivos ficam nos seus caminhos atuais (fora de qualquer route group),
mesmo com o `page.tsx`/`layout.tsx` do mesmo segmento de URL já morando dentro do grupo do domínio —
confirmado ao vivo que o Next resolve os dois fisicamente separados (uma árvore agrupada, outra não)
para a mesma URL final sem problema, é um uso documentado de route groups. `app/opengraph-image.tsx`
e `app/favicon.ico` da raiz já não moviam (ficam em `app/` por definição, seção 4).

**Lição para o resto da execução:** qualquer arquivo de convenção especial do Next (`opengraph-image`,
`twitter-image`, `icon`, `apple-icon`, `manifest` — exceto `robots`/`manifest` na raiz literal, que o
próprio Next isenta) precisa ser checado contra este mesmo problema antes de entrar num route group,
estático ou não.

## 6. Exceções de dependência (medidas com o mapa aplicado, 799 imports analisados)

Cruzam a regra hoje e **ficam como exceção documentada** (mover não as cria, só as deixa visíveis):

| De → Para | Por que fica |
|---|---|
| `(global)/api/telegram/route.js` → `lib/ingress/ranking/ingress-compare-message`, `lib/ingress/ingress-format`, `apps/.../love-language-info.ts` | rota única que despacha por `type` para vários domínios; separar é mudança de comportamento |
| `(global)/api/telegram/ingress-radar.jsx` → `lib/ingress/stats/ingress-radar` | idem (renderiza o radar na mensagem) |
| `app/sitemap.ts` → `lib/livros/acervo/books`, `lib/ingress/catalog/ingress-catalog` | o sitemap enumera todos os domínios por definição |
| `components/global/Footer.tsx` → `components/livros/sala/CreditosModelos`, `lib/livros/sala/livros-routing` | o rodapé global mostra créditos dos modelos 3D nas rotas de `/livros` |
| `scripts/ingress/{ingress,ingress-catalog-gen}.mjs` → `lib/livros/acervo/book-utils` (`slugify`) | **não** extraio: `slugify` devolve `'livro'` como fallback, logo não é genérico — extrair exigiria decidir esse fallback (mudança de comportamento) |

## 7. Única mudança de código além de caminhos: extrair o motor de PDF

`renderElementToPdf` (75 linhas, html2canvas → jsPDF) mora em `utils/pdf-generator.tsx` (apps) mas é usado também por
`marcador-pdf` (livros) — o único caso `domínio → domínio` de `lib/`. Proposta: extraí-lo para
`lib/global/pdf-engine.tsx`, com `pdf-generator.tsx` re-exportando (mesma técnica que `word-cloud.ts` já usa para `session-ids`).
Comportamento idêntico; **vai num commit isolado, separado das mudanças de lugar**, para poder ser revertido sozinho.
O CLAUDE.md ("PDF Generation") diz exatamente para estender esse motor compartilhado.

## 8. Atalhos npm (novos)

JSON não aceita comentário, então cada atalho é documentado em três lugares: tabela no README, seção no CLAUDE.md e
`Uso: npm run …` no cabeçalho de cada script.

| Atalho | Roda | Observação |
|---|---|---|
| `npm run livros -- <cmd>` | `scripts/livros/livros.mjs` | `list`, `add`, `edit`, `capa`, `seed`; **escreve em produção**, pede confirmação |
| `npm run livros:leitura` | `scripts/livros/aplicar-leitura.mjs` | |
| `npm run ingress -- <cmd>` | `scripts/ingress/ingress.mjs` | |
| `npm run ingress:rescore` | `scripts/ingress/ingress-rescore.mjs` | recalcula nota (ADR-0005) |
| `npm run ingress:catalog` | `scripts/ingress/ingress-catalog-gen.mjs` | |
| `npm run ingress:countries` | `scripts/ingress/gen-ingress-countries.mjs` | |
| `npm run ingress:icons` | `scripts/ingress/generate-ingress-pwa-icons.mjs` | |
| `npm run gen:favicons` | `scripts/global/gen-favicons.mjs` | já existia; só o caminho muda |

`migrate-casara`, `migrate-status-livros` e `create-books-table` são migrações históricas ("não re-executar"): **sem atalho**.

## 9. Riscos e como cada um é coberto

| Risco | Cobertura |
|---|---|
| Import quebrado em `.mjs` (o `tsc` não vê: `checkJs: false`) | verificador próprio: todo import de todo arquivo de código tem que resolver para um arquivo existente; roda a cada fase |
| Import dinâmico / caminho em string | busca dirigida (`import(`, `process.cwd`, `import.meta.url`, `readFileSync`, `join(`) e revisão manual da lista |
| **8 scripts calculam a raiz com `'..'`** e passam a ficar um nível abaixo (`.env.local`, `seed/`, `backups/`, `db/migrations`) | corrigir para `'../..'`; smoke test de cada CLI com `--dry-run`/`--help`, **sem escrever em produção** |
| `scripts/gen-ingress-countries.mjs` escreve `lib/ingress/countries.json` | caminho de escrita atualizado para `lib/ingress/catalog/countries.json` |
| Route groups: layout/`@livro`/`manifest.webmanifest` movendo | comparar a **lista de rotas do `next build`** antes/depois: tem que ser idêntica |
| Colchetes e parênteses nos caminhos (`[id]`, `(livros)`) no shell do Windows | mover com `git mv` por script Node (sem passar por shell), nunca por glob |
| Perder histórico do git | `git mv` (rename detection); imports editados depois de mover, em commit separado do `mv` puro quando possível |
| Cache `.next/` e `tsconfig.tsbuildinfo` com caminhos velhos | `rm -rf .next` antes de cada build de verificação |
| Docs/CLAUDE.md citando caminho antigo | varredura por todos os 318 caminhos antigos em CLAUDE.md, README.md, `docs/<domínio>/`, comentários |

## 10. Verificação

### 10.1 Baseline (antes de mexer em qualquer arquivo)
Neste commit, sem alteração: `tsc --noEmit`, `npm run lint`, `npm test`, `next build`. Registrar o que já falha (para não culpar o refactor)
e **a lista de rotas do build**.

### 10.2 Snapshot visual antes/depois
Script Node em pasta temporária (nada é commitado, **nenhuma dependência nova no projeto**): usa o `playwright` do cache do npx,
`pixelmatch` e `pngjs` já presentes no `node_modules`.

**Verificado em 2026-09-21:** `require.resolve('pixelmatch')` e `require.resolve('pngjs')` resolvem direto no projeto
(hoisted como transitivos de `potrace`→`jimp`) — dá para `import`/`require` normalmente. `playwright` **não** é dependência
do projeto (`require.resolve('playwright')` falha) — só existe em `%LOCALAPPDATA%\ms-playwright` (browsers já baixados:
chromium, firefox, webkit) e em caches do `npx` fora do repo. O script de snapshot tem que **invocar via `npx playwright`
(CLI ou subprocesso `npx -y playwright ...`)**, nunca `require('playwright')`/`import 'playwright'` direto — isso falha.
Se o `npx` precisar resolver a versão pela primeira vez nesta máquina, pode exigir rede; os browsers já instalados evitam
o download pesado, mas o pacote `playwright` em si ainda passa pelo `npx`.

- **Servidor:** build de produção (`next build && next start`) numa porta livre — sem overlay de dev, e sem gravar analytics
  (`VERCEL_ENV` ausente, ver CLAUDE.md "Só produção grava evento"). O `.env.local` aponta para o banco de produção: as rotas só **leem**.
- **Rotas:** todas as estáticas do build + amostras das dinâmicas (um slug de cada app em `/app/[app_name]`, alguns `/livros/[slug]`,
  uma medalha em `/ingress/fencherlc/medalha/[slug]`, `/w/<id inexistente>` e `/q/<id inexistente>` → estado 404/vazio; **não crio sessão real** para não escrever no banco).
- **Viewports:** desktop 1280×800 e mobile 390×844. Screenshot full-page de cada uma.
- **Determinismo:** `reducedMotion`, animações/transições CSS desligadas, `Math.random` com semente, relógio congelado (`page.clock`),
  espera de rede ociosa. Home tem quote aleatória; `/livros` tem luz por hora e canvas WebGL.
- **Piso de ruído:** o baseline é capturado **duas vezes**; a diferença entre as duas é o ruído natural de cada rota.
  O "depois" passa se a diferença contra o baseline ficar dentro desse ruído. Rota que não estabiliza (canvas 3D) tem critério próprio:
  canvas não-vazio + zero erro — e fica marcada para o Luiz olhar.
- **Erros:** por rota e viewport, registrar status HTTP, `console.error`/`pageerror` e requisições com falha.
- **APIs GET:** status + formato do JSON (as bodies mudam com dado vivo, então não comparo byte a byte).
- Relatório final: tabela rota × viewport × (status, erros, % de pixels diferentes, veredito).

Isto **não substitui** o teste do Luiz — reduz a chance de ele achar algo quebrado. E não julga estética: só "igual ao antes ou não".

### 10.3 Gate de cada fase
`verificador de imports` → `tsc --noEmit` → `npm run lint` → `npm test` (contagem igual à do baseline) → `next build` (mesmas rotas). Só então commita.

## 11. Ordem de execução (um commit por fase)

0. Baseline + snapshot "antes" ×2 (nada commitado além deste spec).
1. `db/` + `lib/global/` + `components/global/` (inclui `utils/analytics`, `context/`, `components/ui`).
2. `apps`: `lib/apps`, `components/apps`, rotas `(apps)`.
3. Extração do motor de PDF (§7) — commit isolado.
4. `livros`: `lib/livros`, `components/livros`, rotas `(livros)`.
5. `ingress`: `lib/ingress`, `components/ingress`, rotas `(ingress)`.
6. Rotas `(global)` + `app/` raiz.
7. `scripts/` + atalhos npm + `docs/`.
8. CLAUDE.md, README.md, comentários com caminho antigo.
9. Snapshot "depois" + relatório; gate final completo.

Cada fase é reversível sozinha. Se algo grave aparecer, a branch de origem (`feat/ingress-evolution-changes`) continua intacta.

## 12. Fora de escopo
Renomear arquivos; mover `public/`, `data/`, `content/`; refatorar a rota do Telegram; migrar chaves de `localStorage`;
qualquer mudança visual ou de comportamento; teste automático permanente de fronteira entre domínios (posso sugerir depois).
