# Sala de Leitura 3D — Fase 5 (mobile) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar a mesma cena 3D (nenhuma cena nova, nenhum componente
duplicado) para celular: no viewpoint `estante`, arrastar com um dedo desliza
a câmera lateralmente ao longo da prateleira (trilho, limitado à largura real
dela — sem órbita livre); em qualquer outro viewpoint, o toque não move a
câmera pra lugar nenhum; tocar num livro abre direto, sem estado
intermediário de hover (sem tooltip piscando, sem "sair da prateleira" antes
de abrir); e o DPR cai pra 1 em vez do padrão do R3F, pra aliviar GPU.

**Architecture:** Detecção de mobile via `matchMedia('(pointer: coarse)')` —
o sinal correto pro problema real do spec ("hover não existe, arrastar
competiria com scroll"), não o tamanho de tela. Um hook novo,
`useIsMobile()`, é a única fonte disso; `RoomCanvas.tsx` o lê uma vez e
propaga `isMobile` pra baixo (`Canvas dpr`, `CameraRig`, `Bookshelf`/
`DeskBooks` → `Book`), do mesmo jeito que `atlas`/`animate`/`openSlug` já são
propagados desde as fases 2-4. O trilho em si é configuração nativa da
`camera-controls` (biblioteca por trás do `<CameraControls>` do drei):
`touches.one = TOUCH_TRUCK` faz um dedo arrastar em vez de orbitar, e
`setBoundary(box3)` prende o alvo dentro da largura real da estante — nenhuma
lógica de "trilho" precisa ser escrita à mão.

**Tech Stack:** o mesmo das fases 2-4 (Next 15 App Router, R3F, drei,
`camera-controls`, postprocessing) — nenhuma dependência nova. `camera-controls`
já é peer dependency do `<CameraControls>` do drei desde a fase 2.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`
(seção "Interações" → sub-seção "5. Mobile recebe a sala, adaptada")
**Planos anteriores:** `docs/superpowers/plans/2026-07-28-acervo-de-livros-fase-1.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-2.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-3.md`,
`docs/superpowers/plans/2026-07-30-sala-de-leitura-3d-fase-4.md`

## Global Constraints

- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`.**
- **Imports internos usam o alias `@/`.**
- **O `<Canvas>` continua em `app/livros/layout.tsx`** — esta fase não move
  nem duplica isso.
- **Mobile não é degradação.** `detectaMotivoDegradacao` (em
  `RoomCanvas.tsx`) continua decidindo *apenas* WebGL ausente,
  `prefers-reduced-motion` e poucos núcleos de CPU — nenhum desses sinais
  muda nesta fase, e nenhum deles deve passar a significar "é celular". Um
  celular capaz continua recebendo a sala 3D adaptada, nunca o fallback de
  `/livros/lista`.
- **O sinal de mobile é `pointer: coarse`, não largura de tela.** O próprio
  spec justifica isso: os problemas reais são de *interação* (hover não
  existe; arrastar competiria com scroll), não de GPU — um notebook com tela
  estreita não deve ganhar o comportamento de toque.
- **Nenhum componente novo de cena.** A adaptação é só: (a) config de câmera
  por dispositivo, (b) um prop `isMobile` que já existe (não recria) o
  comportamento de hover em `Book.tsx`, (c) `dpr` do `<Canvas>`.
- **Este projeto só cobre com `node --test` lógica pura em `lib/**/*.test.mjs`.**
  Detecção de mobile, configuração de câmera e gating de hover são
  browser-only — verificados olhando (com emulação de toque do DevTools),
  mesma convenção das fases anteriores.
- **Comentários e textos de interface em português.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/book-dimensions.mjs` | *(modificado)* exporta `SHELF_GAP_M`; nova `shelfWidthM(shelfBooks)` |
| `lib/book-dimensions.test.mjs` | *(modificado)* cobre `shelfWidthM` |
| `components/livros/use-is-mobile.ts` | **novo** — `useIsMobile()`, único ponto de detecção |
| `components/livros/Book.tsx` | *(modificado)* prop `isMobile` — em mobile, hover nunca liga (tap abre direto, sem estado intermediário) |
| `components/livros/Bookshelf.tsx` | *(modificado)* usa `shelfWidthM`/`SHELF_GAP_M` do lib (dedup), repassa `isMobile` |
| `components/livros/DeskBooks.tsx` | *(modificado)* repassa `isMobile` |
| `components/livros/CameraRig.tsx` | *(modificado)* props `isMobile`/`shelfWidthM`; trilho só no viewpoint `estante` em mobile (`touches.one = TOUCH_TRUCK` + `setBoundary`) |
| `components/livros/RoomCanvas.tsx` | *(modificado)* `useIsMobile()`, `dpr` do `<Canvas>`, calcula a largura da estante visível e propaga tudo |

**Decisão deliberada 1 — o trilho existe só no viewpoint `estante`.** O spec
diz "arrastar navega lateralmente **pela estante**" — não pela sala inteira.
Nos outros viewpoints (`geral`/`mesa`/`livro`/`indice`), que são momentos de
"olhar uma coisa só" e não de "explorar uma fileira", o toque em mobile cai
de volta pra `TOUCH_ROTATE` (a mesma órbita curta e travada que o desktop já
usa via `minAzimuthAngle`/`maxAzimuthAngle`). A alternativa — deixar
`TOUCH_TRUCK` ligado em todo lugar — arrastaria a câmera livremente pra fora
de qualquer boundary nesses viewpoints (já que só a estante ganha
`setBoundary`), o que é pior que not-having-drag-at-all.

**Decisão deliberada 2 — a largura do trilho vem de uma função pura nova,
não de uma conta duplicada.** `Bookshelf.tsx` já somava espessura+gap pra
centralizar os livros; `RoomCanvas.tsx` agora precisa do mesmo número pra
configurar o boundary da câmera. Em vez de duas contas iguais em dois
arquivos, `shelfWidthM` vai pro `lib/book-dimensions.mjs` (onde já vive toda
a lógica pura de dimensão) e os dois consomem a mesma função — inclusive
`SHELF_GAP_M` (renomeado do `GAP_M` local de `Bookshelf.tsx`) vira exportado,
única fonte do espaçamento entre livros.

---

### Task 1: `lib/book-dimensions.mjs` — `SHELF_GAP_M` exportado + `shelfWidthM`

**Files:**
- Modify: `lib/book-dimensions.mjs`
- Modify: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Consumes: nada novo
- Produces: `SHELF_GAP_M: number` (o antigo `GAP_M` local de `Bookshelf.tsx`,
  agora exportado); `shelfWidthM(shelfBooks: {thicknessM: number}[]) => number`

- [ ] **Step 1: Escreva o teste que falha**

Modify `lib/book-dimensions.test.mjs`, ajustando o import no topo para
incluir `shelfWidthM` e `SHELF_GAP_M`:

```js
import {
    medianPages, bookThicknessM, bookHeightM, layoutSpineAtlas, toShelfBooks, layoutDeskBooks,
    shelfWidthM, SHELF_GAP_M,
    SPINE_THICKNESS_MIN_M, SPINE_THICKNESS_MAX_M, BOOK_HEIGHT_BASE_M, BOOK_HEIGHT_VARIANCE_M,
} from './book-dimensions.mjs';
```

E adicione, no final do arquivo:

```js
test('shelfWidthM soma as espessuras mais os espaçamentos entre livros', () => {
    const largura = shelfWidthM([
        {thicknessM: 0.02},
        {thicknessM: 0.03},
        {thicknessM: 0.015},
    ]);
    const esperado = 0.02 + 0.03 + 0.015 + 2 * SHELF_GAP_M; // 2 gaps entre 3 livros
    assert.ok(Math.abs(largura - esperado) < 1e-9);
});

test('shelfWidthM devolve 0 para estante vazia', () => {
    assert.equal(shelfWidthM([]), 0);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test
```

Esperado: falha com `Cannot find export shelfWidthM` (ou `SHELF_GAP_M`).

- [ ] **Step 3: Implementar**

Modify `lib/book-dimensions.mjs`, adicionando ao final do arquivo:

```js
export const SHELF_GAP_M = 0.003;

/**
 * Largura total da estante — soma das espessuras mais o espaçamento entre
 * livros. Extraída pra cá porque Bookshelf.tsx (posiciona os livros) e
 * RoomCanvas.tsx (configura o boundary do trilho mobile — ver plano da
 * fase 5) precisam do mesmo número; antes só Bookshelf.tsx calculava isso
 * inline.
 */
export function shelfWidthM(shelfBooks) {
    if (shelfBooks.length === 0) return 0;
    return shelfBooks.reduce((soma, b) => soma + b.thicknessM + SHELF_GAP_M, 0) - SHELF_GAP_M;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs
git commit -m "feat(livros): exporta SHELF_GAP_M e adiciona shelfWidthM"
```

---

### Task 2: `use-is-mobile.ts` — detecção única de dispositivo touch

**Files:**
- Create: `components/livros/use-is-mobile.ts`

**Interfaces:**
- Consumes: nada
- Produces: `useIsMobile() => boolean`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {useState} from 'react';

/**
 * Detecta dispositivo touch-primário via `pointer: coarse` — o sinal certo
 * pro problema real do spec (hover não existe, arrastar compete com
 * scroll), não o tamanho de tela: um notebook de tela estreita não deve
 * ganhar o comportamento de toque.
 *
 * Lido uma vez só, na inicialização: o tipo de ponteiro de um aparelho não
 * muda no meio de uma sessão, então um listener de mudança seria
 * complexidade sem ganho — mesmo espírito de `detectaMotivoDegradacao` em
 * RoomCanvas.tsx.
 */
export function useIsMobile(): boolean {
    const [isMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true,
    );
    return isMobile;
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/livros/use-is-mobile.ts
git commit -m "feat(livros): adiciona useIsMobile para detectar toque via pointer: coarse"
```

---

### Task 3: `Book.tsx` — em mobile, hover nunca liga

**Files:**
- Modify: `components/livros/Book.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces: `Book` ganha a prop obrigatória `isMobile: boolean`

- [ ] **Step 1: Adicione a prop ao tipo**

Modify `components/livros/Book.tsx`, o tipo `BookProps`:

```tsx
type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
    isOpen: boolean;
    animate: boolean;
    isMobile: boolean;
    restVariant?: 'lombada' | 'capa';
    restRotationY?: number;
};
```

- [ ] **Step 2: Receba a prop e gate os handlers de hover**

Modify a assinatura da função:

```tsx
export default function Book({
    book, position, atlasTexture, uvRange, isOpen, animate, isMobile,
    restVariant = 'lombada', restRotationY = 0,
}: BookProps) {
```

E os handlers no JSX final (só `onPointerOver`/`onPointerOut` mudam —
`onClick` fica igual, é o que já abre o livro num tap único):

```tsx
            onPointerOver={(e) => {
                if (isOpen || isMobile) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isOpen || isMobile) return;
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
```

Como `hovered` nunca vira `true` em mobile, o tooltip (`{hovered && !isOpen && ...}`)
nunca aparece e o `useFrame` nunca aplica o deslize/inclinação de hover — o
livro fica parado no lugar até o toque virar `isOpen`, que dispara a
animação de abertura direto. Nenhuma outra linha do arquivo muda.

- [ ] **Step 3: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: erros em `Bookshelf.tsx` e `DeskBooks.tsx` (chamam `<Book>` sem
`isMobile`) — normal, resolvido nas Tasks 4 e 5.

- [ ] **Step 4: Commit**

```bash
git add components/livros/Book.tsx
git commit -m "feat(livros): Book ganha isMobile, hover nunca liga em toque"
```

---

### Task 4: `Bookshelf.tsx` — usa `shelfWidthM`/`SHELF_GAP_M`, repassa `isMobile`

**Files:**
- Modify: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: `shelfWidthM`/`SHELF_GAP_M` (Task 1)
- Produces: `Bookshelf({shelfBooks, atlas, openSlug, animate, isMobile})`

- [ ] **Step 1: Reescreva `components/livros/Bookshelf.tsx` por completo**

```tsx
'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {shelfWidthM, SHELF_GAP_M} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

type BookshelfProps = {
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

export default function Bookshelf({shelfBooks, atlas, openSlug, animate, isMobile}: BookshelfProps) {
    const larguraTotal = shelfWidthM(shelfBooks);

    let xAtual = -larguraTotal / 2;
    const posicoes = shelfBooks.map((b) => {
        const x = xAtual + b.thicknessM / 2;
        xAtual += b.thicknessM + SHELF_GAP_M;
        return x;
    });

    const anchor = ROOM_ANCHORS.estante;
    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

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
                        isMobile={isMobile}
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

Esperado: erro em `RoomCanvas.tsx` (chama `<Bookshelf>` sem `isMobile`) —
resolvido na Task 7.

- [ ] **Step 3: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "fix(livros): Bookshelf usa shelfWidthM/SHELF_GAP_M do lib e repassa isMobile"
```

---

### Task 5: `DeskBooks.tsx` — repassa `isMobile`

**Files:**
- Modify: `components/livros/DeskBooks.tsx`

**Interfaces:**
- Consumes: nada novo
- Produces: `DeskBooks({deskBooks, atlas, openSlug, animate, isMobile})`

- [ ] **Step 1: Modifique `components/livros/DeskBooks.tsx`**

Adicione `isMobile: boolean` ao tipo `DeskBooksProps` e repasse pro `<Book>`:

```tsx
type DeskBooksProps = {
    deskBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

export default function DeskBooks({deskBooks, atlas, openSlug, animate, isMobile}: DeskBooksProps) {
    const anchor = ROOM_ANCHORS.mesa;
    const layout = layoutDeskBooks(deskBooks.map((b) => b.slug));

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {deskBooks.map((book) => {
                const slot = layout.find((l: {slug: string}) => l.slug === book.slug);
                if (!slot) return null;
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[slot.x, DESK_BOOK_Y_OFFSET_M, slot.z]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: 0, u1: 1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        isMobile={isMobile}
                        restVariant="capa"
                        restRotationY={slot.rotationY}
                    />
                );
            })}
        </group>
    );
}
```

O resto do arquivo (imports, `DESK_BOOK_Y_OFFSET_M`, o comentário de topo)
fica igual.

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: mesmo erro pendente em `RoomCanvas.tsx` — resolvido na Task 7.

- [ ] **Step 3: Commit**

```bash
git add components/livros/DeskBooks.tsx
git commit -m "feat(livros): DeskBooks repassa isMobile"
```

---

### Task 6: `CameraRig.tsx` — trilho mobile na estante

**Files:**
- Modify: `components/livros/CameraRig.tsx`

**Interfaces:**
- Consumes: `CameraControlsImpl` (a classe real por trás do `<CameraControls>`
  do drei, que já a re-exporta — `import {CameraControls, CameraControlsImpl} from '@react-three/drei'`)
- Produces: `CameraRig({viewpoint, animate?, isMobile?, shelfWidthM?})`

> **Como funciona:** a biblioteca `camera-controls` (por trás do
> `<CameraControls>` do drei) tem uma propriedade `touches.one` que decide o
> que um arrasto de um dedo faz — por padrão, `TOUCH_ROTATE` (órbita).
> Trocando pra `TOUCH_TRUCK`, o mesmo gesto desliza a câmera lateralmente em
> vez de orbitar — exatamente o "trilho" do spec. `setBoundary(box3)` prende
> o alvo dentro de uma caixa, impedindo que o trilho deslize pra fora da
> estante. R3F aceita propriedades aninhadas via prop com hífen
> (`touches-one`), então `touches.one` não precisa de uma chamada imperativa
> — só `setBoundary` precisa, por ser um método, não uma propriedade.

- [ ] **Step 1: Reescreva `components/livros/CameraRig.tsx` por completo**

```tsx
'use client';

import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {CameraControls, CameraControlsImpl} from '@react-three/drei';
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
    indice: {
        camera: [indicePos[0], indicePos[1] + 0.35, indicePos[2] + 0.3],
        target: [indicePos[0], indicePos[1], indicePos[2]],
        minAzimuth: -0.15, maxAzimuth: 0.15,
        minPolar: 0.9, maxPolar: 1.2,
    },
};

// Boundary do trilho mobile: o alvo só desliza lateralmente (X) dentro da
// largura real da estante; a folga em Y/Z é só o suficiente pra tolerar o
// pequeno bounce da biblioteca ao soltar o arrasto perto da borda.
const TRILHO_FOLGA_X_M = 0.1;
const TRILHO_FOLGA_YZ_M = 0.05;

type CameraRigProps = {
    viewpoint: Viewpoint;
    animate?: boolean;
    isMobile?: boolean;
    shelfWidthM?: number;
};

export default function CameraRig({viewpoint, animate = true, isMobile = false, shelfWidthM = 0}: CameraRigProps) {
    const controlsRef = useRef<CameraControls>(null);
    const v = VIEWPOINTS[viewpoint];
    // Spec: "arrastar navega lateralmente pela estante" — só esse
    // viewpoint vira trilho em mobile; nos outros, um dedo continua
    // orbitando (a mesma órbita curta e travada do desktop).
    const trilhoAtivo = isMobile && viewpoint === 'estante';

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint]);

    useEffect(() => {
        if (!controlsRef.current) return;
        if (trilhoAtivo) {
            const alvo = VIEWPOINTS.estante.target;
            const caixa = new THREE.Box3(
                new THREE.Vector3(
                    alvo[0] - shelfWidthM / 2 - TRILHO_FOLGA_X_M,
                    alvo[1] - TRILHO_FOLGA_YZ_M,
                    alvo[2] - TRILHO_FOLGA_YZ_M,
                ),
                new THREE.Vector3(
                    alvo[0] + shelfWidthM / 2 + TRILHO_FOLGA_X_M,
                    alvo[1] + TRILHO_FOLGA_YZ_M,
                    alvo[2] + TRILHO_FOLGA_YZ_M,
                ),
            );
            controlsRef.current.setBoundary(caixa);
        } else {
            controlsRef.current.setBoundary(undefined);
        }
    }, [trilhoAtivo, shelfWidthM]);

    return (
        <CameraControls
            ref={controlsRef}
            minAzimuthAngle={v.minAzimuth}
            maxAzimuthAngle={v.maxAzimuth}
            minPolarAngle={v.minPolar}
            maxPolarAngle={v.maxPolar}
            dollySpeed={0}
            truckSpeed={trilhoAtivo ? 2 : 0}
            touches-one={trilhoAtivo ? CameraControlsImpl.ACTION.TOUCH_TRUCK : CameraControlsImpl.ACTION.TOUCH_ROTATE}
        />
    );
}
```

- [ ] **Step 2: `tsc` para conferir tipos**

```bash
npx tsc --noEmit
```

Esperado: mesmo erro pendente em `RoomCanvas.tsx` — resolvido na Task 7.

- [ ] **Step 3: Commit**

```bash
git add components/livros/CameraRig.tsx
git commit -m "feat(livros): CameraRig ganha trilho mobile na estante"
```

---

### Task 7: `RoomCanvas.tsx` — liga `useIsMobile`, `dpr` e propaga tudo

**Files:**
- Modify: `components/livros/RoomCanvas.tsx`

**Interfaces:**
- Consumes: `useIsMobile` (Task 2); `shelfWidthM` de `@/lib/book-dimensions.mjs` (Task 1)
- Produces: nenhuma mudança de tipo público — só passa `isMobile`/`dpr`/
  largura da estante pros componentes filhos

- [ ] **Step 1: Ajuste os imports**

Modify `components/livros/RoomCanvas.tsx`, trocando a linha de import de
`lib/book-dimensions.mjs`:

```tsx
import {toShelfBooks, shelfWidthM} from '@/lib/book-dimensions.mjs';
```

E adicione, junto aos outros imports de `components/livros/`:

```tsx
import {useIsMobile} from '@/components/livros/use-is-mobile';
```

- [ ] **Step 2: Compute `isMobile` e a largura da estante visível**

Modify o corpo de `RoomCanvas`, logo após as declarações de `useState`
existentes:

```tsx
    const isMobile = useIsMobile();
```

E logo após a declaração de `shelfBooksVisiveis`:

```tsx
    const larguraEstanteM = useMemo(() => shelfWidthM(shelfBooksVisiveis), [shelfBooksVisiveis]);
```

- [ ] **Step 3: Propague pro `<Canvas>`, `<Bookshelf>`, `<DeskBooks>` e `<CameraRig>`**

Modify o `return` final de `RoomCanvas`:

```tsx
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}} dpr={isMobile ? 1 : [1, 2]}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooksVisiveis} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    {mode.kind === 'sala' && <IndexSheet onOpen={abrirIndice}/>}
                    <CameraRig viewpoint={viewpoint} animate={animateTransitions} isMobile={isMobile} shelfWidthM={larguraEstanteM}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
```

O resto do arquivo (estado de índice/ordenação/filtro, botões
Sala/Estante/Mesa, `IndexPanel`) fica igual — esta fase não mexe nisso.

- [ ] **Step 4: `tsc` para conferir tipos em todo o projeto**

```bash
npx tsc --noEmit
```

Esperado: nenhum erro — esta é a task que fecha todas as pontas soltas das
tasks 3-6.

- [ ] **Step 5: Commit**

```bash
git add components/livros/RoomCanvas.tsx
git commit -m "feat(livros): RoomCanvas liga useIsMobile, dpr reduzido e o trilho da estante"
```

---

### Task 8: verificação visual (emulação de toque)

**Files:** nenhum arquivo novo — só verificação manual.

- [ ] **Step 1: Rodar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Ativar emulação de dispositivo móvel**

No Chrome DevTools, ative o Device Toolbar (Ctrl+Shift+M) e escolha um
preset de celular (ex.: iPhone 14). Confirme que o DevTools está em modo de
emulação de toque (o cursor vira um círculo ao clicar) — isso é o que faz
`matchMedia('(pointer: coarse)')` responder `true`.

- [ ] **Step 3: Trilho na estante**

1. Abra `/livros`, toque em "Estante".
2. Arraste um dedo horizontalmente sobre a estante. Confirme: a câmera
   desliza lateralmente (nunca orbita) e para nas bordas — não é possível
   arrastar a estante inteira pra fora de vista.
3. Solte o arrasto no meio da estante e confirme que a câmera não "escapa"
   do boundary (sem bounce violento).

- [ ] **Step 4: Sem trilho fora da estante**

1. Toque em "Mesa" (ou "Sala"). Arraste um dedo sobre a cena.
2. Confirme: a câmera não desliza livremente — no máximo uma órbita curta e
   travada (mesmo comportamento do mouse no desktop), nunca um "voo livre".

- [ ] **Step 5: Tap único abre sem hover**

1. Volte pra "Estante". Toque diretamente num livro (sem arrastar antes).
2. Confirme: o livro vai direto pra animação de abertura — nenhum tooltip
   aparece antes, nenhum "sair da prateleira" piscando previamente.
3. Repita tocando num livro da mesa (se houver algum "lendo agora" cadastrado
   — ver `scripts/livros.mjs add`). Mesmo resultado: abre direto.

- [ ] **Step 6: DPR reduzido**

No console do DevTools (com emulação de toque ainda ativa):

```js
document.querySelector('canvas').width / document.querySelector('canvas').clientWidth
```

Confirme que o resultado é `1` (não `2` ou o `devicePixelRatio` real do
dispositivo emulado).

- [ ] **Step 7: Nenhuma regressão no desktop**

Desative o Device Toolbar (volte ao modo normal de mouse). Repita os fluxos
de abrir/fechar livro (fase 3), ordenar/filtrar (fase 4) e confirme que o
mouse continua orbitando normalmente em todos os viewpoints (nada de
`TOUCH_TRUCK` vazando pro desktop).

---

### Task 9: verificação final da fase 5

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Testes**

```bash
npm test
```

Esperado: todos verdes, incluindo os novos testes de `shelfWidthM` em
`lib/book-dimensions.test.mjs`.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Build de produção**

```bash
rm -rf .next && npm run build
```

Confirme que `/livros/lista` e `/livros/[slug]` continuam com First Load JS
pequeno — mesmo princípio validado nas fases 2-4.

- [ ] **Step 4: Checklist final contra o spec (fase 5)**

- [ ] Mesma cena, sem cena/componente duplicado pra mobile — ✅ Tasks 3-7
      (tudo é prop condicional nos componentes existentes).
- [ ] Câmera em trilho: arrastar navega lateralmente pela estante, sem
      órbita livre — ✅ Task 6.
- [ ] Trilho limitado à largura real da estante (não é possível arrastar
      pra fora) — ✅ Tasks 1 + 6 (`shelfWidthM` + `setBoundary`).
- [ ] Tap único abre o livro sem estado intermediário de hover — ✅ Task 3.
- [ ] DPR reduzido em mobile — ✅ Task 7.
- [ ] Sinal de mobile é `pointer: coarse`, não largura de tela — ✅ Task 2.
- [ ] Mobile não é tratado como degradação — nenhuma mudança em
      `detectaMotivoDegradacao` — ✅ confirmado por inspeção (Global
      Constraints).

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "fix(livros): ajustes finais da verificacao da fase 5"
```
