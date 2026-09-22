import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, rowsForPhase, listSourceFiles, toPosix } from './mapa-utils.mjs';
import { SPEC_RE, RESOLVE_SUFFIXES } from './verify-imports.mjs';

function buildPhaseMap(rows) {
  const map = new Map();
  for (const r of rows) map.set(toPosix(r.antigo), toPosix(r.novo));
  return map;
}

// tenta achar absPosix (ou absPosix + sufixo) no mapa; devolve o alvo e se precisou
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

// Alias @/ resolve sempre a partir da raiz do repo — isso não depende de quem importa nem de
// quem se move. Se o ALVO do alias se moveu nesta fase, o texto precisa mudar, tanto num
// arquivo consumidor quanto num arquivo que também é mover desta fase.
function rewriteAlias(spec, phaseMap) {
  const hit = matchInMap(spec.slice(2), phaseMap);
  if (!hit) return null;
  const targetBase = hit.specHadExtension ? hit.target : hit.target.replace(/\.(ts|tsx|js|jsx|mjs|json)$/, '');
  return `@/${targetBase}`;
}

function rewriteConsumer(text, fileDirPosix, phaseMap) {
  return rewriteFile(text, (spec) => {
    if (spec.startsWith('@/')) return rewriteAlias(spec, phaseMap);
    if (!spec.startsWith('.')) return null;
    const absPosix = path.posix.normalize(path.posix.join(fileDirPosix, spec));
    const hit = matchInMap(absPosix, phaseMap);
    if (!hit) return null;
    return formatSpecifier(fileDirPosix, hit.target, hit.specHadExtension);
  });
}

function rewriteMover(text, oldDirPosix, newDirPosix, phaseMap) {
  return rewriteFile(text, (spec) => {
    if (spec.startsWith('@/')) return rewriteAlias(spec, phaseMap);
    if (!spec.startsWith('.')) return null;
    const absAsWritten = path.posix.normalize(path.posix.join(oldDirPosix, spec));
    const hit = matchInMap(absAsWritten, phaseMap);
    const finalAbs = hit ? hit.target : absAsWritten;
    const keepExtension = hit ? hit.specHadExtension : true;
    return formatSpecifier(newDirPosix, finalAbs, keepExtension);
  });
}

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

export function rewriteImportsForPhase(phase, rootDir = ROOT, tsvPath) {
  const rows = tsvPath ? rowsForPhaseFromFile(tsvPath) : rowsForPhase(phase);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
