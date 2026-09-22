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
