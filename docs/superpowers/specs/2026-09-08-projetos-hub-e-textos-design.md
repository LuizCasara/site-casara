# Reestruturação de navegação: hub "Projetos" + revisão de textos

**Data:** 2026-09-08
**Status:** aprovado no brainstorming, pendente revisão do spec

## Problema

O site tem 5 itens de menu no topo (Início, Sobre, Projetos, Aplicativos, Livros)
e o Ingress fora do menu. Conforme surgem novas áreas construídas dentro do
próprio site (Ingress agora, outras depois), o header não escala. Além disso,
os textos de `/` e `/sobre` citam números concretos que envelheceram — "9
produtos financeiros", "≤20ms de SLA", "350+ TPS" — e o autor não quer manter
afirmações que podem estar desatualizadas.

## Objetivo

1. Reduzir o header a 3 itens (Início, Sobre, Projetos), com "Projetos" abrindo
   um dropdown que separa **Experimentos** (áreas do próprio site) de
   **Trabalho com clientes** (projetos entregues).
2. Transformar `/projects` num hub com esses dois blocos, os experimentos em
   destaque acima do accordion de clientes que já existe.
3. Trocar os números específicos de `/` e `/sobre` por um posicionamento mais
   duradouro: responsável pela plataforma de front-end (interna e externa) de
   uma fintech BaaS/SaaS, com gestão de squads, pessoas, produtos e arquitetura.
4. Adicionar em `/sobre` um bloco de destaque que leva a `/livros`, enfatizando
   o gosto pela leitura.

Fora de escopo: mudar rotas, criar redirects, mexer no conteúdo de `/app`,
`/livros` ou `/ingress`, tocar em `lib/ingress-radar.mjs` (alteração
pré-existente não relacionada).

## Decisões travadas (do brainstorming)

| Tema | Decisão |
|---|---|
| Header | 3 itens; "Projetos" é link para `/projects` **e** abre dropdown |
| Ingress na vitrine | Incluído, com selo "em construção" |
| Nomes dos blocos | "Experimentos" (feitos aqui) / "Trabalho com clientes" |
| Layout dos experimentos | Opção A: grid de 3 cards, mesmo vocabulário visual de `/app` |
| "2 squads" | Generalizar — sem o número |
| Bullet do Dock em `/sobre` | Ajustar junto, alinhado ao novo texto |

## 1. Navegação — `components/Header.tsx`

O componente já é `"use client"` (usa `usePathname`, `useState`, contexto de
idioma). Mantém-se client.

### Estrutura de dados

`navLinks` passa de lista plana para suportar um item com filhos:

```ts
type NavChild = {href: string; label: string; icon?: string; wip?: boolean};
type NavItem = {href: string; label: string; children?: NavChild[]};
```

`pt` e `en`:

- `{href: '/', label: 'Início' | 'Home'}`
- `{href: '/about', label: 'Sobre' | 'About'}`
- `{href: '/projects', label: 'Projetos' | 'Projects', children: [...]}`

Filhos de "Projetos" (rótulos PT / EN):

| href | PT | EN | flag |
|---|---|---|---|
| `/app` | Aplicativos | Apps | — |
| `/livros` | Livros | Books | — |
| `/ingress` | Ingress | Ingress | `wip: true` |
| `/projects` | Trabalho com clientes | Client work | (separador acima) |

Os três primeiros aparecem sob um rótulo "EXPERIMENTOS" / "EXPERIMENTS"; o
último vem após um divisor.

### Comportamento desktop

- "Projetos" é um `<Link href="/projects">` normal **e** dispara a abertura do
  dropdown em `onMouseEnter` / `onFocus` do container.
- Dropdown fecha em `onMouseLeave` do container, `Escape`, ou clique/foco fora
  (listener em `document`, removido no cleanup).
- Container do item tem `onKeyDown` para `Escape`; primeiro item recebe foco ao
  abrir por teclado (opcional — abrir por hover é o caminho principal).
- `aria-haspomenu`/`aria-expanded` no elemento que controla, `role="menu"` +
  `role="menuitem"` no painel.
- Selo "em construção" ao lado de "Ingress": `<span>` pequeno, borda cinza,
  mesmo estilo do selo usado no card da página (ver seção 2).

### Comportamento mobile

- Dentro do menu hambúrguer, "Projetos" aparece como link normal seguido dos
  sub-itens **indentados e sempre visíveis** (sem accordion aninhado).
- Rótulo "EXPERIMENTOS" como cabeçalho pequeno; "Trabalho com clientes" após um
  divisor fino.
- Cada item continua fechando o menu e chamando `trackNavClick(href, 'menu_mobile')`.

### Estado ativo

Hoje: `pathname === href`. Novo: "Projetos" fica ativo quando
`pathname === '/projects'` **ou** `pathname` começa com `/app`, `/livros` ou
`/ingress`. Extrair um helper `isProjetosActive(pathname)` para não repetir a
lógica entre desktop e mobile. Sub-itens do dropdown usam `pathname.startsWith`
do próprio href para o próprio destaque.

### Tracking

`trackNavClick(href, 'header')` / `('...', 'menu_mobile')` mantido em todos os
itens, inclusive nos filhos e no "Projetos" pai.

### Sem mudança

- Header continua retornando `null` em `/casamento`, `/w/`, `/q/` e `/ingress`.
  O dropdown apenas aponta para `/ingress`; a página segue standalone.
- Botão de idioma, logo, breakpoints.

## 2. Página `/projects` — `app/projects/page.tsx`

Continua `"use client"` e bilíngue via `useLang`.

### Novo array local

```ts
const experimentos = [
  {slug: 'aplicativos', href: '/app',     icon: <…/>, wip: false,
   title: {pt: 'Aplicativos', en: 'Apps'},
   blurb: {pt: '15+ mini-ferramentas: conversores, testes e dinâmicas ao vivo.',
           en: '15+ mini-tools: converters, quizzes and live activities.'}},
  {slug: 'livros', href: '/livros', icon: <…/>, wip: false,
   title: {pt: 'Livros', en: 'Books'},
   blurb: {pt: 'Meu acervo numa sala de leitura 3D navegável, com resenhas.',
           en: 'My library as a navigable 3D reading room, with reviews.'}},
  {slug: 'ingress', href: '/ingress', icon: <…/>, wip: true,
   title: {pt: 'Ingress', en: 'Ingress'},
   blurb: {pt: 'Painel do meu perfil de agente: medalhas, stats e linha do tempo.',
           en: "My agent profile dashboard: medals, stats and timeline."}},
];
```

Ícones: `react-icons` (ex.: `FaThLarge`/`FaWrench`, `FaBookOpen`,
`FaGlobeAmericas` ou similar), na cor `text-green-500` como em `/app`.

### Layout

```
<h1>Projetos</h1>
<p>{subtítulo bilíngue}</p>

<section> "EXPERIMENTOS · feitos aqui" / "EXPERIMENTS · built here"
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3
    card: block border rounded-xl p-4, hover eleva (mesma treatment de /app)
      - wip:false  → border-green-... , hover:bg-green-50/50
      - wip:true   → border-gray-... + selo "em construção" / "work in progress"
</section>

<section> "TRABALHO COM CLIENTES" / "CLIENT WORK"
  <ProjectAccordion projects={projects} />   // inalterado
</section>
```

O `translations` da página ganha as chaves novas (`experimentsLabel`,
`clientWorkLabel`, `wipBadge`, subtítulo reescrito). O subtítulo atual
("Uma seleção de projetos que desenvolvi para clientes…") passa a descrever os
dois blocos.

### Tracking

Nova função em `utils/analytics.ts`:

```ts
export const trackInternalProjectClick = (slug: string) =>
  trackEvent('internal_project_click', {slug});
```

Chamada no `onClick` de cada card de experimento. (Segue o padrão das demais
`trackX` do arquivo; ver CLAUDE.md → "Adding a new tracked event". Opcionalmente
adicionar rótulo em `EVENT_LABELS` de `app/stats/page.tsx`.)

## 3. Textos da home — `app/page.tsx`

### Bio

Remove `bioHighlight1`, `bioMid`, `bioHighlight2`, `bioEnd` e o JSX que os
monta. `bio` vira uma string única; opcionalmente um único `<span>` de ênfase
em "plataforma de front-end" / "front-end platform".

**PT:**
> 10+ anos construindo software de alta criticidade em escala. Hoje respondo
> pela plataforma de front-end de uma fintech de infraestrutura bancária (BaaS)
> — do produto interno ao que chega no cliente final —, cuidando de squads,
> pessoas, arquitetura e das estruturas que sustentam a entrega.

**EN:**
> 10+ years building high-criticality software at scale. Today I own the
> front-end platform of a banking-as-a-service (BaaS) fintech — from internal
> tooling to customer-facing products — leading squads, people, architecture,
> and the foundations behind delivery.

### Bloco de stats

| valor (PT/EN) | label PT | label EN |
|---|---|---|
| `10+` | Anos de experiência | Years of experience |
| `Tech Lead` | Fintech BaaS · SaaS | BaaS · SaaS fintech |
| `Front-end` | Plataforma interna + externa | Internal + external platform |

Estrutura do bloco (grid de 3, `text-3xl` no valor) permanece. Verificar que
`Front-end` e `Tech Lead` cabem em `text-3xl` no mobile (`grid-cols-2`) — se
apertar, reduzir para `text-2xl` só nesses ou encurtar rótulo.

## 4. Textos do `/sobre` — `app/about/page.tsx`

### Bio (parágrafo 1)

`bio1` + `bio1company` (link Dock) + `bio1end` reescritos:

**PT** (`bio1` … `{Dock}` … `bio1end`):
> 10+ anos construindo software de alta criticidade em escala. Hoje Tech Lead na
> **Dock**, fintech de infraestrutura bancária (BaaS), onde respondo pela
> plataforma de front-end da empresa — interna e externa — e pela gestão de
> squads, pessoas e arquitetura. Bacharel em Ciência da Computação pela
> Anhanguera — Cascavel, PR.

**EN:**
> 10+ years building high-criticality software at scale. Now Tech Lead at
> **Dock**, a banking-as-a-service (BaaS) fintech, where I own the company's
> front-end platform — internal and external — and lead squads, people, and
> architecture. Bachelor's in Computer Science from Anhanguera — Cascavel,
> Brazil.

`bio2` (parágrafo escoteiro) inalterado.

### Bullets do Dock (`experience[0].highlights`)

**PT:**
1. `Responsável pela plataforma de front-end da empresa — produtos internos e externos —, da arquitetura à qualidade de código.`
2. `Gestão de squads multifuncionais: pessoas, planejamento, prioridades e a estrutura técnica por trás da entrega.`
3. (inalterado) `Micro-frontend com React + TypeScript, GraphQL (Apollo), Node.js BFFs e Python APIs.`
4. (inalterado) `Conduzindo a adoção de Spec-Driven Development para melhorar previsibilidade entre squads.`

**EN:**
1. `Owning the company's front-end platform — internal and customer-facing products — from architecture to code quality.`
2. `Leading cross-functional squads: people, planning, priorities, and the technical foundations behind delivery.`
3. (inalterado)
4. (inalterado)

### Typewriter

Trocar a linha 2 `"Construo produtos financeiros em escala"` /
`"Building financial products at scale"` por
`"Cuido da plataforma de front, ponta a ponta"` /
`"Front-end platform, end to end"`. Linhas 1, 3 e 4 ficam.

## 5. Bloco "Leitura" no `/sobre`

Novo `<section>` logo após a seção "Além do código" (antes de "Contato"):

- `rounded-xl border`, fundo `bg-gray-50 dark:bg-gray-900/50` (mesmo da seção
  "Além do código"), padding `p-6`.
- Emoji/ícone 📚 + título "Leitura" / "Reading".
- Texto **PT:** "Leio bastante — de engenharia a formação pessoal. Montei meu
  acervo numa sala de leitura 3D navegável, com resenhas e notas de cada livro."
- Texto **EN:** "I read a lot — from engineering to personal growth. I built my
  library as a navigable 3D reading room, with reviews and notes on every book."
- Link `next/link` para `/livros`: "Explorar meu acervo →" / "Explore my
  library →". `onClick` → `trackNavClick('/livros', 'about')`.
- Vale nos dois idiomas; o destino `/livros` é PT-only (comportamento idêntico
  ao link que hoje existe no header).

Chaves novas em `translations` (`readingTitle`, `readingText`, `readingCta`).

## Componentes / arquivos tocados

| Arquivo | Mudança |
|---|---|
| `components/Header.tsx` | dropdown desktop + grupo mobile, helper de estado ativo |
| `app/projects/page.tsx` | seção "Experimentos", chaves de tradução, tracking |
| `app/page.tsx` | bio (simplifica JSON), bloco de stats |
| `app/about/page.tsx` | bio, bullets do Dock, typewriter, seção "Leitura" |
| `utils/analytics.ts` | `trackInternalProjectClick` |
| `app/stats/page.tsx` | (opcional) rótulo em `EVENT_LABELS` |

Sem migração de banco, sem rota nova, sem redirect, sem mudança em
`/app`, `/livros`, `/ingress`.

## Testes

Não há suíte configurada. Verificação:

- `npm run lint` limpo.
- `npm run build` sem erro de tipo (as edições em `translations` mudam shapes).
- Manual (o Luiz valida na tela): dropdown abre/fecha (hover, Esc, clique fora);
  estado ativo de "Projetos" nas rotas `/app*`, `/livros`, `/ingress`; menu
  mobile mostra os sub-itens; cards de `/projects` linkam certo e o de Ingress
  mostra o selo; `/` e `/sobre` sem os números antigos em PT e EN; link do
  `/livros` no `/sobre`.

## Risco em aberto: branch

O trabalho está sendo pensado a partir de `feat/ingress` (não mergeada). O
dropdown e o card de `/projects` apontam para `/ingress`, que só existe nessa
branch. Opções:

- **A** — implementar sobre `feat/ingress` (ou uma branch a partir dela). A
  vitrine com Ingress "em construção" faz sentido junto do merge do Ingress.
- **B** — branch a partir de `main` sem o card do Ingress; adicionar o card
  quando `feat/ingress` mergear.

Recomendação: **A**, numa branch nova a partir de `feat/ingress`
(ex.: `feat/projetos-hub`), mantendo `lib/ingress-radar.mjs` fora dos commits
desta feature. A decisão final é do Luiz e será confirmada antes do plano de
implementação.
