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

test('ignora arquivos dentro de scripts/superpowers/ (ferramental descartável, testes têm fixtures de import fake)', () => {
  const dir = fixture({
    'scripts/superpowers/algo.test.mjs': "test('x', () => { const t = \"import { x } from './nao-existe-de-verdade';\"; });\n",
  });
  assert.deepEqual(findBrokenImports(dir), []);
});
