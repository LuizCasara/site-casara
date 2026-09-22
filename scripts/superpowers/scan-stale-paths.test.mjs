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

test('não reporta nada dentro de scripts/superpowers/ (testes do próprio ferramental citam caminho antigo como fixture)', () => {
  const dir = fixture({
    'scripts/superpowers/mapa-utils.test.mjs': "assert.equal(phaseOf({ antigo: 'lib/db.ts' }), 1);\n",
  });
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  assert.deepEqual(scanStalePaths(dir, rows), []);
});

test('não reporta o caminho novo, só o antigo', () => {
  const dir = fixture({ 'CLAUDE.md': 'Ver `lib/global/db.ts`.\n' });
  const rows = [{ antigo: 'lib/db.ts', novo: 'lib/global/db.ts', dominio: 'global' }];
  assert.deepEqual(scanStalePaths(dir, rows), []);
});
