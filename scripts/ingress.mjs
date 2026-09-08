/**
 * CLI do perfil de Ingress.
 *
 * Uso:  node scripts/ingress.mjs show
 *       node scripts/ingress.mjs build <export.tsv> [--apply]
 *       node scripts/ingress.mjs gdpr  <pasta-do-dump> [--apply]
 *       node scripts/ingress.mjs medals [--fetch]
 *       node scripts/ingress.mjs badges list
 *       node scripts/ingress.mjs badges add <slug> [count=N] [tier=T] [<tier>=YYYY-MM-DD ...] [--apply]
 *       node scripts/ingress.mjs badges rm <slug> [--apply]
 *       node scripts/ingress.mjs badges medaldate <slug> <tier> <YYYY-MM-DD> [--apply]
 *
 * Roda APENAS na máquina do Luiz. NÃO toca em banco — a fonte de dados da rota
 * /ingress é o arquivo versionado `data/ingress/fencherlc.json` (ver AD-001).
 * Sem `--apply` é dry-run: mostra o que mudaria e não escreve nada.
 */
import {readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {parseAppExport} from '../lib/ingress-stats.mjs';
import {buildProfile, mergeGdprDump} from '../lib/ingress-profile.mjs';
import {computeAllBadges, BADGES} from '../lib/ingress-badges.mjs';
import {loadCatalog, catalogEntry, coreBadges} from '../lib/ingress-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_PATH = join(ROOT, 'data', 'ingress', 'fencherlc.json');
const CATALOG_PATH = join(ROOT, 'data', 'ingress', 'badge-catalog.json');
const MEDALS_DIR = join(ROOT, 'public', 'ingress', 'medals');

const IP_COLLECTION = 'i37o5ykupb5voix';
const TIER_NAMES = ['bronze', 'silver', 'gold', 'platinum', 'onyx'];
const IP_TIER_FILE = ['bronze', 'silver', 'gold', 'platinum', 'black']; // onyx -> "black"
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// category id do ingress.plus -> grupo do catálogo
const IP_CATEGORY_GROUP = {
  '6u7cr4bi2606us4': 'anomaly',
  pfad17ym2hbqxz7: 'event',
  '0e84186a0c41byx': 'event',
  ls16oyxv2uu1we6: 'event',
  pg6xgooz2c0tlrw: 'event',
  w3edg3aypzulyun: 'prestige',
  '1ibxke0896tb5co': 'collectible',
  '6h59ai1y44s43j0': 'collectible',
  von21ryp7fmqh8d: 'collectible',
};

const GDPR_SERIES = {
  'lifetime_ap.tsv': 'lifetimeAp', 'xm_collected.tsv': 'xmCollected',
  'kilometers_walked.tsv': 'distanceWalkedKm', 'hacks.tsv': 'hacks',
  'portals_captured.tsv': 'portalsCaptured', 'links_created.tsv': 'linksCreated',
  'fields_created.tsv': 'controlFieldsCreated', 'resonators_destroyed.tsv': 'resonatorsDestroyed',
};
const GDPR_PORTAL_FILES = {visited: 'portals_visited.tsv', submitted: 'all_portals_approved.tsv'};

const rel = (p) => p.replace(ROOT, '.');
const readProfile = () =>
  existsSync(PROFILE_PATH) ? JSON.parse(readFileSync(PROFILE_PATH, 'utf8')) : null;
const serialize = (obj) => JSON.stringify(obj, null, 2) + '\n';

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function diff(before, after) {
  if (serialize(before || {}) === serialize(after)) return null;
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after)]);
  return [...keys].filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after[k]));
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
  if (!changed) return console.log('Nada muda — o perfil já está atualizado.');
  console.log(`\nCampos que mudam: ${changed.join(', ')}`);
  if (!apply) return console.log('\nDry-run: nada foi gravado. Rode de novo com --apply para gravar.');
  if (before && profile.capturedAt < before.capturedAt) {
    console.log(`\n⚠  capturedAt novo (${profile.capturedAt}) é MAIS ANTIGO que o atual (${before.capturedAt}).`);
    if (!(await confirm('Sobrescrever mesmo assim?'))) return console.log('Cancelado.');
  }
  if (!(await confirm(`\nGravar ${rel(PROFILE_PATH)}?`))) return console.log('Cancelado.');
  writeFileSync(PROFILE_PATH, serialize(profile));
  console.log('Gravado. Faça o commit + deploy.');
}

// ---------- GDPR ----------

function parseSeriesTsv(text) {
  return text.split(/\r?\n/).slice(1).map((l) => l.split('\t'))
    .filter((c) => c.length >= 2 && c[0].trim())
    .map((c) => ({t: c[0].trim(), v: Number(String(c[1]).replace(/[^\d.-]/g, ''))}))
    .filter((p) => Number.isFinite(p.v));
}
function parsePortalTsv(text) {
  return text.split(/\r?\n/).slice(1).map((l) => l.split('\t'))
    .map((c) => ({lat: Number(c[0]), lng: Number(c[1]), name: (c[2] || '').trim() || undefined}))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}
function readGdprDump(dir) {
  const present = new Set(readdirSync(dir));
  const timeSeries = {};
  for (const [file, key] of Object.entries(GDPR_SERIES)) {
    if (!present.has(file)) {console.log(`  · ${file} ausente`); continue;}
    const points = parseSeriesTsv(readFileSync(join(dir, file), 'utf8'));
    if (points.length) timeSeries[key] = points;
    else console.log(`  · ${file} vazio`);
  }
  const portals = {visited: [], submitted: []};
  for (const [slot, file] of Object.entries(GDPR_PORTAL_FILES)) {
    if (present.has(file)) portals[slot] = parsePortalTsv(readFileSync(join(dir, file), 'utf8'));
    else console.log(`  · ${file} ausente`);
  }
  return {
    timeSeries: Object.keys(timeSeries).length ? timeSeries : undefined,
    portals: portals.visited.length || portals.submitted.length ? portals : undefined,
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}

// ---------- catálogo / ingress.plus ----------

let ipCache = null;
async function fetchIpBadges() {
  if (ipCache) return ipCache;
  const res = await fetch(
    `https://ingress.plus/api/collections/${IP_COLLECTION}/records?perPage=400`,
    {headers: {'User-Agent': 'Mozilla/5.0'}},
  );
  if (!res.ok) throw new Error(`ingress.plus respondeu ${res.status}`);
  ipCache = (await res.json()).items;
  return ipCache;
}

/**
 * Devolve a entrada de `slug` do catálogo; se faltar, busca no ingress.plus.
 * Só grava `badge-catalog.json` quando `write` é true (o dry-run não escreve).
 */
async function ensureCatalogEntry(slug, write) {
  const local = catalogEntry(slug);
  if (local) return local;
  const items = await fetchIpBadges();
  const hit = items.find((it) => slugify(it.title) === slug);
  if (!hit) return null;
  const entry = {
    name: hit.title,
    group: IP_CATEGORY_GROUP[hit.category] || 'other',
    ...(hit.stat_line && hit.tier_values
      ? {tiers: hit.tier_values.split(',').map(Number)}
      : {}),
    requirement: (hit.requirement || '').trim(),
    ipId: hit.id,
    ipArt: hit.image,
  };
  if (write) {
    const catalog = loadCatalog();
    catalog[slug] = entry;
    writeFileSync(CATALOG_PATH, serialize(catalog));
    console.log(`  + catálogo: ${slug} (${entry.group}) de ingress.plus`);
  } else {
    console.log(`  · catálogo receberia ${slug} (${entry.group}) — grava no --apply`);
  }
  return {slug, ...entry};
}

async function downloadPng(url, dest) {
  const res = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}});
  if (!res.ok) {console.log(`  ! ${res.status} ${url}`); return false;}
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500 || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
    console.log(`  ! resposta não é PNG (${buf.length} B): ${url}`);
    return false;
  }
  writeFileSync(dest, buf);
  return true;
}

async function fetchMedalArt(entries) {
  mkdirSync(MEDALS_DIR, {recursive: true});
  let got = 0;
  for (const e of entries) {
    const isCore = e.group === 'core' && Array.isArray(e.ipArt) && e.ipArt.length === 5;
    const jobs = isCore
      ? TIER_NAMES.map((tier, i) => ({
          file: `${e.slug}-${tier}.png`,
          ipFile: e.ipArt.find((f) => f.includes(`_${IP_TIER_FILE[i]}_`)) || e.ipArt[i],
        }))
      : [{file: `${e.slug}.png`, ipFile: e.ipArt?.[0]}];
    for (const j of jobs) {
      if (!j.ipFile) continue;
      const dest = join(MEDALS_DIR, j.file);
      if (existsSync(dest)) continue;
      const url = `https://ingress.plus/api/files/${IP_COLLECTION}/${e.ipId}/${j.ipFile}?thumb=128x128`;
      if (await downloadPng(url, dest)) {got++; console.log(`  ✓ ${j.file}`);}
    }
  }
  console.log(`\n${got} imagem(ns) baixada(s).`);
}

// ---------- comandos ----------

function commandShow() {
  const p = readProfile();
  if (!p) return console.log('Nenhum perfil em', PROFILE_PATH);
  console.log(`${p.agent.codename} (${p.agent.faction}) — nível ${p.agent.level}, ${p.agent.recursions} recursões`);
  console.log(`capturado em ${p.capturedAt} · ${(p.history || []).length} snapshot(s)`);
  console.log(`${Object.keys(p.stats).length} estatísticas`);
  console.log(`eventBadges: ${(p.eventBadges || []).length} · medalDates: ${Object.keys(p.medalDates || {}).length}`);
  console.log(`séries temporais: ${p.timeSeries ? Object.keys(p.timeSeries).join(', ') : 'nenhuma'}`);
  console.log(`pendente: ${p.pending.join(', ') || 'nada'}`);
}

async function commandBuild(tsvPath, apply) {
  if (!tsvPath || !existsSync(tsvPath)) throw new Error(`Arquivo não encontrado: ${tsvPath}`);
  const parsed = parseAppExport(readFileSync(tsvPath, 'utf8'));
  for (const w of parsed.warnings) console.log(`  aviso: ${w}`);
  await persist(buildProfile(parsed, {previous: readProfile()}), apply);
}

async function commandGdpr(dir, apply) {
  if (!dir || !existsSync(dir)) throw new Error(`Pasta não encontrada: ${dir}`);
  const previous = readProfile();
  if (!previous) throw new Error('Rode `build` primeiro.');
  console.log('Lendo o dump GDPR...');
  await persist(mergeGdprDump(previous, readGdprDump(dir)), apply);
}

async function commandMedals(fetchMissing) {
  const p = readProfile();
  const badges = p ? computeAllBadges(p.stats) : [];
  const tierOf = new Map(badges.map((b) => [b.key, b.tier]));

  if (fetchMissing) {
    const eventSlugs = new Set((p?.eventBadges || []).map((e) => e.slug));
    const entries = [...coreBadges()];
    for (const slug of eventSlugs) {
      const e = await ensureCatalogEntry(slug, true);
      if (e) entries.push(e);
    }
    await fetchMedalArt(entries);
    return;
  }

  let present = 0;
  let total = 0;
  for (const b of BADGES) {
    for (const tier of TIER_NAMES) {
      total++;
      const has = existsSync(join(MEDALS_DIR, `${b.slug}-${tier}.png`));
      if (has) present++;
      if (tier === tierOf.get(b.slug)) {
        console.log(`  ${has ? '✓' : '·'} ${b.slug}-${tier}.png   ${b.name} (tier atual)`);
      }
    }
  }
  console.log(`\n${present} de ${total} imagens presentes. Rode com --fetch para baixar o que falta.`);
}

async function commandBadges(sub, rest, apply) {
  const p = readProfile();
  if (!p) throw new Error('Rode `build` primeiro.');
  const kv = Object.fromEntries(
    rest.filter((a) => a.includes('=')).map((a) => a.split('=')),
  );
  const positional = rest.filter((a) => !a.includes('=') && !a.startsWith('--'));

  if (!sub || sub === 'list') {
    console.log('eventBadges:');
    for (const e of p.eventBadges || []) {
      const name = (catalogEntry(e.slug) || {}).name || e.slug;
      console.log(`  ${e.slug}${e.count ? ` ×${e.count}` : ''}${e.tier ? ` (${e.tier})` : ''}  ${name}  ${JSON.stringify(e.dates || {})}`);
    }
    console.log('medalDates:');
    for (const [slug, tiers] of Object.entries(p.medalDates || {})) {
      console.log(`  ${slug}: ${JSON.stringify(tiers)}`);
    }
    return;
  }

  const next = JSON.parse(JSON.stringify(p));

  if (sub === 'add') {
    const slug = positional[0];
    if (!slug) throw new Error('uso: badges add <slug> [count=N] [tier=T] [<tier>=YYYY-MM-DD ...]');
    const entry = await ensureCatalogEntry(slug, apply);
    if (!entry) {
      console.log(`  ! "${slug}" não está no catálogo nem no ingress.plus — nada foi feito.`);
      return;
    }
    const dates = Object.fromEntries(
      Object.entries(kv).filter(([k]) => !['count', 'tier'].includes(k)),
    );
    const eb = {slug};
    if (kv.count) eb.count = Number(kv.count);
    if (kv.tier) eb.tier = kv.tier;
    if (Object.keys(dates).length) eb.dates = dates;
    next.eventBadges = (next.eventBadges || []).filter((x) => x.slug !== slug);
    next.eventBadges.push(eb);
    next.eventBadges.sort((a, b) => a.slug.localeCompare(b.slug));
  } else if (sub === 'rm') {
    const slug = positional[0];
    next.eventBadges = (next.eventBadges || []).filter((x) => x.slug !== slug);
  } else if (sub === 'medaldate') {
    const [slug, tier, date] = positional;
    if (!catalogEntry(slug)) throw new Error(`"${slug}" não é uma badge do catálogo`);
    if (!TIER_NAMES.includes(tier)) throw new Error(`tier inválido: ${tier}`);
    next.medalDates = next.medalDates || {};
    next.medalDates[slug] = {...(next.medalDates[slug] || {}), [tier]: date};
  } else {
    throw new Error(`subcomando desconhecido: ${sub}`);
  }

  await persist(next, apply);
}

// ---------- dispatch ----------

const argv = process.argv.slice(2);
const [command, ...args] = argv;
const apply = argv.includes('--apply');

const run = {
  show: () => commandShow(),
  build: () => commandBuild(args[0], apply),
  gdpr: () => commandGdpr(args[0], apply),
  medals: () => commandMedals(argv.includes('--fetch')),
  badges: () => commandBadges(args[0], args.slice(1), apply),
};

if (!run[command]) {
  console.log('Comandos: show | build <tsv> [--apply] | gdpr <pasta> [--apply] | medals [--fetch] | badges list|add|rm|medaldate');
  process.exit(command ? 1 : 0);
}

Promise.resolve()
  .then(run[command])
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
  });
