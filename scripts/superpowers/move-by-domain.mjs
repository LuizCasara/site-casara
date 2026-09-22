import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
