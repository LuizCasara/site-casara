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

// 'superpowers': scripts/superpowers/ é ferramental descartável desta refatoração (removido no
// Task 9) — seus arquivos de teste contêm strings de fixture com sintaxe de import fake, que dão
// falso positivo se escaneadas como código real.
// 'next-env.d.ts': gerado pelo Next, referencia .next/types/*.d.ts — só existem depois de um
// `next build`/`next dev` de verdade, então dão falso positivo logo após um `rm -rf .next`
// (confirmado: some assim que se roda `npm run build`). Não é código nosso, nunca é editado.
const DEFAULT_SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.vercel', 'out', 'public', 'superpowers', 'next-env.d.ts',
]);

export function listSourceFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs'], out = [], skipDirs = DEFAULT_SKIP_DIRS) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, exts, out, skipDirs);
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}
