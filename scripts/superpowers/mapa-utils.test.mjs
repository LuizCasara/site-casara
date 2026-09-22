import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMapaRows, phaseOf, rowsForPhase } from './mapa-utils.mjs';

test('carrega as 312 linhas de dados do TSV', () => {
  const rows = loadMapaRows();
  assert.equal(rows.length, 312);
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

test('a distribuição real por fase bate com a seção 11 do spec (1067→312 rastreados, após excluir 6 opengraph-image.tsx dinâmicos — ver seção 5.1)', () => {
  const rows = loadMapaRows();
  const counts = {};
  for (const r of rows) counts[phaseOf(r)] = (counts[phaseOf(r)] ?? 0) + 1;
  assert.deepEqual(counts, { 1: 33, 2: 34, 4: 103, 5: 101, 6: 17, 7: 24 });
});

test('rowsForPhase(1) só devolve linhas de fase 1', () => {
  const rows = rowsForPhase(1);
  assert.equal(rows.length, 33);
  assert.ok(rows.every((r) => !r.antigo.startsWith('app/') && !r.antigo.startsWith('docs/') && !r.antigo.startsWith('scripts/')));
});
