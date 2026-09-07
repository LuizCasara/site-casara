/**
 * CLI do perfil de Ingress.
 *
 * Uso:  node scripts/ingress.mjs show
 *       node scripts/ingress.mjs build <export.tsv> [--apply]
 *       node scripts/ingress.mjs gdpr  <pasta-do-dump> [--apply]
 *
 * Roda APENAS na máquina do Luiz. NÃO toca em banco — a fonte de dados da rota
 * /ingress é o arquivo versionado `data/ingress/fencherlc.json` (ver AD-001).
 * Sem `--apply` é dry-run: mostra o que mudaria e não escreve nada.
 *
 * O `build` parte do export de estatísticas do app; o `gdpr` incorpora as séries
 * temporais e listas de portais do dump GDPR. O merge preserva o que já existe.
 */
import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {parseAppExport} from '../lib/ingress-stats.mjs';
import {buildProfile, mergeGdprDump} from '../lib/ingress-profile.mjs';
import {computeAllBadges} from '../lib/ingress-badges.mjs';
import {medalArt, expectedMedalFiles} from '../lib/ingress-medal-art.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_PATH = join(ROOT, 'data', 'ingress', 'fencherlc.json');

// Nome de arquivo do dump GDPR -> chave de série temporal do perfil. Ajustar
// quando o dump real chegar (ver docs/ingress-gdpr-dump-estrutura.md).
const GDPR_SERIES = {
  'lifetime_ap.tsv': 'lifetimeAp',
  'xm_collected.tsv': 'xmCollected',
  'kilometers_walked.tsv': 'distanceWalkedKm',
  'hacks.tsv': 'hacks',
  'portals_captured.tsv': 'portalsCaptured',
  'links_created.tsv': 'linksCreated',
  'fields_created.tsv': 'controlFieldsCreated',
  'resonators_destroyed.tsv': 'resonatorsDestroyed',
};
const GDPR_PORTAL_FILES = {visited: 'portals_visited.tsv', submitted: 'all_portals_approved.tsv'};

function readProfile() {
  return existsSync(PROFILE_PATH) ? JSON.parse(readFileSync(PROFILE_PATH, 'utf8')) : null;
}

function serialize(profile) {
  return JSON.stringify(profile, null, 2) + '\n';
}

function diff(before, after) {
  const b = before ? serialize(before) : '';
  const a = serialize(after);
  if (b === a) return null;
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after)]);
  const changed = [...keys].filter(
    (k) => JSON.stringify(before?.[k]) !== JSON.stringify(after[k]),
  );
  return changed;
}

async function confirm(question) {
  const io = createInterface({input: process.stdin, output: process.stdout});
  const r = (await io.question(`${question} (s/N): `)).trim().toLowerCase();
  io.close();
  return r === 's' || r === 'sim';
}

async function persist(profile, apply) {
  const before = readProfile();
  const changed = diff(before, profile);
  if (!changed) {
    console.log('Nada muda — o perfil já está atualizado.');
    return;
  }
  console.log(`\nCampos que mudam: ${changed.join(', ')}`);
  if (!apply) {
    console.log('\nDry-run: nada foi gravado. Rode de novo com --apply para gravar.');
    return;
  }
  if (before && profile.capturedAt < before.capturedAt) {
    console.log(
      `\n⚠  O capturedAt novo (${profile.capturedAt}) é MAIS ANTIGO que o atual (${before.capturedAt}).`,
    );
    if (!(await confirm('Sobrescrever mesmo assim?'))) return console.log('Cancelado.');
  }
  if (!(await confirm(`\nGravar ${PROFILE_PATH.replace(ROOT, '.')}?`))) return console.log('Cancelado.');
  writeFileSync(PROFILE_PATH, serialize(profile));
  console.log('Gravado. Faça o commit + deploy.');
}

function parseSeriesTsv(text) {
  return text
    .split(/\r?\n/)
    .slice(1) // header
    .map((l) => l.split('\t'))
    .filter((cols) => cols.length >= 2 && cols[0].trim())
    .map((cols) => ({t: cols[0].trim(), v: Number(String(cols[1]).replace(/[^\d.-]/g, ''))}))
    .filter((p) => Number.isFinite(p.v));
}

function parsePortalTsv(text) {
  return text
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split('\t'))
    .map((cols) => ({
      lat: Number(cols[0]),
      lng: Number(cols[1]),
      name: (cols[2] || '').trim() || undefined,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function readGdprDump(dir) {
  const present = new Set(readdirSync(dir));
  const timeSeries = {};
  for (const [file, key] of Object.entries(GDPR_SERIES)) {
    if (!present.has(file)) {
      console.log(`  · ${file} ausente — série "${key}" fica de fora`);
      continue;
    }
    const points = parseSeriesTsv(readFileSync(join(dir, file), 'utf8'));
    if (points.length) timeSeries[key] = points;
    else console.log(`  · ${file} vazio`);
  }
  const portals = {visited: [], submitted: []};
  for (const [slot, file] of Object.entries(GDPR_PORTAL_FILES)) {
    if (present.has(file)) portals[slot] = parsePortalTsv(readFileSync(join(dir, file), 'utf8'));
    else console.log(`  · ${file} ausente — portais "${slot}" ficam de fora`);
  }
  return {
    timeSeries: Object.keys(timeSeries).length ? timeSeries : undefined,
    portals: portals.visited.length || portals.submitted.length ? portals : undefined,
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}

function commandShow() {
  const p = readProfile();
  if (!p) return console.log('Nenhum perfil em', PROFILE_PATH);
  console.log(`${p.agent.codename} (${p.agent.faction}) — nível ${p.agent.level}, ${p.agent.recursions} recursões`);
  console.log(`capturado em ${p.capturedAt}`);
  console.log(`${Object.keys(p.stats).length} estatísticas`);
  console.log(`séries temporais: ${p.timeSeries ? Object.keys(p.timeSeries).join(', ') : 'nenhuma'}`);
  console.log(`portais: ${p.portals ? `${p.portals.visited.length} visitados, ${p.portals.submitted.length} submetidos` : 'nenhum'}`);
  console.log(`pendente: ${p.pending.join(', ') || 'nada'}`);
}

async function commandBuild(tsvPath, apply) {
  if (!tsvPath || !existsSync(tsvPath)) throw new Error(`Arquivo não encontrado: ${tsvPath}`);
  const parsed = parseAppExport(readFileSync(tsvPath, 'utf8'));
  for (const w of parsed.warnings) console.log(`  aviso: ${w}`);
  const profile = buildProfile(parsed, {previous: readProfile()});
  await persist(profile, apply);
}

function commandMedals() {
  const p = readProfile();
  if (!p) return console.log('Rode `build` primeiro.');
  const current = computeAllBadges(p.stats);
  console.log('Medalhas no tier atual do FencherLC:\n');
  for (const b of current) {
    const ok = medalArt(b.key, b.tier);
    console.log(`  ${ok ? '✓' : '·'} ${b.key}-${b.tier}.png   ${b.name} (${b.tier})`);
  }
  const missingAll = expectedMedalFiles().filter(
    (f) => !existsSync(join(ROOT, 'public', 'ingress', 'medals', f)),
  );
  console.log(`\n${missingAll.length} de ${expectedMedalFiles().length} arquivos possíveis ainda não estão em public/ingress/medals/`);
}

async function commandGdpr(dir, apply) {
  if (!dir || !existsSync(dir)) throw new Error(`Pasta não encontrada: ${dir}`);
  const previous = readProfile();
  if (!previous) throw new Error('Rode `build` primeiro — não há perfil para mesclar o dump.');
  console.log('Lendo o dump GDPR...');
  const profile = mergeGdprDump(previous, readGdprDump(dir));
  await persist(profile, apply);
}

const [, , command, arg] = process.argv;
const apply = process.argv.includes('--apply');

const run = {
  show: () => commandShow(),
  build: () => commandBuild(arg, apply),
  gdpr: () => commandGdpr(arg, apply),
  medals: () => commandMedals(),
};

if (!run[command]) {
  console.log('Comandos: show | build <export.tsv> [--apply] | gdpr <pasta> [--apply] | medals');
  process.exit(command ? 1 : 0);
}

Promise.resolve()
  .then(run[command])
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
  });
