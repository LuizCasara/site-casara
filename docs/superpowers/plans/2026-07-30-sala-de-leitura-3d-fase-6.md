# Sala de Leitura 3D — Fase 6 (decoração no estilo do Luiz) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobiliar a sala com o "misto entre tech e campismo, cores quentes,
aconchegante" descrito no brainstorm: uma mesa de trabalho com PC e 4 telas +
notebook, uma mesinha com cafeteira, um sofá com abajur de leitura, e uma
parede nova dedicada a itens de campismo/escotismo (mochila, lampião, corda,
lenços, bastão, faca) — mais pequenos objetos pessoais espalhados (planta,
jogo de tabuleiro, controle de videogame, fone de ouvido, vinil). Tudo é
cenário puro: nenhum destes objetos ganha estado, clique, ou entrada em
`ROOM_ANCHORS` — a fase 5 e todas as anteriores continuam funcionando
byte-a-byte iguais.

**Architecture:** Cada peça de mobília vira um componente pequeno e focado em
`components/livros/decor/`, montado com as mesmas primitivas (box/cylinder/
cone/torus/plane) e o mesmo estilo low-poly que `Room.tsx` já usa desde a
fase 2 — nada de geometria customizada (`ExtrudeGeometry`/`Shape`) nem
modelos importados (GLB), que quebrariam a decisão A1 do spec ("sala
construída em código", sem Blender). `Room.tsx` importa e posiciona cada
peça, exatamente como já faz com a prancha da prateleira e o tampo da mesa —
ele continua "sem saber que livros existem" porque decoração não tem nenhuma
relação com livros pra começo de conversa.

**Tech Stack:** o mesmo das fases 2-5 (Next 15 App Router, R3F, drei,
`three`, postprocessing) — nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`
(seção "Fases" → item 6; seção "Interações" → "toda função tem um objeto
físico", aplicado aqui só pro clima, já que estes objetos não têm função)
**Brainstorm desta fase:** direção definida em conversa — escritório com PC
de 4 telas + notebook, mesinha com cafeteira, sofá com abajur de leitura,
parede de campismo/escotismo (mochila, lampião, corda, lenços, bastão, faca),
mais planta(s), óculos, jogo de tabuleiro, referências a games e música.
**Planos anteriores:** `docs/superpowers/plans/2026-07-28-acervo-de-livros-fase-1.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-2.md`,
`docs/superpowers/plans/2026-07-29-sala-de-leitura-3d-fase-3.md`,
`docs/superpowers/plans/2026-07-30-sala-de-leitura-3d-fase-4.md`,
`docs/superpowers/plans/2026-07-30-sala-de-leitura-3d-fase-5.md`

## Global Constraints

- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`.**
- **Imports internos usam o alias `@/`.**
- **Nenhuma entrada nova em `ROOM_ANCHORS`.** Só ganham entrada ali objetos
  que outro arquivo precisa localizar (`estante`/`leitura`/`mesa`/`indice` —
  lidos por `Bookshelf.tsx`, `DeskBooks.tsx`, `CameraRig.tsx`). Nenhum
  componente desta fase é lido por ninguém fora de `Room.tsx`, então nenhum
  deles precisa de âncora — só recebe uma posição fixa, direto no JSX.
- **Sem geometria customizada, sem GLB.** Só primitivas do three.js
  (`box`/`cylinder`/`cone`/`sphere`/`icosahedron`/`torus`/`plane`) — é a
  decisão A1 do spec ("sala construída em código... sem Blender") e o
  caminho de upgrade pra A2 (modelo com *baked lighting*) continua intacto
  só se nada aqui inventar um formato de geometria novo.
- **Sem sombra dinâmica nova.** Nenhum destes componentes usa `castShadow`/
  `receiveShadow` — mesmo princípio de performance já estabelecido no spec
  ("nenhuma sombra dinâmica... por uma fração do custo").
- **Paleta quente, consistente com o que já existe.** `FLOOR_COLOR`/
  `WALL_COLOR`/`SHELF_BOARD_COLOR` (`Room.tsx`) e a luz do abajur perto da
  estante (`#ffb877`) já são tons quentes — a decoração reaproveita essa
  mesma temperatura de cor em vez de inventar uma paleta nova.
- **Este projeto só cobre com `node --test` lógica pura em `lib/**/*.test.mjs`.**
  Nada nesta fase é lógica pura — é 100% cena, então se verifica olhando,
  mesma convenção das fases 2, 3, 4 e 5.
- **Comentários e textos de interface em português.**
- **Esta é "a única parte que pode ser mexida infinitamente sem quebrar
  nada"** (spec) — os números de posição/cor abaixo são um primeiro rascunho
  deliberadamente simples, não um resultado final. Ajustar à vontade depois
  de olhar não é regressão, é o objetivo desta fase.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `components/livros/decor/PcDesk.tsx` | **novo** — mesa de trabalho, PC (gabinete + 4 monitores) e notebook |
| `components/livros/decor/CafeCorner.tsx` | **novo** — mesinha redonda com cafeteira |
| `components/livros/decor/Sofa.tsx` | **novo** — sofá de 3 partes (assento/encosto/braços) + abajur de leitura com luz quente |
| `components/livros/decor/CampingWall.tsx` | **novo** — parede lateral nova + mochila, lampião, corda, lenços de escoteiro, bastão, faca |
| `components/livros/decor/PersonalProps.tsx` | **novo** — 5 objetos pequenos: `Planta`, `JogoDeTabuleiro`, `ControleDeVideogame`, `FoneDeOuvido`, `Vinil` |
| `components/livros/Room.tsx` | *(modificado)* importa e posiciona as 5 peças acima |

**Decisão deliberada — uma parede lateral nova.** Até a fase 5 a sala só
tinha a parede de fundo (atrás da estante). "Uma parede com coisas de
campismo" pede uma parede de verdade, não alguns itens pendurados na mesma
parede da estante disputando espaço visual. `CampingWall.tsx` adiciona essa
segunda parede (lado esquerdo, `x=-2.9`) e já nasce com os itens montados
nela — ela não precisa de posição vinda de fora porque, como a parede de
fundo em `Room.tsx`, é sempre a mesma peça fixa da sala.

**Layout (visto de cima, aproximado):** estante e a mesa funcional (com os
livros "lendo agora" + a folha do índice, fase 4) continuam exatamente onde
estavam. A mesa de trabalho (PC) fica contra a parede de fundo, do lado
oposto à estante; a mesinha de café e o sofá ficam no lado esquerdo, mais à
frente, perto da parede nova de campismo — o canto "campismo" fica ao lado
do canto "leitura", não do canto "tech", seguindo a mistura pedida
("misto entre tech e campismo") sem os dois temas se sobreporem no mesmo
canto.

---

### Task 1: `PcDesk.tsx` — mesa de trabalho com PC e 4 monitores + notebook

**Files:**
- Create: `components/livros/decor/PcDesk.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `export default function PcDesk({position}: {position: [number, number, number]})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

const DESK_TOP_COLOR = '#4a3323';
const DESK_LEG_COLOR = '#241a12';
const TOWER_COLOR = '#1a1a1a';
const MONITOR_FRAME_COLOR = '#0d0d0d';
const MONITOR_SCREEN_COLOR = '#1a2a4a';
const NOTEBOOK_BASE_COLOR = '#2b2b2b';
const NOTEBOOK_SCREEN_COLOR = '#111111';

const DESK_TOP_Y = 0.72;
const DESK_WIDTH = 1.3;
const DESK_DEPTH = 0.55;

/**
 * Mesa de trabalho decorativa — PC com 4 monitores + notebook. Puro
 * cenário: nada fora deste arquivo sabe que ela existe (sem entrada em
 * ROOM_ANCHORS, diferente de estante/mesa/leitura/indice).
 */
export default function PcDesk({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <mesh position={[0, DESK_TOP_Y, 0]}>
                <boxGeometry args={[DESK_WIDTH, 0.03, DESK_DEPTH]}/>
                <meshStandardMaterial color={DESK_TOP_COLOR} roughness={0.6}/>
            </mesh>

            {[-DESK_WIDTH / 2 + 0.05, DESK_WIDTH / 2 - 0.05].map((x) => (
                <mesh key={x} position={[x, DESK_TOP_Y / 2, DESK_DEPTH / 2 - 0.05]}>
                    <boxGeometry args={[0.04, DESK_TOP_Y, 0.04]}/>
                    <meshStandardMaterial color={DESK_LEG_COLOR} roughness={0.8}/>
                </mesh>
            ))}

            {/* Gabinete no chão, ao lado da mesa */}
            <mesh position={[DESK_WIDTH / 2 + 0.12, 0.2, DESK_DEPTH / 2 - 0.1]}>
                <boxGeometry args={[0.16, 0.4, 0.35]}/>
                <meshStandardMaterial color={TOWER_COLOR} roughness={0.5} metalness={0.2}/>
            </mesh>

            {/* 4 monitores lado a lado, levemente curvados pra dentro */}
            {[-0.42, -0.14, 0.14, 0.42].map((x, i) => {
                const anguloY = (i - 1.5) * -0.12;
                return (
                    <group key={x} position={[x, DESK_TOP_Y + 0.22, -DESK_DEPTH / 2 + 0.08]} rotation={[0, anguloY, 0]}>
                        <mesh>
                            <boxGeometry args={[0.24, 0.16, 0.015]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR} roughness={0.4}/>
                        </mesh>
                        <mesh position={[0, 0, 0.009]}>
                            <planeGeometry args={[0.21, 0.13]}/>
                            <meshStandardMaterial color={MONITOR_SCREEN_COLOR} emissive={MONITOR_SCREEN_COLOR} emissiveIntensity={0.6}/>
                        </mesh>
                        <mesh position={[0, -0.11, 0]}>
                            <boxGeometry args={[0.02, 0.06, 0.02]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR}/>
                        </mesh>
                    </group>
                );
            })}

            {/* Notebook aberto, do lado do teclado */}
            <group position={[-DESK_WIDTH / 2 + 0.22, DESK_TOP_Y + 0.015, DESK_DEPTH / 2 - 0.15]}>
                <mesh>
                    <boxGeometry args={[0.26, 0.015, 0.18]}/>
                    <meshStandardMaterial color={NOTEBOOK_BASE_COLOR} roughness={0.5} metalness={0.3}/>
                </mesh>
                <mesh position={[0, 0.09, -0.08]} rotation={[-0.35, 0, 0]}>
                    <boxGeometry args={[0.26, 0.17, 0.01]}/>
                    <meshStandardMaterial color={NOTEBOOK_SCREEN_COLOR} emissive="#264d73" emissiveIntensity={0.3}/>
                </mesh>
            </group>
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
git add components/livros/decor/PcDesk.tsx
git commit -m "feat(livros): adiciona PcDesk (mesa de trabalho com PC e 4 monitores)"
```

---

### Task 2: `CafeCorner.tsx` — mesinha com cafeteira

**Files:**
- Create: `components/livros/decor/CafeCorner.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `export default function CafeCorner({position}: {position: [number, number, number]})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

const TABLE_COLOR = '#4a3323';
const MAKER_BODY_COLOR = '#2b2b2b';
const MAKER_JUG_COLOR = '#8a6a4a';
const MAKER_LIGHT_COLOR = '#ff6a3d';

export default function CafeCorner({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <mesh position={[0, 0.42, 0]}>
                <cylinderGeometry args={[0.26, 0.26, 0.03, 16]}/>
                <meshStandardMaterial color={TABLE_COLOR} roughness={0.6}/>
            </mesh>
            <mesh position={[0, 0.21, 0]}>
                <cylinderGeometry args={[0.04, 0.06, 0.42, 12]}/>
                <meshStandardMaterial color={TABLE_COLOR} roughness={0.7}/>
            </mesh>

            {/* Cafeteira, com uma lucezinha quente ligada — detalhe de aconchego */}
            <group position={[0.08, 0.44, -0.05]}>
                <mesh>
                    <cylinderGeometry args={[0.05, 0.06, 0.14, 12]}/>
                    <meshStandardMaterial color={MAKER_BODY_COLOR} roughness={0.4} metalness={0.3}/>
                </mesh>
                <mesh position={[0, -0.09, 0]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.03, 12]}/>
                    <meshStandardMaterial color={MAKER_JUG_COLOR} roughness={0.3} transparent opacity={0.85}/>
                </mesh>
                <mesh position={[0, 0.075, 0]}>
                    <sphereGeometry args={[0.008, 8, 8]}/>
                    <meshStandardMaterial color={MAKER_LIGHT_COLOR} emissive={MAKER_LIGHT_COLOR} emissiveIntensity={1.2}/>
                </mesh>
            </group>
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
git add components/livros/decor/CafeCorner.tsx
git commit -m "feat(livros): adiciona CafeCorner (mesinha com cafeteira)"
```

---

### Task 3: `Sofa.tsx` — sofá com abajur de leitura

**Files:**
- Create: `components/livros/decor/Sofa.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `export default function Sofa({position, rotationY?}: {position: [number, number, number]; rotationY?: number})`

- [ ] **Step 1: Implementar**

```tsx
'use client';

const SOFA_COLOR = '#7a3b2e';
const LAMP_POLE_COLOR = '#2b2320';
const LAMP_SHADE_COLOR = '#e8d9b5';
const LAMP_LIGHT_COLOR = '#ffb877';

export default function Sofa({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0.22, 0]}>
                <boxGeometry args={[1.3, 0.3, 0.55]}/>
                <meshStandardMaterial color={SOFA_COLOR} roughness={0.9}/>
            </mesh>
            <mesh position={[0, 0.5, -0.24]}>
                <boxGeometry args={[1.3, 0.4, 0.14]}/>
                <meshStandardMaterial color={SOFA_COLOR} roughness={0.9}/>
            </mesh>
            {[-0.65, 0.65].map((x) => (
                <mesh key={x} position={[x, 0.4, 0]}>
                    <boxGeometry args={[0.14, 0.3, 0.55]}/>
                    <meshStandardMaterial color={SOFA_COLOR} roughness={0.9}/>
                </mesh>
            ))}

            {/* Abajur de leitura ao lado — mesma cor quente da luz perto da estante */}
            <group position={[0.85, 0, 0.1]}>
                <mesh position={[0, 0.6, 0]}>
                    <cylinderGeometry args={[0.015, 0.02, 1.2, 8]}/>
                    <meshStandardMaterial color={LAMP_POLE_COLOR}/>
                </mesh>
                <mesh position={[0, 1.22, 0]}>
                    <coneGeometry args={[0.16, 0.2, 16, 1, true]}/>
                    <meshStandardMaterial color={LAMP_SHADE_COLOR} emissive={LAMP_LIGHT_COLOR} emissiveIntensity={0.4}/>
                </mesh>
                <pointLight position={[0, 1.15, 0]} color={LAMP_LIGHT_COLOR} intensity={12} distance={3} decay={2}/>
            </group>
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
git add components/livros/decor/Sofa.tsx
git commit -m "feat(livros): adiciona Sofa com abajur de leitura"
```

---

### Task 4: `CampingWall.tsx` — parede nova + itens de campismo/escotismo

**Files:**
- Create: `components/livros/decor/CampingWall.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `export default function CampingWall()` — sem props, posição fixa (mesma ideia da parede de fundo em `Room.tsx`)

- [ ] **Step 1: Implementar**

```tsx
'use client';

const WALL_COLOR = '#2b2320'; // mesmo tom da parede de fundo, pra ler como a mesma sala
const BACKPACK_COLOR = '#5a6b3f';
const BACKPACK_FLAP_COLOR = '#48592f';
const LANTERN_BODY_COLOR = '#3a3a3a';
const LANTERN_LIGHT_COLOR = '#ffcf8a';
const ROPE_COLOR = '#b89968';
const SCARF_COLORS = ['#d97b3f', '#3f6fd9'];
const STAFF_COLOR = '#5c4326';
const KNIFE_HANDLE_COLOR = '#4a3323';
const KNIFE_BLADE_COLOR = '#c9c9c9';

const WALL_X = -2.9;

/**
 * Parede lateral nova — até a fase 5 a sala só tinha a parede de fundo (atrás
 * da estante). Dedicada aos itens de campismo/escotismo, o lado "campismo"
 * do "misto entre tech e campismo" pedido pro estilo da sala. Puro cenário,
 * mesmo espírito de Room.tsx: sem âncora, sem ninguém de fora precisando
 * saber que existe — por isso não recebe `position` por prop, igual à
 * parede de fundo.
 */
export default function CampingWall() {
    return (
        <group>
            <mesh position={[WALL_X, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[4.2, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/* Mochila encostada no canto */}
            <group position={[WALL_X + 0.18, 0.22, -1.2]}>
                <mesh>
                    <boxGeometry args={[0.22, 0.36, 0.14]}/>
                    <meshStandardMaterial color={BACKPACK_COLOR} roughness={0.9}/>
                </mesh>
                <mesh position={[0, 0.16, 0.02]}>
                    <boxGeometry args={[0.2, 0.12, 0.15]}/>
                    <meshStandardMaterial color={BACKPACK_FLAP_COLOR} roughness={0.9}/>
                </mesh>
            </group>

            {/* Lampião pendurado, com uma luz quente própria */}
            <group position={[WALL_X + 0.15, 1.7, -0.6]}>
                <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.3, 6]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR}/>
                </mesh>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.07, 0.12, 8]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR} roughness={0.4} metalness={0.4}/>
                </mesh>
                <pointLight position={[0, -0.02, 0]} color={LANTERN_LIGHT_COLOR} intensity={8} distance={2.5} decay={2}/>
            </group>

            {/* Corda enrolada no canto do chão */}
            <mesh position={[WALL_X + 0.15, 0.03, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.12, 0.025, 8, 24]}/>
                <meshStandardMaterial color={ROPE_COLOR} roughness={0.9}/>
            </mesh>

            {/* Lenços de escoteiro, pendurados */}
            {SCARF_COLORS.map((cor, i) => (
                <mesh key={cor} position={[WALL_X + 0.08, 1.3 - i * 0.14, 0.2]} rotation={[0.15, 0, 0.1 * (i === 0 ? 1 : -1)]}>
                    <boxGeometry args={[0.02, 0.16, 0.22]}/>
                    <meshStandardMaterial color={cor} roughness={0.8}/>
                </mesh>
            ))}

            {/* Bastão de caminhada, encostado no canto */}
            <mesh position={[WALL_X + 0.1, 0.65, -1.35]} rotation={[0, 0, 0.12]}>
                <cylinderGeometry args={[0.012, 0.016, 1.3, 8]}/>
                <meshStandardMaterial color={STAFF_COLOR} roughness={0.8}/>
            </mesh>

            {/* Faca decorativa, montada na parede */}
            <group position={[WALL_X + 0.08, 1.0, 0.55]} rotation={[0, 0, Math.PI / 2]}>
                <mesh>
                    <boxGeometry args={[0.03, 0.16, 0.01]}/>
                    <meshStandardMaterial color={KNIFE_HANDLE_COLOR}/>
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                    <boxGeometry args={[0.025, 0.1, 0.006]}/>
                    <meshStandardMaterial color={KNIFE_BLADE_COLOR} roughness={0.3} metalness={0.6}/>
                </mesh>
            </group>
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
git add components/livros/decor/CampingWall.tsx
git commit -m "feat(livros): adiciona CampingWall, parede nova com itens de campismo"
```

---

### Task 5: `PersonalProps.tsx` — planta, jogo de tabuleiro, controle, fone, vinil

**Files:**
- Create: `components/livros/decor/PersonalProps.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `Planta`, `JogoDeTabuleiro`, `ControleDeVideogame`, `FoneDeOuvido`, `Vinil` — todos `({position}: {position: [number, number, number]}) => JSX.Element`

- [ ] **Step 1: Implementar**

```tsx
'use client';

const POT_COLOR = '#a05a3a';
const LEAF_COLOR = '#3f7a4a';
const BOARD_GAME_COLOR = '#8a3b2e';
const BOARD_GAME_LID_COLOR = '#c9a24a';
const CONTROLLER_COLOR = '#2b2b2b';
const HEADPHONE_COLOR = '#1a1a1a';
const VINYL_COLOR = '#111111';
const VINYL_LABEL_COLOR = '#c9432e';

type PropPosition = {position: [number, number, number]};

export function Planta({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.06, 0.05, 0.1, 10]}/>
                <meshStandardMaterial color={POT_COLOR} roughness={0.9}/>
            </mesh>
            <mesh position={[0, 0.16, 0]}>
                <icosahedronGeometry args={[0.08, 0]}/>
                <meshStandardMaterial color={LEAF_COLOR} roughness={0.8} flatShading/>
            </mesh>
        </group>
    );
}

export function JogoDeTabuleiro({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.2, 0.04, 0.28]}/>
                <meshStandardMaterial color={BOARD_GAME_COLOR} roughness={0.7}/>
            </mesh>
            <mesh position={[0, 0.021, 0]}>
                <boxGeometry args={[0.16, 0.002, 0.22]}/>
                <meshStandardMaterial color={BOARD_GAME_LID_COLOR} roughness={0.6}/>
            </mesh>
        </group>
    );
}

export function ControleDeVideogame({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.14, 0.03, 0.08]}/>
                <meshStandardMaterial color={CONTROLLER_COLOR} roughness={0.5}/>
            </mesh>
            {[-0.04, 0.04].map((x) => (
                <mesh key={x} position={[x, 0, 0.03]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.02, 8]}/>
                    <meshStandardMaterial color="#555555"/>
                </mesh>
            ))}
        </group>
    );
}

export function FoneDeOuvido({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.07, 0.008, 8, 16, Math.PI]}/>
                <meshStandardMaterial color={HEADPHONE_COLOR}/>
            </mesh>
            {[-0.07, 0.07].map((x) => (
                <mesh key={x} position={[x, 0.05, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.03, 12]}/>
                    <meshStandardMaterial color={HEADPHONE_COLOR}/>
                </mesh>
            ))}
        </group>
    );
}

export function Vinil({position}: PropPosition) {
    return (
        <group position={position} rotation={[0, 0, Math.PI / 2 - 0.15]}>
            <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.004, 24]}/>
                <meshStandardMaterial color={VINYL_COLOR} roughness={0.3}/>
            </mesh>
            <mesh position={[0, 0.003, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.006, 16]}/>
                <meshStandardMaterial color={VINYL_LABEL_COLOR}/>
            </mesh>
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
git add components/livros/decor/PersonalProps.tsx
git commit -m "feat(livros): adiciona PersonalProps (planta, jogo, controle, fone, vinil)"
```

---

### Task 6: `Room.tsx` — posiciona toda a decoração

**Files:**
- Modify: `components/livros/Room.tsx`

**Interfaces:**
- Consumes: `PcDesk`, `CafeCorner`, `Sofa`, `CampingWall` (Tasks 1-4); `Planta`/
  `JogoDeTabuleiro`/`ControleDeVideogame`/`FoneDeOuvido`/`Vinil` (Task 5)
- Produces: nenhuma mudança de tipo público — `ROOM_ANCHORS` e a assinatura
  de `Room()` ficam exatamente iguais

- [ ] **Step 1: Adicione os imports**

Modify `components/livros/Room.tsx`, no topo do arquivo:

```tsx
import {Sparkles} from '@react-three/drei';
import PcDesk from '@/components/livros/decor/PcDesk';
import CafeCorner from '@/components/livros/decor/CafeCorner';
import Sofa from '@/components/livros/decor/Sofa';
import CampingWall from '@/components/livros/decor/CampingWall';
import {Planta, JogoDeTabuleiro, ControleDeVideogame, FoneDeOuvido, Vinil} from '@/components/livros/decor/PersonalProps';
```

- [ ] **Step 2: Adicione a decoração ao `return` de `Room()`**

Modify `components/livros/Room.tsx`, inserindo antes do bloco de luzes
(`<pointLight .../>` etc.) — depois da prancha da prateleira e do tampo da
mesa, que já estão lá desde as fases 2 e 4:

```tsx
            {/*
              Decoração da fase 6 — mesa de trabalho contra a parede de
              fundo, do lado oposto à estante; mesinha de café e sofá no
              lado esquerdo, perto da parede de campismo nova. Números de
              posição são um primeiro rascunho — ajustar olhando é o
              esperado nesta fase.
            */}
            <PcDesk position={[2.0, 0, -1.4]}/>
            <FoneDeOuvido position={[1.55, 0.75, -1.05]}/>

            <CafeCorner position={[-1.2, 0, 0.8]}/>
            <Planta position={[-1.35, 0.44, 0.68]}/>
            <JogoDeTabuleiro position={[-1.08, 0.44, 0.9]}/>

            <Sofa position={[-1.8, 0, 1.6]} rotationY={0.5}/>
            <Vinil position={[-1.55, 0.05, 1.42]}/>
            <ControleDeVideogame position={[-1.95, 0.38, 1.35]}/>

            <CampingWall/>
```

O resto do arquivo (`ROOM_ANCHORS`, o piso, a parede de fundo, a prancha da
prateleira, o tampo da mesa, as luzes existentes, o `Sparkles`) fica igual.

- [ ] **Step 3: `tsc` para conferir tipos em todo o projeto**

```bash
npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add components/livros/Room.tsx
git commit -m "feat(livros): Room posiciona a decoracao da fase 6"
```

---

### Task 7: verificação visual (a parte que se mexe à vontade)

**Files:** nenhum arquivo novo — só verificação manual, e ajustes de posição/
cor/luz direto nos arquivos das Tasks 1-6 conforme o que parecer errado.

- [ ] **Step 1: Rodar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Olhar cada peça isoladamente**

Abra `/livros`, troque entre os viewpoints "Sala"/"Estante"/"Mesa" e confirme,
pra cada peça nova:

1. **PC + monitores**: os 4 monitores não se sobrepõem entre si nem
   atravessam o tampo da mesa; o "brilho" de tela (material emissivo) é
   visível mas não estoura de tão claro.
2. **Mesinha de café**: a cafeteira está em cima do tampo, não flutuando
   nem afundada nele.
3. **Sofá + abajur**: o abajur ilumina de fato (compare com a sala sem ele,
   comentando a `pointLight` temporariamente); o sofá não atravessa a parede
   nova de campismo.
4. **Parede de campismo**: a parede nova aparece como uma superfície de
   verdade (não uma linha fina) e os itens (mochila, lampião, corda, lenços,
   bastão, faca) ficam apoiados nela, não flutuando à frente ou atravessando
   pra trás dela.
5. **Objetos pessoais**: planta/jogo/controle/fone/vinil aparecem nos
   tamanhos e posições esperados, sem atravessar a mobília.

- [ ] **Step 3: Olhar a sala inteira**

No viewpoint "Sala" (visão geral), confirme que a composição lê como "misto
entre tech e campismo, cores quentes, aconchegante" — o canto do PC não
domina visualmente o canto do sofá/campismo, e a estante continua sendo o
elemento central (ela é o motivo da sala existir).

- [ ] **Step 4: Ajustar o que incomodar**

Esta é a task "infinita" do spec — ajuste posições, cores, intensidades de
luz direto nos arquivos das Tasks 1-6 até o resultado agradar. Cada ajuste
aqui é esperado, não indica um erro do plano.

- [ ] **Step 5: Nenhuma regressão nas fases anteriores**

Repita rapidamente: abrir/fechar um livro (fase 3), ordenar/filtrar pela
folha do índice (fase 4). Confirme que a decoração nova não bloqueia
clique/hover em nenhum livro nem no índice (nenhum destes objetos tem
`onClick`/`onPointerOver`, então isso não deveria acontecer — mas vale
confirmar visualmente que nada ficou literalmente por cima da estante/mesa
funcional).

---

### Task 8: verificação final da fase 6

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Testes**

```bash
npm test
```

Esperado: todos verdes — nenhum teste novo nesta fase (nenhuma lógica pura
foi adicionada).

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Build de produção**

```bash
rm -rf .next && npm run build
```

Confirme que `/livros/lista` e `/livros/[slug]` continuam com First Load JS
pequeno — a decoração é toda client-only, carregada só dentro do bundle 3D
já isolado desde a fase 2.

- [ ] **Step 4: Checklist final contra o brainstorm da fase 6**

- [ ] Mesa de trabalho com PC, 4 telas e notebook — ✅ Task 1.
- [ ] Mesinha com cafeteira — ✅ Task 2.
- [ ] Sofá com abajur de leitura — ✅ Task 3.
- [ ] Parede de campismo/escotismo (mochila, lampião, corda, lenços, bastão,
      faca) — ✅ Task 4.
- [ ] Planta, jogo de tabuleiro, controle, fone de ouvido, vinil — ✅ Task 5.
- [ ] Cores quentes e aconchegantes, consistentes com o resto da sala — ✅
      Tasks 1-5 (paletas reaproveitam os tons já usados em `Room.tsx`).
- [ ] `Room.tsx` continua sem saber que livros existem — ✅ Task 6 (nenhuma
      referência a `Book`/`livro` em nenhum arquivo desta fase).
- [ ] Nenhuma entrada nova em `ROOM_ANCHORS` — ✅ confirmado por inspeção.

- [ ] **Step 5: Commit final (se houver ajustes da Task 7)**

```bash
git add -A
git commit -m "fix(livros): ajustes finais de decoracao da fase 6"
```
