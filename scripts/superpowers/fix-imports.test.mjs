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
