# Sala de Leitura 3D — Fase 3 (abrir livro) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicar num livro na estante muda a URL para `/livros/[slug]` **sem
desmontar a cena** (rota interceptada), o livro anima saindo da prateleira e
girando pra mostrar a capa, a câmera desliza pro ponto de vista `livro`, e um
painel DOM (`BookOverlay`) aparece com a ficha técnica e a resenha. O botão
voltar do navegador fecha o livro nativamente. Abrir `/livros/[slug]` por link
externo continua funcionando exatamente como hoje (SSR instantâneo), e a sala
3D materializa atrás, com o livro **já aberto, sem animação** (não houve
clique para justificá-la).

**Architecture:** Next.js Parallel + Intercepting Routes
(`app/livros/@livro/(.)[slug]/page.tsx`) resolvem a rota interceptada; o
`<Canvas>` continua vivendo em `app/livros/layout.tsx` (fase 2, inalterado) e
nunca desmonta entre `/livros` e `/livros/[slug]`. A peça central é que **o
overlay DOM e a orquestração 3D não se comunicam entre si** — os dois
derivam independentemente o estado "qual livro está aberto" a partir da
**mesma URL**: a rota interceptada decide isso pelo roteamento do Next
(`@livro/(.)[slug]` só resolve quando o pathname bate), e `RoomCanvasLoader`
decide isso lendo `usePathname()` via a função pura `deriveLivrosMode`. Zero
state compartilhado, zero Context — a URL é a única fonte da verdade.

**Tech Stack:** o mesmo da fase 2 (Next 15 App Router, R3F, drei,
postprocessing) — nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`
**Planos anteriores:** `docs/superpowers/plans/2026-07-28-acervo-de-livros-fase-1.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-2.md`

## Global Constraints

- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`.**
- **Imports internos usam o alias `@/`.**
- **O `<Canvas>` continua em `app/livros/layout.tsx`** — esta fase não move
  nem duplica isso, só estende o que a fase 2 já montou.
- **`Room.tsx` continua sem saber que livros existem** — só ganha mais uma
  âncora nomeada (`leitura`), do mesmo jeito que já publica `estante`. Book.tsx
  e CameraRig.tsx *importam* `ROOM_ANCHORS` (relação já existente desde a
  fase 2); a regra é sobre `Room.tsx` nunca importar nada de livro, não sobre
  ninguém poder importar `Room.tsx`.
- **Degradação (sem WebGL/`prefers-reduced-motion`/GPU fraca) só redireciona
  pra `/livros/lista` na rota `/livros` em si.** Em `/livros/<slug>` a página
  SSR já é um fallback completo e funcional — degradar ali significa apenas
  "não mostrar o 3D", nunca redirecionar para longe de um conteúdo que já
  funciona (ver spec, decisão "Link externo entrega conteúdo primeiro, sala
  depois": *"Se o 3D falhar ou demorar demais, nada acontece: a página
  permanece exatamente como está, funcionando"*).
- **A capa real (`cover_path`) só é baixada quando o livro é aberto** — nunca
  no carregamento da estante. Motivo de performance já estabelecido na fase 1
  (rate limit da Open Library) e reafirmado no spec para a cena 3D.
- **Intercepting routes só ativam em navegação client-side** (`<Link>` ou
  `router.push`) originada de dentro da árvore `/livros/*`. Um link externo, F5
  na própria página, ou digitar a URL direto sempre caem na rota real
  `[slug]/page.tsx` — é assim que o spec distingue "clique na sala" (anima) de
  "link externo" (não anima).
- **Este projeto só cobre com `node --test` lógica pura em `lib/**/*.test.mjs`.**
  Cena, animação e layout de DOM flutuante se verificam olhando.
- **Comentários e textos de interface em português.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/livros-routing.mjs` | `deriveLivrosMode(pathname)` — lógica pura, testada |
| `lib/livros-routing.test.mjs` | `node --test` da função acima |
| `lib/book-dimensions.mjs` | *(modificado)* `toShelfBooks` passa a incluir `coverPath` |
| `components/livros/Room.tsx` | *(modificado)* ganha a âncora `leitura` |
| `components/livros/CameraRig.tsx` | *(modificado)* ganha o viewpoint `'livro'` e o parâmetro `animate` |
| `components/livros/Book.tsx` | *(modificado)* ganha `isOpen`/`animate`, animação de abertura, carga preguiçosa da capa, clique navega |
| `components/livros/Bookshelf.tsx` | *(modificado)* repassa `openSlug`/`animate` pra cada `Book` |
| `components/livros/BookOverlay.tsx` | **novo** — ficha técnica + resenha, usado só pela rota interceptada |
| `app/livros/@livro/default.tsx` | **novo** — fallback do slot paralelo (`null`) |
| `app/livros/@livro/(.)[slug]/page.tsx` | **novo** — rota interceptada: busca o livro, renderiza `BookOverlay` flutuando sobre a cena |
| `app/livros/layout.tsx` | *(modificado)* aceita o slot `livro`, inclui `cover_path` na query |
| `components/livros/RoomCanvasLoader.tsx` | *(modificado)* usa `deriveLivrosMode` em vez de comparar string fixa |
| `components/livros/RoomCanvas.tsx` | *(modificado)* recebe `mode`, decide animar ou não, dispara `trackBookOpened` |
| `app/livros/[slug]/page.tsx` | *(modificado, mínimo)* embrulha o conteúdo num card com fundo, pra ficar legível com a sala atrás |

**Decisão deliberada:** `BookOverlay.tsx` **não** reaproveita o JSX de
`app/livros/[slug]/page.tsx` — são duas apresentações genuinamente diferentes
(painel flutuante sobre fundo escuro vs. página de documento normal) do mesmo
dado, e `[slug]/page.tsx` é código estável da fase 1 que funciona hoje. Um
pouco de duplicação de markup é aceito aqui de propósito, pra não arriscar
uma regressão numa página que já está no ar só para eliminar ~15 linhas
repetidas. Ver `lib/books.ts` para o tipo `Book` que os dois consomem.

---

### Task 1: `lib/livros-routing.mjs` — deriva o modo da sala a partir da URL

**Files:**
- Create: `lib/livros-routing.mjs`
- Create: `lib/livros-routing.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces: `deriveLivrosMode(pathname: string | null | undefined) => {kind:'sala'} | {kind:'livro', slug:string} | null`

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/livros-routing.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveLivrosMode} from './livros-routing.mjs';

test('deriveLivrosMode reconhece a sala', () => {
    assert.deepEqual(deriveLivrosMode('/livros'), {kind: 'sala'});
});

test('deriveLivrosMode ignora a lista — ela nunca ativa o 3D', () => {
    assert.equal(deriveLivrosMode('/livros/lista'), null);
});

test('deriveLivrosMode reconhece um livro pelo slug', () => {
    assert.deepEqual(deriveLivrosMode('/livros/o-nome-do-vento'), {kind: 'livro', slug: 'o-nome-do-vento'});
});

test('deriveLivrosMode ignora rotas fora de /livros', () => {
    assert.equal(deriveLivrosMode('/'), null);
    assert.equal(deriveLivrosMode('/about'), null);
    assert.equal(deriveLivrosMode(null), null);
    assert.equal(deriveLivrosMode(undefined), null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha com `Cannot find module './livros-routing.mjs'`.

- [ ] **Step 3: Implementar**

Create `lib/livros-routing.mjs`:

```js
/**
 * Deriva o "modo" da sala 3D a partir do pathname atual — lógica pura,
 * sem dependências. .mjs pelo mesmo motivo de lib/book-dimensions.mjs: é a
 * única forma de cobrir isso com `node --test` neste projeto.
 *
 * RoomCanvasLoader usa isso pra decidir o que montar; a rota interceptada
 * (app/livros/@livro/(.)[slug]/page.tsx) chega ao mesmo resultado só por
 * como o Next resolve a URL — as duas nunca precisam se comunicar direto.
 */

const SLUG_RE = /^\/livros\/([a-z0-9-]+)$/;

export function deriveLivrosMode(pathname) {
    if (pathname === '/livros') return {kind: 'sala'};
    if (pathname === '/livros/lista') return null;
    const match = typeof pathname === 'string' ? pathname.match(SLUG_RE) : null;
    if (match) return {kind: 'livro', slug: match[1]};
    return null;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```

Esperado: os 4 novos testes em verde, sem quebrar os existentes.

- [ ] **Step 5: Commit**

```bash
git add lib/livros-routing.mjs lib/livros-routing.test.mjs
git commit -m "feat(livros): adiciona deriveLivrosMode para decidir o modo da sala pela URL"
```

---

### Task 2: `lib/book-dimensions.mjs` — `toShelfBooks` passa a incluir `coverPath`

**Files:**
- Modify: `lib/book-dimensions.mjs`
- Modify: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Consumes: nada de novo
- Produces: `toShelfBooks(...)` agora inclui `coverPath: string | null` no formato que `components/livros/Book.tsx` consome (Task 4 amplia `ShelfBookData` pra ter esse campo)

- [ ] **Step 1: Amplie o teste existente**

Modify `lib/book-dimensions.test.mjs`, no teste `toShelfBooks`:

```js
test('toShelfBooks preserva ordem e preenche thicknessM/heightM/coverPath', () => {
    const shelf = toShelfBooks([
        {slug: 'a', title: 'A', author: 'Fulano', rating: '4.5', pages: 300, spine_color: '#ec4899', cover_path: '/livros/capas/a.jpg'},
        {slug: 'b', title: 'B', author: null, rating: null, pages: null, spine_color: null, cover_path: null},
    ]);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0].slug, 'a');
    assert.equal(shelf[0].coverPath, '/livros/capas/a.jpg');
    assert.equal(shelf[1].slug, 'b');
    assert.ok(shelf[0].thicknessM > 0);
    assert.ok(shelf[1].thicknessM > 0, 'livro sem pages usa a mediana do acervo, não quebra');
    assert.equal(shelf[1].spineColor, null);
    assert.equal(shelf[1].coverPath, null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha em `shelf[0].coverPath` (`undefined` !== `'/livros/capas/a.jpg'`).

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
        thicknessM: bookThicknessM(b.pages, mediana),
        heightM: bookHeightM(b.slug),
    }));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs
git commit -m "feat(livros): toShelfBooks inclui coverPath para a fase de abrir o livro"
```

---

### Task 3: âncora `leitura` em `Room.tsx` + viewpoint `'livro'` em `CameraRig.tsx`

**Files:**
- Modify: `components/livros/Room.tsx`
- Modify: `components/livros/CameraRig.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces:
  - `ROOM_ANCHORS.leitura: {position, rotation}` — o ponto fixo onde **qualquer** livro aberto se acomoda (todos convergem pro mesmo lugar; não é por-livro, é uma simplificação deliberada — ver nota abaixo)
  - `Viewpoint = 'geral' | 'estante' | 'livro'`
  - `CameraRig({viewpoint, animate?})` — novo parâmetro `animate` (default `true`)

> **Por que um ponto fixo de leitura, e não a posição de cada livro na
> prateleira:** se cada livro abrisse na própria posição do prumo, a câmera
> do viewpoint `'livro'` teria que ser recalculada por livro — complexidade
> real sem ganho perceptível, já que visualmente "o livro vem até você" é tão
> convincente quanto "a câmera vai até o livro". Um ponto único mantém
> `CameraRig` com viewpoints igualmente simples (`geral`/`estante`/`livro`,
> todos fixos) e Task 4 não precisa de nenhuma prop nova vinda de
> `Bookshelf.tsx` além de `isOpen`/`animate`.

- [ ] **Step 1: Adicione a âncora em `Room.tsx`**

Modify `components/livros/Room.tsx`:

```tsx
export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    leitura: {
        position: [0, 1.3, 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
};
```

- [ ] **Step 2: Adicione o viewpoint `'livro'` e o parâmetro `animate` em `CameraRig.tsx`**

Modify `components/livros/CameraRig.tsx` por completo:

```tsx
'use client';

import {useEffect, useRef} from 'react';
import {CameraControls} from '@react-three/drei';
import {ROOM_ANCHORS} from '@/components/livros/Room';

export type Viewpoint = 'geral' | 'estante' | 'livro';

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
    livro: {
        camera: [leitura[0], leitura[1] + 0.05, leitura[2] + 0.9],
        target: [leitura[0], leitura[1], leitura[2]],
        minAzimuth: -0.2, maxAzimuth: 0.2,
        minPolar: 1.35, maxPolar: 1.6,
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

- [ ] **Step 3: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/livros/Room.tsx components/livros/CameraRig.tsx
git commit -m "feat(livros): adiciona ancora de leitura e viewpoint livro na camera"
```

---

### Task 4: `Book.tsx` — abrir, girar pra capa, carregar capa real, clicar navega

**Files:**
- Modify: `components/livros/Book.tsx`

**Interfaces:**
- Consumes: `ROOM_ANCHORS` de `@/components/livros/Room`; `useRouter` de `next/navigation`
- Produces:
  - `ShelfBookData` ganha o campo `coverPath: string | null`
  - `Book` ganha as props `isOpen: boolean` e `animate: boolean`
  - Clicar num livro fechado chama `router.push('/livros/<slug>')`

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
// quando o livro abre e gira 180°) é a face -z, oposta.
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
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
    isOpen: boolean;
    animate: boolean;
};

function setBoxFaceUV(geometry: THREE.BoxGeometry, faceIndex: number, u0: number, u1: number, v0: number, v1: number) {
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const base = faceIndex * 4;
    for (let i = 0; i < 4; i++) {
        const vi = base + i;
        const oldU = uv.getX(vi);
        const oldV = uv.getY(vi);
        uv.setXY(vi, u0 + oldU * (u1 - u0), v0 + oldV * (v1 - v0));
    }
    uv.needsUpdate = true;
}

export default function Book({book, position, atlasTexture, uvRange, isOpen, animate}: BookProps) {
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

    // A capa real só é baixada quando o livro é aberto — ver spec, "Atlas de
    // lombadas": a API de covers da Open Library tem rate limit, então a
    // estante inteira nunca carrega 51 capas de uma vez, só a que abriu.
    useEffect(() => {
        if (!isOpen || !book.coverPath || coverTexture) return;
        let cancelado = false;
        new THREE.TextureLoader().load(book.coverPath, (tex) => {
            if (cancelado) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            setCoverTexture(tex);
        });
        return () => {
            cancelado = true;
        };
    }, [isOpen, book.coverPath, coverTexture]);

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

        const distanciaAtual = groupRef.current.position.length();
        const velocidade = (isOpen || distanciaAtual > DESLOCAMENTO_GRANDE_M) ? OPEN_LERP_SPEED : HOVER_LERP_SPEED;

        const alvoX = isOpen ? OPEN_LOCAL_POSITION[0] : 0;
        const alvoY = isOpen ? OPEN_LOCAL_POSITION[1] : 0;
        const alvoZ = isOpen ? OPEN_LOCAL_POSITION[2] : (hovered ? HOVER_SLIDE_M : 0);
        const alvoRotX = isOpen ? OPEN_TILT_RAD : (hovered ? -HOVER_TILT_RAD : 0);
        const alvoRotY = isOpen ? Math.PI : 0;

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

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: erros em `Bookshelf.tsx` (falta passar `isOpen`/`animate`) — normal, resolvido na Task 5.

- [ ] **Step 3: Commit**

```bash
git add components/livros/Book.tsx
git commit -m "feat(livros): Book anima abertura, carrega capa sob demanda e navega ao clicar"
```

---

### Task 5: `Bookshelf.tsx` — repassa `openSlug`/`animate`

**Files:**
- Modify: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: `ShelfBookData` (Task 4), `SpineAtlas`
- Produces: `Bookshelf({shelfBooks, atlas, openSlug, animate})`

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

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {shelfBooks.map((book, i) => (
                <Book
                    key={book.slug}
                    book={book}
                    position={[posicoes[i], book.heightM / 2, 0]}
                    atlasTexture={atlas.texture}
                    uvRange={{u0: atlas.layout.spines[i].u0, u1: atlas.layout.spines[i].u1}}
                    isOpen={book.slug === openSlug}
                    animate={animate}
                />
            ))}
        </group>
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: erro em `RoomCanvas.tsx` (ainda chama `<Bookshelf shelfBooks={...} atlas={...}/>` sem `openSlug`/`animate`) — resolvido na Task 9.

- [ ] **Step 3: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "feat(livros): Bookshelf repassa openSlug e animate para cada Book"
```

---

### Task 6: `BookOverlay.tsx` — ficha técnica + resenha

**Files:**
- Create: `components/livros/BookOverlay.tsx`

**Interfaces:**
- Consumes: `type Book` de `@/lib/books`; `getCategory` de `@/lib/book-categories.mjs`; `corDeTextoSobre` de `@/lib/contraste.mjs`; `StarRating` de `@/components/livros/StarRating`
- Produces: `export default function BookOverlay({livro}: {livro: Book})`

> **Atenção ao nome:** este arquivo importa o **tipo** `Book` de `lib/books.ts`
> (o registro do banco), que não tem relação com o **componente** `Book` de
> `components/livros/Book.tsx` (a malha 3D). Este arquivo não importa esse
> componente — não há colisão de fato, só cuidado ao ler o código.

- [ ] **Step 1: Implementar**

```tsx
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import {getCategory} from '@/lib/book-categories.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';
import StarRating from '@/components/livros/StarRating';
import type {Book} from '@/lib/books';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
const REMAP_HEADINGS = {
    h1: ({node, ...props}: any) => <h2 {...props}/>,
    h2: ({node, ...props}: any) => <h3 {...props}/>,
    h3: ({node, ...props}: any) => <h4 {...props}/>,
    h4: ({node, ...props}: any) => <h5 {...props}/>,
    h5: ({node, ...props}: any) => <h6 {...props}/>,
    h6: ({node, ...props}: any) => <h6 {...props}/>,
};
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

export default function BookOverlay({livro}: {livro: Book}) {
    const categoria = getCategory(livro.category);

    return (
        <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-3">
                {livro.cover_path && (
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded shadow-lg">
                        <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill sizes="220px"
                               className="object-cover"/>
                    </div>
                )}
                <h2 className="text-xl font-bold text-white">{livro.title}</h2>
                {livro.author && <p className="text-sm text-white/70">{livro.author}</p>}
                <StarRating nota={livro.rating} tamanho="text-base"/>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
                    {livro.year && (<><dt className="font-medium">Ano</dt><dd>{livro.year}</dd></>)}
                    {livro.pages && (<><dt className="font-medium">Páginas</dt><dd>{livro.pages}</dd></>)}
                </dl>

                <div className="flex flex-wrap gap-2">
                    {categoria && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{backgroundColor: categoria.cor, color: corDeTextoSobre(categoria.cor)}}>
                            {categoria.nome}
                        </span>
                    )}
                    {livro.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="prose prose-sm prose-invert max-h-[60vh] max-w-none overflow-y-auto pr-2">
                {livro.review ? (
                    <ReactMarkdown components={REMAP_HEADINGS}>{livro.review}</ReactMarkdown>
                ) : (
                    <p className="italic text-white/50">Resenha ainda não escrita.</p>
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
git add components/livros/BookOverlay.tsx
git commit -m "feat(livros): adiciona BookOverlay com ficha tecnica e resenha"
```

---

### Task 7: rota interceptada `@livro/(.)[slug]`

**Files:**
- Create: `app/livros/@livro/default.tsx`
- Create: `app/livros/@livro/(.)[slug]/page.tsx`

**Interfaces:**
- Consumes: `buscarLivroPorSlug` de `@/lib/books`; `BookOverlay` (Task 6)
- Produces: navegar de dentro de `/livros` pra um livro renderiza este componente, mantendo a cena montada

- [ ] **Step 1: Fallback do slot paralelo**

Create `app/livros/@livro/default.tsx`:

```tsx
export default function DefaultLivroSlot() {
    return null;
}
```

Sem isso, o Next não sabe o que renderizar no slot `@livro` quando a rota
ativa é `/livros` ou `/livros/lista` (que não batem com `(.)[slug]`), e a
navegação quebra com 404 no slot.

- [ ] **Step 2: A rota interceptada**

Create `app/livros/@livro/(.)[slug]/page.tsx`:

```tsx
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {buscarLivroPorSlug} from '@/lib/books';
import BookOverlay from '@/components/livros/BookOverlay';

export default async function LivroInterceptado({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
            <div className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl
                            bg-black/70 p-8 shadow-2xl backdrop-blur-md">
                <Link href="/livros"
                      className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
                      aria-label="Fechar">
                    ✕ fechar
                </Link>
                <BookOverlay livro={livro}/>
            </div>
        </div>
    );
}
```

`<Link href="/livros">` fecha o livro de volta pra sala — complementa (não
substitui) o botão voltar do navegador, que já funciona de graça por ser uma
navegação client-side normal do Next.

- [ ] **Step 3: Verificação de tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/livros/@livro
git commit -m "feat(livros): rota interceptada abre o livro sem desmontar a sala"
```

---

### Task 8: `app/livros/layout.tsx` — slot `livro` + `cover_path` na query

**Files:**
- Modify: `app/livros/layout.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces: `LivrosLayout({children, livro})` — o parâmetro `livro` é o slot paralelo que o Next injeta automaticamente por causa da pasta `@livro`

- [ ] **Step 1: Modificar**

```tsx
import {listarLivros} from '@/lib/books';
import RoomCanvasLoader from '@/components/livros/RoomCanvasLoader';

export default async function LivrosLayout({children, livro}: {
    children: React.ReactNode;
    livro: React.ReactNode;
}) {
    const livrosLidos = await listarLivros({status: 'lido'});

    const shelvedBooks = livrosLidos.map((l) => ({
        slug: l.slug,
        title: l.title,
        author: l.author,
        rating: l.rating,
        pages: l.pages,
        spine_color: l.spine_color,
        cover_path: l.cover_path,
    }));

    return (
        <>
            <RoomCanvasLoader books={shelvedBooks}/>
            {children}
            {livro}
        </>
    );
}
```

Repare que o `map` usa `l`, não `livro` — o parâmetro da função já se chama
`livro` (o slot paralelo), então reusar o nome dentro do `map` esconderia essa
variável.

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: erro em `RoomCanvasLoader.tsx`/`RoomCanvas.tsx` (`cover_path` novo no shape, `mode` ainda não existe) — resolvido na Task 9.

- [ ] **Step 3: Commit**

```bash
git add app/livros/layout.tsx
git commit -m "feat(livros): layout aceita o slot livro e inclui cover_path na query"
```

---

### Task 9: `RoomCanvasLoader.tsx` + `RoomCanvas.tsx` — modo, degradação por rota, `trackBookOpened`

**Files:**
- Modify: `components/livros/RoomCanvasLoader.tsx`
- Modify: `components/livros/RoomCanvas.tsx`

**Interfaces:**
- Consumes: `deriveLivrosMode` (Task 1); `trackBookOpened` de `@/utils/analytics` (já existe desde a fase 1, agora finalmente chamado)
- Produces:
  - `type LivrosMode = {kind:'sala'} | {kind:'livro', slug:string}`
  - `RoomCanvasProps = {books: ShelvedBookInput[]; mode: LivrosMode}`
  - `ShelvedBookInput` ganha `cover_path: string | null`

- [ ] **Step 1: `RoomCanvasLoader.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {deriveLivrosMode} from '@/lib/livros-routing.mjs';
import type {RoomCanvasProps} from '@/components/livros/RoomCanvas';

const RoomCanvas = dynamic(() => import('@/components/livros/RoomCanvas'), {ssr: false});

/**
 * Ativa a sala 3D em /livros (modo 'sala') e em /livros/<slug> (modo 'livro',
 * livro pré-aberto) — nunca em /livros/lista. `deriveLivrosMode` decide isso
 * ANTES de renderizar <RoomCanvas/>, então o `dynamic()` nunca carrega o
 * chunk de three/r3f/drei fora dessas duas rotas.
 */
export default function RoomCanvasLoader(props: Omit<RoomCanvasProps, 'mode'>) {
    const pathname = usePathname();
    const mode = deriveLivrosMode(pathname);
    if (!mode) return null;
    return <RoomCanvas {...props} mode={mode}/>;
}
```

- [ ] **Step 2: `RoomCanvas.tsx`**

```tsx
'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {trackRoomLoaded, trackListFallback, trackBookOpened} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
    cover_path: string | null;
};

export type LivrosMode = {kind: 'sala'} | {kind: 'livro'; slug: string};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
    mode: LivrosMode;
};

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

export default function RoomCanvas({books, mode}: RoomCanvasProps) {
    const router = useRouter();
    const openSlug = mode.kind === 'livro' ? mode.slug : null;

    const [manualViewpoint, setManualViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);
    const [degradado, setDegradado] = useState(false);

    const shelfBooks = useMemo(() => toShelfBooks(books), [books]);

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

    if (degradado || !atlas) return null;

    const viewpoint: Viewpoint = openSlug ? 'livro' : manualViewpoint;

    return (
        <>
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions}/>
                    <CameraRig viewpoint={viewpoint} animate={animateTransitions}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && (
                <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                    <button
                        onClick={() => setManualViewpoint('geral')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'geral' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Sala
                    </button>
                    <button
                        onClick={() => setManualViewpoint('estante')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'estante' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Estante
                    </button>
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 3: `tsc` para conferir tipos em todo o projeto**

```bash
npx tsc --noEmit
```

Esperado: nenhum erro — esta é a task que fecha todas as pontas soltas das
tasks 4, 5 e 8.

- [ ] **Step 4: Commit**

```bash
git add components/livros/RoomCanvasLoader.tsx components/livros/RoomCanvas.tsx
git commit -m "feat(livros): RoomCanvas orquestra abrir/fechar livro por modo de rota"
```

---

### Task 10: `app/livros/[slug]/page.tsx` — card de fundo pra legibilidade sobre a sala

**Files:**
- Modify: `app/livros/[slug]/page.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces: mesmo conteúdo, só com um fundo sólido/translúcido por trás

- [ ] **Step 1: Modificar só a div de conteúdo**

Modify `app/livros/[slug]/page.tsx`, trocando:

```tsx
            <div className="mx-auto max-w-3xl">
```

por:

```tsx
            <div className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-6 shadow-xl
                            backdrop-blur-sm dark:bg-black/70 sm:p-10">
```

Sem isso, quando a sala 3D materializar atrás (fixed, `-z-10`), o texto ficaria
flutuando direto sobre a cena, sem contraste garantido. Com o card, a página
funciona igual de bem com ou sem o 3D atrás — inclusive no caso de degradação
(Task 9, `setDegradado(true)`), onde o 3D nunca aparece.

- [ ] **Step 2: Verificação visual**

Confirmar na Task 11 que a página `/livros/[slug]` continua com boa aparência
tanto sozinha (JS desabilitado ou degradação) quanto com a sala atrás.

- [ ] **Step 3: Commit**

```bash
git add "app/livros/[slug]/page.tsx"
git commit -m "fix(livros): pagina do livro ganha card de fundo para legibilidade sobre a sala"
```

---

### Task 11: verificação visual end-to-end

**Files:** nenhum arquivo novo — só verificação manual.

- [ ] **Step 1: Rodar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Fluxo "clique na sala" (com animação)**

1. Abra `/livros`.
2. Clique num livro na prateleira.
3. Confirme: a URL muda para `/livros/<slug>` sem a página recarregar (sem
   flash branco); o livro sai da prateleira, gira e vai até a posição de
   leitura; a câmera desliza suavemente até o viewpoint `livro`; o painel
   `BookOverlay` aparece com capa/título/autor/nota/ano/páginas/categoria/tags/
   resenha; os botões "Sala"/"Estante" desaparecem.
4. Clique "✕ fechar" (ou aperte voltar do navegador). Confirme: a URL volta
   pra `/livros`, o painel some, o livro volta pra prateleira, a câmera volta
   pro viewpoint anterior, os botões reaparecem.

- [ ] **Step 3: Fluxo "link direto" (sem animação)**

1. Cole a URL de um livro específico (`/livros/<slug>`) direto na barra de
   endereço e dê Enter (navegação dura, não client-side).
2. Confirme: o conteúdo SSR (`[slug]/page.tsx`, com o card de fundo da Task 10)
   aparece **imediatamente**, sem esperar o 3D.
3. Alguns instantes depois, confirme que a sala materializa atrás (fixed,
   z-index negativo) com o livro **já aberto e a câmera já no viewpoint
   `livro`, sem nenhuma animação de abertura** — comparar com o Step 2, a
   diferença deve ser nítida (um anima, o outro não).

- [ ] **Step 4: Carga da capa sob demanda**

Com a aba de Network do devtools aberta, filtrando por imagens: confirme que
nenhuma requisição de capa dispara ao carregar `/livros` (só a lombada, via
atlas), e que uma requisição de capa dispara **só** quando um livro
específico é aberto (Step 2 ou Step 3).

- [ ] **Step 5: Degradação em `/livros/<slug>` não redireciona**

No devtools, emule `prefers-reduced-motion: reduce` (Rendering tab) e recarregue
`/livros/<slug>` direto. Confirme: a página continua mostrando o conteúdo SSR
normalmente, **sem** redirecionar para `/livros/lista` (diferente do
comportamento em `/livros` puro, que continua redirecionando — reconfirmar
isso também).

- [ ] **Step 6: Nenhuma regressão nas rotas existentes**

Confirme `/livros/lista` continua sem nenhum `<canvas>` no DOM
(`document.querySelectorAll('canvas').length === 0` no console).

---

### Task 12: verificação final da fase 3

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Testes**

```bash
npm test
```

Esperado: todos verdes, incluindo os novos `lib/livros-routing.test.mjs` e o
teste ampliado de `toShelfBooks`.

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
princípio validado na fase 2.

- [ ] **Step 4: Checklist final contra o spec (fase 3)**

- [ ] Clicar num livro muda a URL sem desmontar a cena (rota interceptada) — ✅ Task 7.
- [ ] O botão voltar do navegador fecha o livro nativamente — ✅ consequência da Task 9 (estado deriva 100% da URL).
- [ ] Livro anima saindo da prateleira, girando pra mostrar a capa — ✅ Task 4.
- [ ] Câmera desliza pro ponto de vista `livro` — ✅ Task 3 + 9.
- [ ] Painel DOM com ficha técnica + resenha aparece — ✅ Task 6 + 7.
- [ ] Link externo entrega conteúdo primeiro, sala depois, sem animação — ✅ Task 4 (snap) + Task 9 (`instantOpen`).
- [ ] Degradação em `/livros/<slug>` nunca redireciona pra longe de conteúdo que já funciona — ✅ Task 9.
- [ ] Capa real baixada só quando o livro abre — ✅ Task 4.
- [ ] `Room.tsx` continua sem importar nada de livro — ✅ Task 3 (só ganhou uma âncora).

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "fix(livros): ajustes finais da verificacao da fase 3"
```
