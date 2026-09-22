import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadMapaRows, toPosix } from './mapa-utils.mjs';

// 'superpowers': mesmo motivo do verify-imports.mjs — os testes deste próprio ferramental citam
// caminhos antigos como fixture (ex: 'lib/db.ts'), que dão falso positivo contra o TSV real.
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', 'out', 'public', '.specs', '.superpowers', 'superpowers']);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hits = scanStalePaths();
  if (hits.length === 0) {
    console.log('scan-stale-paths: nenhum caminho antigo residual.');
    process.exit(0);
  }
  console.error(`scan-stale-paths: ${hits.length} referência(s) a caminho antigo:`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ->  "${h.oldPath}"`);
  process.exit(1);
}
