# Estante por Ano de Leitura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar as duas tábuas flutuantes da sala 3D pelo modelo GLB de estante escolhido pelo dono do acervo, com os livros agrupados nos 5 nichos por ano de leitura e uma navegação de câmera em dois níveis (estante inteira → um ano).

**Architecture:** Duas peças puras novas em `lib/` carregam toda a decisão — as medidas do `.glb` (validadas contra o arquivo por teste) e o agrupamento cronológico por capacidade. Os componentes 3D só consomem essas peças: `Room` monta o(s) modelo(s), `Bookshelf` posiciona por nicho, `CameraRig` deriva os pontos de vista dos nichos e `RoomCanvas` guarda qual ano está focado.

**Tech Stack:** Next.js 15 (App Router), React Three Fiber + drei, TypeScript, Tailwind, `node --test` para a lógica pura em `.mjs`.

## Global Constraints

- Lógica pura compartilhada entre CLI e Next fica em `lib/*.mjs`, nunca `.ts` — é o único jeito de rodar sem etapa de build (ver `lib/book-utils.mjs`).
- Toda query contra `casara.books` qualifica o schema — o `search_path` não inclui `casara`.
- `KenneyModel` recebe tamanho em **metros** (`alturaAlvo`/`larguraAlvo`), nunca fator de escala, e `position` é sempre **o ponto do chão sob o centro da peça**.
- Este projeto não tem teste de UI. Mudanças em componentes React se verificam rodando `npm run dev` e olhando no navegador — não pule esse passo.
- Spec completa: `docs/superpowers/specs/2026-08-05-estante-por-ano-design.md`.

## Pré-requisito (fora do código)

**`node scripts/aplicar-leitura.mjs --apply` precisa ter rodado.** Sem `finished_at` no banco não existe ano para agrupar e a estante nasce com um nicho só. O script é dry-run por padrão, mostra a tabela e pede confirmação; escreve em produção. Rode-o antes da Task 3.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/bookshelf-model.mjs` (novo) | Medidas do `.glb`: escala derivada, tamanho final, geometria dos 5 nichos |
| `lib/bookshelf-model.test.mjs` (novo) | Confere as medidas contra o `.glb` de verdade, parseando o arquivo |
| `lib/shelf-years.mjs` (novo) | Ano de leitura, agrupamento cronológico por capacidade, rótulos |
| `lib/shelf-years.test.mjs` (novo) | Casos do agrupamento, incluindo transbordo e livro sem data |
| `lib/book-dimensions.mjs` | Perde `splitShelfRows`/`SHELF_ROWS`/`SHELF_ROW_SPACING_M`; `toShelfBooks` passa a levar `finishedAt` |
| `components/livros/Room.tsx` | Monta o(s) GLB(s) no lugar das pranchas em código |
| `components/livros/Bookshelf.tsx` | Posiciona por nicho e desenha as etiquetas 3D de ano |
| `components/livros/CameraRig.tsx` | Ponto de vista da estante inteira + um por nicho; perde o trilho mobile |
| `components/livros/RoomCanvas.tsx` | Estado do ano focado, segunda linha de botões |
| `app/livros/layout.tsx` | Passa `finished_at` adiante |

---

### Task 1: Medidas do modelo em `lib/bookshelf-model.mjs`

**Files:**
- Create: `lib/bookshelf-model.mjs`
- Test: `lib/bookshelf-model.test.mjs`

**Interfaces:**
- Produces: `BOOKSHELF_SCALE` (number), `BOOKSHELF_SIZE_M` (`{larguraM, alturaM, profundidadeM}`), `NICHOS` (array de `{indice, pisoY, offsetX, larguraUtilM, alturaUtilM}`), `NICHOS_POR_ESTANTE` (number), `NICHO_CAPACIDADE_M` (number). Consumidos pelas Tasks 2, 4, 5, 6 e 7.

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/bookshelf-model.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    BOOKSHELF_SCALE, BOOKSHELF_SIZE_M, NICHOS,
    NICHOS_POR_ESTANTE, NICHO_CAPACIDADE_M,
} from './bookshelf-model.mjs';
import {BOOK_HEIGHT_BASE_M, BOOK_DEPTH_M} from './book-dimensions.mjs';

/**
 * Lê os vértices do .glb sem three.js: o arquivo é um cabeçalho de 12 bytes,
 * um chunk JSON e um chunk binário. Isto existe só no teste — o runtime usa
 * as constantes, nunca parseia o arquivo.
 */
function planosDoModelo() {
    const buf = readFileSync(new URL('../public/livros/modelos/bookshelf-tall.glb', import.meta.url));
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen + 8;
    const acessor = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    const view = json.bufferViews[acessor.bufferView];
    const off = binStart + (view.byteOffset ?? 0) + (acessor.byteOffset ?? 0);
    // O nó que embrulha a malha tem escala 100 — sem ela os números saem em
    // centésimos de metro e nada bate.
    const escalaNo = json.nodes.find((n) => n.mesh != null).scale[0];

    const ys = new Set();
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < acessor.count; i++) {
        const x = buf.readFloatLE(off + i * 12) * escalaNo;
        const y = buf.readFloatLE(off + i * 12 + 4) * escalaNo;
        const z = buf.readFloatLE(off + i * 12 + 8) * escalaNo;
        ys.add(+y.toFixed(3));
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    return {ys: [...ys].sort((a, b) => a - b), larguraNativa: maxX - minX, profundidadeNativa: maxZ - minZ};
}

test('a escala faz o livro caber no vão, com folga para o gesto de hover', () => {
    const alturaUtil = NICHOS[0].alturaUtilM;
    assert.ok(alturaUtil > BOOK_HEIGHT_BASE_M, `vão ${alturaUtil} não cabe livro de ${BOOK_HEIGHT_BASE_M}`);
    assert.ok(alturaUtil - BOOK_HEIGHT_BASE_M >= 0.03, 'folga menor que 3cm não acomoda o hover');
});

test('a profundidade escalada acomoda a profundidade do livro', () => {
    assert.ok(BOOKSHELF_SIZE_M.profundidadeM >= BOOK_DEPTH_M,
        'livro mais fundo que a estante ficaria com a "bunda" pra fora');
});

test('as medidas batem com o .glb de verdade', () => {
    const {ys, larguraNativa, profundidadeNativa} = planosDoModelo();
    const alturaNativa = ys[ys.length - 1] - ys[0];

    assert.equal(NICHOS.length, NICHOS_POR_ESTANTE);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.alturaM - alturaNativa * BOOKSHELF_SCALE) < 0.001);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.larguraM - larguraNativa * BOOKSHELF_SCALE) < 0.001);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.profundidadeM - profundidadeNativa * BOOKSHELF_SCALE) < 0.001);

    // Cada piso declarado tem que existir como plano horizontal no modelo.
    for (const nicho of NICHOS) {
        const pisoNativo = nicho.pisoY / BOOKSHELF_SCALE;
        const achou = ys.some((y) => Math.abs(y - pisoNativo) < 0.005);
        assert.ok(achou, `piso ${nicho.pisoY.toFixed(3)}m (nativo ${pisoNativo.toFixed(3)}) não existe no .glb`);
    }
});

test('os nichos sobem em ordem e alternam de lado', () => {
    for (let i = 1; i < NICHOS.length; i++) {
        assert.ok(NICHOS[i].pisoY > NICHOS[i - 1].pisoY, 'nicho ' + i + ' não está acima do anterior');
        assert.ok(NICHOS[i].offsetX * NICHOS[i - 1].offsetX < 0, 'nichos vizinhos deveriam alternar de lado');
    }
});

test('a capacidade é a largura útil de um nicho', () => {
    assert.equal(NICHO_CAPACIDADE_M, NICHOS[0].larguraUtilM);
    assert.ok(NICHO_CAPACIDADE_M > 0.5, 'nicho estreito demais para um ano de leitura');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './bookshelf-model.mjs'`.

- [ ] **Step 3: Implementar**

Crie `lib/bookshelf-model.mjs`:

```js
/**
 * Medidas do modelo de estante `public/livros/modelos/bookshelf-tall.glb`
 * (poly.pizza/m/30Iealxb0p, CC0) — 5 nichos empilhados em zigue-zague.
 *
 * Os números NATIVOS abaixo foram medidos lendo os vértices do próprio .glb
 * (planos horizontais = prateleiras, planos verticais = montantes), já
 * multiplicados pela escala 100 do nó que embrulha a malha.
 * `lib/bookshelf-model.test.mjs` refaz essa leitura e confere — trocar o
 * arquivo sem atualizar esta tabela quebra o teste em vez de enterrar os
 * livros na madeira.
 *
 * .mjs, não .ts: é importado tanto pelo Next quanto pelos testes de
 * `node --test`, mesma razão de lib/book-dimensions.mjs.
 */

import {BOOK_HEIGHT_BASE_M} from './book-dimensions.mjs';

const NATIVO = {
    larguraM: 0.574,
    alturaM: 1.320,
    profundidadeM: 0.154,
    /** Topo de cada prateleira — é onde o livro do nicho assenta. */
    pisos: [0.032, 0.289, 0.546, 0.804, 1.062],
    /** Vão livre entre uma prateleira e a de cima. */
    vaoM: 0.235,
    /** Distância entre os dois montantes internos de um nicho. */
    larguraUtilM: 0.409,
    /**
     * Deslocamento do centro do nicho em relação ao centro do MÓVEL (não ao
     * pivô do arquivo): é isso que o zigue-zague significa. Sinal alterna a
     * cada andar, começando pela direita na base. Relativo ao centro porque
     * `KenneyModel` centraliza a peça pela bounding box.
     */
    offsetXM: 0.0615,
};

/**
 * Folga vertical além da altura do livro. O hover puxa o livro para fora e o
 * inclina; sem folga ele raspa na prateleira de cima durante o gesto.
 */
const FOLGA_VERTICAL_M = 0.042;

/**
 * A escala NÃO é escolhida a olho: ela é a menor que faz o livro caber no vão
 * com folga. Sai em ~1,45 — e, por consequência, a profundidade do móvel
 * passa a acomodar os 20cm do livro, que no tamanho nativo ficavam 4,6cm
 * para fora.
 */
export const BOOKSHELF_SCALE = (BOOK_HEIGHT_BASE_M + FOLGA_VERTICAL_M) / NATIVO.vaoM;

export const BOOKSHELF_SIZE_M = {
    larguraM: NATIVO.larguraM * BOOKSHELF_SCALE,
    alturaM: NATIVO.alturaM * BOOKSHELF_SCALE,
    profundidadeM: NATIVO.profundidadeM * BOOKSHELF_SCALE,
};

/**
 * Um nicho por andar, do mais baixo (índice 0) ao mais alto. `pisoY` e
 * `offsetX` são relativos ao ponto de apoio da estante no chão, no centro do
 * móvel — o mesmo contrato de posicionamento de `KenneyModel`.
 */
export const NICHOS = NATIVO.pisos.map((piso, i) => ({
    indice: i,
    pisoY: piso * BOOKSHELF_SCALE,
    offsetX: (i % 2 === 0 ? 1 : -1) * NATIVO.offsetXM * BOOKSHELF_SCALE,
    larguraUtilM: NATIVO.larguraUtilM * BOOKSHELF_SCALE,
    alturaUtilM: NATIVO.vaoM * BOOKSHELF_SCALE,
}));

export const NICHOS_POR_ESTANTE = NICHOS.length;

/** Quanto de lombada cabe num nicho — a régua do agrupamento por ano. */
export const NICHO_CAPACIDADE_M = NICHOS[0].larguraUtilM;
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS — os 5 testes novos e todos os que já existiam.

- [ ] **Step 5: Commit**

```bash
git add lib/bookshelf-model.mjs lib/bookshelf-model.test.mjs
git commit -m "feat(livros): medidas do modelo de estante, validadas contra o .glb"
```

---

### Task 2: Agrupamento por ano em `lib/shelf-years.mjs`

**Files:**
- Create: `lib/shelf-years.mjs`
- Test: `lib/shelf-years.test.mjs`

**Interfaces:**
- Consumes: `NICHO_CAPACIDADE_M`, `NICHOS_POR_ESTANTE` (Task 1); `shelfWidthM` (já existe em `lib/book-dimensions.mjs`).
- Produces: `anoDeLeitura(finishedAt): number|null`, `agruparPorAnoDeLeitura(shelfBooks, capacidadeM): Grupo[]` com `Grupo = {anos: number[], rotulo: string, temSemData: boolean}`, `livrosDoGrupo(grupo, shelfBooks): ShelfBook[]`, `contarEstantes(qtdGrupos, nichosPorEstante): number`. Consumidos pelas Tasks 4, 5, 6, 7 e 8.

- [ ] **Step 1: Escrever os testes que falham**

Crie `lib/shelf-years.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {anoDeLeitura, agruparPorAnoDeLeitura, livrosDoGrupo, contarEstantes} from './shelf-years.mjs';

/** Livro de estante mínimo: só o que o agrupamento olha. */
function livro(slug, finishedAt, thicknessM = 0.03) {
    return {slug, finishedAt, thicknessM};
}

test('anoDeLeitura lê o ano em UTC, não no fuso local', () => {
    // finished_at é DATE do Postgres: 2024-01-01 volta como meia-noite UTC.
    // Lido com getFullYear() num fuso negativo isso viraria 2023.
    assert.equal(anoDeLeitura('2024-01-01T00:00:00.000Z'), 2024);
    assert.equal(anoDeLeitura(new Date('2026-12-31T00:00:00.000Z')), 2026);
    assert.equal(anoDeLeitura(null), null);
    assert.equal(anoDeLeitura('nao é data'), null);
});

test('anos pequenos vizinhos dividem nicho; anos grandes ficam sozinhos', () => {
    const livros = [
        livro('a', '2020-06-15T00:00:00Z', 0.05),
        livro('b', '2021-06-15T00:00:00Z', 0.05),
        livro('c', '2022-06-15T00:00:00Z', 0.40),
        livro('d', '2023-06-15T00:00:00Z', 0.40),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2020, 2021], [2022], [2023]]);
});

test('o primeiro grupo é o mais antigo — a cronologia sobe na estante', () => {
    const livros = [
        livro('novo', '2026-01-15T00:00:00Z'),
        livro('velho', '2020-01-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos[0].anos, [2020]);
    assert.deepEqual(grupos[1].anos, [2026]);
});

test('rótulo abrevia o segundo ano e escreve o primeiro por extenso', () => {
    const livros = [
        livro('a', '2020-06-15T00:00:00Z'),
        livro('b', '2021-06-15T00:00:00Z'),
        livro('c', '2024-06-15T00:00:00Z', 0.55),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.equal(grupos[0].rotulo, '2020-21');
    assert.equal(grupos[1].rotulo, '2024');
});

test('livro lido sem data entra no grupo mais recente e marca o rótulo', () => {
    const livros = [
        livro('datado', '2024-06-15T00:00:00Z'),
        livro('orfao', null),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    const ultimo = grupos[grupos.length - 1];
    assert.equal(ultimo.temSemData, true);
    assert.match(ultimo.rotulo, /s\/ data/);
    assert.ok(livrosDoGrupo(ultimo, livros).some((b) => b.slug === 'orfao'),
        'livro sem data sumiu da estante');
});

test('acervo só de livros sem data ainda produz um grupo', () => {
    const grupos = agruparPorAnoDeLeitura([livro('x', null)], 0.59);
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].temSemData, true);
    assert.deepEqual(grupos[0].anos, []);
});

test('acervo vazio não produz grupo nenhum', () => {
    assert.deepEqual(agruparPorAnoDeLeitura([], 0.59), []);
});

test('um único ano maior que a capacidade fica sozinho, sem travar', () => {
    const livros = [
        livro('gordo1', '2023-01-15T00:00:00Z', 0.5),
        livro('gordo2', '2023-02-15T00:00:00Z', 0.5),
        livro('depois', '2024-01-15T00:00:00Z', 0.1),
    ];
    const grupos = agruparPorAnoDeLeitura(livros, 0.59);
    assert.deepEqual(grupos.map((g) => g.anos), [[2023], [2024]]);
});

test('livrosDoGrupo filtra pela lista visível, sem remontar os grupos', () => {
    const todos = [
        livro('a', '2022-06-15T00:00:00Z'),
        livro('b', '2022-07-15T00:00:00Z'),
        livro('c', '2023-06-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(todos, 0.59);
    const visiveis = todos.filter((b) => b.slug !== 'b'); // como se um filtro tivesse escondido 'b'
    const doPrimeiro = livrosDoGrupo(grupos[0], visiveis);
    assert.deepEqual(doPrimeiro.map((b) => b.slug), ['a']);
    // e o agrupamento em si não mudou
    assert.deepEqual(grupos.map((g) => g.anos), [[2022], [2023]]);
});

test('livrosDoGrupo preserva a ordem que recebeu (a ordenação atua dentro do nicho)', () => {
    const todos = [
        livro('z', '2022-06-15T00:00:00Z'),
        livro('a', '2022-07-15T00:00:00Z'),
    ];
    const grupos = agruparPorAnoDeLeitura(todos, 0.59);
    const reordenados = [todos[1], todos[0]];
    assert.deepEqual(livrosDoGrupo(grupos[0], reordenados).map((b) => b.slug), ['a', 'z']);
});

test('contarEstantes cresce só quando os nichos acabam', () => {
    assert.equal(contarEstantes(0, 5), 1);
    assert.equal(contarEstantes(5, 5), 1);
    assert.equal(contarEstantes(6, 5), 2);
    assert.equal(contarEstantes(11, 5), 3);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './shelf-years.mjs'`.

- [ ] **Step 3: Implementar**

Crie `lib/shelf-years.mjs`:

```js
/**
 * Agrupamento dos livros da estante por ANO DE LEITURA.
 *
 * A estante é uma linha do tempo: cada nicho guarda um ano, ou dois anos
 * vizinhos quando os dois juntos cabem. Quem decide isso é a largura real das
 * lombadas, não uma tabela escrita à mão — assim a divisão continua correta
 * quando o acervo cresce.
 *
 * .mjs pelo mesmo motivo de lib/book-dimensions.mjs: `node --test` roda isto
 * sem etapa de build.
 */

import {shelfWidthM} from './book-dimensions.mjs';

/**
 * Ano em que o livro foi lido, ou `null` se não há data.
 *
 * Lê com `getUTCFullYear`, não com o getter local: `finished_at` é uma coluna
 * DATE do Postgres, que o driver devolve como meia-noite UTC — em
 * America/Sao_Paulo (UTC-3), 2024-01-01 lido localmente vira 31/12/2023 e o
 * livro pularia de nicho.
 */
export function anoDeLeitura(finishedAt) {
    if (!finishedAt) return null;
    const d = new Date(finishedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCFullYear();
}

/** "2024" para um ano só, "2020-21" para uma faixa. */
function rotuloDeAnos(anos) {
    if (anos.length === 0) return 's/ data';
    const primeiro = anos[0];
    const ultimo = anos[anos.length - 1];
    if (primeiro === ultimo) return String(primeiro);
    return `${primeiro}-${String(ultimo).slice(-2)}`;
}

/**
 * Divide os livros em grupos cronológicos que cabem num nicho.
 *
 * Percorre os anos do mais antigo ao mais novo e só junta o ano seguinte ao
 * grupo atual se a soma das lombadas couber em `capacidadeM`. O resultado sai
 * em ordem cronológica — o índice 0 é o grupo mais antigo, que vai no nicho de
 * BAIXO, porque a leitura sobe.
 *
 * Um ano que sozinho já estoura a capacidade fica sozinho mesmo assim: não há
 * como partir um ano ao meio sem mentir sobre o que o nicho guarda, e é o
 * transbordo para a segunda estante (ver `contarEstantes`) que resolve o
 * espaço.
 *
 * Livros sem data de leitura vão para o grupo mais recente, que passa a
 * declarar `temSemData` — some da estante seria o pior desfecho possível para
 * um acervo pessoal.
 */
export function agruparPorAnoDeLeitura(shelfBooks, capacidadeM) {
    if (shelfBooks.length === 0) return [];

    const porAno = new Map();
    const semData = [];
    for (const livro of shelfBooks) {
        const ano = anoDeLeitura(livro.finishedAt);
        if (ano === null) {
            semData.push(livro);
            continue;
        }
        if (!porAno.has(ano)) porAno.set(ano, []);
        porAno.get(ano).push(livro);
    }

    const anosOrdenados = [...porAno.keys()].sort((a, b) => a - b);
    const grupos = [];
    let atual = null;

    for (const ano of anosOrdenados) {
        const livrosDoAno = porAno.get(ano);
        if (atual) {
            const juntos = [...atual.livros, ...livrosDoAno];
            if (shelfWidthM(juntos) <= capacidadeM) {
                atual.anos.push(ano);
                atual.livros = juntos;
                continue;
            }
        }
        atual = {anos: [ano], livros: livrosDoAno};
        grupos.push(atual);
    }

    if (semData.length > 0) {
        if (grupos.length === 0) grupos.push({anos: [], livros: []});
        grupos[grupos.length - 1].temSemData = true;
    }

    return grupos.map((g) => ({
        anos: g.anos,
        temSemData: Boolean(g.temSemData),
        rotulo: g.temSemData && g.anos.length > 0 ? `${rotuloDeAnos(g.anos)} + s/ data` : rotuloDeAnos(g.anos),
    }));
}

/**
 * Os livros de um grupo dentro de uma lista qualquer — normalmente a lista já
 * ordenada e filtrada que está na tela.
 *
 * Existe separado de `agruparPorAnoDeLeitura` de propósito: o agrupamento é
 * calculado uma vez sobre o acervo INTEIRO, e filtrar não pode fazer os anos
 * trocarem de nicho debaixo do dedo de quem está filtrando. A ordem da lista
 * recebida é preservada, que é como a ordenação do Índice atua dentro do
 * nicho.
 */
export function livrosDoGrupo(grupo, shelfBooks) {
    const anos = new Set(grupo.anos);
    return shelfBooks.filter((livro) => {
        const ano = anoDeLeitura(livro.finishedAt);
        if (ano === null) return grupo.temSemData;
        return anos.has(ano);
    });
}

/** Quantas estantes são necessárias para acomodar os grupos. Nunca menos de uma. */
export function contarEstantes(qtdGrupos, nichosPorEstante) {
    return Math.max(1, Math.ceil(qtdGrupos / nichosPorEstante));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS — os 11 testes novos.

- [ ] **Step 5: Commit**

```bash
git add lib/shelf-years.mjs lib/shelf-years.test.mjs
git commit -m "feat(livros): agrupamento cronologico dos livros por ano de leitura"
```

---

### Task 3: `finished_at` chega até a estante

**Files:**
- Modify: `lib/book-dimensions.mjs` (dentro de `toShelfBooks`)
- Modify: `app/livros/layout.tsx` (`mapShelved`)
- Modify: `components/livros/RoomCanvas.tsx` (tipo `ShelvedBookInput`)
- Modify: `components/livros/Book.tsx` (tipo `ShelfBookData`)
- Test: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Produces: `ShelfBookData.finishedAt: string | Date | null`, consumido pelas Tasks 5, 6 e 8 via `livrosDoGrupo`.

- [ ] **Step 1: Escrever o teste que falha**

Adicione ao final de `lib/book-dimensions.test.mjs`:

```js
test('toShelfBooks carrega a data de leitura adiante', () => {
    const livros = [{
        slug: 'x', title: 'X', author: null, rating: null, spine_color: null,
        cover_path: null, category: 'ficcao', tags: [], year: null, pages: 200,
        finished_at: '2024-03-15T00:00:00.000Z',
    }];
    assert.equal(toShelfBooks(livros)[0].finishedAt, '2024-03-15T00:00:00.000Z');
});

test('toShelfBooks aceita livro sem data de leitura', () => {
    const livros = [{
        slug: 'y', title: 'Y', author: null, rating: null, spine_color: null,
        cover_path: null, category: 'ficcao', tags: [], year: null, pages: 200,
    }];
    assert.equal(toShelfBooks(livros)[0].finishedAt, null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `undefined !== '2024-03-15T00:00:00.000Z'`.

- [ ] **Step 3: Levar o campo ponta a ponta**

Em `lib/book-dimensions.mjs`, dentro do objeto devolvido por `toShelfBooks`, logo depois de `year`:

```js
        year: b.year ?? null,
        finishedAt: b.finished_at ?? null,
```

Em `app/livros/layout.tsx`, no `mapShelved`, depois de `year`:

```js
        year: l.year,
        finished_at: l.finished_at,
```

Em `components/livros/RoomCanvas.tsx`, no tipo `ShelvedBookInput`, depois de `year`:

```ts
    year: number | null;
    finished_at: Date | string | null;
```

Em `components/livros/Book.tsx`, no tipo `ShelfBookData`, depois de `year` (o campo não é usado pelo componente — ele só precisa aceitá-lo para o objeto continuar tipado ao atravessar `Bookshelf`):

```ts
    year: number | null;
    finishedAt: Date | string | null;
```

- [ ] **Step 4: Rodar os testes e o typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS nos testes; `tsc` sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs app/livros/layout.tsx components/livros/RoomCanvas.tsx components/livros/Book.tsx
git commit -m "feat(livros): leva a data de leitura do banco ate a estante 3D"
```

---

### Task 4: A estante GLB entra na sala

**Files:**
- Modify: `components/livros/decor/KenneyModel.tsx` (mapa `MODELOS`)
- Modify: `components/livros/Room.tsx`

**Interfaces:**
- Consumes: `BOOKSHELF_SIZE_M`, `NICHOS_POR_ESTANTE` (Task 1); `contarEstantes` (Task 2).
- Produces: `ROOM_ANCHORS.estante` passando a ser o **ponto do chão sob o centro da primeira estante**, e `posicaoDaEstante(indice)` exportado de `Room.tsx`, consumido pelas Tasks 5 e 7.

- [ ] **Step 1: Registrar o modelo**

Em `components/livros/decor/KenneyModel.tsx`, dentro de `MODELOS`, junto das outras entradas:

```ts
    estanteLivros: '/livros/modelos/bookshelf-tall.glb',
```

Comentário a acrescentar logo acima dessa linha:

```ts
    // Não é do Furniture Kit do Kenney como os vizinhos — é o modelo do
    // poly.pizza escolhido pelo dono do acervo (CC0, textura embutida, por
    // isso não aparece em nenhum mapa de `cores`). Mora aqui mesmo assim
    // porque o carregamento é idêntico e ter dois mapas de URL seria pior.
```

- [ ] **Step 2: Trocar as pranchas pelo modelo em `Room.tsx`**

Troque o import de dimensões:

```tsx
import {SHELF_ROWS, SHELF_ROW_SPACING_M} from '@/lib/book-dimensions.mjs';
```

por:

```tsx
import {BOOKSHELF_SIZE_M, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';
```

Troque a âncora `estante` dentro de `ROOM_ANCHORS`:

```tsx
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
```

por:

```tsx
    // Ponto do CHÃO sob o centro da primeira estante (contrato de
    // posicionamento do KenneyModel), não mais o topo de uma prancha
    // flutuante: o móvel agora assenta no piso e encosta na parede de fundo
    // (-1.6 + metade da profundidade).
    estante: {
        position: [0, 0, -1.6 + BOOKSHELF_SIZE_M.profundidadeM / 2] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
```

Acrescente, logo abaixo de `ROOM_ANCHORS`:

```tsx
/**
 * Folga entre duas estantes vizinhas. Pequena de propósito: elas leem como um
 * conjunto, não como dois móveis que por acaso estão na mesma parede.
 */
const ESTANTE_GAP_M = 0.06;

/**
 * Ponto do chão sob o centro da estante `indice`, com o conjunto todo
 * centralizado na parede. Com uma estante só devolve a âncora; com duas, uma
 * vai pra esquerda e outra pra direita.
 */
export function posicaoDaEstante(indice: number, total: number): [number, number, number] {
    const passo = BOOKSHELF_SIZE_M.larguraM + ESTANTE_GAP_M;
    const x = (indice - (total - 1) / 2) * passo;
    const base = ROOM_ANCHORS.estante.position;
    return [base[0] + x, base[1], base[2]];
}
```

Troque a prop e o cálculo da prancha. Remova o tipo `RoomProps`, o `larguraEstanteM`, `larguraPrancha`, `SHELF_BOARD_MARGIN_M` e `SHELF_BOARD_MIN_WIDTH_M`, e a assinatura passa a ser:

```tsx
type RoomProps = {
    /**
     * Quantos grupos de ano a estante precisa acomodar. É só isso que o
     * cenário sabe sobre o acervo — quantas estantes montar. Quais livros
     * existem continua sendo assunto de Bookshelf.tsx.
     */
    gruposDeAno?: number;
};

export default function Room({gruposDeAno = 1}: RoomProps) {
    const totalEstantes = contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE);
```

E o bloco das pranchas (o `Array.from({length: SHELF_ROWS}, ...)` inteiro, com o comentário acima dele) vira:

```tsx
            {/*
              A estante do acervo — modelo GLB (CC0), não mais pranchas
              geradas em código. Fica dentro do mesmo <Suspense> da mobília
              logo abaixo? NÃO: ela é o motivo da sala existir, e suspender a
              sala inteira esperando por ela seria pior do que esperar pelos
              móveis. Tem o seu próprio boundary.

              Uma segunda estante só é montada quando os grupos de ano não
              cabem na primeira — ver contarEstantes.
            */}
            <Suspense fallback={null}>
                {Array.from({length: totalEstantes}, (_, i) => (
                    <KenneyModel
                        key={i}
                        url={MODELOS.estanteLivros}
                        position={posicaoDaEstante(i, totalEstantes)}
                        alturaAlvo={BOOKSHELF_SIZE_M.alturaM}
                    />
                ))}
            </Suspense>
```

- [ ] **Step 3: Ajustar quem passava a prop antiga**

Em `components/livros/RoomCanvas.tsx`, troque `<Room larguraEstanteM={larguraEstanteM}/>` por `<Room/>` **temporariamente** — a Task 8 volta aqui para passar `gruposDeAno`. Sem isso o `tsc` reclama de prop inexistente.

- [ ] **Step 4: Verificar no navegador**

Run: `npm run dev` e abra `http://localhost:3000/livros` (se a porta 3000 estiver ocupada, o Next avisa qual usou).
Expected: a estante de madeira aparece de pé no centro da parede de fundo, assentada no chão, com os 5 nichos visíveis. Os livros ainda estão no lugar errado (flutuando onde ficavam as tábuas) — isso é a Task 5. Confirme que o móvel **não** atravessa a parede nem flutua.

- [ ] **Step 5: Commit**

```bash
git add components/livros/Room.tsx components/livros/decor/KenneyModel.tsx components/livros/RoomCanvas.tsx
git commit -m "feat(livros): a estante do acervo vira o modelo GLB, assentado no chao"
```

---

### Task 5: Livros posicionados por nicho

**Files:**
- Modify: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: `NICHOS`, `NICHOS_POR_ESTANTE`, `NICHO_CAPACIDADE_M` (Task 1); `agruparPorAnoDeLeitura`, `livrosDoGrupo`, `contarEstantes` (Task 2); `posicaoDaEstante` (Task 4).
- Produces: nada consumido por outra task (a Task 6 acrescenta as etiquetas neste mesmo arquivo).

- [ ] **Step 1: Reescrever o corpo do componente**

Troque os imports de `Bookshelf.tsx`:

```tsx
import {shelfWidthM, splitShelfRows, SHELF_GAP_M, SHELF_ROW_SPACING_M} from '@/lib/book-dimensions.mjs';
```

por:

```tsx
import {shelfWidthM, SHELF_GAP_M} from '@/lib/book-dimensions.mjs';
import {NICHOS, NICHOS_POR_ESTANTE, NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, livrosDoGrupo, contarEstantes} from '@/lib/shelf-years.mjs';
import {posicaoDaEstante} from '@/components/livros/Room';
```

A prop nova, no tipo `BookshelfProps`:

```tsx
type BookshelfProps = {
    /** Acervo INTEIRO — define o agrupamento, que não pode mudar ao filtrar. */
    todosOsLivros: ShelfBookData[];
    /** O que está visível agora (já ordenado e filtrado pelo Índice). */
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};
```

E o corpo inteiro do `return` passa a ser:

```tsx
export default function Bookshelf({todosOsLivros, shelfBooks, atlas, openSlug, animate, isMobile}: BookshelfProps) {
    // O agrupamento sai do acervo COMPLETO: filtrar esconde livros, nunca
    // muda de que ano é cada nicho (ver spec, D6).
    const grupos = agruparPorAnoDeLeitura(todosOsLivros, NICHO_CAPACIDADE_M);
    const totalEstantes = contarEstantes(grupos.length, NICHOS_POR_ESTANTE);

    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

    return (
        <>
            {grupos.map((grupo, iGrupo) => {
                const iEstante = Math.floor(iGrupo / NICHOS_POR_ESTANTE);
                const nicho = NICHOS[iGrupo % NICHOS_POR_ESTANTE];
                const base = posicaoDaEstante(iEstante, totalEstantes);

                const livros = livrosDoGrupo(grupo, shelfBooks);
                // Fila centrada dentro do nicho, não colada à esquerda: um ano
                // com poucos livros num nicho largo lê melhor centralizado do
                // que empurrado pra um canto.
                const largura = shelfWidthM(livros);
                let xAtual = -largura / 2;

                return livros.map((book) => {
                    const spine = spineBySlug.get(book.slug);
                    if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                    const x = xAtual + book.thicknessM / 2;
                    xAtual += book.thicknessM + SHELF_GAP_M;
                    return (
                        <Book
                            key={book.slug}
                            book={book}
                            position={[
                                base[0] + nicho.offsetX + x,
                                base[1] + nicho.pisoY + book.heightM / 2,
                                base[2],
                            ]}
                            atlasTexture={atlas.texture}
                            uvRange={{u0: spine.u0, u1: spine.u1}}
                            isOpen={book.slug === openSlug}
                            animate={animate}
                            isMobile={isMobile}
                            anchor={ROOM_ANCHORS.estante}
                        />
                    );
                });
            })}
        </>
    );
}
```

Note que o `<group position={anchor.position}>` que embrulhava tudo **sai**: cada livro agora recebe posição absoluta, porque nichos de estantes diferentes não compartilham origem. `ROOM_ANCHORS` continua importado por causa do `anchor` que `Book` usa para a animação de abertura.

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev`, abra `/livros` e clique em "Estante".
Expected: os livros aparecem **dentro** dos nichos, um bloco por ano, o mais antigo embaixo. Nenhum livro atravessando prateleira ou flutuando fora do móvel. Espere uns 10 segundos antes de concluir que está certo — a posição é amortecida por `useFrame` e leva alguns frames para assentar (foi assim que um bug de posição passou despercebido antes).

- [ ] **Step 3: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "feat(livros): livros assentam nos nichos, agrupados por ano de leitura"
```

---

### Task 6: Etiquetas de ano na estante

**Files:**
- Modify: `components/livros/Bookshelf.tsx`

**Interfaces:**
- Consumes: os `grupos` já calculados na Task 5.
- Produces: prop `onSelecionarGrupo(indice: number)` e `grupoFocado`, que a Task 8 liga ao estado de `RoomCanvas`.

- [ ] **Step 1: Acrescentar as props**

No tipo `BookshelfProps`:

```tsx
    /** Índice do grupo em foco, ou null na visão da estante inteira. */
    grupoFocado: number | null;
    onSelecionarGrupo: (indice: number) => void;
```

- [ ] **Step 2: Desenhar a etiqueta em cada nicho**

Importe o `Html` do drei no topo do arquivo:

```tsx
import {Html} from '@react-three/drei';
```

Dentro do `grupos.map`, **antes** do `return livros.map(...)`, troque esse `return` por um fragmento que traz a etiqueta junto:

```tsx
                return (
                    <group key={grupo.rotulo}>
                        {/*
                          Etiqueta do ano, na borda frontal da prateleira. Mesmo
                          <Html> que já desenha a etiqueta de hover do livro —
                          `occlude` para ela sumir quando um móvel passa na
                          frente, senão flutuaria por cima da cena inteira.

                          `distanceFactor` maior que o do hover do livro (6): a
                          etiqueta precisa continuar legível na visão da estante
                          inteira, que é bem mais longe que a distância de hover.
                        */}
                        <Html
                            position={[
                                base[0] + nicho.offsetX,
                                base[1] + nicho.pisoY - 0.03,
                                base[2] + BOOKSHELF_SIZE_M.profundidadeM / 2,
                            ]}
                            center
                            distanceFactor={10}
                            occlude
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelecionarGrupo(iGrupo);
                                }}
                                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]
                                            font-semibold shadow transition ${
                                    grupoFocado === iGrupo
                                        ? 'bg-white text-black'
                                        : 'bg-black/70 text-white/90 hover:bg-black/90'
                                }`}
                            >
                                {grupo.rotulo}
                            </button>
                        </Html>
                        {livros.map((book) => {
                            const spine = spineBySlug.get(book.slug);
                            if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                            const x = xAtual + book.thicknessM / 2;
                            xAtual += book.thicknessM + SHELF_GAP_M;
                            return (
                                <Book
                                    key={book.slug}
                                    book={book}
                                    position={[
                                        base[0] + nicho.offsetX + x,
                                        base[1] + nicho.pisoY + book.heightM / 2,
                                        base[2],
                                    ]}
                                    atlasTexture={atlas.texture}
                                    uvRange={{u0: spine.u0, u1: spine.u1}}
                                    isOpen={book.slug === openSlug}
                                    animate={animate}
                                    isMobile={isMobile}
                                    anchor={ROOM_ANCHORS.estante}
                                />
                            );
                        })}
                    </group>
                );
```

O `key` sai do `livros.map` e vai para o `<group>` — o `key={book.slug}` do `<Book>` continua, mas agora é chave dentro do grupo, não da lista de cima.

Acrescente `BOOKSHELF_SIZE_M` ao import de `lib/bookshelf-model.mjs`.

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`, abra `/livros`, clique em "Estante".
Expected: uma etiqueta por nicho (`2020-21`, `2022`, `2023`, `2024`, `2025-26`), legível, na frente da prateleira. Clicar ainda não move a câmera (isso é a Task 7 + 8), mas o clique não pode dar erro no console nem abrir um livro por baixo.

- [ ] **Step 4: Commit**

```bash
git add components/livros/Bookshelf.tsx
git commit -m "feat(livros): etiqueta de ano clicavel em cada nicho da estante"
```

---

### Task 7: Câmera em dois níveis

**Files:**
- Modify: `components/livros/CameraRig.tsx`

**Interfaces:**
- Consumes: `NICHOS`, `NICHOS_POR_ESTANTE`, `BOOKSHELF_SIZE_M` (Task 1); `posicaoDaEstante` (Task 4).
- Produces: prop `grupoFocado: number | null` e `totalGrupos: number`; a prop `shelfWidthM` **sai**. Consumido pela Task 8.

- [ ] **Step 1: Trocar imports e derivar as distâncias**

Troque:

```tsx
import {SHELF_ROWS, SHELF_ROW_SPACING_M, BOOK_HEIGHT_BASE_M} from '@/lib/book-dimensions.mjs';
```

por:

```tsx
import {NICHOS, NICHOS_POR_ESTANTE, BOOKSHELF_SIZE_M} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';
import {ROOM_ANCHORS, posicaoDaEstante} from '@/components/livros/Room';
```

(o import de `ROOM_ANCHORS` já existe — troque a linha inteira pela versão acima.)

Substitua o `estanteMeioY` por:

```tsx
/**
 * Meio da altura ocupada pelos livros na estante. A âncora é o chão, então
 * mirar nela deixaria o móvel inteiro na metade de cima da tela.
 */
const estanteMeioY = ROOM_ANCHORS.estante.position[1] + BOOKSHELF_SIZE_M.alturaM / 2;

/**
 * Distância necessária para caber uma altura `alturaM` no campo vertical de
 * uma câmera com `fov` graus. `FOLGA_ENQUADRAMENTO` existe porque o header e
 * o rodapé cobrem as bordas do canvas (que é `fixed inset-0`): a conta pura
 * enquadra certo num retângulo limpo e corta nas pontas na tela real.
 */
const FOV_GRAUS = 50;
const FOLGA_ENQUADRAMENTO = 1.3;
function distanciaPara(alturaM: number): number {
    const meia = alturaM / 2;
    return (meia / Math.tan((FOV_GRAUS * Math.PI) / 360)) * FOLGA_ENQUADRAMENTO;
}
```

- [ ] **Step 2: Reescrever o viewpoint `estante` e criar o do nicho**

No objeto `VIEWPOINTS`, troque a entrada `estante` (com o comentário antigo sobre as duas fileiras) por:

```tsx
    // Nível 1: a estante inteira em quadro. A distância vem da altura do
    // móvel, não de um número calibrado à mão — trocar o modelo por outro
    // reenquadra sozinho.
    estante: {
        camera: [0, estanteMeioY, estanteZ + distanciaPara(BOOKSHELF_SIZE_M.alturaM)],
        target: [0, estanteMeioY, estanteZ],
        minAzimuth: -0.25, maxAzimuth: 0.25,
        minPolar: 1.3, maxPolar: 1.75,
    },
```

E logo abaixo do objeto `VIEWPOINTS`:

```tsx
/**
 * Nível 2: um nicho preenchendo o quadro, com as bordas dos vizinhos ainda
 * aparecendo (spec, D4 — só a câmera se move, nada escurece). Enquadra a
 * altura do vão mais uma margem que é justamente o que deixa o vizinho
 * espiando.
 */
const MARGEM_VIZINHOS_M = 0.16;

function viewpointDoGrupo(indiceGrupo: number, totalGrupos: number): ViewpointConfig {
    const totalEstantes = contarEstantes(totalGrupos, NICHOS_POR_ESTANTE);
    const nicho = NICHOS[indiceGrupo % NICHOS_POR_ESTANTE];
    const base = posicaoDaEstante(Math.floor(indiceGrupo / NICHOS_POR_ESTANTE), totalEstantes);

    const alvoX = base[0] + nicho.offsetX;
    const alvoY = base[1] + nicho.pisoY + nicho.alturaUtilM / 2;
    const distancia = distanciaPara(nicho.alturaUtilM + MARGEM_VIZINHOS_M);

    return {
        camera: [alvoX, alvoY, base[2] + distancia],
        target: [alvoX, alvoY, base[2]],
        minAzimuth: -0.15, maxAzimuth: 0.15,
        minPolar: 1.4, maxPolar: 1.7,
    };
}
```

- [ ] **Step 3: Trocar as props do componente**

A assinatura passa a ser:

```tsx
type CameraRigProps = {
    viewpoint: Viewpoint;
    animate?: boolean;
    /** Índice do grupo de ano em foco. Só tem efeito no viewpoint 'estante'. */
    grupoFocado?: number | null;
    totalGrupos?: number;
};

export default function CameraRig({viewpoint, animate = true, grupoFocado = null, totalGrupos = 0}: CameraRigProps) {
    const controlsRef = useRef<CameraControls>(null);
    const v = (viewpoint === 'estante' && grupoFocado !== null)
        ? viewpointDoGrupo(grupoFocado, totalGrupos)
        : VIEWPOINTS[viewpoint];

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint, grupoFocado]);

    return (
        <CameraControls
            ref={controlsRef}
            minAzimuthAngle={v.minAzimuth}
            maxAzimuthAngle={v.maxAzimuth}
            minPolarAngle={v.minPolar}
            maxPolarAngle={v.maxPolar}
            dollySpeed={0}
            truckSpeed={0}
            touches-one={CameraControlsImpl.ACTION.TOUCH_ROTATE}
        />
    );
}
```

**Some tudo que era trilho mobile**: o `useEffect` do `setBoundary`, as constantes `TRILHO_FOLGA_X_M`/`TRILHO_FOLGA_YZ_M`, o `trilhoAtivo`, a prop `isMobile` e a prop `shelfWidthM`, e os imports de `THREE` e `CameraControlsImpl`… **exceto** `CameraControlsImpl`, que continua em uso no `touches-one`. O import de `* as THREE` sai (era só do `Box3`).

Comentário a deixar no lugar, logo acima do `return`:

```tsx
    // Sem trilho de arrasto: ele existia porque a fila de livros era mais
    // larga que a tela. A estante agora é vertical e cabe inteira no quadro,
    // e navegar é escolher um ano — mais preciso no toque do que arrastar
    // até achar (spec, D9).
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: erro APENAS em `RoomCanvas.tsx`, que ainda passa `isMobile`/`shelfWidthM` para o `CameraRig` — a Task 8 conserta. Nenhum erro dentro do próprio `CameraRig.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/livros/CameraRig.tsx
git commit -m "feat(livros): camera em dois niveis, da estante inteira ao nicho do ano"
```

---

### Task 8: Estado do ano e a segunda linha de botões

**Files:**
- Modify: `components/livros/RoomCanvas.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 4-7.
- Produces: nada — é o fim da cadeia.

- [ ] **Step 1: Trocar imports e o cálculo de largura**

Troque:

```tsx
import {toShelfBooks, shelfWidthM, splitShelfRows} from '@/lib/book-dimensions.mjs';
import type {ShelfBookData} from '@/components/livros/Book';
```

por:

```tsx
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, livrosDoGrupo} from '@/lib/shelf-years.mjs';
```

Remova o `useMemo` inteiro de `larguraEstanteM` (o comentário sobre a fileira mais larga vai junto) e ponha no lugar:

```tsx
    // Os grupos de ano saem do acervo INTEIRO (não da lista filtrada), pelo
    // mesmo motivo que Bookshelf.tsx: filtrar esconde livros, nunca muda de
    // que ano é cada nicho.
    const grupos = useMemo(
        () => agruparPorAnoDeLeitura(shelfBooksBase, NICHO_CAPACIDADE_M),
        [shelfBooksBase],
    );
```

- [ ] **Step 2: Estado do grupo focado**

Junto dos outros `useState`:

```tsx
    const [grupoFocado, setGrupoFocado] = useState<number | null>(null);
```

E logo depois da definição de `viewpoint`:

```tsx
    // Sair da cena da estante larga o foco do ano: voltar depois pela cena
    // "Estante" tem que começar do nível 1 de novo, não no zoom em que a
    // pessoa estava três cliques atrás.
    useEffect(() => {
        if (manualViewpoint !== 'estante') setGrupoFocado(null);
    }, [manualViewpoint]);

    // Clicar no ano já ativo sobe um nível (spec, D4).
    const selecionarGrupo = useCallback((indice: number) => {
        setGrupoFocado((atual) => (atual === indice ? null : indice));
    }, []);
```

- [ ] **Step 3: `Esc` sobe um nível antes de qualquer outra coisa**

No `useEffect` do teclado, dentro do bloco que hoje trata a sala (depois do `if (indiceAberto)`), acrescente **antes** das setas:

```tsx
            if (e.key === 'Escape' && grupoFocado !== null) {
                setGrupoFocado(null);
                return;
            }
```

E acrescente `grupoFocado` ao array de dependências desse `useEffect`.

- [ ] **Step 4: Passar tudo para a cena**

No JSX do `<Canvas>`:

```tsx
                    <Room gruposDeAno={grupos.length}/>
                    <Bookshelf
                        todosOsLivros={shelfBooksBase}
                        shelfBooks={shelfBooksVisiveis}
                        atlas={atlas}
                        openSlug={openSlug}
                        animate={animateTransitions}
                        isMobile={isMobile}
                        grupoFocado={grupoFocado}
                        onSelecionarGrupo={selecionarGrupo}
                    />
```

E o `CameraRig`:

```tsx
                    <CameraRig
                        viewpoint={viewpoint}
                        animate={animateTransitions}
                        grupoFocado={grupoFocado}
                        totalGrupos={grupos.length}
                    />
```

- [ ] **Step 5: A segunda linha de botões**

Dentro do bloco `{mode.kind === 'sala' && !indiceAberto && (...)}`, envolva a linha de cenas existente num container em coluna e acrescente a linha de anos **acima** dela:

```tsx
                <div
                    style={{bottom: `${alturaRodape + 24}px`}}
                    className="fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
                >
                    {/*
                      Sub-nível: só existe na cena da estante. Fica ACIMA da
                      linha de cenas porque é um nível abaixo dela na
                      navegação — a linha de baixo é onde você está, a de cima
                      é dentro de onde você está.
                    */}
                    {manualViewpoint === 'estante' && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {grupos.map((grupo, i) => {
                                const visiveis = livrosDoGrupo(grupo, shelfBooksVisiveis).length;
                                const totalDoGrupo = livrosDoGrupo(grupo, shelfBooksBase).length;
                                const filtrado = visiveis !== totalDoGrupo;
                                return (
                                    <button
                                        key={grupo.rotulo}
                                        onClick={() => selecionarGrupo(i)}
                                        disabled={visiveis === 0}
                                        aria-current={grupoFocado === i ? 'true' : undefined}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold shadow-lg transition
                                                    disabled:cursor-not-allowed disabled:opacity-40 ${
                                            grupoFocado === i ? 'bg-white text-black' : 'bg-black/60 text-white'
                                        }`}
                                    >
                                        {grupo.rotulo}{filtrado && ` · ${visiveis}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex gap-2">
                        {CENAS.map((cena: {id: Viewpoint; rotulo: string}) => (
                            <button
                                key={cena.id}
                                onClick={() => setManualViewpoint(cena.id)}
                                aria-current={manualViewpoint === cena.id ? 'true' : undefined}
                                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === cena.id ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                            >
                                {cena.rotulo}
                            </button>
                        ))}
                    </div>
                </div>
```

O comentário longo que hoje explica o `style={{bottom: ...}}` e o `z-20` continua onde está, acima do container externo — ele explica o posicionamento dos dois níveis, não só da linha de cenas.

- [ ] **Step 6: Verificar no navegador**

Run: `npm run dev`, abra `/livros`.
Expected, na ordem:
1. Clicar em "Estante" mostra o móvel inteiro e faz aparecer a linha de anos.
2. Clicar em `2023` (botão ou etiqueta 3D) aproxima naquele nicho; as lombadas ficam legíveis e as bordas dos nichos vizinhos continuam à vista.
3. Clicar em `2023` de novo, ou `Esc`, volta para a estante inteira.
4. Ir para "Sala" e voltar para "Estante" começa no nível 1.
5. Abrir o Índice e filtrar por uma categoria: os botões de ano passam a mostrar `· N`, algum pode ficar esmaecido, e **nenhum ano troca de nicho**.

- [ ] **Step 7: Commit**

```bash
git add components/livros/RoomCanvas.tsx
git commit -m "feat(livros): navegacao por ano na estante, com botoes e foco de camera"
```

---

### Task 9: Remover o que a divisão por fileiras deixou para trás

**Files:**
- Modify: `lib/book-dimensions.mjs`
- Modify: `lib/book-dimensions.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces: nada — é limpeza.

- [ ] **Step 1: Conferir que ninguém mais usa**

Run: `rg "splitShelfRows|SHELF_ROWS|SHELF_ROW_SPACING_M" --glob '!node_modules'`
Expected: só as definições em `lib/book-dimensions.mjs` e os testes delas em `lib/book-dimensions.test.mjs`. Se algum componente aparecer, ele ficou para trás numa task anterior — conserte antes de apagar.

- [ ] **Step 2: Apagar**

Remova de `lib/book-dimensions.mjs` as exportações `SHELF_ROW_SPACING_M`, `SHELF_ROWS` e a função `splitShelfRows` inteira (com os comentários). Remova de `lib/book-dimensions.test.mjs` os testes de `splitShelfRows`.

- [ ] **Step 3: Rodar tudo**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: testes passando, `tsc` limpo, ESLint sem avisos.

- [ ] **Step 4: Verificação final no navegador**

Run: `npm run dev` e percorra: Sala → Estante → cada um dos 5 anos → abrir um livro de dentro de um nicho → fechar → Índice com filtro → Mesa. Confirme também numa janela estreita (~400px de largura) que a linha de anos não estoura a tela e que não sobrou arrasto lateral.
Expected: nenhum erro no console; livro aberto anima da prateleira e volta para o mesmo nicho ao fechar.

- [ ] **Step 5: Commit**

```bash
git add lib/book-dimensions.mjs lib/book-dimensions.test.mjs
git commit -m "refactor(livros): remove a divisao em fileiras, substituida pelos nichos por ano"
```
