import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const broken = findBrokenImports();
  if (broken.length === 0) {
    console.log('verify-imports: 0 imports quebrados.');
    process.exit(0);
  }
  console.error(`verify-imports: ${broken.length} import(s) quebrado(s):`);
  for (const b of broken) console.error(`  ${b.file}:${b.line}  ->  "${b.specifier}"`);
  process.exit(1);
}
