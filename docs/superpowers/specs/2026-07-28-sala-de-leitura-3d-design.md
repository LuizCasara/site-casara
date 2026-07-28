# Sala de Leitura 3D — Design

**Data:** 2026-07-28
**Status:** aprovado, pronto para plano de implementação
**Escopo:** fundação do acervo de livros + sala 3D (MVP)

---

## Objetivo

Uma rota nova onde os livros que o Luiz lê viram objetos em uma sala 3D
acolhedora: os que ele está lendo ficam soltos sobre a mesa, com a capa à
mostra; os já lidos ficam organizados em uma estante. Passar o mouse destaca um
livro; clicar abre o livro e revela ficha técnica e o texto pessoal sobre ele.

Três metas, em ordem de prioridade:

1. Encantar quem acessa a rota.
2. Falar sobre livros e estimular a leitura de outras pessoas.
3. Interagir com visitantes.

A meta 3 **não** faz parte deste spec — ver "Fora de escopo".

## Premissa de volume

**~20 livros no lançamento, ~60 em dois anos.** Acervo curado, não histórico
completo de leitura.

Esse número sustenta várias decisões abaixo e precisa ser revisitado se mudar:
uma estante só (sem paginação), sem instancing, cada livro com textura própria em
boa resolução, e a cena inteira carregada de uma vez. Acima de ~200 livros o
design muda de verdade — exigiria instancing, LOD e estante com rolagem
vertical.

---

## Decisões estruturantes

Cada uma destas foi decidida no brainstorming e restringe o que vem depois.

### 1. O conteúdo existe fora do canvas

Uma rota 100% WebGL não tem SEO, não gera link compartilhável por livro e some
para quem não roda 3D — o que colide de frente com a meta 2. Portanto:

- `/livros/[slug]` é uma página server-rendered de verdade, indexável.
- A sala 3D é **uma lente sobre os dados**, não a única porta de entrada.
- Consequência prática: a fase 1 entrega um acervo publicado e útil **antes de
  existir qualquer 3D**.

### 2. Clicar num livro muda a URL sem desmontar a cena

Via **Intercepting Routes** do App Router (o mecanismo do modal de foto do
Instagram). Navegando de dentro da sala, a URL vira `/livros/[slug]` e o livro
apenas abre. O botão "voltar" do navegador fecha o livro nativamente.

Escolhido path com slug (`/livros/o-nome-do-vento`) em vez de query param
(`?livro=34`): ambos são igualmente instantâneos, mas o path é legível ao ser
compartilhado, indexa melhor e ganha histórico de navegação de graça.

> **Restrição de implementação, não negociável:** o `<Canvas>` precisa viver em
> `app/livros/layout.tsx`, nunca em `page.tsx`. Na page ele desmonta a cada
> navegação e o efeito inteiro se perde.

### 3. Link externo entrega conteúdo primeiro, sala depois

Quem abre `/livros/o-nome-do-vento` vindo de fora recebe o HTML server-rendered
imediatamente. A sala 3D carrega em paralelo, em background, e materializa com o
livro aberto quando estiver pronta. Ninguém fica preso em tela de carregamento, e
quem tem GPU fraca ou internet ruim lê o conteúdo do mesmo jeito.

Concretamente: a página renderiza o conteúdo do livro em DOM normal; o bundle 3D
é importado em paralelo; quando a cena termina de montar, ela aparece atrás do
conteúdo com *fade*, com a câmera **já** no ponto de vista `livro` e o livro
aberto — sem animação de abertura, porque não houve clique para justificá-la. O
painel de conteúdo já visível se torna o painel ancorado nas páginas. Se o 3D
falhar ou demorar demais, nada acontece: a página permanece exatamente como
está, funcionando.

### 4. Renderização: R3F com sala construída em código (A1)

Sala low-poly montada com primitivas, vendida pela **iluminação** (luz quente de
abajur, LED frio atrás da estante, poeira volumétrica, bloom), não por
modelagem. Sem Blender.

Rejeitadas:

- **Diorama híbrido** (fundo pré-renderizado + poucos objetos 3D): bonito no dia
  1 e muito leve, mas trava a câmera e torna qualquer mudança de ângulo um
  re-render de tudo. Fecha a porta de evoluir a sala, que é exatamente a porta
  que precisa ficar aberta.
- **CSS 3D puro**: sem dependências novas e ótimo em mobile, mas entrega uma
  ilustração inclinada, não um ambiente. Não atende a meta 1.

**Caminho de upgrade preservado:** A1 → A2 (geometria modelada com *baked
lighting*, no espírito do [My Room in
3D](https://my-room-in-3d.vercel.app/)) é troca de materiais e import de um GLB,
não reescrita. O contrato que garante isso está na seção "Cena 3D".

### 5. Mobile recebe a sala, adaptada

Mesma cena, com câmera em trilho (arrastar navega lateralmente pela estante,
sem órbita livre), tap único abrindo o livro sem estado intermediário de hover,
e DPR reduzido. Os problemas reais de mobile aqui são de *interação* (hover não
existe; arrastar competiria com scroll), não de GPU — com 20-60 livros e sala
low-poly a GPU sobra.

### 6. Skoob fica de fora

A API pública do Skoob (`v1/bookcase/books`) foi desligada na atualização de
setembro de 2025 e não existe exportação nativa. Todos os exportadores de
terceiros conhecidos estão quebrados. As únicas rotas hoje seriam scraping
autenticado ou engenharia reversa do app — ambos frágeis.

O acervo é populado digitando ISBNs. O buscador de metadados fica isolado atrás
de uma interface (`lib/book-sources/`) para que um adapter de Skoob possa entrar
no futuro sem tocar em mais nada.

---

## Modelo de dados

Uma tabela, no schema `casara` como todo o resto do site. Toda query precisa
qualificar explicitamente — o `search_path` da conexão não inclui `casara`.

```sql
CREATE TABLE IF NOT EXISTS casara.books (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,        -- "o-nome-do-vento"
  isbn         TEXT,
  title        TEXT NOT NULL,
  author       TEXT NOT NULL,
  year         SMALLINT,
  publisher    TEXT,
  pages        SMALLINT,                    -- vira a espessura na estante
  synopsis     TEXT,                        -- sinopse curta
  cover_path   TEXT,                        -- /livros/capas/<slug>.jpg (local)
  spine_color  TEXT,                        -- hex, extraído da capa
  rating       NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  category     TEXT NOT NULL,               -- uma só, taxonomia fechada
  tags         TEXT[] NOT NULL DEFAULT '{}',-- livres, quantas quiser
  status       TEXT NOT NULL CHECK (status IN ('lendo','lido')),
  progress_pct SMALLINT,                    -- só quando status='lendo'
  finished_at  DATE,
  review       TEXT,                        -- texto pessoal, markdown
  shelf_order  SMALLINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_status   ON casara.books (status);
CREATE INDEX IF NOT EXISTS idx_books_category ON casara.books (category);
CREATE INDEX IF NOT EXISTS idx_books_tags     ON casara.books USING GIN (tags);
```

O DDL entra em `lib/schema.sql` junto com as outras tabelas.

### Categoria única + tags livres

`category` é **uma só** e vem de uma taxonomia fechada definida em código
(`lib/book-categories.ts`, no mesmo padrão de `temperament-info.ts` e
`love-language-info.ts`: nome de exibição, cor Tailwind/hex, ícone).

Motivo: a categoria define **onde o livro mora na estante** e qual cor ele tem.
Se um livro pudesse ter várias categorias, sua posição na prateleira seria
ambígua.

`tags` são livres e transversais — o eixo de busca e filtro. *A Revolta de Atlas*
tem categoria `ficcao` e tags `politica`, `filosofia`.

Tags livres degeneram sozinhas (`politica` / `política` / `Política` viram três
coisas). O CLI normaliza na entrada (minúsculas, trim, colapso de espaços) e
**autocompleta a partir das tags já existentes no banco**, para incentivar reuso
em vez de recriação.

### Capas são baixadas, não linkadas

No cadastro, o script baixa a imagem e salva em `public/livros/capas/<slug>.jpg`.

Motivo: a API de covers da Open Library tem rate limit. Linkar direto faria
*cada visitante* bater no servidor deles — bloqueio garantido num dia de tráfego
bom. Baixando: `next/image` funciona, e a capa não some se a Open Library mudar.

`spine_color` é extraída da capa **uma vez, no cadastro**, e gravada. O navegador
nunca faz esse trabalho.

---

## Cadastro (CLI)

`scripts/livros.mjs`, rodando apenas na máquina do Luiz. **Zero superfície de
ataque pública** — foi requisito explícito: o site não ganha rota autenticada,
nem admin, nem sessão.

```
node scripts/livros.mjs add 9788576570000
node scripts/livros.mjs edit o-nome-do-vento
node scripts/livros.mjs list
node scripts/livros.mjs add 9788576570000 --dry-run
```

Fluxo do `add`:

1. Busca metadados na Open Library pelo ISBN.
2. Mostra o que encontrou e pede confirmação.
3. Pergunta nota, categoria, tags (com autocomplete), status.
4. Baixa a capa, extrai a cor dominante, gera o slug.
5. **Abre o `$EDITOR`** para escrever o texto do livro — igual `git commit`.
   Escrever uma resenha em prompt de terminal seria tortura; em editor de verdade
   é confortável.
6. Mostra o resumo do que será gravado e pede confirmação final.
7. `INSERT`.

### Este script escreve em produção

Não existe banco de staging neste projeto. Portanto:

- Nada é gravado sem confirmação explícita, com resumo à vista.
- `--dry-run` executa tudo menos o `INSERT`.
- `edit` faz `UPDATE` por slug, nunca por posição ou índice.
- Não existe subcomando de exclusão em massa.

### Dados incompletos são caminho normal, não erro

A Open Library é boa mas incompleta, especialmente para edições brasileiras.
Se o CLI assumir dados completos, ele falha no terceiro livro cadastrado.

| Situação | Comportamento |
|---|---|
| ISBN não encontrado | Cai em cadastro manual com campos vazios |
| Sem `number_of_pages` | Pergunta no terminal |
| Sem capa, ou download falha | Gera placeholder com título + cor da categoria — deliberadamente sem graça, para ser notado e trocado depois |
| Capa em baixa resolução | Avisa e pergunta se segue |
| Slug já existe | Sufixa com o ano; se ainda colidir, pergunta |

### Fontes de metadados plugáveis

```
lib/book-sources/
  index.mjs          -- interface: buscar(isbn) -> BookMetadata | null
  openlibrary.mjs    -- implementação atual
```

É o gancho para um futuro adapter de Skoob. Se ele quebrar, o acervo não sente.

---

## Rotas

| Rota | Natureza | Papel |
|---|---|---|
| `/livros` | client, `<Canvas>` no layout | A sala 3D |
| `/livros/[slug]` | server-rendered | Página real do livro. É o que Google indexa e WhatsApp desembrulha |
| `app/livros/@livro/(.)[slug]/` | intercepting route | Mesma URL, mas vindo de dentro da sala o livro só abre |
| `/livros/lista` | server-rendered | Grade de capas com filtros, em HTML puro |

`/livros/lista` acumula três papéis: fallback de degradação, versão acessível, e
**a mesma tela que a folha do índice mostra dentro da sala** — mesmo componente
de filtro, mesmo estado, duas apresentações. Aceita query params
(`/livros/lista?tag=politica`), então filtros também são compartilháveis.

### Integração com o que já existe

- `lib/routes.ts`: `APP_SLUGS` não muda (isto não é um mini-app), mas
  `REAL_ROUTE_PATTERN` precisa aceitar `/livros`, `/livros/lista` e
  `/livros/<slug>`. Sem isso o `middleware.ts` descarta esses `page_view` como
  se fossem varredura de bot, e a rota fica invisível no `/stats`.
- `utils/analytics.ts`: eventos novos (ver "Medição").
- `lib/schema.sql`: DDL da tabela nova.

---

## Cena 3D

### Estrutura de arquivos

```
app/livros/
  layout.tsx                 <Canvas> + slot @livro
  page.tsx                   a sala
  [slug]/page.tsx            página real, SSR
  @livro/(.)[slug]/page.tsx  rota interceptada
  lista/page.tsx
components/livros/
  Room.tsx                   cenário burro, expõe âncoras
  Bookshelf.tsx              livros lidos, de lombada
  DeskBooks.tsx              livros lendo, soltos e de capa virada
  Book.tsx                   uma caixa, 6 materiais
  IndexSheet.tsx             a folha do índice
  CameraRig.tsx              transições entre pontos de vista nomeados
  BookOverlay.tsx            conteúdo em DOM
lib/
  books.ts                   tipos, dimensões, queries, lógica pura
  book-categories.ts         taxonomia fechada
  spine-texture.ts           geração do atlas de lombadas
```

### O contrato que mantém a porta do A2 aberta

`Room.tsx` **não sabe que livros existem**. Ele desenha cenário e publica âncoras
nomeadas (`estante`, `mesa`, `janela`) como posições/orientações. Estante, mesa e
folha se posicionam a partir dessas âncoras.

Trocar a sala por um modelo baked significa reescrever `Room.tsx` e mais nada.
Se qualquer lógica de livro vazar para dentro dele, a porta fecha.

### Como um livro é representado

Uma `boxGeometry` com 6 materiais. A espessura deriva de `pages`:

```
espessura = clamp(pages * 0.055mm, 12mm, 60mm)
```

O clamp existe para que um livro de 90 páginas não vire uma folha invisível e um
de 1200 não vire tijolo dominando a prateleira. A altura varia levemente por
livro (derivada deterministicamente do slug, não aleatória — senão muda a cada
render), para a estante não parecer um gráfico de barras. Quando `pages` é nulo,
usa o valor mediano do acervo.

**A lombada é gerada, não fotografada.** Nenhuma API de livros fornece imagem de
lombada — só capa frontal. Um `<canvas>` pinta o fundo com `spine_color`, escreve
título e autor na vertical em **Quicksand** (fonte que o site já carrega, então a
estante fica com a cara do resto do site) e adiciona relevo sutil.

Essa limitação técnica virou a regra estética, e ela coincide com o pedido
original: **lidos ficam de lombada na estante; lendo ficam de capa virada na
mesa.**

### Atlas de lombadas

Numa estante você vê apenas lombadas. Se cada livro carregasse também a capa,
seriam ~120 texturas para 60 livros — memória e draw calls demais.

Todas as lombadas vão para **um único atlas de textura**, gerado em canvas. A
estante inteira custa uma textura. A capa real só é baixada quando aquele livro é
aberto. Exceção: os livros de "lendo agora" (1 a 3), que mostram capa e carregam
de imediato.

### Interações

**Hover** — o livro desliza para fora da estante alguns centímetros, com leve
inclinação, e uma etiqueta mostra título, autor e nota em estrelas. Afeto físico,
não glow. **Sem som no hover**: passar o mouse por dezenas de livros com um
clique de madeira em cada um seria insuportável.

**Clique** — a URL muda, a câmera desliza para frente, o livro sai da estante,
gira para a câmera e abre.

> **O texto não é renderizado dentro do 3D.** Texto como textura fica borrado,
> não é selecionável nem copiável, leitor de tela não alcança, e custa caro. O
> livro 3D fornece o *quadro* — papel, sombra, a animação de abrir. Assim que a
> animação assenta, o conteúdo aparece como painel DOM ancorado sobre as
> páginas: nítido, selecionável, rolável, acessível.

Página esquerda: capa, autor, ano, páginas, categoria, tags, nota.
Página direita: o texto pessoal.

**Ordenar a estante** por nota, ano ou categoria — os livros animam para as
posições novas com mola.

**Folha do índice** — objeto físico sobre a mesa. Clicar aproxima a câmera e abre
o painel de filtros. É a navegação que a sala precisa: com 60 livros, achar um
específico orbitando a estante seria ruim. Nesta versão o zoom é funcional e
direto; a coreografia cinematográfica é refinamento posterior, isolado da lógica.

Isso mantém a sala coerente: **toda função tem um objeto físico** — a mesma ideia
que, nos specs futuros, coloca as recomendações de visitantes como uma pilha de
cartas sobre a mesa.

**Ambiência** — luz quente de abajur, LED frio atrás da estante, poeira no facho
de luz, bloom leve. Toggle de lo-fi opcional reutilizando `lib/sound.ts`.

### Câmera

Sem órbita livre: ela deixa ver a parede de trás inacabada e permite a pessoa se
perder. A câmera trafega entre **pontos de vista nomeados** (`geral`, `estante`,
`mesa`, `livro`, `índice`) com interpolação suave; dentro de cada um há órbita
curta e limitada. Sensação de exploração sem achar o fundo do cenário.

### Degradação

Sem WebGL, com `prefers-reduced-motion`, ou GPU fraca detectada: redireciona para
`/livros/lista`. A sala nunca é a única porta.

---

## Dependências novas

Nenhuma delas entra no bundle das rotas existentes.

**Runtime, carregadas só em `/livros`:**

| Pacote | Para quê |
|---|---|
| `three` | O motor 3D |
| `@react-three/fiber` | Ponte React ↔ three |
| `@react-three/drei` | Helpers (câmera, `<Html>`, carregamento de textura) |
| `@react-three/postprocessing` | Bloom — é ele que faz a luz parecer aconchegante |

**Runtime, no bundle geral (pequena):**

| Pacote | Para quê |
|---|---|
| `react-markdown` | Renderizar o campo `review`. Uma resenha precisa no mínimo de negrito, itálico e link; guardar HTML cru no banco seria pior |

**Apenas desenvolvimento, usada só pelo CLI:**

| Pacote | Para quê |
|---|---|
| `sharp` | Redimensionar a capa baixada e extrair a cor dominante para `spine_color` |

`framer-motion` já é dependência do projeto (Quiz, Nuvem de Palavras, Sorteio) e
cobre as animações fora do canvas. Dentro do canvas, a animação é feita no
`useFrame` do R3F.

O CLI usa a `DATABASE_URL` que já existe no `.env.local`. **Nenhuma variável de
ambiente nova é necessária.**

---

## Performance

Metas concretas, para não virar discussão de gosto depois:

- Sala interativa em **até 3s** em conexão boa no desktop.
- **60fps** no desktop; **≥30fps** em celular de linha média.
- `/livros/[slug]` carregada direto: conteúdo visível em **menos de 1s**, sem
  esperar WebGL.

Sustentado por: `three`/R3F carregados só nessa rota (`dynamic`, `ssr: false`),
atlas único de lombadas, capas via `next/image`, DPR limitado, e nenhuma sombra
dinâmica — um plano de sombra de contato entrega o efeito por uma fração do
custo.

---

## Testes

O projeto não tem suite de testes configurada e este spec não introduz uma.

A exceção é o CLI: ele grava dado permanente em produção, e um bug silencioso ali
corrompe o acervo. Portanto a lógica pura fica em `lib/books.ts` — cálculo de
dimensão a partir de páginas, geração de slug, normalização de tag, parsing da
resposta da Open Library — coberta por um `node --test` enxuto.

O resto (cena, animações, layout) se verifica olhando.

---

## Medição

Eventos novos em `utils/analytics.ts`, no padrão existente:

| Evento | Payload | Para quê |
|---|---|---|
| `room_loaded` | tempo até interativo, mobile/desktop | Validar a meta de 3s no mundo real |
| `book_opened` | slug | Quais livros interessam |
| `shelf_sorted` | critério | Se o recurso é usado |
| `index_opened` | filtros aplicados | Se a folha é descoberta |
| `list_fallback` | motivo | Quantos caem no HTML por não rodar a sala — decide se vale investir mais no 3D |

Opcionalmente, adicionar rótulos ao `EVENT_LABELS` em `app/stats/page.tsx`.

---

## Fases

Nenhuma fase depois da 1 bloqueia o site: parando na 1, existe um acervo
funcionando no ar.

1. Tabela, `lib/books.ts`, `lib/book-categories.ts`, CLI, `/livros/lista`,
   `/livros/[slug]`. **Acervo publicado e compartilhável, sem 3D.**
2. Sala mínima: estante, livros de lombada, hover, câmera.
3. Abrir livro: rotas interceptadas, animação, overlay DOM.
4. Mesa com "lendo agora", folha do índice, ordenação.
5. Mobile.
6. **Decoração da sala no estilo do Luiz** — deliberadamente por último, quando
   tudo já funciona. É a única parte que pode ser mexida infinitamente sem
   quebrar nada.

---

## Fora de escopo

Ficam para specs próprios:

- **Comentários de visitantes por livro** (spec 2). Traz um problema que o site
  ainda não tem: conteúdo público de terceiros, ou seja, moderação e spam.
- **"Me recomende um livro"** (spec 3). Mesmo problema.
- **Adapter de Skoob** — investigação futura; o gancho já existe em
  `lib/book-sources/`.
- **Upgrade A2** (sala modelada com baked lighting). O contrato do `Room.tsx`
  existe justamente para permitir isso sem reescrita.

A tabela `casara.books` não muda por causa de nenhum desses.
