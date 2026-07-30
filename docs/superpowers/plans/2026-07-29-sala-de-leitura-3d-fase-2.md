# Sala de Leitura 3D — Fase 2 (sala mínima) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `/livros` deixar de redirecionar para `/livros/lista` e passar a
renderizar a sala 3D mínima descrita na fase 2 do spec: uma estante com os
livros de status `lido` de lombada, hover que destaca um livro com etiqueta
(título/autor/nota), e uma câmera que transita entre dois pontos de vista
nomeados (`geral`, `estante`) com órbita curta e limitada dentro de cada um.
Abrir o livro (rotas interceptadas, animação, overlay DOM), a mesa com
"lendo agora", a folha do índice e mobile ficam para as fases 3-5.

**Architecture:** R3F (`@react-three/fiber` + `@react-three/drei` +
`@react-three/postprocessing`) sobre Next.js App Router. O `<Canvas>` é
montado por um componente client (`RoomCanvasLoader`) renderizado a partir de
`app/livros/layout.tsx` — nunca de `page.tsx` — mas só ativa de fato quando a
rota atual é exatamente `/livros`, evitando que `/livros/lista` e
`/livros/[slug]` paguem o custo do bundle 3D nesta fase. A lógica pura
(dimensão do livro a partir de páginas/slug, empacotamento do atlas de
lombadas) fica em `lib/book-dimensions.mjs`, testada via `node --test`; o
resto — geração da textura em `<canvas>`, cena R3F, câmera, hover — é visual
e se verifica olhando, seguindo a mesma convenção de teste já estabelecida
neste projeto.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (não-estrito),
Tailwind, `three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing`, `camera-controls` (peer dependency do
`CameraControls` do drei). Reaproveita `lib/books.ts`, `lib/contraste.mjs` e
`components/livros/StarRating.tsx` já existentes da fase 1.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`
**Plano da fase 1:** `docs/superpowers/plans/2026-07-28-acervo-de-livros-fase-1.md`

## Global Constraints

- **Toda tabela vive no schema `casara`, toda query qualifica explicitamente**
  (`casara.books`). Esta fase não adiciona SQL novo — reaproveita
  `listarLivros` de `lib/books.ts` — mas nenhum código novo deve introduzir
  uma query sem esse prefixo.
- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`.** Não é necessário lutar contra o compilador para
  tipos de bibliotecas 3D de tipagem incompleta.
- **Imports internos usam o alias `@/`.**
- **O `<Canvas>` precisa viver em `app/livros/layout.tsx`, nunca em
  `page.tsx`** — restrição não-negociável do spec, motivada pela fase 3 (rota
  interceptada precisa que o Canvas não desmonte ao navegar de `/livros` para
  `/livros/[slug]`). Ver Task 9 para como isso é resolvido sem forçar
  `/livros/lista` e `/livros/[slug]` a carregarem o bundle 3D nesta fase.
- **`Room.tsx` não sabe que livros existem.** Ele desenha cenário e publica
  âncoras nomeadas (posição/rotação). `Bookshelf.tsx` e `CameraRig.tsx` leem
  essas âncoras; nenhuma lógica de livro entra em `Room.tsx`.
- **Sem Blender, sem geometria modelada (A1).** A sala é primitivas de
  `three`, vendida pela iluminação (luz quente, LED frio, poeira, bloom leve).
- **Câmera sem órbita livre.** Ela transita entre pontos de vista nomeados
  (`geral`, `estante` nesta fase) com interpolação suave; dentro de cada um a
  órbita é curta e limitada.
- **Volume do acervo: ~51 livros hoje, premissa de design é ~20 no
  lançamento / ~60 em dois anos, teto de design em ~200.** Isso sustenta:
  estante única sem paginação, sem instancing, atlas único de textura para
  todas as lombadas, cena carregada de uma vez.
- **Degradação:** sem WebGL, com `prefers-reduced-motion: reduce`, ou sinal de
  GPU fraca → redireciona para `/livros/lista`. A sala nunca é a única porta.
- **Metas de performance:** sala interativa em até 3s em conexão boa;
  60fps desktop; texto nunca é renderizado dentro do 3D como conteúdo (a
  lombada gerada em canvas é textura decorativa, não substitui a página real
  do livro).
- **Este projeto não tem suite de testes de componente/cena.** Só a lógica
  pura de `lib/book-dimensions.mjs` ganha `node --test`. O resto se verifica
  rodando `npm run dev` e olhando.
- **Comentários e textos de interface em português.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/book-dimensions.mjs` | Lógica pura: espessura/altura do livro, empacotamento do atlas de lombadas — testado |
| `lib/book-dimensions.test.mjs` | `node --test` da lógica pura acima |
| `lib/spine-canvas.ts` | Gera a textura do atlas de lombadas em `<canvas>` (visual, cliente) |
| `components/livros/Room.tsx` | Cenário (chão, parede, prateleira física, luzes, poeira) + `ROOM_ANCHORS` |
| `components/livros/Book.tsx` | Um livro: `BoxGeometry` + 6 materiais, hover (desliza + etiqueta) |
| `components/livros/Bookshelf.tsx` | Posiciona os livros `lido` ao longo da âncora `estante` |
| `components/livros/CameraRig.tsx` | Pontos de vista nomeados (`geral`, `estante`) com órbita limitada |
| `components/livros/RoomCanvas.tsx` | Composição da cena: degradação, atlas, `<Canvas>`, UI de troca de vista |
| `components/livros/RoomCanvasLoader.tsx` | Import dinâmico (`ssr:false`) gated por rota, para não pesar `/livros/lista` e `/livros/[slug]` |
| `app/livros/layout.tsx` | Busca os livros `lido`, renderiza `RoomCanvasLoader` + `children` (**novo arquivo**) |
| `app/livros/page.tsx` | Deixa de redirecionar; vira o host vazio da sala (modificado) |
| `utils/analytics.ts` | `trackRoomLoaded`, `trackListFallback` (modificado) |

---

### Task 1: Instalar dependências 3D e validar o pipeline de build

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nada
- Produces: `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`, `camera-controls` disponíveis para import em
  todas as tasks seguintes.

- [ ] **Step 1: Instalar as dependências**

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing camera-controls
```

- [ ] **Step 2: Smoke test — um Canvas mínimo compila e roda**

Crie um arquivo temporário `app/livros/_smoke-test.tsx` (será apagado no
Step 4, existe só para validar o pipeline antes de escrever a cena de
verdade):

```tsx
'use client';

import {Canvas} from '@react-three/fiber';

export default function SmokeTest() {
  return (
    <div style={{height: 300}}>
      <Canvas>
        <mesh>
          <boxGeometry args={[1, 1, 1]}/>
          <meshStandardMaterial color="orange"/>
        </mesh>
        <ambientLight intensity={1}/>
      </Canvas>
    </div>
  );
}
```

Importe-o temporariamente em `app/livros/page.tsx` (o conteúdo atual do
arquivo será substituído na Task 9 de qualquer forma):

```tsx
import SmokeTest from './_smoke-test';

export default function LivrosPage() {
  return <SmokeTest/>;
}
```

- [ ] **Step 3: Rodar o dev server e confirmar**

```bash
npm run dev
```

Abra `http://localhost:3000/livros` no navegador. Espera-se um cubo laranja
girável renderizado sem erros no console. Se o Turbopack reclamar de
transpilação de `three`/`@react-three/*`, adicione a `next.config.ts`:

```ts
const nextConfig: NextConfig = {
    transpilePackages: ["three"],
    env: { /* ... mantém o que já existe ... */ },
};
```

(Só adicione isso se o erro realmente aparecer — não é necessário na maioria
das instalações limpas dessas bibliotecas.)

- [ ] **Step 4: Reverter o smoke test**

```bash
rm app/livros/_smoke-test.tsx
git checkout app/livros/page.tsx
```

(O `page.tsx` original — o redirect da fase 1 — volta como estava; ele será
substituído de propósito na Task 9.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(livros): instala dependencias 3D (three, r3f, drei, postprocessing)"
```

---

### Task 2: `lib/book-dimensions.mjs` — dimensões e atlas, com testes

**Files:**
- Create: `lib/book-dimensions.mjs`
- Create: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Consumes: nada (lógica pura, zero dependências)
- Produces:
  - `BOOK_DEPTH_M: number`
  - `medianPages(pagesList: (number|null|undefined)[]) => number|null`
  - `bookThicknessM(pages: number|null, medianPagesFallback: number|null) => number`
  - `bookHeightM(slug: string) => number`
  - `layoutSpineAtlas(books: {slug:string, thicknessM:number}[], options?) => {atlasWidthPx, atlasHeightPx, spines: {slug,xPx,widthPx,u0,u1}[]}`
  - `toShelfBooks(books: {slug,title,author,rating,pages,spine_color}[]) => ShelfBookData[]` (formato consumido por `components/livros/Book.tsx` na Task 5)

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/book-dimensions.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    medianPages, bookThicknessM, bookHeightM, layoutSpineAtlas, toShelfBooks,
    SPINE_THICKNESS_MIN_M, SPINE_THICKNESS_MAX_M, BOOK_HEIGHT_BASE_M, BOOK_HEIGHT_VARIANCE_M,
} from './book-dimensions.mjs';

test('medianPages ignora nulos/undefined e calcula corretamente', () => {
    assert.equal(medianPages([100, 200, 300]), 200);
    assert.equal(medianPages([100, 200, 300, 400]), 250);
    assert.equal(medianPages([null, 150, undefined, 250]), 200);
    assert.equal(medianPages([]), null);
});

test('bookThicknessM aplica pages*0.055mm e respeita os limites de 12-60mm', () => {
    assert.equal(bookThicknessM(300, 250), 300 * 0.000055);
    assert.equal(bookThicknessM(10, 250), SPINE_THICKNESS_MIN_M);
    assert.equal(bookThicknessM(2000, 250), SPINE_THICKNESS_MAX_M);
    assert.equal(bookThicknessM(null, 300), 300 * 0.000055);
    assert.equal(bookThicknessM(null, null), SPINE_THICKNESS_MIN_M);
});

test('bookHeightM é determinístico e fica dentro da variação declarada', () => {
    const h1 = bookHeightM('o-nome-do-vento');
    const h2 = bookHeightM('o-nome-do-vento');
    assert.equal(h1, h2, 'mesma slug tem que dar sempre a mesma altura');
    assert.ok(h1 >= BOOK_HEIGHT_BASE_M - BOOK_HEIGHT_VARIANCE_M);
    assert.ok(h1 <= BOOK_HEIGHT_BASE_M + BOOK_HEIGHT_VARIANCE_M);
    assert.notEqual(bookHeightM('duna'), bookHeightM('1984'), 'slugs diferentes tendem a alturas diferentes');
});

test('layoutSpineAtlas empacota lombadas lado a lado sem sobreposição', () => {
    const books = [
        {slug: 'a', thicknessM: 0.02},
        {slug: 'b', thicknessM: 0.03},
        {slug: 'c', thicknessM: 0.015},
    ];
    const layout = layoutSpineAtlas(books, {pixelsPerMm: 4, rowHeightPx: 256});
    assert.equal(layout.spines.length, 3);
    assert.equal(layout.atlasHeightPx, 256);
    assert.equal(layout.spines[0].u0, 0);
    assert.equal(layout.spines[2].u1, 1);
    assert.equal(layout.spines[1].xPx, layout.spines[0].xPx + layout.spines[0].widthPx);
    assert.equal(layout.spines[2].xPx, layout.spines[1].xPx + layout.spines[1].widthPx);
});

test('layoutSpineAtlas reduz proporcionalmente quando excede a largura máxima', () => {
    const books = Array.from({length: 60}, (_, i) => ({slug: `livro-${i}`, thicknessM: 0.05}));
    const layout = layoutSpineAtlas(books, {pixelsPerMm: 4, maxWidthPx: 4096});
    assert.ok(layout.atlasWidthPx <= 4096);
    assert.equal(layout.spines.at(-1).u1, 1);
});

test('toShelfBooks preserva ordem e preenche thicknessM/heightM', () => {
    const shelf = toShelfBooks([
        {slug: 'a', title: 'A', author: 'Fulano', rating: '4.5', pages: 300, spine_color: '#ec4899'},
        {slug: 'b', title: 'B', author: null, rating: null, pages: null, spine_color: null},
    ]);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0].slug, 'a');
    assert.equal(shelf[1].slug, 'b');
    assert.ok(shelf[0].thicknessM > 0);
    assert.ok(shelf[1].thicknessM > 0, 'livro sem pages usa a mediana do acervo, não quebra');
    assert.equal(shelf[1].spineColor, null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha com `Cannot find module './book-dimensions.mjs'`.

- [ ] **Step 3: Implementar `lib/book-dimensions.mjs`**

```js
/**
 * Dimensões 3D dos livros na sala de leitura — lógica pura, sem dependências.
 *
 * .mjs de propósito, mesma razão de lib/book-utils.mjs e lib/contraste.mjs:
 * é o único jeito de rodar `node --test` neste projeto (`lib/**\/*.test.mjs`).
 * A geração da textura em si (lib/spine-canvas.ts) usa `<canvas>` do DOM e
 * não pode ser testada sem um browser real — por isso fica separada e não
 * coberta por teste, seguindo a mesma convenção do resto do projeto.
 */

export const BOOK_HEIGHT_BASE_M = 0.22;
export const BOOK_HEIGHT_VARIANCE_M = 0.015;
export const BOOK_DEPTH_M = 0.15;
export const SPINE_THICKNESS_MIN_M = 0.012;
export const SPINE_THICKNESS_MAX_M = 0.060;
export const SPINE_THICKNESS_PER_PAGE_M = 0.000055;
export const DEFAULT_ATLAS_ROW_HEIGHT_PX = 512;
export const DEFAULT_ATLAS_PIXELS_PER_MM = 4;
export const DEFAULT_MAX_ATLAS_WIDTH_PX = 4096;

/** Mediana de uma lista de páginas, ignorando null/undefined. `null` se a lista ficar vazia. */
export function medianPages(pagesList) {
    const validos = pagesList.filter((p) => typeof p === 'number' && p > 0).sort((a, b) => a - b);
    if (validos.length === 0) return null;
    const meio = Math.floor(validos.length / 2);
    return validos.length % 2 === 0 ? (validos[meio - 1] + validos[meio]) / 2 : validos[meio];
}

/**
 * espessura = clamp(pages * 0.055mm, 12mm, 60mm), em metros.
 * Quando `pages` é nulo, usa `medianPagesFallback` (a mediana do acervo
 * atual) — ver spec, seção "Como um livro é representado".
 */
export function bookThicknessM(pages, medianPagesFallback) {
    const paginas = typeof pages === 'number' && pages > 0 ? pages : medianPagesFallback;
    if (!paginas) return SPINE_THICKNESS_MIN_M;
    const bruto = paginas * SPINE_THICKNESS_PER_PAGE_M;
    return Math.min(SPINE_THICKNESS_MAX_M, Math.max(SPINE_THICKNESS_MIN_M, bruto));
}

/** Hash determinístico simples (djb2), normalizado para 0..1. */
function hashString01(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) {
        h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
    }
    return (h % 10000) / 10000;
}

/**
 * Altura do livro, variando levemente por slug — determinístico, não
 * aleatório, para a estante não mudar de aparência a cada render.
 */
export function bookHeightM(slug) {
    const t = hashString01(slug);
    return BOOK_HEIGHT_BASE_M + (t * 2 - 1) * BOOK_HEIGHT_VARIANCE_M;
}

/**
 * Empacota as lombadas lado a lado num atlas de uma única fileira: a altura
 * do atlas é fixa (a textura inteira representa a altura "canônica" da
 * lombada, mapeada por V 0..1 em qualquer livro); só a largura de cada
 * lombada varia, proporcional à espessura física do livro. Se a soma das
 * larguras passar de `maxWidthPx`, tudo é reduzido proporcionalmente para
 * caber — protege contra o limite de textura da GPU (tipicamente 4096-8192px).
 */
export function layoutSpineAtlas(books, options = {}) {
    const pixelsPerMm = options.pixelsPerMm ?? DEFAULT_ATLAS_PIXELS_PER_MM;
    const rowHeightPx = options.rowHeightPx ?? DEFAULT_ATLAS_ROW_HEIGHT_PX;
    const maxWidthPx = options.maxWidthPx ?? DEFAULT_MAX_ATLAS_WIDTH_PX;

    const largurasBrutas = books.map((b) => Math.max(1, Math.round(b.thicknessM * 1000 * pixelsPerMm)));
    const larguraTotalBruta = largurasBrutas.reduce((soma, w) => soma + w, 0);
    const fatorEscala = larguraTotalBruta > maxWidthPx ? maxWidthPx / larguraTotalBruta : 1;

    let x = 0;
    const spines = books.map((b, i) => {
        const widthPx = Math.max(1, Math.round(largurasBrutas[i] * fatorEscala));
        const spine = {slug: b.slug, xPx: x, widthPx, u0: 0, u1: 0};
        x += widthPx;
        return spine;
    });
    const atlasWidthPx = x;
    for (const s of spines) {
        s.u0 = s.xPx / atlasWidthPx;
        s.u1 = (s.xPx + s.widthPx) / atlasWidthPx;
    }
    return {atlasWidthPx, atlasHeightPx: rowHeightPx, spines};
}

/**
 * Converte livros crus do banco (formato de `lib/books.ts`) no formato que
 * `components/livros/Book.tsx` espera, com as dimensões já calculadas.
 * Preserva a ordem de entrada — quem chama depende disso para casar o índice
 * de cada livro com o índice do atlas gerado por `layoutSpineAtlas`.
 */
export function toShelfBooks(books) {
    const mediana = medianPages(books.map((b) => b.pages));
    return books.map((b) => ({
        slug: b.slug,
        title: b.title,
        author: b.author ?? null,
        rating: b.rating ?? null,
        spineColor: b.spine_color ?? null,
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
npm test
```

Esperado: todos os testes de `lib/book-dimensions.test.mjs` em verde, sem
quebrar os testes existentes (`book-utils`, `contraste`, `book-cover`,
`openlibrary`).

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs
git commit -m "feat(livros): adiciona dimensoes do livro e empacotamento do atlas de lombadas"
```

---

### Task 3: `lib/spine-canvas.ts` — gera a textura do atlas de lombadas

**Files:**
- Create: `lib/spine-canvas.ts`

**Interfaces:**
- Consumes: `layoutSpineAtlas` de `@/lib/book-dimensions.mjs`; `corDeTextoSobre`
  de `@/lib/contraste.mjs`
- Produces:
  - `type SpineSourceBook = {slug, title, author, spineColor, thicknessM}`
  - `type SpineAtlas = {texture: THREE.CanvasTexture, layout: ReturnType<typeof layoutSpineAtlas>}`
  - `buildSpineAtlas(books: SpineSourceBook[]) => Promise<SpineAtlas>`

Este arquivo é client-only (usa `document.createElement('canvas')`) e não é
coberto por `node --test` — verificação é visual, na Task 8.

- [ ] **Step 1: Implementar**

```ts
import * as THREE from 'three';
import {layoutSpineAtlas} from '@/lib/book-dimensions.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';

export type SpineSourceBook = {
    slug: string;
    title: string;
    author: string | null;
    spineColor: string | null;
    thicknessM: number;
};

export type SpineAtlas = {
    texture: THREE.CanvasTexture;
    layout: ReturnType<typeof layoutSpineAtlas>;
};

const FALLBACK_SPINE_COLOR = '#4b4b4b';

function truncarParaLargura(ctx: CanvasRenderingContext2D, texto: string, maxLargura: number): string {
    if (ctx.measureText(texto).width <= maxLargura) return texto;
    let truncado = texto;
    while (truncado.length > 1 && ctx.measureText(truncado + '…').width > maxLargura) {
        truncado = truncado.slice(0, -1);
    }
    return truncado + '…';
}

function desenharLombada(
    ctx: CanvasRenderingContext2D,
    book: SpineSourceBook,
    xPx: number,
    widthPx: number,
    heightPx: number,
) {
    const cor = book.spineColor || FALLBACK_SPINE_COLOR;
    ctx.fillStyle = cor;
    ctx.fillRect(xPx, 0, widthPx, heightPx);

    const corTexto = corDeTextoSobre(cor);
    ctx.save();
    ctx.translate(xPx + widthPx / 2, heightPx - 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = corTexto;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const maxLargura = heightPx - 48;
    const tamanhoTitulo = Math.min(28, Math.max(14, widthPx * 0.45));
    ctx.font = `700 ${tamanhoTitulo}px Quicksand, sans-serif`;
    ctx.fillText(truncarParaLargura(ctx, book.title, maxLargura), 0, 0);

    if (book.author) {
        ctx.font = `400 ${tamanhoTitulo * 0.7}px Quicksand, sans-serif`;
        ctx.fillText(truncarParaLargura(ctx, book.author, maxLargura), 0, tamanhoTitulo + 10);
    }
    ctx.restore();
}

/**
 * Espera as fontes carregarem antes de desenhar — a textura é gerada uma vez
 * só e fica gravada; se desenhar cedo demais, a fonte errada fica gravada
 * pro resto da sessão (diferente de texto em DOM, que reflui sozinho).
 */
export async function buildSpineAtlas(books: SpineSourceBook[]): Promise<SpineAtlas> {
    const layout = layoutSpineAtlas(books.map((b) => ({slug: b.slug, thicknessM: b.thicknessM})));

    if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
    }

    const canvas = document.createElement('canvas');
    canvas.width = layout.atlasWidthPx;
    canvas.height = layout.atlasHeightPx;
    const ctx = canvas.getContext('2d')!;

    books.forEach((book, i) => {
        const spine = layout.spines[i];
        desenharLombada(ctx, book, spine.xPx, spine.widthPx, layout.atlasHeightPx);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return {texture, layout};
}
```

- [ ] **Step 2: Verificação visual isolada**

Ainda não há cena para montar isso — a verificação de verdade acontece na
Task 8, quando `RoomCanvas.tsx` chama `buildSpineAtlas`. Por ora, confirme só
que o arquivo compila:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/spine-canvas.ts
git commit -m "feat(livros): gera atlas de lombadas em canvas para textura da estante"
```

---

### Task 4: `components/livros/Room.tsx` — cenário e âncoras

**Files:**
- Create: `components/livros/Room.tsx`

**Interfaces:**
- Consumes: `Sparkles` de `@react-three/drei`
- Produces:
  - `ROOM_ANCHORS: {estante: {position: [number,number,number], rotation: [number,number,number]}}`
  - `export default function Room()`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {Sparkles} from '@react-three/drei';

export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const SHELF_BOARD_COLOR = '#1f1713';

/**
 * Cenário puro — não sabe que livros existem. Publica ROOM_ANCHORS
 * (posição/rotação) para que Bookshelf.tsx e CameraRig.tsx se posicionem a
 * partir daqui, sem nenhuma lógica de livro vazar para este arquivo.
 */
export default function Room() {
    const estante = ROOM_ANCHORS.estante;

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

            {/* Prancha física da prateleira — os livros da Task 6 assentam no topo dela. */}
            <mesh position={[estante.position[0], estante.position[1] - 0.02, estante.position[2]]}>
                <boxGeometry args={[1.4, 0.04, 0.2]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>

            <pointLight position={[1.3, 1.7, 0.6]} color="#ffb877" intensity={6} distance={5} decay={2}/>
            <pointLight position={[0, 2.1, -1.55]} color="#9fd8ff" intensity={3} distance={4} decay={2}/>
            <ambientLight intensity={0.25}/>

            <Sparkles count={40} scale={[2, 2, 2]} position={[1, 1.5, 0.3]} size={2} speed={0.15} color="#ffd9a0" opacity={0.35}/>
        </group>
    );
}
```

- [ ] **Step 2: Verificação visual**

Ainda não há como montar isso sozinho fora de um `<Canvas>` — a verificação
acontece junto da Task 8. Confirme que compila:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/Room.tsx
git commit -m "feat(livros): adiciona cenario da sala com ancoras nomeadas"
```

---

### Task 5: `components/livros/Book.tsx` — mesh, materiais e hover

**Files:**
- Create: `components/livros/Book.tsx`

**Interfaces:**
- Consumes: `BOOK_DEPTH_M` de `@/lib/book-dimensions.mjs`; `StarRating` de
  `@/components/livros/StarRating`; `Html` de `@react-three/drei`
- Produces:
  - `type ShelfBookData = {slug, title, author, rating, thicknessM, heightM, spineColor}`
  - `export default function Book({book, position, atlasTexture, uvRange})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import StarRating from '@/components/livros/StarRating';
import {BOOK_DEPTH_M} from '@/lib/book-dimensions.mjs';

// Ordem de materiais do BoxGeometry: [+x, -x, +y, -y, +z, -z].
// A lombada (visível de fora da estante) é a face +z.
const SPINE_FACE_INDEX = 4;
const FALLBACK_SPINE_COLOR = '#4b4b4b';
const HOVER_SLIDE_M = 0.035;
const HOVER_TILT_RAD = 0.12;
const LERP_SPEED = 8;

export type ShelfBookData = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    thicknessM: number;
    heightM: number;
    spineColor: string | null;
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
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

export default function Book({book, position, atlasTexture, uvRange}: BookProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1]);

    const materials = useMemo(() => {
        const corCapa = book.spineColor || FALLBACK_SPINE_COLOR;
        const materialCapa = new THREE.MeshStandardMaterial({color: corCapa, roughness: 0.8});
        const materialLombada = new THREE.MeshStandardMaterial({map: atlasTexture, roughness: 0.7});
        return [materialCapa, materialCapa, materialCapa, materialCapa, materialLombada, materialCapa];
    }, [book.spineColor, atlasTexture]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const alvoZ = hovered ? HOVER_SLIDE_M : 0;
        const alvoRotX = hovered ? -HOVER_TILT_RAD : 0;
        groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, alvoZ, LERP_SPEED, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, alvoRotX, LERP_SPEED, delta);
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                setHovered(false);
            }}
        >
            <mesh geometry={geometry} material={materials}/>
            {hovered && (
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

- [ ] **Step 2: Verificação visual**

Verificação real acontece na Task 8 (`Bookshelf` + `RoomCanvas`). Por ora,
confirme que compila:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/Book.tsx
git commit -m "feat(livros): componente Book com 6 materiais e hover"
```

---

### Task 6: `components/livros/Bookshelf.tsx` — layout da estante

**Files:**
- Create: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: `Book`, `type ShelfBookData` de `@/components/livros/Book`;
  `ROOM_ANCHORS` de `@/components/livros/Room`; `type SpineAtlas` de
  `@/lib/spine-canvas`
- Produces: `export default function Bookshelf({shelfBooks, atlas})`

**Importante:** `shelfBooks` e `atlas.layout.spines` precisam vir do **mesmo
array, na mesma ordem** — quem monta os dois (Task 8, `RoomCanvas.tsx`) usa
`toShelfBooks(books)` uma única vez e passa o resultado para
`buildSpineAtlas` e para este componente, para que o índice `i` bata dos dois
lados.

- [ ] **Step 1: Implementar**

```tsx
'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import type {SpineAtlas} from '@/lib/spine-canvas';

const GAP_M = 0.003;

export default function Bookshelf({shelfBooks, atlas}: {shelfBooks: ShelfBookData[]; atlas: SpineAtlas}) {
    const larguraTotal = shelfBooks.reduce((soma, b) => soma + b.thicknessM + GAP_M, 0) - GAP_M;

    let xAtual = -larguraTotal / 2;
    const posicoes = shelfBooks.map((b) => {
        const x = xAtual + b.thicknessM / 2;
        xAtual += b.thicknessM + GAP_M;
        return x;
    });

    const anchor = ROOM_ANCHORS.estante;

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {shelfBooks.map((book, i) => (
                <Book
                    key={book.slug}
                    book={book}
                    position={[posicoes[i], book.heightM / 2, 0]}
                    atlasTexture={atlas.texture}
                    uvRange={{u0: atlas.layout.spines[i].u0, u1: atlas.layout.spines[i].u1}}
                />
            ))}
        </group>
    );
}
```

- [ ] **Step 2: Verificação visual**

Acontece na Task 8. Confirme que compila:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "feat(livros): layout da estante a partir da ancora ROOM_ANCHORS.estante"
```

---

### Task 7: `components/livros/CameraRig.tsx` — pontos de vista nomeados

**Files:**
- Create: `components/livros/CameraRig.tsx`

**Interfaces:**
- Consumes: `CameraControls` de `@react-three/drei`; `ROOM_ANCHORS` de
  `@/components/livros/Room`
- Produces:
  - `type Viewpoint = 'geral' | 'estante'`
  - `export default function CameraRig({viewpoint}: {viewpoint: Viewpoint})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {useEffect, useRef} from 'react';
import {CameraControls} from '@react-three/drei';
import {ROOM_ANCHORS} from '@/components/livros/Room';

export type Viewpoint = 'geral' | 'estante';

type ViewpointConfig = {
    camera: [number, number, number];
    target: [number, number, number];
    minAzimuth: number;
    maxAzimuth: number;
    minPolar: number;
    maxPolar: number;
};

const estanteZ = ROOM_ANCHORS.estante.position[2];

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
};

export default function CameraRig({viewpoint}: {viewpoint: Viewpoint}) {
    const controlsRef = useRef<CameraControls>(null);
    const v = VIEWPOINTS[viewpoint];

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, true);
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

- [ ] **Step 2: `tsc` para checar a tipagem do ref**

```bash
npx tsc --noEmit
```

Se `useRef<CameraControls>` reclamar de tipo (bibliotecas 3D às vezes têm
tipagem incompleta), troque por `useRef<InstanceType<typeof CameraControls>>(null)`
— o projeto tem `strict: false`, então isso não deve bloquear o build mesmo
se o tipo ficar frouxo.

- [ ] **Step 3: Commit**

```bash
git add components/livros/CameraRig.tsx
git commit -m "feat(livros): camera com pontos de vista nomeados geral/estante"
```

---

### Task 8: `components/livros/RoomCanvas.tsx` — composição, degradação, atlas

**Files:**
- Create: `components/livros/RoomCanvas.tsx`
- Modify: `utils/analytics.ts` (adicionar `trackRoomLoaded`, `trackListFallback`)

**Interfaces:**
- Consumes: `toShelfBooks` de `@/lib/book-dimensions.mjs`; `buildSpineAtlas`,
  `type SpineAtlas` de `@/lib/spine-canvas`; `Room`, `Bookshelf`, `CameraRig`,
  `type Viewpoint` dos componentes das tasks anteriores
- Produces:
  - `type ShelvedBookInput = {slug, title, author, rating, pages, spine_color}`
  - `type RoomCanvasProps = {books: ShelvedBookInput[]}`
  - `export default function RoomCanvas({books}: RoomCanvasProps)`

- [ ] **Step 1: Adicionar os eventos de analytics**

Modify `utils/analytics.ts`, na seção `// ─── Livros ───` já existente:

```ts
export const trackBookOpened = (slug: string) =>
  trackEvent('book_opened', { slug });

export const trackBookFilter = (campo: string, valor: string) =>
  trackEvent('book_filter', { campo, valor });

export const trackRoomLoaded = (timeToInteractiveMs: number, isMobile: boolean) =>
  trackEvent('room_loaded', { time_to_interactive_ms: timeToInteractiveMs, is_mobile: isMobile });

export const trackListFallback = (motivo: string) =>
  trackEvent('list_fallback', { motivo });
```

- [ ] **Step 2: Implementar `RoomCanvas.tsx`**

```tsx
'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {trackRoomLoaded, trackListFallback} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
};

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

export default function RoomCanvas({books}: RoomCanvasProps) {
    const router = useRouter();
    const [viewpoint, setViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);

    const shelfBooks = useMemo(() => toShelfBooks(books), [books]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            trackListFallback(motivo);
            router.replace('/livros/lista');
            return;
        }

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(shelfBooks).then((resultado) => {
            if (cancelado) return;
            setAtlas(resultado);
            trackRoomLoaded(Math.round(performance.now() - inicio), window.innerWidth < 768);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!atlas) return null;

    return (
        <>
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooks} atlas={atlas}/>
                    <CameraRig viewpoint={viewpoint}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                <button
                    onClick={() => setViewpoint('geral')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'geral' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                >
                    Sala
                </button>
                <button
                    onClick={() => setViewpoint('estante')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'estante' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                >
                    Estante
                </button>
            </div>
        </>
    );
}
```

`shelfBooks` é recalculado a partir de `books` (que só muda se a lista de
livros mudar) mas o efeito de build do atlas roda só uma vez no mount
(array de dependências vazio, de propósito — reconstruir o atlas a cada
re-render de `viewpoint` seria caro e desnecessário).

- [ ] **Step 3: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/livros/RoomCanvas.tsx utils/analytics.ts
git commit -m "feat(livros): compoe a cena, degradacao e troca de ponto de vista"
```

---

### Task 9: Ligar as rotas — `layout.tsx`, `RoomCanvasLoader.tsx`, `page.tsx`

**Files:**
- Create: `app/livros/layout.tsx`
- Create: `components/livros/RoomCanvasLoader.tsx`
- Modify: `app/livros/page.tsx`

**Interfaces:**
- Consumes: `listarLivros` de `@/lib/books`; `RoomCanvasLoader`;
  `type RoomCanvasProps` de `@/components/livros/RoomCanvas`
- Produces: `/livros` renderiza a sala em vez de redirecionar

**Por que dois arquivos (`layout.tsx` + `RoomCanvasLoader.tsx`) e não um só:**
`next/dynamic` com `ssr: false` só é permitido dentro de um Client Component
— um Server Component (que é o que `layout.tsx` precisa ser, para poder dar
`await listarLivros(...)`) não pode chamar `dynamic(..., {ssr:false})`
diretamente. `RoomCanvasLoader` existe só para isolar essa chamada.

**Custo aceito conscientemente:** `layout.tsx` busca `listarLivros({status:
'lido'})` em **toda** requisição sob `/livros/**`, inclusive `/livros/lista`
e `/livros/[slug]`, que não usam esse resultado nesta fase (o Canvas 3D só
ativa na rota exata `/livros` — ver `RoomCanvasLoader` abaixo). É uma query
indexada extra e pequena nessas duas rotas; o alternativo seria mover o
`<Canvas>` para dentro de `page.tsx`, o que violaria a restrição
não-negociável do spec e forçaria reescrita na fase 3 (rota interceptada
precisa do Canvas já vivendo em `layout.tsx` para não desmontar ao navegar).

- [ ] **Step 1: Implementar `RoomCanvasLoader.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import type {RoomCanvasProps} from '@/components/livros/RoomCanvas';

const RoomCanvas = dynamic(() => import('@/components/livros/RoomCanvas'), {ssr: false});

/**
 * Só a rota exata /livros ativa a sala nesta fase — /livros/lista e
 * /livros/[slug] continuam 100% SSR, sem pagar o bundle de three/r3f/drei.
 * A checagem de pathname acontece ANTES de renderizar <RoomCanvas/>, então o
 * `dynamic()` nunca dispara o carregamento do chunk fora de /livros.
 */
export default function RoomCanvasLoader(props: RoomCanvasProps) {
    const pathname = usePathname();
    if (pathname !== '/livros') return null;
    return <RoomCanvas {...props}/>;
}
```

- [ ] **Step 2: Implementar `app/livros/layout.tsx`**

```tsx
import {listarLivros} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

export default async function LivrosLayout({children}: {children: React.ReactNode}) {
    const livrosLidos = await listarLivros({status: 'lido'});

    const shelvedBooks = livrosLidos.map((livro) => ({
        slug: livro.slug,
        title: livro.title,
        author: livro.author,
        rating: livro.rating,
        pages: livro.pages,
        spine_color: livro.spine_color,
    }));

    return (
        <>
            <RoomCanvasLoader books={shelvedBooks}/>
            {children}
        </>
    );
}
```

- [ ] **Step 3: Substituir `app/livros/page.tsx`**

O conteúdo atual (redirect da fase 1) some — a sala passa a ser o próprio
conteúdo da rota `/livros`, renderizada por `RoomCanvasLoader` a partir do
layout. `page.tsx` só precisa existir para a rota resolver, e cuida do caso
zero-JS:

```tsx
export default function LivrosPage() {
    return (
        <noscript>
            <meta httpEquiv="refresh" content="0;url=/livros/lista"/>
        </noscript>
    );
}
```

- [ ] **Step 4: Rodar o dev server e verificar visualmente**

```bash
npm run dev
```

Abra `http://localhost:3000/livros`. Checklist:

- A sala aparece (chão, parede, prateleira, luz quente + luz fria, poeira sutil).
- Os livros com `status='lido'` aparecem de lombada, lado a lado, com título/autor legíveis na lombada (gerados pelo atlas).
- Passar o mouse sobre um livro: ele desliza para fora com leve inclinação e mostra a etiqueta com título/autor/estrelas.
- Os botões "Sala" / "Estante" no rodapé trocam o ponto de vista com transição suave, e a órbita (arrastar o mouse) fica limitada dentro de cada ponto de vista.
- Abrir `http://localhost:3000/livros/lista` continua funcionando exatamente como antes (fase 1), sem nenhum peso de 3D (confira a aba Network do devtools: nenhum chunk de `three`/`r3f` carregado).
- Abrir `http://localhost:3000/livros/<slug-de-algum-livro>` continua funcionando exatamente como antes.
- No painel de performance do navegador (`chrome://inspect` ou aba Performance), confirme que a sala fica interativa em poucos segundos e não trava o thread principal.

- [ ] **Step 5: Commit**

```bash
git add app/livros/layout.tsx app/livros/page.tsx components/livros/RoomCanvasLoader.tsx
git commit -m "feat(livros): liga a sala 3D em /livros sem pesar lista/[slug]"
```

---

### Task 10: Verificação final da fase 2

**Files:** nenhum arquivo novo — só verificação.

- [ ] **Step 1: Rodar a suite de testes de lógica pura**

```bash
npm test
```

Esperado: todos os testes verdes, incluindo os novos de
`lib/book-dimensions.test.mjs` e todos os já existentes da fase 1.

- [ ] **Step 2: Rodar o lint**

```bash
npm run lint
```

Corrija qualquer aviso novo introduzido pelos arquivos desta fase antes de
prosseguir.

- [ ] **Step 3: Build de produção**

```bash
npm run build
```

Confirma que o code-splitting de `/livros` está correto (o bundle de
`three`/`@react-three/*` não deve aparecer no First Load JS de `/livros/lista`
nem de `/livros/[slug]` no relatório do `next build`).

- [ ] **Step 4: Checklist final contra o spec (fase 2)**

Reabra a seção "Fases" do spec
(`docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`) e confirme
item a item:

- [ ] Estante com os livros `lido` de lombada — ✅ Task 6.
- [ ] Hover destaca o livro (desliza + etiqueta com título/autor/nota) — ✅ Task 5.
- [ ] Câmera com pontos de vista nomeados e órbita curta/limitada — ✅ Task 7.
- [ ] Degradação (sem WebGL / `prefers-reduced-motion` / GPU fraca) redireciona para `/livros/lista` — ✅ Task 8.
- [ ] `Room.tsx` não importa nada de livro — ✅ Task 4 (confira com `grep -n "Book\|book" components/livros/Room.tsx`, não deve haver ocorrência).
- [ ] `/livros/lista` e `/livros/[slug]` continuam SSR puro, sem 3D — ✅ Task 9, Step 4.
- [ ] `Canvas` vive em `app/livros/layout.tsx`, não em `page.tsx` — ✅ Task 9.

- [ ] **Step 5: Commit final (se houver ajustes do checklist)**

```bash
git add -A
git commit -m "fix(livros): ajustes finais da verificacao da fase 2"
```

(Só crie este commit se o checklist acima gerou mudanças reais. Se tudo já
estava correto, não há nada para commitar aqui.)
