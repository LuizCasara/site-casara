# Reorganização do repositório por domínio — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover os 318 arquivos mapeados em `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-mapa.tsv` para a estrutura por domínio (`global`/`apps`/`livros`/`ingress`) descrita no spec, sem mudar nenhum comportamento, URL, contrato de API ou visual.

**Architecture:** Ferramentas Node descartáveis em `scripts/superpowers/` (removidas no Task 9) fazem o trabalho mecânico: `move-by-domain.mjs` executa `git mv` fase a fase a partir do TSV; `fix-imports.mjs` reescreve os imports quebrados pela fase; `verify-imports.mjs` é o gate que garante zero import quebrado antes de cada commit. Cada fase do spec (seção 11) vira um Task com um commit único, no fim de um gate `verificador de imports → tsc → lint → test → build`.

**Tech Stack:** Node.js (`node:fs`, `node:path`, `node:child_process`, `node:url`), `node --test` para os testes das ferramentas, TypeScript (`tsc --noEmit`), ESLint, Next.js 16 build, `npx playwright` (via subprocesso, nunca `require`) + `pixelmatch`/`pngjs` (já presentes em `node_modules`) para o snapshot visual.

**Spec:** [`docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-design.md`](../specs/2026-09-21-reorganizacao-por-dominio-design.md) + [`2026-09-21-reorganizacao-por-dominio-mapa.tsv`](../specs/2026-09-21-reorganizacao-por-dominio-mapa.tsv) (318 linhas de dados, fonte única do que move). Este plano só sequencia e ferramentaliza a execução; qualquer dúvida sobre "por quê" de uma decisão está no spec, não aqui.

## Global Constraints

- **Refactor de lugar, não de comportamento.** Nenhuma URL, contrato de API, nome de arquivo ou pixel muda — só a pasta.
- **Não mexer**: `public/`, `data/`, `content/`, `proxy.ts`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json` (alias `@/*` continua válido), `.specs/`, `.superpowers/`, `docs/adr/`.
- **`git mv` sempre via script Node** (`execFileSync`, nunca `exec`/shell, nunca glob) — colchetes/parênteses nos caminhos (`[id]`, `(livros)`) quebram o shell do Windows.
- **Nunca `require('playwright')`/`import 'playwright'` direto** — só via subprocesso `npx -y playwright ...` (o pacote não é dependência do projeto; só `pixelmatch`/`pngjs`, transitivos hoisted, resolvem direto).
- **`rm -rf .next`** (`Remove-Item -Recurse -Force .next` no PowerShell) antes de cada `tsc`/`build` de verificação de fase — cache com caminho velho mascara quebra.
- **Uma fase do spec = um commit**, sempre depois do gate completo (`verify-imports` → `tsc --noEmit` → `npm run lint` → `npm test`, contagem de testes igual à baseline → `next build`, lista de rotas igual à baseline).
- **As exceções de dependência da seção 6 do spec ficam como estão** — não "corrigir" `(global)/api/telegram/route.js` importando de `lib/ingress/...`, nem extrair `slugify` de `lib/livros/acervo/book-utils.mjs` para os scripts de ingress.
- **`scripts/superpowers/` é ferramental descartável desta refatoração**, não faz parte da estrutura por domínio do spec — é removido no Task 9, depois do gate final passar.

---

## Task 0.1: `mapa-utils.mjs` — leitura do TSV e regra de fase

O TSV tem uma coluna `dominio`, mas domínio sozinho não basta para saber em que fase (1–9) um arquivo move: `global` se espalha pelas fases 1 (lib/components), 6 (rotas) e 7 (docs/scripts); o mesmo vale para `apps`/`livros`/`ingress` (fase própria + fase 7 para docs/scripts). A regra exata, validada contra as 318 linhas do TSV (soma bate: 33+35+103+105+18+24 = 318, igual à seção 11 do spec):

```
docs/ ou scripts/          → fase 7
dominio=global, resto      → app/... ? fase 6 : fase 1
dominio=apps                → fase 2
dominio=livros               → fase 4
dominio=ingress               → fase 5
```

**Files:**
- Create: `scripts/superpowers/mapa-utils.mjs`
- Test: `scripts/superpowers/mapa-utils.test.mjs`

**Interfaces:**
- Produces: `ROOT` (string, raiz do repo), `loadMapaRows(): {antigo:string, novo:string, dominio:string}[]`, `phaseOf(row): number`, `rowsForPhase(phase:number): row[]`, `toPosix(p:string): string`, `listSourceFiles(dir:string, exts:string[]): string[]` (usado por `verify-imports.mjs` e `fix-imports.mjs`)

- [ ] **Step 1: Escrever o teste que falha**

```js
// scripts/superpowers/mapa-utils.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMapaRows, phaseOf, rowsForPhase } from './mapa-utils.mjs';

test('carrega as 318 linhas de dados do TSV', () => {
  const rows = loadMapaRows();
  assert.equal(rows.length, 318);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['antigo', 'dominio', 'novo']);
});

test('phaseOf: docs/ e scripts/ sempre vão para a fase 7, mesmo domínio ingress/livros/apps', () => {
  assert.equal(phaseOf({ antigo: 'docs/livros-sala-3d.md', novo: 'docs/livros/livros-sala-3d.md', dominio: 'livros' }), 7);
  assert.equal(phaseOf({ antigo: 'scripts/ingress.mjs', novo: 'scripts/ingress/ingress.mjs', dominio: 'ingress' }), 7);
});

test('phaseOf: domínio global — app/ vai para 6, o resto para 1', () => {
  assert.equal(phaseOf({ antigo: 'app/page.tsx', novo: 'app/(global)/page.tsx', dominio: 'global' }), 6);
  assert.equal(phaseOf({ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }), 1);
});

test('phaseOf: apps=2, livros=4, ingress=5 para o resto (não docs/scripts)', () => {
  assert.equal(phaseOf({ antigo: 'lib/quiz.ts', novo: 'lib/apps/quiz.ts', dominio: 'apps' }), 2);
  assert.equal(phaseOf({ antigo: 'lib/books.ts', novo: 'lib/livros/acervo/books.ts', dominio: 'livros' }), 4);
  assert.equal(phaseOf({ antigo: 'lib/ingress.ts', novo: 'lib/ingress/profile/ingress.ts', dominio: 'ingress' }), 5);
});

test('a distribuição real por fase bate com a seção 11 do spec (1067→318 rastreados)', () => {
  const rows = loadMapaRows();
  const counts = {};
  for (const r of rows) counts[phaseOf(r)] = (counts[phaseOf(r)] ?? 0) + 1;
  assert.deepEqual(counts, { 1: 33, 2: 35, 4: 103, 5: 105, 6: 18, 7: 24 });
});

test('rowsForPhase(1) só devolve linhas de fase 1', () => {
  const rows = rowsForPhase(1);
  assert.equal(rows.length, 33);
  assert.ok(rows.every((r) => !r.antigo.startsWith('app/') && !r.antigo.startsWith('docs/') && !r.antigo.startsWith('scripts/')));
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test scripts/superpowers/mapa-utils.test.mjs`
Expected: FAIL — `Cannot find module './mapa-utils.mjs'`

- [ ] **Step 3: Implementar**

```js
// scripts/superpowers/mapa-utils.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TSV_PATH = path.join(ROOT, 'docs', 'superpowers', 'specs', '2026-09-21-reorganizacao-por-dominio-mapa.tsv');

export function toPosix(p) {
  return p.split(path.sep).join('/');
}

export function loadMapaRows(tsvPath = TSV_PATH) {
  const text = fs.readFileSync(tsvPath, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [antigo, novo, dominio] = line.split('\t');
    if (!antigo || !novo || !dominio) continue;
    rows.push({ antigo, novo, dominio });
  }
  return rows;
}

export function phaseOf(row) {
  const { antigo, dominio } = row;
  if (antigo.startsWith('docs/') || antigo.startsWith('scripts/')) return 7;
  if (dominio === 'global') return antigo.startsWith('app/') ? 6 : 1;
  if (dominio === 'apps') return 2;
  if (dominio === 'livros') return 4;
  if (dominio === 'ingress') return 5;
  throw new Error(`domínio desconhecido "${dominio}" na linha: ${antigo}`);
}

export function rowsForPhase(phase, tsvPath = TSV_PATH) {
  return loadMapaRows(tsvPath).filter((r) => phaseOf(r) === phase);
}

const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', 'out', 'public']);

export function listSourceFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs'], out = [], skipDirs = DEFAULT_SKIP_DIRS) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, exts, out, skipDirs);
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/superpowers/mapa-utils.test.mjs`
Expected: PASS — 5 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/superpowers/mapa-utils.mjs scripts/superpowers/mapa-utils.test.mjs
git commit -m "chore(refactor): ferramenta de leitura do mapa de reorganização por domínio"
```

---

## Task 0.2: `verify-imports.mjs` — gate de imports quebrados

O `tsc` não vê `.mjs` (`checkJs: false` no `tsconfig.json`), então é a única rede de segurança para imports quebrados nesses arquivos — roda depois de CADA fase, antes de cada commit.

**Files:**
- Create: `scripts/superpowers/verify-imports.mjs`
- Test: `scripts/superpowers/verify-imports.test.mjs`

**Interfaces:**
- Consumes: `listSourceFiles`, `toPosix`, `ROOT` de `[[mapa-utils.mjs]]` (Task 0.1)
- Produces: `findBrokenImports(rootDir): {file:string, line:number, specifier:string}[]`; CLI que sai com código 1 se a lista não for vazia

- [ ] **Step 1: Escrever o teste que falha**

```js
// scripts/superpowers/verify-imports.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBrokenImports } from './verify-imports.mjs';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-imports-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('import relativo válido não é reportado', () => {
  const dir = fixture({
    'a.ts': "import { b } from './b';\nexport const a = 1;\n",
    'b.ts': 'export const b = 2;\n',
  });
  assert.deepEqual(findBrokenImports(dir), []);
});

test('import relativo quebrado é reportado com arquivo e linha', () => {
  const dir = fixture({ 'a.ts': "import { x } from './nao-existe';\n" });
  const broken = findBrokenImports(dir);
  assert.equal(broken.length, 1);
  assert.equal(broken[0].file, 'a.ts');
  assert.equal(broken[0].line, 1);
  assert.equal(broken[0].specifier, './nao-existe');
});

test('alias @/ resolve a partir da raiz do fixture', () => {
  const dir = fixture({
    'lib/db.ts': 'export const sql = 1;\n',
    'app/page.tsx': "import { sql } from '@/lib/db';\n",
  });
  assert.deepEqual(findBrokenImports(dir), []);
});

test('require() e import() dinâmico também são checados', () => {
  const dir = fixture({
    'a.mjs': "const b = require('./falta.mjs');\nconst c = await import('./tambem-falta.mjs');\n",
  });
  const broken = findBrokenImports(dir);
  assert.equal(broken.length, 2);
});

test('import de pacote (não relativo, não @/) é ignorado', () => {
  const dir = fixture({ 'a.ts': "import React from 'react';\n" });
  assert.deepEqual(findBrokenImports(dir), []);
});

test('resolve sem extensão explícita contra o arquivo .mjs real', () => {
  const dir = fixture({
    'a.ts': "import { b } from './b';\n",
    'b.mjs': 'export const b = 1;\n',
  });
  assert.deepEqual(findBrokenImports(dir), []);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test scripts/superpowers/verify-imports.test.mjs`
Expected: FAIL — `Cannot find module './verify-imports.mjs'`

- [ ] **Step 3: Implementar**

```js
// scripts/superpowers/verify-imports.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listSourceFiles, toPosix } from './mapa-utils.mjs';

export const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];

export const SPEC_RE =
  /\bfrom\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;

function existsWithSuffix(absNoExt) {
  return RESOLVE_SUFFIXES.some((suf) => fs.existsSync(absNoExt + suf));
}

export function findBrokenImports(rootDir = ROOT) {
  const broken = [];
  for (const file of listSourceFiles(rootDir)) {
    const text = fs.readFileSync(file, 'utf8');
    const fileDir = path.dirname(file);
    let match;
    SPEC_RE.lastIndex = 0;
    while ((match = SPEC_RE.exec(text))) {
      const spec = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!spec) continue;
      let absNoExt;
      if (spec.startsWith('.')) {
        absNoExt = path.resolve(fileDir, spec);
      } else if (spec.startsWith('@/')) {
        absNoExt = path.resolve(rootDir, spec.slice(2));
      } else {
        continue; // pacote de node_modules, fora de escopo
      }
      if (!existsWithSuffix(absNoExt)) {
        const line = text.slice(0, match.index).split('\n').length;
        broken.push({ file: toPosix(path.relative(rootDir, file)), line, specifier: spec });
      }
    }
  }
  return broken;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const broken = findBrokenImports();
  if (broken.length === 0) {
    console.log('verify-imports: 0 imports quebrados.');
    process.exit(0);
  }
  console.error(`verify-imports: ${broken.length} import(s) quebrado(s):`);
  for (const b of broken) console.error(`  ${b.file}:${b.line}  ->  "${b.specifier}"`);
  process.exit(1);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/superpowers/verify-imports.test.mjs`
Expected: PASS — 6 testes

- [ ] **Step 5: Rodar contra o repositório real como smoke test (nenhuma fase moveu nada ainda, tem que dar zero)**

Run: `node scripts/superpowers/verify-imports.mjs`
Expected: `verify-imports: 0 imports quebrados.` — se aparecer algo aqui, é uma quebra pré-existente, **não culpar o refactor** (registrar no baseline do Task 0.5 e seguir)

- [ ] **Step 6: Commit**

```bash
git add scripts/superpowers/verify-imports.mjs scripts/superpowers/verify-imports.test.mjs
git commit -m "chore(refactor): gate de imports quebrados para as fases da reorganização"
```

---

## Task 0.3: `move-by-domain.mjs` — mover uma fase via `git mv`

**Files:**
- Create: `scripts/superpowers/move-by-domain.mjs`
- Test: `scripts/superpowers/move-by-domain.test.mjs`

**Interfaces:**
- Consumes: `rowsForPhase`, `ROOT` de `[[mapa-utils.mjs]]`
- Produces: `moveRows(rows, {rootDir, dryRun}): {moved: row[], skipped: row[]}` (idempotente: se `antigo` não existe mas `novo` já existe, marca como `skipped` em vez de falhar — permite re-rodar uma fase interrompida)

- [ ] **Step 1: Escrever o teste que falha**

```js
// scripts/superpowers/move-by-domain.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { moveRows } from './move-by-domain.mjs';

function gitFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'move-by-domain-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  return dir;
}

test('move um arquivo simples e cria a pasta de destino com git mv', () => {
  const dir = gitFixture();
  fs.writeFileSync(path.join(dir, 'lib.ts'), 'export const a = 1;\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

  const result = moveRows([{ antigo: 'lib.ts', novo: 'lib/global/lib.ts', dominio: 'global' }], { rootDir: dir });

  assert.equal(result.moved.length, 1);
  assert.equal(fs.existsSync(path.join(dir, 'lib.ts')), false);
  assert.equal(fs.existsSync(path.join(dir, 'lib', 'global', 'lib.ts')), true);
});

test('lida com colchetes e parênteses no caminho (route groups, rotas dinâmicas)', () => {
  const dir = gitFixture();
  fs.mkdirSync(path.join(dir, 'app', 'w', '[id]'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'w', '[id]', 'page.tsx'), 'export default function P() { return null; }\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

  const result = moveRows(
    [{ antigo: 'app/w/[id]/page.tsx', novo: 'app/(apps)/w/[id]/page.tsx', dominio: 'apps' }],
    { rootDir: dir }
  );

  assert.equal(result.moved.length, 1);
  assert.equal(fs.existsSync(path.join(dir, 'app', '(apps)', 'w', '[id]', 'page.tsx')), true);
});

test('dryRun não toca no disco', () => {
  const dir = gitFixture();
  fs.writeFileSync(path.join(dir, 'lib.ts'), 'export const a = 1;\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

  const result = moveRows([{ antigo: 'lib.ts', novo: 'lib/global/lib.ts', dominio: 'global' }], {
    rootDir: dir,
    dryRun: true,
  });

  assert.equal(result.moved.length, 1);
  assert.equal(fs.existsSync(path.join(dir, 'lib.ts')), true);
});

test('idempotente: se antigo já não existe e novo já existe, marca como skipped em vez de falhar', () => {
  const dir = gitFixture();
  fs.mkdirSync(path.join(dir, 'lib', 'global'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'lib', 'global', 'lib.ts'), 'export const a = 1;\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

  const result = moveRows([{ antigo: 'lib.ts', novo: 'lib/global/lib.ts', dominio: 'global' }], { rootDir: dir });

  assert.equal(result.moved.length, 0);
  assert.equal(result.skipped.length, 1);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test scripts/superpowers/move-by-domain.test.mjs`
Expected: FAIL — `Cannot find module './move-by-domain.mjs'`

- [ ] **Step 3: Implementar**

```js
// scripts/superpowers/move-by-domain.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, rowsForPhase } from './mapa-utils.mjs';

export function moveRows(rows, { rootDir = ROOT, dryRun = false } = {}) {
  const moved = [];
  const skipped = [];
  for (const row of rows) {
    const oldAbs = path.resolve(rootDir, row.antigo);
    const newAbs = path.resolve(rootDir, row.novo);
    const oldExists = fs.existsSync(oldAbs);
    const newExists = fs.existsSync(newAbs);

    if (!oldExists && newExists) {
      skipped.push(row);
      continue;
    }
    if (!oldExists && !newExists) {
      throw new Error(`nem "${row.antigo}" nem "${row.novo}" existem — dado inconsistente`);
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(newAbs), { recursive: true });
      execFileSync('git', ['mv', row.antigo, row.novo], { cwd: rootDir });
    }
    moved.push(row);
  }
  return { moved, skipped };
}

function parseArgs(argv) {
  const args = { phase: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--phase') args.phase = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { phase, dryRun } = parseArgs(process.argv.slice(2));
  if (!phase) {
    console.error('uso: node scripts/superpowers/move-by-domain.mjs --phase <1|2|4|5|6|7> [--dry-run]');
    process.exit(1);
  }
  const rows = rowsForPhase(phase);
  console.log(`fase ${phase}: ${rows.length} linha(s)${dryRun ? ' (dry-run)' : ''}`);
  const { moved, skipped } = moveRows(rows, { dryRun });
  for (const r of moved) console.log(`  mv  ${r.antigo}  ->  ${r.novo}`);
  for (const r of skipped) console.log(`  já movido, pulando: ${r.novo}`);
  console.log(`${moved.length} movido(s), ${skipped.length} já estava(m) movido(s)`);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/superpowers/move-by-domain.test.mjs`
Expected: PASS — 4 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/superpowers/move-by-domain.mjs scripts/superpowers/move-by-domain.test.mjs
git commit -m "chore(refactor): script de mover arquivos por fase via git mv"
```

---

## Task 0.4: `fix-imports.mjs` — reescrever imports depois de mover uma fase

Dois casos, tratados em dois passes sobre todo o repositório (não só os arquivos movidos):

1. **Arquivo que se moveu nesta fase** (é o importador): sua própria mudança de pasta pode desalinhar TODOS os seus imports relativos, mesmo os que apontam para arquivos que não se moveram. A correção é puramente geométrica — recalcula o `../` a partir da nova pasta — **exceto** quando o alvo também se moveu nesta mesma fase, caso em que usa o mapa da fase para achar o destino real antes de recalcular.
2. **Arquivo que não se moveu nesta fase** (é consumidor de algo que se moveu): resolve cada import relativo/`@/` a partir da própria pasta (que não mudou) e, se bater com um `antigo` do mapa desta fase, troca pelo `novo`.

Por indução, isso é suficiente: ao final de cada fase, todo import no repositório aponta corretamente para tudo que já se moveu até aqui — então na fase seguinte, quando um arquivo com import já corrigido finalmente se move, o passe 1 (geométrico) já encontra o texto certo para só re-basear.

**Files:**
- Create: `scripts/superpowers/fix-imports.mjs`
- Test: `scripts/superpowers/fix-imports.test.mjs`

**Interfaces:**
- Consumes: `ROOT`, `rowsForPhase`, `listSourceFiles`, `toPosix` de `[[mapa-utils.mjs]]`; `RESOLVE_SUFFIXES`, `SPEC_RE` de `[[verify-imports.mjs]]` (Task 0.2)
- Produces: `rewriteImportsForPhase(phase, rootDir): string[]` (caminhos relativos dos arquivos alterados)

- [ ] **Step 1: Escrever o teste que falha**

```js
// scripts/superpowers/fix-imports.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { moveRows } from './move-by-domain.mjs';
import { findBrokenImports } from './verify-imports.mjs';
import { rewriteImportsForPhase } from './fix-imports.mjs';

function gitFixtureWithMapa(files, rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-imports-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  const tsvPath = path.join(dir, 'mapa.tsv');
  fs.writeFileSync(tsvPath, ['# antigo\tnovo\tdominio', ...rows.map((r) => `${r.antigo}\t${r.novo}\t${r.dominio}`)].join('\n'));
  return { dir, tsvPath };
}

test('consumidor que não se moveu: import relativo é atualizado para a nova localização do alvo', () => {
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  const { dir, tsvPath } = gitFixtureWithMapa(
    { 'lib/db.ts': 'export const sql = 1;\n', 'app/page.tsx': "import { sql } from '../lib/db';\n" },
    rows
  );
  moveRows(rows, { rootDir: dir });
  rewriteImportsForPhase(1, dir, tsvPath);
  const text = fs.readFileSync(path.join(dir, 'app', 'page.tsx'), 'utf8');
  assert.match(text, /from ['"]\.\.\/lib\/global\/db['"]/);
  assert.deepEqual(findBrokenImports(dir), []);
});

test('mover o importador: re-base geométrico de um import para um arquivo que NÃO se moveu', () => {
  const rows = [{ antigo: 'scripts/foo.mjs', novo: 'scripts/livros/foo.mjs', dominio: 'livros' }];
  const { dir, tsvPath } = gitFixtureWithMapa(
    { 'lib/reading-dates.mjs': 'export const d = 1;\n', 'scripts/foo.mjs': "import { d } from '../lib/reading-dates.mjs';\n" },
    rows
  );
  moveRows(rows, { rootDir: dir });
  rewriteImportsForPhase(4, dir, tsvPath);
  const text = fs.readFileSync(path.join(dir, 'scripts', 'livros', 'foo.mjs'), 'utf8');
  assert.match(text, /from ['"]\.\.\/\.\.\/lib\/reading-dates\.mjs['"]/);
  assert.deepEqual(findBrokenImports(dir), []);
});

test('mover o importador E o alvo na mesma fase: usa o mapa da fase antes de re-basear', () => {
  const rows = [
    { antigo: 'lib/quiz.ts', novo: 'lib/apps/quiz.ts', dominio: 'apps' },
    { antigo: 'components/QuizPodium.tsx', novo: 'components/apps/quiz/QuizPodium.tsx', dominio: 'apps' },
  ];
  const { dir, tsvPath } = gitFixtureWithMapa(
    {
      'lib/quiz.ts': 'export const QUIZ_LIMITS = {};\n',
      'components/QuizPodium.tsx': "import { QUIZ_LIMITS } from '../lib/quiz';\n",
    },
    rows
  );
  moveRows(rows, { rootDir: dir });
  rewriteImportsForPhase(2, dir, tsvPath);
  const text = fs.readFileSync(path.join(dir, 'components', 'apps', 'quiz', 'QuizPodium.tsx'), 'utf8');
  assert.match(text, /from ['"]\.\.\/\.\.\/\.\.\/lib\/apps\/quiz['"]/);
  assert.deepEqual(findBrokenImports(dir), []);
});

test('import por alias @/ não muda quando só o importador se move (base é a raiz, não a pasta do arquivo)', () => {
  const rows = [{ antigo: 'components/Foo.tsx', novo: 'components/global/Foo.tsx', dominio: 'global' }];
  const { dir, tsvPath } = gitFixtureWithMapa(
    { 'lib/db.ts': 'export const sql = 1;\n', 'components/Foo.tsx': "import { sql } from '@/lib/db';\n" },
    rows
  );
  moveRows(rows, { rootDir: dir });
  rewriteImportsForPhase(1, dir, tsvPath);
  const text = fs.readFileSync(path.join(dir, 'components', 'global', 'Foo.tsx'), 'utf8');
  assert.match(text, /from ['"]@\/lib\/db['"]/);
});

test('import JSON explícito (with type: json) é reescrito preservando a extensão', () => {
  const rows = [
    { antigo: 'lib/ingress-countries.mjs', novo: 'lib/ingress/catalog/ingress-countries.mjs', dominio: 'ingress' },
    { antigo: 'lib/ingress/countries.json', novo: 'lib/ingress/catalog/countries.json', dominio: 'ingress' },
  ];
  const { dir, tsvPath } = gitFixtureWithMapa(
    {
      'lib/ingress/countries.json': '{}\n',
      'lib/ingress-countries.mjs': "import COUNTRIES from './ingress/countries.json' with {type: 'json'};\n",
    },
    rows
  );
  moveRows(rows, { rootDir: dir });
  rewriteImportsForPhase(5, dir, tsvPath);
  const text = fs.readFileSync(path.join(dir, 'lib', 'ingress', 'catalog', 'ingress-countries.mjs'), 'utf8');
  assert.match(text, /from ['"]\.\/countries\.json['"]/);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test scripts/superpowers/fix-imports.test.mjs`
Expected: FAIL — `Cannot find module './fix-imports.mjs'`

- [ ] **Step 3: Implementar**

```js
// scripts/superpowers/fix-imports.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, rowsForPhase, listSourceFiles, toPosix } from './mapa-utils.mjs';
import { SPEC_RE, RESOLVE_SUFFIXES } from './verify-imports.mjs';

function buildPhaseMap(rows) {
  const map = new Map();
  for (const r of rows) map.set(toPosix(r.antigo), toPosix(r.novo));
  return map;
}

// tenta achar absNoExt (ou absNoExt + sufixo) no mapa; devolve o alvo e se precisou
// completar a extensão (ou seja, se o specifier original já tinha extensão ou não)
function matchInMap(absPosix, map) {
  for (const suf of RESOLVE_SUFFIXES) {
    const hit = map.get(absPosix + suf);
    if (hit) return { target: hit, specHadExtension: suf === '' };
  }
  return null;
}

function formatSpecifier(fromDirPosix, targetAbsPosix, keepExtension) {
  const targetDir = path.posix.dirname(targetAbsPosix);
  const targetBase = keepExtension
    ? path.posix.basename(targetAbsPosix)
    : path.posix.basename(targetAbsPosix).replace(/\.(ts|tsx|js|jsx|mjs|json)$/, '');
  let rel = path.posix.relative(fromDirPosix, targetDir);
  if (rel === '') rel = '.';
  let spec = path.posix.join(rel, targetBase);
  if (!spec.startsWith('.')) spec = `./${spec}`;
  return spec;
}

function rewriteFile(text, replacer) {
  let changed = false;
  const newText = text.replace(SPEC_RE, (match, g1, g2, g3, g4) => {
    const spec = g1 ?? g2 ?? g3 ?? g4;
    if (!spec) return match;
    const next = replacer(spec);
    if (!next || next === spec) return match;
    changed = true;
    return match.replace(spec, next);
  });
  return { changed, newText };
}

function rewriteConsumer(text, fileDirPosix, phaseMap) {
  return rewriteFile(text, (spec) => {
    let absPosix;
    if (spec.startsWith('.')) absPosix = path.posix.normalize(path.posix.join(fileDirPosix, spec));
    else if (spec.startsWith('@/')) absPosix = spec.slice(2);
    else return null;
    const hit = matchInMap(absPosix, phaseMap);
    if (!hit) return null;
    const base = spec.startsWith('@/') ? '' : fileDirPosix;
    if (spec.startsWith('@/')) {
      const targetBase = hit.specHadExtension
        ? hit.target
        : hit.target.replace(/\.(ts|tsx|js|jsx|mjs|json)$/, '');
      return `@/${targetBase}`;
    }
    return formatSpecifier(base, hit.target, hit.specHadExtension);
  });
}

function rewriteMover(text, oldDirPosix, newDirPosix, phaseMap) {
  return rewriteFile(text, (spec) => {
    if (!spec.startsWith('.')) return null; // alias @/ não é afetado pela pasta do importador
    const absAsWritten = path.posix.normalize(path.posix.join(oldDirPosix, spec));
    const hit = matchInMap(absAsWritten, phaseMap);
    const finalAbs = hit ? hit.target : absAsWritten;
    const keepExtension = hit ? hit.specHadExtension : true;
    return formatSpecifier(newDirPosix, finalAbs, keepExtension);
  });
}

export function rewriteImportsForPhase(phase, rootDir = ROOT, tsvPath) {
  const rows = tsvPath ? rowsForPhaseFromFile(tsvPath, phase) : rowsForPhase(phase);
  const phaseMap = buildPhaseMap(rows);
  const newToOld = new Map(rows.map((r) => [toPosix(r.novo), toPosix(r.antigo)]));

  const touched = [];
  for (const file of listSourceFiles(rootDir)) {
    const relCurrent = toPosix(path.relative(rootDir, file));
    const text = fs.readFileSync(file, 'utf8');
    const oldOfThisFile = newToOld.get(relCurrent);

    const { changed, newText } = oldOfThisFile
      ? rewriteMover(text, path.posix.dirname(oldOfThisFile), path.posix.dirname(relCurrent), phaseMap)
      : rewriteConsumer(text, path.posix.dirname(relCurrent), phaseMap);

    if (changed) {
      fs.writeFileSync(file, newText);
      touched.push(relCurrent);
    }
  }
  return touched;
}

// usado só nos testes, que apontam para um TSV de fixture em vez do TSV real do repo
function rowsForPhaseFromFile(tsvPath) {
  const text = fs.readFileSync(tsvPath, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [antigo, novo, dominio] = line.split('\t');
    if (antigo && novo && dominio) rows.push({ antigo, novo, dominio });
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const phaseArgIdx = process.argv.indexOf('--phase');
  const phase = phaseArgIdx >= 0 ? Number(process.argv[phaseArgIdx + 1]) : null;
  if (!phase) {
    console.error('uso: node scripts/superpowers/fix-imports.mjs --phase <1|2|4|5|6|7>');
    process.exit(1);
  }
  const touched = rewriteImportsForPhase(phase);
  console.log(`fix-imports: ${touched.length} arquivo(s) alterado(s)`);
  for (const t of touched) console.log(`  ${t}`);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/superpowers/fix-imports.test.mjs`
Expected: PASS — 5 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/superpowers/fix-imports.mjs scripts/superpowers/fix-imports.test.mjs
git commit -m "chore(refactor): script de reescrita de imports após mover uma fase"
```

---

## Task 0.5: Baseline — tsc/lint/test/build, rotas e snapshot visual "antes"

Registrar o estado atual (falhas pré-existentes incluídas) para comparar depois de cada fase e no relatório final. Nada de arquivo do site é tocado aqui.

**Files:**
- Create: `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-baseline.md`

- [ ] **Step 1: Capturar tsc, lint, test e build**

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit 2>&1 | Tee-Object -FilePath "$env:TEMP\baseline-tsc.txt"
npm run lint 2>&1 | Tee-Object -FilePath "$env:TEMP\baseline-lint.txt"
npm test 2>&1 | Tee-Object -FilePath "$env:TEMP\baseline-test.txt"
npm run build 2>&1 | Tee-Object -FilePath "$env:TEMP\baseline-build.txt"
```

Anote em `$env:TEMP\baseline-build.txt`: a lista de rotas que o `next build` imprime (tabela `Route (app)`), e do `baseline-test.txt`: a linha `# pass N`.

- [ ] **Step 2: Escrever o script de snapshot na scratchpad (não commitado)**

Ver Global Constraints: `playwright` não é dependência do projeto — o script chama `npx -y playwright ...` como subprocesso, nunca `require('playwright')`. Ele vive em `<scratchpad>/snapshot/capture.mjs`, roda contra um build de produção local (`next build && next start` numa porta livre, sem overlay de dev), e produz um JSON de resultado por rota/viewport (status, `console.error`, `pageerror`, requisições com falha, hash da screenshot) na própria scratchpad.

```js
// <scratchpad>/snapshot/capture.mjs
// Uso: npx -y playwright@1 test capture.mjs (executado de dentro de <scratchpad>/snapshot/)
// Se `npx -y playwright test` reclamar de @playwright/test ausente, trocar por:
//   npx -y --package=@playwright/test playwright test capture.mjs
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? 'http://localhost:4173';
const OUT_DIR = process.env.SNAPSHOT_OUT_DIR ?? path.join(process.cwd(), 'out');
const LABEL = process.env.SNAPSHOT_LABEL ?? 'antes';

// Rotas estáticas do build + amostras das dinâmicas (uma de cada app/[app_name],
// alguns /livros/[slug], uma medalha de /ingress/fencherlc/medalha/[slug],
// e /w//q/ com id inexistente pra pegar o estado 404/vazio sem criar sessão real).
const ROUTES = [
  '/', '/about', '/projects', '/casamento', '/stats',
  '/app', '/app/rule-of-three', '/app/qr-code', '/app/sorteio',
  '/app/descubra-seu-temperamento', '/app/descubra-sua-linguagem-do-amor',
  '/livros', '/livros/lista',
  '/ingress', '/ingress/fencherlc', '/ingress/ranking',
  '/w/inexistente-000', '/q/inexistente-000',
];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`${route} @ ${vp.name}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (err) => errors.push(String(err)));
      const failedRequests = [];
      page.on('requestfailed', (req) => failedRequests.push(req.url()));

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-09-22T12:00:00Z') });
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }' });

      const safeName = `${route.replace(/[\/?]/g, '_') || 'root'}__${vp.name}`;
      const outDir = path.join(OUT_DIR, LABEL);
      fs.mkdirSync(outDir, { recursive: true });
      await page.screenshot({ path: path.join(outDir, `${safeName}.png`), fullPage: true });

      fs.writeFileSync(
        path.join(outDir, `${safeName}.json`),
        JSON.stringify({ route, viewport: vp.name, status: response?.status() ?? null, errors, failedRequests }, null, 2)
      );
    });
  }
}
```

- [ ] **Step 3: Subir o build de produção numa porta livre**

```bash
npm run build
# numa aba separada, sem gravar analytics (VERCEL_ENV ausente):
npx next start -p 4173
```

- [ ] **Step 4: Rodar a captura "antes" duas vezes (piso de ruído)**

```bash
cd <scratchpad>/snapshot
$env:SNAPSHOT_BASE_URL = "http://localhost:4173"
$env:SNAPSHOT_LABEL = "antes-1"
npx -y playwright test capture.mjs
$env:SNAPSHOT_LABEL = "antes-2"
npx -y playwright test capture.mjs
```

Se `npx -y playwright test` falhar reclamando de `@playwright/test`, repetir com `npx -y --package=@playwright/test playwright test capture.mjs`.

- [ ] **Step 5: Calcular o piso de ruído com `pixelmatch`/`pngjs` (já resolvem direto no projeto)**

```js
// <scratchpad>/snapshot/diff.mjs — node <scratchpad>/snapshot/diff.mjs antes-1 antes-2
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [labelA, labelB] = process.argv.slice(2);
const dirA = path.join('out', labelA);
const dirB = path.join('out', labelB);

for (const file of fs.readdirSync(dirA).filter((f) => f.endsWith('.png'))) {
  const a = PNG.sync.read(fs.readFileSync(path.join(dirA, file)));
  const bPath = path.join(dirB, file);
  if (!fs.existsSync(bPath)) { console.log(`${file}: só existe em ${labelA}`); continue; }
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) { console.log(`${file}: dimensão mudou`); continue; }
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const pct = ((diffPixels / (a.width * a.height)) * 100).toFixed(3);
  console.log(`${file}: ${pct}% de pixels diferentes (piso de ruído)`);
}
```

- [ ] **Step 6: Encerrar o `next start`, registrar tudo no baseline.md e commitar**

Salvar em `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-baseline.md`:
- Saída resumida de `tsc`/`lint`/`test`/`build` (o que já falhava antes do refactor, se algo falhar)
- A lista de rotas do `next build`
- A tabela `rota × viewport × % de ruído` do Step 5
- Onde os screenshots "antes" ficaram salvos na scratchpad (para comparar no Task 9 — **não são commitados**, per spec seção 10.2)

```bash
git add docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-baseline.md
git commit -m "chore(refactor): baseline de verificação antes de mover qualquer arquivo"
```

---

## Task 1: Fase 1 do spec — `db/` + `lib/global/` + `components/global/`

33 linhas do TSV (fase 1): migrações e schema para `db/`, `lib/*`/`utils/analytics.ts` para `lib/global/`, `components/{Header,Footer,ui/*}.tsx` + `context/LanguageContext.tsx` para `components/global/`.

**Files:**
- Modify: todos os 33 caminhos listados nas linhas de fase 1 de `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-mapa.tsv` (rodar `node -e "..."` do Step 1 para ver a lista exata antes de começar)

**Interfaces:**
- Consumes: `moveRows`+CLI de `[[move-by-domain.mjs]]`, `rewriteImportsForPhase`+CLI de `[[fix-imports.mjs]]`, `findBrokenImports`+CLI de `[[verify-imports.mjs]]`

- [ ] **Step 1: Conferir a lista de linhas desta fase antes de mover (revisão, não altera nada)**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(1)))"
```

- [ ] **Step 2: Dry-run do move**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 1 --dry-run
```

- [ ] **Step 3: Mover de verdade**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 1
```

- [ ] **Step 4: Reescrever imports**

```bash
node scripts/superpowers/fix-imports.mjs --phase 1
```

- [ ] **Step 5: Revisão manual dirigida (caminho em string, fora do alcance do regex de import)**

```bash
grep -rn "process\.cwd\(\)\|import\.meta\.url\|readFileSync\|join(" --include="*.ts" --include="*.tsx" --include="*.mjs" lib components app scripts | grep -E "lib/(db|analytics|rate-limit|request-meta|routes|sanitize|site-preferences|sound|telegram-markdown|use-site-preferences|utils)\.ts|lib/analytics-env\.ts|lib/schema\.sql|lib/migrations|lib/seed-temperament\.sql"
```

Corrigir manualmente qualquer ocorrência encontrada (typicamente nenhuma — esses módulos não são referenciados por caminho em string fora de import estático, mas o spec pede a checagem em toda fase, seção 9).

- [ ] **Step 6: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Comparar: `verify-imports` = 0; `tsc`/`lint` = mesmas falhas do baseline (ou zero, se o baseline já era limpo); `npm test` = mesma contagem de `# pass` do baseline; `npm run build` = mesma lista de rotas do baseline.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(global): mover db/, lib/global/ e components/global/ para a estrutura por domínio"
```

---

## Task 2: Fase 2 do spec — `apps`

35 linhas: rotas `app/(app|q|w)/**` → `app/(apps)/**`, `lib/{quiz,sorteio,word-cloud,session-ids}.ts` → `lib/apps/`, `utils/{pdf-generator,love-language-pdf-generator}.tsx` → `lib/apps/pdf/`, `components/{AppFooter,Quiz*,Word*}` → `components/apps/`.

**Files:**
- Modify: todos os 35 caminhos das linhas de fase 2 do TSV

**Interfaces:**
- Consumes: mesmas três ferramentas do Task 1

- [ ] **Step 1: Conferir a lista**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(2)))"
```

- [ ] **Step 2: Dry-run**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 2 --dry-run
```

- [ ] **Step 3: Mover**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 2
```

- [ ] **Step 4: Reescrever imports**

```bash
node scripts/superpowers/fix-imports.mjs --phase 2
```

- [ ] **Step 5: Revisão manual dirigida — o import dinâmico do `[app_name]` é o ponto mais sensível desta fase**

`app/(apps)/app/[app_name]/page.tsx` resolve `@/apps/<categoria>/<slug>` — esse caminho **não muda** (a pasta `apps/` na raiz do repo é "fora de escopo", seção 5 do spec), só a localização do `page.tsx` que faz o `import()`. Conferir manualmente:

```bash
grep -n "import(" "app/(apps)/app/[app_name]/page.tsx"
```

O padrão deve continuar apontando para `@/apps/${categoria}/${slug}` (alias `@/`, raiz do repo — não afetado por este passe, mas confirmar visualmente).

- [ ] **Step 6: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(apps): mover lib/apps/, components/apps/ e as rotas (apps) para a estrutura por domínio"
```

---

## Task 3: Extrair o motor de PDF compartilhado (§7 do spec)

Única mudança de código do refactor (o resto é só mover arquivo). `renderElementToPdf` está em `lib/apps/pdf/pdf-generator.tsx` (já movido na Task 2) mas também é usado por `marcador-pdf` (livros, ainda em `utils/marcador-pdf.tsx` até a Task 4 mover para `lib/livros/segredos/`) — é o único caso hoje de `lib/` de um domínio importando `lib/` de outro. Extrai para `lib/global/pdf-engine.tsx`; `pdf-generator.tsx` passa a reexportar, mesma técnica que `word-cloud.ts` já usa para `session-ids`.

**Files:**
- Read: `lib/apps/pdf/pdf-generator.tsx` (localizar a função `renderElementToPdf`, ~75 linhas)
- Create: `lib/global/pdf-engine.tsx`
- Modify: `lib/apps/pdf/pdf-generator.tsx` (vira um re-export)

- [ ] **Step 1: Ler o arquivo atual para copiar `renderElementToPdf` exatamente como está**

```bash
grep -n "renderElementToPdf\|^import\|^export" lib/apps/pdf/pdf-generator.tsx
```

- [ ] **Step 2: Criar `lib/global/pdf-engine.tsx` com o conteúdo de `renderElementToPdf` e seus imports (html2canvas, jsPDF) movidos para lá, sem alterar uma linha de lógica**

(O conteúdo exato depende do que o Step 1 mostrar — copiar literalmente a função e os imports que ela usa, sem reescrever nada.)

- [ ] **Step 3: Em `lib/apps/pdf/pdf-generator.tsx`, trocar a definição local de `renderElementToPdf` por um re-export**

```ts
export { renderElementToPdf } from '@/lib/global/pdf-engine';
```

- [ ] **Step 4: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- [ ] **Step 5: Nota para o Luiz testar manualmente (sem cobertura automática de PDF)**

Não existe teste automatizado para geração de PDF (html2canvas/jsPDF dependem de canvas real). Registrar no resumo do commit que os três fluxos que usam `renderElementToPdf` — teste de temperamento, teste de linguagem do amor, e o marcador-pdf de `/livros` (este último só depois da Task 4) — precisam do teste manual do Luiz antes do merge final.

- [ ] **Step 6: Commit isolado**

```bash
git add lib/global/pdf-engine.tsx lib/apps/pdf/pdf-generator.tsx
git commit -m "refactor(global): extrair renderElementToPdf para lib/global/pdf-engine.tsx"
```

---

## Task 4: Fase 4 do spec — `livros`

103 linhas: `lib/livros/{acervo,sala,segredos}/`, `components/livros/{acervo,hooks,overlays,sala}/` (essas quatro subpastas já existem hoje — só ganham arquivos vindos da raiz de `components/livros/`), rotas `app/(livros)/**`. Inclui `utils/marcador-pdf.tsx` → `lib/livros/segredos/marcador-pdf.tsx`.

**Files:**
- Modify: todos os 103 caminhos das linhas de fase 4 do TSV

**Interfaces:**
- Consumes: mesmas três ferramentas do Task 1

- [ ] **Step 1: Conferir a lista**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(4)))"
```

- [ ] **Step 2: Dry-run**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 4 --dry-run
```

- [ ] **Step 3: Mover**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 4
```

- [ ] **Step 4: Reescrever imports**

```bash
node scripts/superpowers/fix-imports.mjs --phase 4
```

- [ ] **Step 5: Revisão manual dirigida — a sala 3D é o ponto mais sensível (imports de modelos GLB, `process.cwd()`, `import.meta.url`)**

```bash
grep -rn "process\.cwd()\|import\.meta\.url\|readFileSync(" lib/livros components/livros app/\(livros\)
```

Conferir cada ocorrência contra o novo local do arquivo referenciado — em especial `content/caderno/` (fora de escopo, não move, mas é lido via `process.cwd()` por algum módulo de `lib/livros/segredos/`) e qualquer referência a `public/livros/capas/` (também fora de escopo).

- [ ] **Step 6: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Conferir especificamente que a intercepting route `app/(livros)/livros/@livro/(.)[slug]/page.tsx` continua no lugar certo relativo a `app/(livros)/livros/[slug]/page.tsx` (intercepting routes são sensíveis à posição relativa) e que `app/(livros)/livros/layout.tsx` continua sendo o único lugar com `<Canvas>` (CLAUDE.md: "o `<Canvas>` mora em `app/livros/layout.tsx`, nunca numa page").

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(livros): mover lib/livros/, components/livros/ e as rotas (livros) para a estrutura por domínio"
```

---

## Task 5: Fase 5 do spec — `ingress`

105 linhas: `lib/ingress/{catalog,stats,ranking,profile,map}/` + raiz (`ingress-format.mjs`, `ingress-lang.mjs`), `components/ingress/{hero,map,medals,profile,shell}/`, rotas `app/(ingress)/**`. Inclui `components/MotionProvider.tsx` → `components/ingress/shell/MotionProvider.tsx`.

**Files:**
- Modify: todos os 105 caminhos das linhas de fase 5 do TSV

**Interfaces:**
- Consumes: mesmas três ferramentas do Task 1

- [ ] **Step 1: Conferir a lista**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(5)))"
```

- [ ] **Step 2: Dry-run**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 5 --dry-run
```

- [ ] **Step 3: Mover**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 5
```

- [ ] **Step 4: Reescrever imports**

```bash
node scripts/superpowers/fix-imports.mjs --phase 5
```

- [ ] **Step 5: Revisão manual dirigida — `lib/ingress-countries.mjs` importa `./ingress/countries.json` (caso já validado no design do fix-imports, mas confirmar no arquivo real), e `app/(ingress)/ingress/manifest.webmanifest/route.ts` + PWA icons gerados por `scripts/generate-ingress-pwa-icons.mjs` (ainda não movido, é fase 7) referenciam caminhos de `public/ingress/pwa` — não deve haver referência cruzada para `lib/ingress` que quebre**

```bash
grep -rn "process\.cwd()\|import\.meta\.url\|readFileSync(\|join(" lib/ingress components/ingress "app/(ingress)"
```

- [ ] **Step 6: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ingress): mover lib/ingress/, components/ingress/ e as rotas (ingress) para a estrutura por domínio"
```

---

## Task 6: Fase 6 do spec — rotas `(global)` + `app/` raiz

18 linhas: `app/{about,api/events,api/metrics/*,api/send-email,api/telegram/*,casamento/*,page.tsx,projects/*,stats/page.tsx}` → `app/(global)/**`. `app/layout.tsx`, `globals.css`, `favicon.ico`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx` **ficam na raiz de `app/`** (seção 4 do spec) — não estão no TSV, não movem.

**Files:**
- Modify: todos os 18 caminhos das linhas de fase 6 do TSV

**Interfaces:**
- Consumes: mesmas três ferramentas do Task 1

- [ ] **Step 1: Conferir a lista**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(6)))"
```

- [ ] **Step 2: Dry-run**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 6 --dry-run
```

- [ ] **Step 3: Mover**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 6
```

- [ ] **Step 4: Reescrever imports**

```bash
node scripts/superpowers/fix-imports.mjs --phase 6
```

- [ ] **Step 5: Revisão manual dirigida — as duas exceções de dependência documentadas na seção 6 do spec ficam aqui, sem "corrigir"**

```bash
grep -n "ingress-compare-message\|ingress-format\|love-language-info\|ingress-radar" "app/(global)/api/telegram/route.js" "app/(global)/api/telegram/ingress-radar.jsx"
```

Confirmar que os imports foram reescritos para os novos caminhos de `lib/ingress/...` e `apps/desenvolvimento-pessoal/love-language-info.ts` (que não move — está em `apps/`, fora de escopo) — mas **sem** tentar desacoplar essa rota dos outros domínios, isso é a exceção documentada, não um bug.

- [ ] **Step 6: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Conferir com atenção a lista de rotas do build: `app/robots.ts` e `app/sitemap.ts` continuam na raiz e ainda enumeram rotas de todos os domínios (`lib/livros/acervo/books`, `lib/ingress/catalog/ingress-catalog` — outra exceção documentada da seção 6).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(global): mover as rotas (global) para a estrutura por domínio"
```

---

## Task 7: Fase 7 do spec — `scripts/`, atalhos npm e `docs/`

24 linhas: `docs/{apps,global,ingress,livros}/**` (12 arquivos de doc) + `scripts/{global,ingress,livros}/**` (11 scripts + 2 arquivos de seed em `scripts/livros/seed/`). Mais os atalhos npm novos da seção 8 do spec, e a correção do "8 scripts calculam a raiz com `..`" da seção 9 (na prática são 7 scripts com esse padrão — `ingress-catalog-gen.mjs`, `gen-favicons.mjs`, `ingress-rescore.mjs`, `ingress.mjs`, `gen-ingress-countries.mjs`, `create-books-table.mjs`, `migrate-casara.mjs`, `migrate-status-livros.mjs`, `livros.mjs` — todos ficam um nível mais fundo e o `fix-imports.mjs` já corrige o `'..'` deles porque são imports/joins relativos comuns, mas **conferir cada um manualmente** no Step 3 porque alguns usam a constante `ROOT` em string literals fora de um `import`, que o regex de import não cobre).

**Files:**
- Modify: todos os 24 caminhos das linhas de fase 7 do TSV
- Modify: `package.json` (novos scripts)
- Modify: `README.md` (tabela "Available Scripts")

**Interfaces:**
- Consumes: mesmas três ferramentas do Task 1

- [ ] **Step 1: Conferir a lista**

```bash
node -e "import('./scripts/superpowers/mapa-utils.mjs').then(m => console.table(m.rowsForPhase(7)))"
```

- [ ] **Step 2: Dry-run e mover**

```bash
node scripts/superpowers/move-by-domain.mjs --phase 7 --dry-run
node scripts/superpowers/move-by-domain.mjs --phase 7
node scripts/superpowers/fix-imports.mjs --phase 7
```

- [ ] **Step 3: Corrigir manualmente o `'..'` → `'../..'` nos 9 scripts que calculam a raiz por `fileURLToPath`**

Cada um tem uma linha como `const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');` — como o script foi um nível mais fundo (`scripts/livros/livros.mjs` em vez de `scripts/livros.mjs`), essa linha precisa virar `'../..'`. Arquivos a conferir (já no novo local depois do Step 2):

```
scripts/ingress/ingress-catalog-gen.mjs
scripts/global/gen-favicons.mjs
scripts/ingress/ingress-rescore.mjs
scripts/ingress/ingress.mjs
scripts/ingress/gen-ingress-countries.mjs
scripts/livros/create-books-table.mjs
scripts/global/migrate-casara.mjs
scripts/livros/migrate-status-livros.mjs
scripts/livros/livros.mjs
```

```bash
grep -n "fileURLToPath(import.meta.url)), '\.\.'" scripts/ingress/*.mjs scripts/global/*.mjs scripts/livros/*.mjs
```

Trocar `'..'` por `'../..'` em cada ocorrência encontrada.

- [ ] **Step 4: `scripts/ingress/gen-ingress-countries.mjs` escreve `lib/ingress/countries.json` — atualizar para o novo caminho de escrita**

```bash
grep -n "COUNTRIES_JSON\|countries.json" scripts/ingress/gen-ingress-countries.mjs
```

Corrigir o caminho de escrita para `lib/ingress/catalog/countries.json` (a leitura, em `lib/ingress-countries.mjs`, já foi corrigida pelo `fix-imports.mjs` na Task 5).

- [ ] **Step 5: Smoke test de cada CLI movido, sem escrever em produção**

```bash
node scripts/livros/livros.mjs list --dry-run 2>&1 | Select-Object -First 5
node scripts/livros/livros.mjs seed --limit 1 2>&1 | Select-Object -First 10
node scripts/ingress/ingress.mjs --help 2>&1 | Select-Object -First 5
node scripts/ingress/ingress-rescore.mjs --dry-run 2>&1 | Select-Object -First 10
node scripts/global/gen-favicons.mjs --help 2>&1 | Select-Object -First 5
```

Qualquer erro de `ENOENT`/`Cannot find module` aqui indica que o Step 3 ou 4 deixou algum caminho errado.

- [ ] **Step 6: Adicionar os atalhos npm novos (seção 8 do spec)**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "test": "node --test --test-concurrency=1 \"lib/**/*.test.mjs\"",
  "gen:favicons": "node scripts/global/gen-favicons.mjs",
  "livros": "node scripts/livros/livros.mjs",
  "livros:leitura": "node scripts/livros/aplicar-leitura.mjs",
  "ingress": "node scripts/ingress/ingress.mjs",
  "ingress:rescore": "node scripts/ingress/ingress-rescore.mjs",
  "ingress:catalog": "node scripts/ingress/ingress-catalog-gen.mjs",
  "ingress:countries": "node scripts/ingress/gen-ingress-countries.mjs",
  "ingress:icons": "node scripts/ingress/generate-ingress-pwa-icons.mjs"
}
```

`migrate-casara`, `migrate-status-livros` e `create-books-table` são migrações históricas — **sem atalho**, por decisão do spec (seção 8).

- [ ] **Step 7: Atualizar a tabela "Available Scripts" do README.md e a única referência de caminho na seção "Project Structure"**

Adicionar as 7 linhas novas de `npm run livros -- <cmd>` / `npm run ingress -- <cmd>` etc. (mesma tabela da seção 8 do spec) depois da linha `npm run gen:favicons`. E trocar, na seção "Project Structure":

```diff
- `apps/<category>/<slug>.tsx` — the utility mini-apps, dynamically loaded by
-   `app/app/[app_name]/page.tsx`
+ `apps/<category>/<slug>.tsx` — the utility mini-apps, dynamically loaded by
+   `app/(apps)/app/[app_name]/page.tsx`
```

- [ ] **Step 8: Gate de verificação**

```bash
node scripts/superpowers/verify-imports.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(scripts): mover scripts/ e docs/ para a estrutura por domínio, novos atalhos npm"
```

---

## Task 8: CLAUDE.md, README.md e comentários com caminho antigo

Varredura pelos 318 caminhos antigos do TSV em `CLAUDE.md`, `README.md`, `docs/<domínio>/` e comentários de código — **exceto** `.specs/`, `.superpowers/` e `docs/adr/`, que são registro histórico e mantêm os caminhos da época (seção 5 do spec).

**Files:**
- Create: `scripts/superpowers/scan-stale-paths.mjs`
- Create: `scripts/superpowers/scan-stale-paths.test.mjs`
- Modify: `CLAUDE.md`
- Modify: qualquer arquivo de `docs/{global,apps,livros,ingress}/` ou comentário de código apontado pelo scanner

**Interfaces:**
- Consumes: `loadMapaRows`, `toPosix`, `ROOT` de `[[mapa-utils.mjs]]`
- Produces: `scanStalePaths(rootDir, rows): {file:string, line:number, oldPath:string}[]`

- [ ] **Step 1: Escrever o teste que falha**

```js
// scripts/superpowers/scan-stale-paths.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanStalePaths } from './scan-stale-paths.mjs';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-stale-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('acha caminho antigo citado em CLAUDE.md', () => {
  const dir = fixture({ 'CLAUDE.md': 'Ver `lib/db.ts` para o cliente Neon.\n' });
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  const hits = scanStalePaths(dir, rows);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].file, 'CLAUDE.md');
  assert.equal(hits[0].oldPath, 'lib/db.ts');
});

test('não reporta nada dentro de docs/adr/ ou .specs/ (registro histórico preservado)', () => {
  const dir = fixture({
    'docs/adr/0001-db.md': 'Decisão original: `lib/db.ts`.\n',
    '.specs/notas.md': 'Rascunho antigo citando `lib/db.ts`.\n',
  });
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  assert.deepEqual(scanStalePaths(dir, rows), []);
});

test('não reporta o caminho novo, só o antigo', () => {
  const dir = fixture({ 'CLAUDE.md': 'Ver `lib/global/db.ts`.\n' });
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  assert.deepEqual(scanStalePaths(dir, rows), []);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test scripts/superpowers/scan-stale-paths.test.mjs`
Expected: FAIL — `Cannot find module './scan-stale-paths.mjs'`

- [ ] **Step 3: Implementar**

```js
// scripts/superpowers/scan-stale-paths.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadMapaRows, toPosix } from './mapa-utils.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', 'out', 'public', '.specs', '.superpowers']);
const TEXT_EXT = new Set(['.md', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.html', '.css']);

function listTextFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (toPosix(path.relative(dir, full)).startsWith('docs/adr')) continue;
      listTextFiles(full, out);
    } else if (TEXT_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

export function scanStalePaths(rootDir = ROOT, rows = loadMapaRows()) {
  const oldPaths = rows.map((r) => r.antigo).sort((a, b) => b.length - a.length); // mais longo primeiro evita match parcial de prefixo
  const hits = [];
  for (const file of listTextFiles(rootDir)) {
    const relFile = toPosix(path.relative(rootDir, file));
    if (relFile.startsWith('docs/adr/')) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((lineText, idx) => {
      for (const oldPath of oldPaths) {
        if (lineText.includes(oldPath)) {
          hits.push({ file: relFile, line: idx + 1, oldPath });
          break;
        }
      }
    });
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hits = scanStalePaths();
  if (hits.length === 0) {
    console.log('scan-stale-paths: nenhum caminho antigo residual.');
    process.exit(0);
  }
  console.error(`scan-stale-paths: ${hits.length} referência(s) a caminho antigo:`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ->  "${h.oldPath}"`);
  process.exit(1);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/superpowers/scan-stale-paths.test.mjs`
Expected: PASS — 3 testes

- [ ] **Step 5: Commit da ferramenta**

```bash
git add scripts/superpowers/scan-stale-paths.mjs scripts/superpowers/scan-stale-paths.test.mjs
git commit -m "chore(refactor): scanner de caminhos antigos residuais em docs e comentários"
```

- [ ] **Step 6: Rodar contra o repositório real e corrigir cada ocorrência**

```bash
node scripts/superpowers/scan-stale-paths.mjs
```

Para cada hit em `CLAUDE.md` (a maior parte — o arquivo cita dezenas de caminhos de `lib/`, `components/`, `app/`, `scripts/` ao longo do texto) e em `docs/{global,apps,livros,ingress}/`: editar a linha trocando o caminho antigo pelo novo (mesmo arquivo, mesma frase — só o caminho muda). Não editar nada sob `docs/adr/` ou `.specs/` (já excluídos pelo scanner, mas conferir visualmente que nada escapou).

- [ ] **Step 7: Rodar de novo até dar zero**

```bash
node scripts/superpowers/scan-stale-paths.mjs
```

Expected: `scan-stale-paths: nenhum caminho antigo residual.`

- [ ] **Step 8: Gate de verificação (CLAUDE.md/docs não afetam build/tsc, mas confirmar que nada quebrou por engano)**

```bash
node scripts/superpowers/verify-imports.mjs
npm run lint
```

- [ ] **Step 9: Commit das correções**

```bash
git add CLAUDE.md docs README.md
git commit -m "docs: atualizar CLAUDE.md e docs/ para os novos caminhos por domínio"
```

---

## Task 9: Snapshot "depois", relatório final, gate completo e limpeza do ferramental

**Files:**
- Create: `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-relatorio-final.md`
- Delete: `scripts/superpowers/` (inteiro — ferramental descartável desta refatoração)

- [ ] **Step 1: Build de produção limpo e captura "depois", mesmas rotas/viewports do Task 0.5**

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npx next start -p 4173
```

```bash
cd <scratchpad>/snapshot
$env:SNAPSHOT_BASE_URL = "http://localhost:4173"
$env:SNAPSHOT_LABEL = "depois"
npx -y playwright test capture.mjs
```

- [ ] **Step 2: Comparar "depois" contra o baseline "antes" (usando o piso de ruído calculado no Task 0.5)**

```bash
node <scratchpad>/snapshot/diff.mjs antes-1 depois
```

Rota que ficar dentro do piso de ruído calculado no Task 0.5 = ok. Rota fora do piso, ou com canvas 3D (`/livros/*`) que não estabiliza: critério próprio — canvas não-vazio + zero erro de console/rede, marcada para o Luiz olhar pessoalmente (isto não substitui o teste dele, só reduz a chance de ele achar algo quebrado).

- [ ] **Step 3: Gate final completo**

```bash
node scripts/superpowers/verify-imports.mjs
node scripts/superpowers/scan-stale-paths.mjs
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Todos precisam bater com o baseline do Task 0.5 (mesmas falhas pré-existentes se houver, mesma contagem de testes, mesma lista de rotas).

- [ ] **Step 4: Escrever o relatório final**

Em `docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-relatorio-final.md`: tabela rota × viewport × (status HTTP, erros de console/rede, % de pixels diferentes, veredito), resultado do gate do Step 3, e a lista de rotas marcadas para revisão manual do Luiz (canvas 3D e qualquer coisa fora do piso de ruído).

- [ ] **Step 5: Remover o ferramental descartável**

```bash
git rm -r scripts/superpowers/
```

- [ ] **Step 6: Rodar o gate uma última vez sem o ferramental (ele não deveria ser dependência de nada)**

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- [ ] **Step 7: Commit final**

```bash
git add docs/superpowers/specs/2026-09-21-reorganizacao-por-dominio-relatorio-final.md
git commit -m "chore(refactor): relatório final da reorganização por domínio, remove ferramental descartável"
```

- [ ] **Step 8: Passar a bola para o Luiz**

A branch `refactor/estrutura-por-dominio` está pronta para o teste manual completo do Luiz (decisão registrada na seção 2 do spec: "o Luiz testa tudo de novo depois"). Não fazer merge para `main`/`feat/ingress-evolution-changes` sem ele confirmar.

---

## Self-Review

**Cobertura do spec:** seção 4 (estrutura alvo) → Tasks 1,2,4,5,6,7; seção 5 (o que não muda) → conferido em cada gate + Global Constraints; seção 6 (exceções de dependência) → explicitamente preservadas no Step 5 de manual review da Task 6; seção 7 (motor de PDF) → Task 3, commit isolado; seção 8 (atalhos npm) → Task 7 Step 6; seção 9 (riscos) → cada linha da tabela mapeada para uma ferramenta ou um step de revisão manual; seção 10.1 (baseline) → Task 0.5; seção 10.2 (snapshot) → Task 0.5 + Task 9; seção 10.3 (gate) → repetido em toda fase; seção 11 (ordem) → Tasks 0.1–9 seguem a numeração 0–9 à risca; seção 12 (fora de escopo) → nada neste plano toca `apps/`, `public/`, `data/`, `content/`, nem muda comportamento.

**Consistência de tipos:** `rowsForPhase`/`phaseOf`/`loadMapaRows`/`toPosix`/`listSourceFiles` definidos uma vez em `mapa-utils.mjs` (Task 0.1) e só consumidos depois; `SPEC_RE`/`RESOLVE_SUFFIXES` definidos uma vez em `verify-imports.mjs` (Task 0.2) e reaproveitados por `fix-imports.mjs` (Task 0.4); `moveRows`/`rewriteImportsForPhase`/`findBrokenImports`/`scanStalePaths` usados com a mesma assinatura em todas as fases de execução.
