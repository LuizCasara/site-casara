# Sala de Leitura 3D — Fase 4 (mesa, folha do índice, ordenação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mesa ganha os livros com status `lendo` (1 a 3), soltos e de capa
virada — diferente da estante, onde os `lido` ficam de lombada. A folha do
índice aparece como objeto físico sobre a mesa: clicar nela aproxima a câmera
(`indice`) e abre um painel com ordenação da estante (nota/ano/categoria) e
filtro (categoria/tag). Reordenar ou filtrar não pede animação nova — os
livros já animam (damp) até a posição recebida por prop desde a fase 2/3,
então só trocar a ordem/composição do array de livros já produz o movimento
"com mola" que o spec pede.

**Architecture:** Mesmo modelo de âncoras nomeadas de `Room.tsx` (fase 2/3),
estendido com `mesa` e `indice`. `DeskBooks.tsx` reaproveita o mesmo `Book.tsx`
da estante (variante de repouso nova, `restVariant='capa'`), então toda a
lógica de abrir/fechar/navegar por clique continua vindo de um único lugar.
`IndexSheet.tsx` é só a superfície clicável 3D; `IndexPanel.tsx` é o painel DOM
com os controles — mesmo par "objeto físico + overlay DOM" já estabelecido
por `Book.tsx`/`BookOverlay.tsx` na fase 3. Ordenação e filtro são funções
puras novas em `lib/livros-shelf.mjs`, testadas com `node --test`; o estado
(`sortCriterio`, `filtros`, `indiceAberto`) vive em `RoomCanvas.tsx`, nunca na
URL — diferente de abrir um livro, isto não precisa de SEO nem de link
compartilhável.

**Tech Stack:** o mesmo das fases 2/3 (Next 15 App Router, R3F, drei,
postprocessing) — nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`
**Planos anteriores:** `docs/superpowers/plans/2026-07-28-acervo-de-livros-fase-1.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-2.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-3.md`

## Global Constraints

- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`.**
- **Imports internos usam o alias `@/`.**
- **O `<Canvas>` continua em `app/livros/layout.tsx`** — esta fase não move
  nem duplica isso.
- **`Room.tsx` continua sem saber que livros existem.** Só ganha mais duas
  âncoras nomeadas (`mesa`, `indice`) e a mobília física (tampo da mesa) que é
  puro cenário — do mesmo jeito que já publica `estante`/`leitura` e a prancha
  da prateleira. Quem lê essas âncoras (`DeskBooks.tsx`, `IndexSheet.tsx`,
  `CameraRig.tsx`) importa `Room.tsx`, nunca o contrário.
- **A capa real só é baixada quando o livro é aberto — EXCEÇÃO explícita do
  spec para esta fase:** *"os livros de 'lendo agora' (1 a 3), que mostram
  capa e carregam de imediato"*. `Book.tsx` ganha um parâmetro pra distinguir
  os dois comportamentos (Task 6).
- **No máximo 1 a 3 livros "lendo agora" simultâneos** (premissa do spec,
  seção "Interações") — `DeskBooks.tsx`/`layoutDeskBooks` assumem isso.
- **Degradação (sem WebGL/`prefers-reduced-motion`/GPU fraca) só redireciona
  pra `/livros/lista` na rota `/livros` em si** — inalterado desde a fase 3.
- **Ordenação/filtro da estante NÃO vão para a URL.** Diferente de abrir um
  livro (que precisa ser linkável/indexável), isto é navegação efêmera dentro
  da sala — estado local em `RoomCanvas.tsx`.
- **Este projeto só cobre com `node --test` lógica pura em `lib/**/*.test.mjs`.**
  Cena, animação e layout de DOM flutuante se verificam olhando.
- **Comentários e textos de interface em português.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/book-dimensions.mjs` | *(modificado)* `toShelfBooks` ganha `category`/`tags`/`year`; nova `layoutDeskBooks` |
| `lib/book-dimensions.test.mjs` | *(modificado)* cobre os campos novos e `layoutDeskBooks` |
| `lib/livros-shelf.mjs` | **novo** — `sortShelfBooks`, `filterShelfBooks`, lógica pura |
| `lib/livros-shelf.test.mjs` | **novo** — `node --test` das duas funções acima |
| `utils/analytics.ts` | *(modificado)* `trackShelfSorted`, `trackIndexOpened` |
| `components/livros/Room.tsx` | *(modificado)* âncoras `mesa`/`indice` + tampo físico da mesa |
| `components/livros/CameraRig.tsx` | *(modificado)* viewpoints `'mesa'` e `'indice'` |
| `components/livros/Book.tsx` | *(modificado)* `restVariant`/`restRotationY`, carga de capa imediata para `'capa'` |
| `components/livros/Bookshelf.tsx` | *(modificado, correção)* casa a lombada do atlas por slug, não por índice — necessário porque a estante agora pode chegar reordenada/filtrada |
| `components/livros/DeskBooks.tsx` | **novo** — livros "lendo agora", soltos e de capa virada sobre a mesa |
| `components/livros/IndexSheet.tsx` | **novo** — a folha física, clicável, sobre a mesa |
| `components/livros/IndexPanel.tsx` | **novo** — painel DOM de ordenação + filtro |
| `components/livros/RoomCanvas.tsx` | *(modificado)* recebe `deskBooks`/`tags`, estado de ordenação/filtro/índice, botão "Mesa", renderiza os componentes novos |
| `app/livros/layout.tsx` | *(modificado)* busca também `status: 'lendo'` e `listarTags()`, inclui `category`/`tags`/`year` na query mapeada |

**Decisão deliberada 1 — `IndexPanel.tsx` em arquivo próprio.** O spec original
lista só `IndexSheet.tsx` na estrutura de arquivos da fase, mas o padrão já
estabelecido na fase 3 é "objeto físico num arquivo, overlay DOM em outro"
(`Book.tsx`/`BookOverlay.tsx`) — o painel de ordenação+filtro é grande o
bastante (duas seções de chips, mais o header) para merecer o mesmo tratamento
em vez de inflar `IndexSheet.tsx` com JSX de DOM que ele não deveria conhecer.

**Decisão deliberada 2 — ordenação e filtro no mesmo painel.** O spec descreve
"ordenar a estante" e "a folha do índice abre o painel de filtros" em frases
separadas, mas ambos resolvem o mesmo problema ("achar um livro específico"
vs. "achar em que ordem olhar pra estante") e o único objeto físico disponível
pra isso é a folha — não faz sentido dois objetos físicos pra duas metades da
mesma tarefa de navegação.

**Decisão deliberada 3 — livro filtrado some sem animação de saída.** Quando
um filtro remove um livro da estante, o componente `Book` correspondente
desmonta direto (o React remove pela `key`), sem transição. Os livros
*restantes* deslizam suavemente pra fechar o espaço (isso sim já é de graça,
via o damp existente), mas o livro que sai não tem uma animação de saída
própria nesta fase — consistente com o próprio spec dizendo, sobre o zoom da
folha do índice, *"nesta versão é funcional e direto; a coreografia
cinematográfica é refinamento posterior"*.

---

### Task 1: `lib/book-dimensions.mjs` — `toShelfBooks` ganha campos novos + `layoutDeskBooks`

**Files:**
- Modify: `lib/book-dimensions.mjs`
- Modify: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Consumes: nada novo
- Produces:
  - `toShelfBooks(...)` agora inclui `category: string`, `tags: string[]`, `year: number | null` no formato que `components/livros/Book.tsx` (Task 6) e `lib/livros-shelf.mjs` (Task 2) consomem
  - `layoutDeskBooks(slugs: string[]) => {slug, x, z, rotationY}[]` — no máximo 3 entradas, determinístico por slug

- [ ] **Step 1: Amplie o teste existente de `toShelfBooks`**

Modify `lib/book-dimensions.test.mjs`, substituindo o teste `toShelfBooks preserva ordem...`:

```js
test('toShelfBooks preserva ordem e preenche thicknessM/heightM/coverPath/category/tags/year', () => {
    const shelf = toShelfBooks([
        {
            slug: 'a', title: 'A', author: 'Fulano', rating: '4.5', pages: 300,
            spine_color: '#ec4899', cover_path: '/livros/capas/a.jpg',
            category: 'ficcao', tags: ['aventura'], year: 2010,
        },
        {
            slug: 'b', title: 'B', author: null, rating: null, pages: null,
            spine_color: null, cover_path: null,
            category: 'filosofia', tags: [], year: null,
        },
    ]);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0].slug, 'a');
    assert.equal(shelf[0].coverPath, '/livros/capas/a.jpg');
    assert.deepEqual(shelf[0].tags, ['aventura']);
    assert.equal(shelf[0].year, 2010);
    assert.equal(shelf[1].slug, 'b');
    assert.ok(shelf[0].thicknessM > 0);
    assert.ok(shelf[1].thicknessM > 0, 'livro sem pages usa a mediana do acervo, não quebra');
    assert.equal(shelf[1].spineColor, null);
    assert.equal(shelf[1].coverPath, null);
    assert.deepEqual(shelf[1].tags, []);
    assert.equal(shelf[1].year, null);
});
```

E adicione, no mesmo arquivo, o teste de `layoutDeskBooks` (também ajuste o
import no topo do arquivo para incluir `layoutDeskBooks`):

```js
test('layoutDeskBooks é determinístico e limita a 3 livros', () => {
    const layout1 = layoutDeskBooks(['a', 'b', 'c', 'd']);
    const layout2 = layoutDeskBooks(['a', 'b', 'c', 'd']);
    assert.equal(layout1.length, 3, 'no maximo 3 — spec preve 1 a 3 livros lendo agora');
    assert.deepEqual(layout1, layout2, 'mesma entrada tem que dar sempre a mesma disposicao');
    assert.notEqual(layout1[0].x, layout1[1].x, 'livros ficam espalhados, nao empilhados no mesmo ponto');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha em `shelf[0].tags`/`shelf[0].year` (`undefined`) e em
`Cannot find export layoutDeskBooks`.

- [ ] **Step 3: Implementar**

Modify `lib/book-dimensions.mjs`, a função `toShelfBooks`:

```js
export function toShelfBooks(books) {
    const mediana = medianPages(books.map((b) => b.pages));
    return books.map((b) => ({
        slug: b.slug,
        title: b.title,
        author: b.author ?? null,
        rating: b.rating ?? null,
        spineColor: b.spine_color ?? null,
        coverPath: b.cover_path ?? null,
        category: b.category,
        tags: b.tags ?? [],
        year: b.year ?? null,
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}
```

Adicione, no final do arquivo, `layoutDeskBooks` (reaproveita `hashString01`,
já definida mais acima no mesmo módulo, do mesmo jeito que `bookHeightM` já
faz):

```js
const DESK_BASE_OFFSETS = [
    {x: 0, z: 0},
    {x: -0.11, z: 0.035},
    {x: 0.1, z: -0.03},
];
const DESK_ROTATION_VARIANCE_RAD = 0.3;
const DESK_MAX_BOOKS = DESK_BASE_OFFSETS.length;

/**
 * Posição de cada livro "lendo agora" sobre a mesa — espalhados, não em fila
 * como a estante. Determinístico por slug (mesmo espírito de bookHeightM): a
 * disposição não pode mudar a cada render. Limitado a DESK_MAX_BOOKS porque o
 * spec prevê 1 a 3 livros "lendo agora" simultâneos; um quarto livro (dado
 * incomum) simplesmente não aparece na mesa, sem erro.
 */
export function layoutDeskBooks(slugs) {
    return slugs.slice(0, DESK_MAX_BOOKS).map((slug, i) => {
        const base = DESK_BASE_OFFSETS[i];
        const t = hashString01(`${slug}:desk-rotation`);
        const rotationY = (t * 2 - 1) * DESK_ROTATION_VARIANCE_RAD;
        return {slug, x: base.x, z: base.z, rotationY};
    });
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs
git commit -m "feat(livros): toShelfBooks inclui category/tags/year e adiciona layoutDeskBooks"
```

---

### Task 2: `lib/livros-shelf.mjs` — ordenação e filtro da estante

**Files:**
- Create: `lib/livros-shelf.mjs`
- Create: `lib/livros-shelf.test.mjs`

**Interfaces:**
- Consumes: array no formato de saída de `toShelfBooks` (Task 1) — precisa de
  `slug`, `title`, `rating`, `year`, `category`, `tags`
- Produces:
  - `SORT_CRITERIA: string[]` — `['padrao', 'nota', 'ano', 'categoria']`
  - `sortShelfBooks(shelfBooks, criterio) => shelfBooks (novo array, mesma forma)`
  - `filterShelfBooks(shelfBooks, {categoria, tag}) => shelfBooks (subconjunto)`

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/livros-shelf.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortShelfBooks, filterShelfBooks} from './livros-shelf.mjs';

const LIVROS = [
    {slug: 'a', title: 'Alfa', rating: '3.0', year: 2010, category: 'ficcao', tags: ['aventura']},
    {slug: 'b', title: 'Beta', rating: '4.5', year: 2020, category: 'filosofia', tags: ['estoicismo', 'aventura']},
    {slug: 'c', title: 'Gama', rating: null, year: 2005, category: 'ficcao', tags: []},
];

test('sortShelfBooks "padrao" preserva a ordem de entrada', () => {
    const resultado = sortShelfBooks(LIVROS, 'padrao');
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'b', 'c']);
});

test('sortShelfBooks "nota" ordena por rating decrescente, tratando null como 0', () => {
    const resultado = sortShelfBooks(LIVROS, 'nota');
    assert.deepEqual(resultado.map((l) => l.slug), ['b', 'a', 'c']);
});

test('sortShelfBooks "ano" ordena por ano decrescente', () => {
    const resultado = sortShelfBooks(LIVROS, 'ano');
    assert.deepEqual(resultado.map((l) => l.slug), ['b', 'a', 'c']);
});

test('sortShelfBooks "categoria" agrupa por categoria e desempata por título', () => {
    const resultado = sortShelfBooks(LIVROS, 'categoria');
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'c', 'b']);
});

test('sortShelfBooks não modifica o array original', () => {
    const copiaOriginal = [...LIVROS];
    sortShelfBooks(LIVROS, 'nota');
    assert.deepEqual(LIVROS, copiaOriginal);
});

test('filterShelfBooks sem filtros devolve tudo', () => {
    assert.equal(filterShelfBooks(LIVROS, {categoria: null, tag: null}).length, 3);
});

test('filterShelfBooks por categoria', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: 'ficcao', tag: null});
    assert.deepEqual(resultado.map((l) => l.slug), ['a', 'c']);
});

test('filterShelfBooks por tag', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: null, tag: 'estoicismo'});
    assert.deepEqual(resultado.map((l) => l.slug), ['b']);
});

test('filterShelfBooks combina categoria e tag (AND)', () => {
    const resultado = filterShelfBooks(LIVROS, {categoria: 'ficcao', tag: 'aventura'});
    assert.deepEqual(resultado.map((l) => l.slug), ['a']);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha com `Cannot find module './livros-shelf.mjs'`.

- [ ] **Step 3: Implementar**

Create `lib/livros-shelf.mjs`:

```js
/**
 * Ordenação e filtro da estante dentro da sala 3D — lógica pura, sem
 * dependência de three/R3F, testável com node --test (mesmo espírito de
 * lib/livros-routing.mjs).
 *
 * Ambas operam sobre o array já convertido por toShelfBooks
 * (lib/book-dimensions.mjs) e devolvem um array na mesma forma — quem chama
 * (RoomCanvas.tsx) passa o resultado direto pra <Bookshelf/>, que recalcula
 * posições a partir da ordem do array. É assim que a "animação com mola" da
 * reordenação e o fechamento de espaço da filtragem saem de graça: Book.tsx
 * já anima (damp) até a posição recebida por prop a cada frame, então só
 * trocar a ordem/composição do array já produz o movimento.
 */

export const SORT_CRITERIA = ['padrao', 'nota', 'ano', 'categoria'];

export function sortShelfBooks(shelfBooks, criterio) {
    if (criterio === 'nota') {
        return [...shelfBooks].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    if (criterio === 'ano') {
        return [...shelfBooks].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    }
    if (criterio === 'categoria') {
        return [...shelfBooks].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
    }
    return shelfBooks; // 'padrao' — mantém a ordem que já veio do banco (listarLivros)
}

export function filterShelfBooks(shelfBooks, filtros) {
    return shelfBooks.filter((b) => {
        if (filtros.categoria && b.category !== filtros.categoria) return false;
        if (filtros.tag && !b.tags.includes(filtros.tag)) return false;
        return true;
    });
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add lib/livros-shelf.mjs lib/livros-shelf.test.mjs
git commit -m "feat(livros): adiciona sortShelfBooks e filterShelfBooks"
```

---

### Task 3: `utils/analytics.ts` — `trackShelfSorted` e `trackIndexOpened`

**Files:**
- Modify: `utils/analytics.ts`

**Interfaces:**
- Consumes: nada novo
- Produces: `trackShelfSorted(criterio: string)`, `trackIndexOpened(categoria: string | null, tag: string | null)`

- [ ] **Step 1: Adicionar ao final da seção "─── Livros ───"**

Modify `utils/analytics.ts`:

```ts
export const trackShelfSorted = (criterio: string) =>
  trackEvent('shelf_sorted', { criterio });

export const trackIndexOpened = (categoria: string | null, tag: string | null) =>
  trackEvent('index_opened', { categoria: categoria ?? '', tag: tag ?? '' });
```

- [ ] **Step 2: Commit**

```bash
git add utils/analytics.ts
git commit -m "feat(livros): adiciona trackShelfSorted e trackIndexOpened"
```

---

### Task 4: `Room.tsx` — âncoras `mesa`/`indice` + tampo físico

**Files:**
- Modify: `components/livros/Room.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces: `ROOM_ANCHORS.mesa`, `ROOM_ANCHORS.indice` — posições/rotações que `DeskBooks.tsx`, `IndexSheet.tsx` e `CameraRig.tsx` (Task 5) vão ler

- [ ] **Step 1: Reescreva `components/livros/Room.tsx` por completo**

```tsx
'use client';

import {Sparkles} from '@react-three/drei';

export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    leitura: {
        position: [0, 1.3, 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    // Deslocada pro lado (x=1.4) pra não brigar de espaço com a estante
    // (z=-1.4) nem com o ponto de leitura (x=0, z=0.6). Rotação -0.35 rad
    // angula o tampo levemente em direção ao centro da sala, então a mesa
    // "olha" pra quem entra em vez de ficar de perfil.
    mesa: {
        position: [1.4, 0.75, 0.9] as [number, number, number],
        rotation: [0, -0.35, 0] as [number, number, number],
    },
    // Sobre o tampo da mesa (y = mesa.y + metade da espessura do tampo),
    // levemente fora do centro — não perfeitamente alinhada, pra parecer um
    // objeto pousado, não um ícone de menu.
    indice: {
        position: [1.25, 0.775, 1.05] as [number, number, number],
        rotation: [-Math.PI / 2, 0, 0.25] as [number, number, number],
    },
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const SHELF_BOARD_COLOR = '#1f1713';

/**
 * Cenário puro — não sabe que livros existem. Publica ROOM_ANCHORS
 * (posição/rotação) para que Bookshelf.tsx, DeskBooks.tsx, IndexSheet.tsx e
 * CameraRig.tsx se posicionem a partir daqui, sem nenhuma lógica de livro
 * vazar para este arquivo.
 */
export default function Room() {
    const estante = ROOM_ANCHORS.estante;
    const mesa = ROOM_ANCHORS.mesa;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[6, 6]}/>
                <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9}/>
            </mesh>

            <mesh position={[0, 1.5, -1.6]}>
                <planeGeometry args={[6, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/* Prancha física da prateleira — os livros assentam no topo dela. */}
            <mesh position={[estante.position[0], estante.position[1] - 0.02, estante.position[2]]}>
                <boxGeometry args={[1.4, 0.04, 0.2]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>

            {/*
              Mesa física — o tampo onde DeskBooks.tsx e IndexSheet.tsx
              assentam. Uma perna central é suficiente: não é o foco visual
              da cena, e o spec pede sala low-poly montada com primitivas.
            */}
            <mesh position={[mesa.position[0], mesa.position[1] - 0.02, mesa.position[2]]} rotation={mesa.rotation} receiveShadow>
                <boxGeometry args={[0.7, 0.04, 0.45]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>
            <mesh position={[mesa.position[0], (mesa.position[1] - 0.02) / 2, mesa.position[2]]} rotation={mesa.rotation}>
                <boxGeometry args={[0.08, mesa.position[1] - 0.02, 0.08]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.8}/>
            </mesh>

            {/*
              Intensidades em candela — o three.js (r155+) usa luz fisicamente
              correta por padrão, então os valores "de sensação" de versões
              antigas (ex.: 3-6) ficam quase invisíveis. 40/25 aqui é o que
              realmente ilumina uma sala pequena a poucos metros de distância.
            */}
            <pointLight position={[1.3, 1.7, 0.6]} color="#ffb877" intensity={40} distance={6} decay={2}/>
            <pointLight position={[0, 2.1, -1.55]} color="#9fd8ff" intensity={25} distance={5} decay={2}/>
            <hemisphereLight color="#8899aa" groundColor="#1a1410" intensity={0.6}/>
            <ambientLight intensity={0.15}/>

            <Sparkles count={40} scale={[2, 2, 2]} position={[1, 1.5, 0.3]} size={2} speed={0.15} color="#ffd9a0" opacity={0.35}/>
        </group>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/Room.tsx
git commit -m "feat(livros): adiciona ancoras mesa/indice e o tampo fisico da mesa"
```

---

### Task 5: `CameraRig.tsx` — viewpoints `'mesa'` e `'indice'`

**Files:**
- Modify: `components/livros/CameraRig.tsx`

**Interfaces:**
- Consumes: `ROOM_ANCHORS.mesa`/`ROOM_ANCHORS.indice` (Task 4)
- Produces: `Viewpoint = 'geral' | 'estante' | 'mesa' | 'livro' | 'indice'`

- [ ] **Step 1: Reescreva `components/livros/CameraRig.tsx` por completo**

```tsx
'use client';

import {useEffect, useRef} from 'react';
import {CameraControls} from '@react-three/drei';
import {ROOM_ANCHORS} from '@/components/livros/Room';

export type Viewpoint = 'geral' | 'estante' | 'mesa' | 'livro' | 'indice';

type ViewpointConfig = {
    camera: [number, number, number];
    target: [number, number, number];
    minAzimuth: number;
    maxAzimuth: number;
    minPolar: number;
    maxPolar: number;
};

const estanteZ = ROOM_ANCHORS.estante.position[2];
const leitura = ROOM_ANCHORS.leitura.position;
const mesaPos = ROOM_ANCHORS.mesa.position;
const indicePos = ROOM_ANCHORS.indice.position;

const VIEWPOINTS: Record<Viewpoint, ViewpointConfig> = {
    geral: {
        camera: [0, 1.6, 2.6],
        target: [0, 1.1, estanteZ],
        minAzimuth: -0.5, maxAzimuth: 0.5,
        minPolar: 1.1, maxPolar: 1.6,
    },
    estante: {
        camera: [0, 1.1, 0.3],
        target: [0, 1.0, estanteZ],
        minAzimuth: -0.25, maxAzimuth: 0.25,
        minPolar: 1.3, maxPolar: 1.75,
    },
    mesa: {
        camera: [mesaPos[0] + 0.5, mesaPos[1] + 0.5, mesaPos[2] + 0.7],
        target: [mesaPos[0], mesaPos[1], mesaPos[2]],
        minAzimuth: -0.4, maxAzimuth: 0.4,
        minPolar: 1.1, maxPolar: 1.6,
    },
    livro: {
        camera: [leitura[0], leitura[1] + 0.05, leitura[2] + 0.9],
        target: [leitura[0], leitura[1], leitura[2]],
        minAzimuth: -0.2, maxAzimuth: 0.2,
        minPolar: 1.35, maxPolar: 1.6,
    },
    // Câmera mais "de cima" que as outras (minPolar/maxPolar menores) porque
    // a folha está deitada no tampo — olhar quase reto pra baixo é o único
    // jeito de ler algo escrito nela.
    indice: {
        camera: [indicePos[0], indicePos[1] + 0.35, indicePos[2] + 0.3],
        target: [indicePos[0], indicePos[1], indicePos[2]],
        minAzimuth: -0.15, maxAzimuth: 0.15,
        minPolar: 0.9, maxPolar: 1.2,
    },
};

export default function CameraRig({viewpoint, animate = true}: {viewpoint: Viewpoint; animate?: boolean}) {
    const controlsRef = useRef<CameraControls>(null);
    const v = VIEWPOINTS[viewpoint];

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint]);

    return (
        <CameraControls
            ref={controlsRef}
            minAzimuthAngle={v.minAzimuth}
            maxAzimuthAngle={v.maxAzimuth}
            minPolarAngle={v.minPolar}
            maxPolarAngle={v.maxPolar}
            dollySpeed={0}
            truckSpeed={0}
        />
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/CameraRig.tsx
git commit -m "feat(livros): adiciona viewpoints mesa e indice na camera"
```

---

### Task 6: `Book.tsx` — variante de repouso `'capa'` para os livros da mesa

**Files:**
- Modify: `components/livros/Book.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces:
  - `ShelfBookData` ganha `category: string`, `tags: string[]`, `year: number | null`
  - `Book` ganha as props opcionais `restVariant?: 'lombada' | 'capa'` (default `'lombada'`) e `restRotationY?: number` (default `0`)
  - Quando `restVariant === 'capa'`, a capa real carrega imediatamente
    (não só quando `isOpen`), e o repouso do livro fica quase deitado,
    virado de capa pra cima, em vez de em pé mostrando a lombada

- [ ] **Step 1: Reescreva `components/livros/Book.tsx` por completo**

```tsx
'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useRouter} from 'next/navigation';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import StarRating from '@/components/livros/StarRating';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {BOOK_DEPTH_M} from '@/lib/book-dimensions.mjs';

// Ordem de materiais do BoxGeometry: [+x, -x, +y, -y, +z, -z].
// A lombada (visível na estante) é a face +z; a capa frontal (visível só
// quando o livro abre e gira 180°, ou de imediato nos livros da mesa) é a
// face -z, oposta.
const SPINE_FACE_INDEX = 4;
const COVER_FACE_INDEX = 5;
const FALLBACK_SPINE_COLOR = '#4b4b4b';
const HOVER_SLIDE_M = 0.035;
const HOVER_TILT_RAD = 0.12;
const HOVER_LERP_SPEED = 8;
const OPEN_LERP_SPEED = 3;
const OPEN_TILT_RAD = -0.35;
// Livro "fora do lugar" além desta distância (aberto ou voltando a fechar)
// anima na velocidade lenta de abertura; hover puro usa a velocidade rápida.
const DESLOCAMENTO_GRANDE_M = 0.1;
// Quase deitado (-90° seria totalmente plano) — o suficiente pra "capa
// virada" ficar legível em ângulo, sem virar um adesivo grudado na mesa.
const DESK_REST_TILT_RAD = -1.3;

// Área de detecção de hover/clique maior que o volume visível da lombada —
// com poucos livros no acervo (espessura mínima de 12mm), a malha real ocupa
// poucos pixels na tela e fica quase impossível de acertar com um mouse de
// verdade (confirmado testando manualmente). Uma malha invisível maior por
// trás resolve isso sem mudar a espessura visual.
// Contrapartida aceita: com um acervo bem mais denso (~51+ livros lado a
// lado), esse mínimo de largura pode fazer hitboxes de vizinhos se
// sobreporem um pouco perto da borda — revisitar então se virar problema.
const HITBOX_MIN_THICKNESS_M = 0.05;
const HITBOX_HEIGHT_PADDING_M = 0.06;
const HITBOX_DEPTH_PADDING_M = 0.08;

const OPEN_LOCAL_POSITION: [number, number, number] = [
    ROOM_ANCHORS.leitura.position[0] - ROOM_ANCHORS.estante.position[0],
    ROOM_ANCHORS.leitura.position[1] - ROOM_ANCHORS.estante.position[1],
    ROOM_ANCHORS.leitura.position[2] - ROOM_ANCHORS.estante.position[2],
];

export type ShelfBookData = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    thicknessM: number;
    heightM: number;
    spineColor: string | null;
    coverPath: string | null;
    category: string;
    tags: string[];
    year: number | null;
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
    isOpen: boolean;
    animate: boolean;
    restVariant?: 'lombada' | 'capa';
    restRotationY?: number;
};

/** Remapeia as UVs padrão (0..1) de uma face do BoxGeometry para um sub-retângulo do atlas. */
function setBoxFaceUV(geometry: THREE.BoxGeometry, faceIndex: number, u0: number, u1: number, v0: number, v1: number) {
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const base = faceIndex * 4; // 4 vértices por face
    for (let i = 0; i < 4; i++) {
        const vi = base + i;
        const oldU = uv.getX(vi);
        const oldV = uv.getY(vi);
        uv.setXY(vi, u0 + oldU * (u1 - u0), v0 + oldV * (v1 - v0));
    }
    uv.needsUpdate = true;
}

export default function Book({
    book, position, atlasTexture, uvRange, isOpen, animate,
    restVariant = 'lombada', restRotationY = 0,
}: BookProps) {
    const router = useRouter();
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);
    const snappedRef = useRef(false);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1]);

    const hitboxGeometry = useMemo(() => new THREE.BoxGeometry(
        Math.max(book.thicknessM, HITBOX_MIN_THICKNESS_M),
        book.heightM + HITBOX_HEIGHT_PADDING_M,
        BOOK_DEPTH_M + HITBOX_DEPTH_PADDING_M,
    ), [book.thicknessM, book.heightM]);

    // A capa real normalmente só é baixada quando o livro é aberto — ver
    // spec, "Atlas de lombadas": a API de covers da Open Library tem rate
    // limit, então a estante inteira nunca carrega 51 capas de uma vez.
    // Exceção explícita do spec: os livros "lendo agora" (restVariant
    // 'capa') mostram a capa de imediato — são no máximo 1 a 3, o custo é
    // desprezível.
    useEffect(() => {
        const deveCarregar = isOpen || restVariant === 'capa';
        if (!deveCarregar || !book.coverPath || coverTexture) return;
        let cancelado = false;
        new THREE.TextureLoader().load(book.coverPath, (tex) => {
            if (cancelado) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            setCoverTexture(tex);
        });
        return () => {
            cancelado = true;
        };
    }, [isOpen, restVariant, book.coverPath, coverTexture]);

    const materials = useMemo(() => {
        const corCapa = book.spineColor || FALLBACK_SPINE_COLOR;
        const materialCapa = new THREE.MeshStandardMaterial({color: corCapa, roughness: 0.8});
        const materialLombada = new THREE.MeshStandardMaterial({map: atlasTexture, roughness: 0.7});
        const materialCapaFrontal = coverTexture
            ? new THREE.MeshStandardMaterial({map: coverTexture, roughness: 0.6})
            : materialCapa;
        const lista = [materialCapa, materialCapa, materialCapa, materialCapa, materialLombada, materialCapa];
        lista[COVER_FACE_INDEX] = materialCapaFrontal;
        return lista;
    }, [book.spineColor, atlasTexture, coverTexture]);

    // Nav direta a /livros/<slug> (link externo): o livro já nasce aberto,
    // sem animação — não houve clique prévio que a justifique (ver spec).
    useEffect(() => {
        if (isOpen && !animate && !snappedRef.current && groupRef.current) {
            groupRef.current.position.set(...OPEN_LOCAL_POSITION);
            groupRef.current.rotation.set(OPEN_TILT_RAD, Math.PI, 0);
            snappedRef.current = true;
        }
    }, [isOpen, animate]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        if (isOpen && !animate && snappedRef.current) return; // já encaixado, nada a animar

        // O repouso ("fechado") não é a origem do grupo — é a posição da prop
        // `position`, que é diferente por livro (slot na prateleira/mesa).
        // Usar 0 aqui faria todo livro derivar pra origem do grupo pai a cada
        // frame.
        const distanciaDoRepouso = groupRef.current.position.distanceTo(
            new THREE.Vector3(position[0], position[1], position[2]),
        );
        const velocidade = (isOpen || distanciaDoRepouso > DESLOCAMENTO_GRANDE_M) ? OPEN_LERP_SPEED : HOVER_LERP_SPEED;

        const emCapa = restVariant === 'capa';
        const restRotX = emCapa ? DESK_REST_TILT_RAD : 0;
        const restRotYFinal = emCapa ? Math.PI + restRotationY : 0;

        const alvoX = isOpen ? OPEN_LOCAL_POSITION[0] : position[0];
        const alvoY = isOpen ? OPEN_LOCAL_POSITION[1] : position[1];
        const alvoZ = isOpen ? OPEN_LOCAL_POSITION[2] : position[2] + (!emCapa && hovered ? HOVER_SLIDE_M : 0);
        const alvoRotX = isOpen ? OPEN_TILT_RAD : (restRotX + (!emCapa && hovered ? -HOVER_TILT_RAD : 0));
        const alvoRotY = isOpen ? Math.PI : restRotYFinal;

        groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, alvoX, velocidade, delta);
        groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, alvoY, velocidade, delta);
        groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, alvoZ, velocidade, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, alvoRotX, velocidade, delta);
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, alvoRotY, velocidade, delta);
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={(e) => {
                if (isOpen) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isOpen) return;
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (isOpen) return;
                e.stopPropagation();
                router.push(`/livros/${book.slug}`);
            }}
        >
            <mesh geometry={geometry} material={materials}/>
            <mesh geometry={hitboxGeometry}>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>
            {hovered && !isOpen && (
                <Html position={[0, book.heightM / 2 + 0.08, 0]} center distanceFactor={6} occlude>
                    <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-3 py-2 text-center text-white shadow-lg backdrop-blur-sm">
                        <p className="text-sm font-bold">{book.title}</p>
                        {book.author && <p className="text-xs opacity-80">{book.author}</p>}
                        <StarRating nota={book.rating} tamanho="justify-center text-xs"/>
                    </div>
                </Html>
            )}
        </group>
    );
}
```

> **Nota para a verificação visual (Task 13):** o offset do tooltip
> (`Html position={[0, heightM/2 + 0.08, 0]}`) é local ao grupo, que agora
> pode estar rotacionado ~-1.3 rad em X para os livros da mesa. O tooltip
> ainda aparece ao passar o mouse, só que não necessariamente "acima" no
> sentido da tela — ajustar o offset ali (não neste arquivo) se ficar
> estranho olhando.

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: erros em `Bookshelf.tsx` (chama `<Book>` sem os campos novos de
`ShelfBookData` vindos de `shelfBooks`, que ainda não foram propagados) —
normal, resolvido nas Tasks 7-11.

- [ ] **Step 3: Commit**

```bash
git add components/livros/Book.tsx
git commit -m "feat(livros): Book ganha restVariant capa para os livros da mesa"
```

---

### Task 7: `Bookshelf.tsx` — casa a lombada do atlas por slug (correção necessária)

**Por que esta correção é necessária agora:** desde a fase 2, `Bookshelf.tsx`
casava `atlas.layout.spines[i]` com `shelfBooks[i]` pelo **índice** — inofensivo
até aqui porque o array sempre chegava na mesma ordem em que o atlas foi
gerado. A partir da Task 11, `RoomCanvas.tsx` passa pra `<Bookshelf/>` um
array **reordenado** (`sortShelfBooks`) e **filtrado** (`filterShelfBooks`),
enquanto o atlas continua sendo gerado uma vez só, na ordem original. Casar
por índice depois disso pintaria a lombada errada em cada livro. Casar por
`slug` (que o atlas já carrega em cada entrada de `spines`) resolve para
qualquer ordem/subconjunto.

**Files:**
- Modify: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: `ShelfBookData` (Task 6), `SpineAtlas` (`atlas.layout.spines[].slug` já existe, ver `lib/book-dimensions.mjs`/`lib/spine-canvas.ts`)
- Produces: `Bookshelf({shelfBooks, atlas, openSlug, animate})` — assinatura inalterada

- [ ] **Step 1: Modifique `components/livros/Bookshelf.tsx`**

```tsx
'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import type {SpineAtlas} from '@/lib/spine-canvas';

const GAP_M = 0.003;

type BookshelfProps = {
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
};

export default function Bookshelf({shelfBooks, atlas, openSlug, animate}: BookshelfProps) {
    const larguraTotal = shelfBooks.reduce((soma, b) => soma + b.thicknessM + GAP_M, 0) - GAP_M;

    let xAtual = -larguraTotal / 2;
    const posicoes = shelfBooks.map((b) => {
        const x = xAtual + b.thicknessM / 2;
        xAtual += b.thicknessM + GAP_M;
        return x;
    });

    const anchor = ROOM_ANCHORS.estante;
    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original — ver nota da Task 7 no plano da fase 4.
    const spineBySlug = new Map(atlas.layout.spines.map((s) => [s.slug, s]));

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {shelfBooks.map((book, i) => {
                const spine = spineBySlug.get(book.slug);
                if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[posicoes[i], book.heightM / 2, 0]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: spine.u0, u1: spine.u1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                    />
                );
            })}
        </group>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "fix(livros): Bookshelf casa a lombada do atlas por slug, nao por indice"
```

---

### Task 8: `DeskBooks.tsx` — livros "lendo agora" sobre a mesa

**Files:**
- Create: `components/livros/DeskBooks.tsx`

**Interfaces:**
- Consumes: `ShelfBookData` (Task 6), `layoutDeskBooks` (Task 1), `ROOM_ANCHORS.mesa` (Task 4)
- Produces: `DeskBooks({deskBooks, atlas, openSlug, animate})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {layoutDeskBooks} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

// Altura do centro do livro deitado acima do tampo — metade da espessura do
// tampo (0.02m) mais uma folga pequena pra não cravar dentro da madeira.
const DESK_BOOK_Y_OFFSET_M = 0.05;

type DeskBooksProps = {
    deskBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
};

/**
 * Livros com status 'lendo' — soltos sobre a mesa, de capa virada (não de
 * lombada como na estante). `atlasTexture`/`uvRange` ainda são exigidos por
 * Book.tsx (usados só na face da lombada, que aqui nunca fica visível de
 * propósito — o livro descansa virado de capa pra cima), então passamos o
 * mesmo atlas da estante e um UV qualquer; nenhum atlas extra é gerado só
 * pra isto.
 */
export default function DeskBooks({deskBooks, atlas, openSlug, animate}: DeskBooksProps) {
    const anchor = ROOM_ANCHORS.mesa;
    const layout = layoutDeskBooks(deskBooks.map((b) => b.slug));

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {deskBooks.map((book) => {
                const slot = layout.find((l) => l.slug === book.slug);
                if (!slot) return null; // acervo com mais de 3 'lendo' — ver layoutDeskBooks
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[slot.x, DESK_BOOK_Y_OFFSET_M, slot.z]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: 0, u1: 1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        restVariant="capa"
                        restRotationY={slot.rotationY}
                    />
                );
            })}
        </group>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/DeskBooks.tsx
git commit -m "feat(livros): adiciona DeskBooks para os livros lendo agora"
```

---

### Task 9: `IndexSheet.tsx` — a folha física, clicável, sobre a mesa

**Files:**
- Create: `components/livros/IndexSheet.tsx`

**Interfaces:**
- Consumes: `ROOM_ANCHORS.indice` (Task 4)
- Produces: `IndexSheet({onOpen})` — mesh 3D clicável; não sabe nada sobre filtro/ordenação, só avisa o pai (`RoomCanvas.tsx`, Task 11) que foi clicada

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {useState} from 'react';
import {ROOM_ANCHORS} from '@/components/livros/Room';

const SHEET_COLOR = '#e8e2d5';
const SHEET_HOVER_LIFT_M = 0.01;

/**
 * A folha do índice — objeto físico sobre a mesa (ver spec, "Interações").
 * Clicar chama `onOpen`; RoomCanvas.tsx decide o que isso significa (trocar
 * viewpoint pra 'indice' e mostrar o IndexPanel). Este componente não sabe
 * nada sobre filtros/ordenação — só é a superfície clicável.
 */
export default function IndexSheet({onOpen}: {onOpen: () => void}) {
    const anchor = ROOM_ANCHORS.indice;
    const [hovered, setHovered] = useState(false);
    const y = anchor.position[1] + (hovered ? SHEET_HOVER_LIFT_M : 0);

    return (
        <mesh
            position={[anchor.position[0], y, anchor.position[2]]}
            rotation={anchor.rotation}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                e.stopPropagation();
                onOpen();
            }}
        >
            <planeGeometry args={[0.18, 0.24]}/>
            <meshStandardMaterial color={SHEET_COLOR} roughness={0.95}/>
        </mesh>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/IndexSheet.tsx
git commit -m "feat(livros): adiciona IndexSheet, a folha clicavel sobre a mesa"
```

---

### Task 10: `IndexPanel.tsx` — painel DOM de ordenação e filtro

**Files:**
- Create: `components/livros/IndexPanel.tsx`

**Interfaces:**
- Consumes: `CATEGORIES` de `@/lib/book-categories.mjs`; `SORT_CRITERIA` de `@/lib/livros-shelf.mjs` (Task 2); `corDeTextoSobre` de `@/lib/contraste.mjs`
- Produces: `IndexPanel({tags, sortCriterio, onSortChange, filtros, onFilterChange, onClose})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {CATEGORIES} from '@/lib/book-categories.mjs';
import {SORT_CRITERIA} from '@/lib/livros-shelf.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';

const SORT_LABELS: Record<string, string> = {
    padrao: 'Padrão',
    nota: 'Nota',
    ano: 'Ano',
    categoria: 'Categoria',
};

type IndiceFiltros = {categoria: string | null; tag: string | null};

type IndexPanelProps = {
    tags: string[];
    sortCriterio: string;
    onSortChange: (criterio: string) => void;
    filtros: IndiceFiltros;
    onFilterChange: (filtros: IndiceFiltros) => void;
    onClose: () => void;
};

export default function IndexPanel({tags, sortCriterio, onSortChange, filtros, onFilterChange, onClose}: IndexPanelProps) {
    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
            <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl
                            bg-black/70 p-6 shadow-2xl backdrop-blur-md">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
                    aria-label="Fechar"
                >
                    ✕ fechar
                </button>

                <h2 className="mb-4 text-lg font-bold text-white">Índice</h2>

                <div className="mb-5">
                    <p className="mb-2 text-xs font-bold uppercase text-white/50">Ordenar por</p>
                    <div className="flex flex-wrap gap-2">
                        {SORT_CRITERIA.map((criterio: string) => (
                            <button
                                key={criterio}
                                onClick={() => onSortChange(criterio)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    sortCriterio === criterio
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                            >
                                {SORT_LABELS[criterio]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-5">
                    <p className="mb-2 text-xs font-bold uppercase text-white/50">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c: {id: string; nome: string; cor: string}) => {
                            const ativo = filtros.categoria === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onFilterChange({
                                        categoria: ativo ? null : c.id,
                                        tag: filtros.tag,
                                    })}
                                    className="rounded-full px-3 py-1 text-xs font-medium transition"
                                    style={ativo
                                        ? {backgroundColor: c.cor, color: corDeTextoSobre(c.cor)}
                                        : {backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)'}}
                                >
                                    {c.nome}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {tags.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase text-white/50">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => onFilterChange({
                                        categoria: filtros.categoria,
                                        tag: filtros.tag === t ? null : t,
                                    })}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        filtros.tag === t
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/IndexPanel.tsx
git commit -m "feat(livros): adiciona IndexPanel com ordenacao e filtro"
```

---

### Task 11: `RoomCanvas.tsx` — liga mesa, índice, ordenação e filtro

**Files:**
- Modify: `components/livros/RoomCanvas.tsx`

**Interfaces:**
- Consumes: `sortShelfBooks`/`filterShelfBooks` (Task 2); `trackShelfSorted`/`trackIndexOpened` (Task 3); `DeskBooks` (Task 8); `IndexSheet` (Task 9); `IndexPanel` (Task 10)
- Produces:
  - `ShelvedBookInput` ganha `category: string`, `tags: string[]`, `year: number | null`
  - `RoomCanvasProps` ganha `deskBooks: ShelvedBookInput[]` e `tags: string[]`

- [ ] **Step 1: Reescreva `components/livros/RoomCanvas.tsx` por completo**

```tsx
'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import DeskBooks from '@/components/livros/DeskBooks';
import IndexSheet from '@/components/livros/IndexSheet';
import IndexPanel from '@/components/livros/IndexPanel';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {sortShelfBooks, filterShelfBooks} from '@/lib/livros-shelf.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {
    trackRoomLoaded, trackListFallback, trackBookOpened,
    trackShelfSorted, trackIndexOpened,
} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
    cover_path: string | null;
    category: string;
    tags: string[];
    year: number | null;
};

export type LivrosMode = {kind: 'sala'} | {kind: 'livro'; slug: string};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
    deskBooks: ShelvedBookInput[];
    tags: string[];
    mode: LivrosMode;
};

type IndiceFiltros = {categoria: string | null; tag: string | null};

/**
 * Heurística deliberadamente simples: não há um jeito confiável de medir GPU
 * pelo browser sem WebGL já ativo, então poucos núcleos de CPU é o sinal mais
 * barato de aparelho fraco. Pode ser refinada depois sem mudar o contrato
 * (o resto da sala só depende de receber um motivo string ou `null`).
 */
function detectaMotivoDegradacao(): 'sem-webgl' | 'reduced-motion' | 'gpu-fraca' | null {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'reduced-motion';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'sem-webgl';
    } catch {
        return 'sem-webgl';
    }
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores < 4) return 'gpu-fraca';
    return null;
}

export default function RoomCanvas({books, deskBooks, tags, mode}: RoomCanvasProps) {
    const router = useRouter();
    const openSlug = mode.kind === 'livro' ? mode.slug : null;

    const [manualViewpoint, setManualViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);
    const [degradado, setDegradado] = useState(false);
    const [sortCriterio, setSortCriterio] = useState('padrao');
    const [filtros, setFiltros] = useState<IndiceFiltros>({categoria: null, tag: null});
    const [indiceAberto, setIndiceAberto] = useState(false);

    // Base = todos os livros 'lido', na ordem que vieram do banco — o atlas
    // é gerado a partir desta lista (uma vez só, nunca refeito ao ordenar ou
    // filtrar). A lista visível na estante é derivada dela.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );

    // "animate" só nasce falso quando a página já chega com um livro aberto
    // (link direto/externo) — sem clique prévio, não há o que justificar
    // animar (ver spec, decisão "Link externo entrega conteúdo primeiro").
    // Nas trocas seguintes (fechar, abrir outro) sempre anima.
    //
    // Cuidado com a ordem: como o Canvas só renderiza depois que `atlas` fica
    // pronto (`if (!atlas) return null` abaixo), "primeira renderização do
    // componente" NÃO é o mesmo momento que "primeira renderização da cena
    // 3D" — `buildSpineAtlas` é assíncrono e só resolve depois do primeiro
    // commit. Por isso o ref abaixo só vira `true` quando `atlas` de fato
    // aparece, não no mount do componente.
    const [instantOpen] = useState(() => openSlug !== null);
    const hasShownSceneRef = useRef(false);
    const isFirstSceneRender = !hasShownSceneRef.current;
    useEffect(() => {
        if (atlas) hasShownSceneRef.current = true;
    }, [atlas]);
    const animateTransitions = !(isFirstSceneRender && instantOpen);

    const previousOpenSlugRef = useRef<string | null>(null);
    useEffect(() => {
        if (openSlug && previousOpenSlugRef.current !== openSlug) trackBookOpened(openSlug);
        previousOpenSlugRef.current = openSlug;
    }, [openSlug]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            if (mode.kind === 'sala') {
                trackListFallback(motivo);
                router.replace('/livros/lista');
            } else {
                // Em /livros/<slug> a página SSR já é um fallback completo —
                // degradar aqui é só "não mostrar o 3D", nunca redirecionar
                // pra longe de um conteúdo que já funciona sozinho.
                setDegradado(true);
            }
            return;
        }

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(shelfBooksBase).then((resultado) => {
            if (cancelado) return;
            setAtlas(resultado);
            trackRoomLoaded(Math.round(performance.now() - inicio), window.innerWidth < 768);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // O <Canvas> às vezes monta antes do layout do `fixed inset-0` acima
    // estabilizar, e o ResizeObserver do R3F perde essa primeira medição —
    // o canvas fica preso no tamanho padrão (300x150) até algo mais disparar
    // um resize de verdade. Um `requestAnimationFrame` sozinho dispara cedo
    // demais (o observer ainda não tinha se conectado); alguns retries com
    // atraso crescente cobrem a janela real sem custo perceptível quando o
    // tamanho já estava certo desde o início.
    useEffect(() => {
        if (!atlas) return;
        const atrasos = [0, 100, 300, 600];
        const ids = atrasos.map((ms) => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
        return () => ids.forEach(clearTimeout);
    }, [atlas]);

    if (degradado || !atlas) return null;

    const viewpoint: Viewpoint = openSlug ? 'livro' : (indiceAberto ? 'indice' : manualViewpoint);

    const abrirIndice = () => {
        setIndiceAberto(true);
        trackIndexOpened(filtros.categoria, filtros.tag);
    };
    const fecharIndice = () => setIndiceAberto(false);
    const mudarOrdenacao = (criterio: string) => {
        setSortCriterio(criterio);
        trackShelfSorted(criterio);
    };

    return (
        <>
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooksVisiveis} atlas={atlas} openSlug={openSlug} animate={animateTransitions}/>
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions}/>
                    {mode.kind === 'sala' && <IndexSheet onOpen={abrirIndice}/>}
                    <CameraRig viewpoint={viewpoint} animate={animateTransitions}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                    <button
                        onClick={() => setManualViewpoint('geral')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'geral' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Sala
                    </button>
                    <button
                        onClick={() => setManualViewpoint('estante')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'estante' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Estante
                    </button>
                    <button
                        onClick={() => setManualViewpoint('mesa')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'mesa' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Mesa
                    </button>
                </div>
            )}
            {indiceAberto && (
                <IndexPanel
                    tags={tags}
                    sortCriterio={sortCriterio}
                    onSortChange={mudarOrdenacao}
                    filtros={filtros}
                    onFilterChange={setFiltros}
                    onClose={fecharIndice}
                />
            )}
        </>
    );
}
```

> **Nota:** os botões "Sala/Estante/Mesa" agora comparam com `manualViewpoint`
> em vez de `viewpoint` — antes da fase 4 os dois eram sempre iguais fora do
> modo `'livro'`; agora `viewpoint` pode ser `'indice'` mesmo com
> `manualViewpoint` parado em `'estante'`, e os botões precisam continuar
> refletindo pra onde vão levar ao clicar, não o estado momentâneo da câmera.

- [ ] **Step 2: `tsc` para conferir tipos em todo o projeto**

```bash
npx tsc --noEmit
```

Esperado: erro só em `app/livros/layout.tsx` (ainda não passa `deskBooks`/`tags`
nem inclui `category`/`tags`/`year` na query) — resolvido na Task 12.
`RoomCanvasLoader.tsx` não precisa de nenhuma mudança: ele já espalha
`Omit<RoomCanvasProps, 'mode'>` genericamente.

- [ ] **Step 3: Commit**

```bash
git add components/livros/RoomCanvas.tsx
git commit -m "feat(livros): RoomCanvas liga mesa, indice, ordenacao e filtro"
```

---

### Task 12: `app/livros/layout.tsx` — busca "lendo agora" e tags

**Files:**
- Modify: `app/livros/layout.tsx`

**Interfaces:**
- Consumes: `listarLivros`/`listarTags`/`type Book` de `@/lib/books` (já existentes)
- Produces: `RoomCanvasLoader` recebe `books`, `deskBooks` e `tags`

- [ ] **Step 1: Reescreva `app/livros/layout.tsx` por completo**

```tsx
import {listarLivros, listarTags, type Book} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

function mapShelved(l: Book) {
    return {
        slug: l.slug,
        title: l.title,
        author: l.author,
        rating: l.rating,
        pages: l.pages,
        spine_color: l.spine_color,
        cover_path: l.cover_path,
        category: l.category,
        tags: l.tags,
        year: l.year,
    };
}

export default async function LivrosLayout({children, livro}: {
    children: React.ReactNode;
    livro: React.ReactNode;
}) {
    const [livrosLidos, livrosLendo, tags] = await Promise.all([
        listarLivros({status: 'lido'}),
        listarLivros({status: 'lendo'}),
        listarTags(),
    ]);

    return (
        <>
            <RoomCanvasLoader
                books={livrosLidos.map(mapShelved)}
                deskBooks={livrosLendo.map(mapShelved)}
                tags={tags}
            />
            {children}
            {livro}
        </>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos em todo o projeto**

```bash
npx tsc --noEmit
```

Esperado: nenhum erro — esta é a task que fecha todas as pontas soltas das
tasks 6-11.

- [ ] **Step 3: Commit**

```bash
git add app/livros/layout.tsx
git commit -m "feat(livros): layout busca livros lendo agora e tags para a mesa e o indice"
```

---

### Task 13: verificação visual end-to-end

**Files:** nenhum arquivo novo — só verificação manual.

- [ ] **Step 1: Rodar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Mesa e livros "lendo agora"**

1. Abra `/livros`, clique no botão "Mesa".
2. Confirme: a câmera desliza até a mesa; os livros com status `lendo` (1 a 3,
   dependendo do acervo atual) aparecem soltos sobre o tampo, mostrando a capa
   real (não a lombada) desde o primeiro frame — sem esperar clique.
3. Passe o mouse sobre um deles: cursor vira pointer, tooltip com
   título/autor/nota aparece (ajustar o offset do `Html` em `Book.tsx` se a
   posição parecer errada, conforme a nota da Task 6).
4. Clique num livro da mesa: mesmo fluxo de abrir um livro da estante (URL
   muda, câmera vai pro viewpoint `livro`, `BookOverlay` aparece). Feche e
   confirme que ele volta a descansar na mesa, não na estante.

- [ ] **Step 3: Folha do índice — ordenação**

1. Volte pra "Sala" ou "Mesa", clique na folha sobre a mesa.
2. Confirme: a câmera aproxima (viewpoint `indice`), o painel `IndexPanel`
   aparece, os botões Sala/Estante/Mesa somem.
3. Clique "Nota": vá até "Estante" (ou observe pela câmera geral) e confirme
   que os livros deslizam suavemente para a nova ordem (maior nota primeiro).
   Repita para "Ano" e "Categoria". Clique "Padrão" e confirme que voltam à
   ordem original.

- [ ] **Step 4: Folha do índice — filtro**

1. Com o painel aberto, clique numa categoria. Confirme que os livros fora
   dela somem da estante (sem animação de saída própria — ver "Decisão
   deliberada 3") e os restantes fecham o espaço deslizando.
2. Clique numa tag (com ou sem categoria ativa) e confirme que o filtro
   combina os dois (E lógico, não OU).
3. Clique de novo na categoria/tag ativa pra desativar, confirme que a
   estante volta a mostrar todos os livros `lido`.
4. Feche o painel (✕ ou clique fora não fecha — só o botão). Confirme que a
   câmera volta pro viewpoint anterior e os botões Sala/Estante/Mesa
   reaparecem.

- [ ] **Step 5: Correção do atlas por slug**

Com um filtro ativo (Step 4) ou uma ordenação diferente de "Padrão" (Step 3),
olhe de perto os livros restantes na estante (viewpoint "Estante") e confirme
que cada lombada mostra o título/autor correspondente ao próprio livro, não o
de outro — essa é a correção da Task 7; sem ela, a lombada certa só aparecia
por coincidência de ordem.

- [ ] **Step 6: Nenhuma regressão nas fases anteriores**

Repita rapidamente o fluxo de abrir/fechar um livro pela estante (fase 3) e
confirme que continua idêntico — a mesa e o índice não deveriam ter mudado
nada desse caminho.

---

### Task 14: verificação final da fase 4

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Testes**

```bash
npm test
```

Esperado: todos verdes, incluindo `lib/livros-shelf.test.mjs` e os testes
novos de `lib/book-dimensions.test.mjs` (`layoutDeskBooks`, campos
`category`/`tags`/`year`).

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Build de produção**

```bash
rm -rf .next && npm run build
```

Confirme no relatório de rotas que `/livros/lista` e `/livros/[slug]`
continuam com First Load JS pequeno (sem o peso de three/r3f) — mesmo
princípio validado nas fases 2 e 3.

- [ ] **Step 4: Checklist final contra o spec (fase 4)**

- [ ] Mesa com livros "lendo agora" (1 a 3), soltos, de capa virada — ✅ Task 8.
- [ ] Capa desses livros carrega de imediato, não só ao abrir — ✅ Task 6.
- [ ] Folha do índice é um objeto físico clicável sobre a mesa — ✅ Task 9.
- [ ] Clicar na folha aproxima a câmera (viewpoint `indice`) — ✅ Task 5 + 11.
- [ ] Clicar na folha abre o painel de filtros — ✅ Task 10 + 11.
- [ ] Ordenar a estante por nota/ano/categoria anima os livros pra nova
      posição — ✅ Task 2 (lógica) + 11 (wiring); animação em si já existe
      desde a fase 2/3 em `Book.tsx`, sem código novo.
- [ ] `Room.tsx` continua sem importar nada de livro — ✅ Task 4 (só ganhou
      âncoras + mobília física).
- [ ] Zoom da folha é funcional e direto, sem coreografia cinematográfica —
      ✅ Task 11 (troca de viewpoint imediata, sem sequência extra).

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "fix(livros): ajustes finais da verificacao da fase 4"
```
