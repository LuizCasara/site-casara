/**
 * Gera `data/ingress/badge-catalog.json` a partir do ingress.plus (API PocketBase
 * aberta). One-off — roda só na máquina do Luiz, quando o catálogo do jogo mudar.
 * Histórico, como `scripts/migrate-casara.mjs`: o arquivo é versionado e o site
 * NÃO depende do ingress.plus em runtime nem em build.
 *
 * Pega as 29 medalhas de contagem cujo `stat_line` casa com uma coluna do export
 * do app. **Preserva as entradas non-core** (evento/anomalia/colecionável) que o
 * `scripts/ingress.mjs badges add` tiver acrescentado. Idempotente.
 *
 * Uso:  node scripts/ingress-catalog-gen.mjs [--apply]
 */
import {writeFileSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {STAT_COLUMNS} from '../lib/ingress-stats.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'ingress', 'badge-catalog.json');
const COLLECTION = 'i37o5ykupb5voix';
const API = `https://ingress.plus/api/collections/${COLLECTION}/records?perPage=400`;

// stat_line do ingress.plus -> chave estável (coluna do export)
const COL_TO_KEY = new Map(STAT_COLUMNS.map((c) => [c.col, c.key]));

// Ordem canônica das core no arquivo.
const ORDER = [
    'builder', 'connector', 'mind-controller', 'illuminator', 'liberator', 'pioneer',
    'explorer', 'trekker', 'purifier', 'hacker', 'sojourner', 'recharger', 'engineer',
    'specops', 'translator', 'recon', 'scout', 'scout-controller', 'seer', 'recruiter',
    'guardian', 'first-saturday', 'second-sunday', 'mission-day', 'nl-1331-meetups',
    'operation-clear-field', 'maverick', 'reclaimer', 'epoch',
];

// Limiares que o jogo mostra diferente do ingress.plus (o jogo é a fonte da verdade).
const TIER_OVERRIDES = {
    illuminator: [5000, 50000, 250000, 1000000, 4000000], // ingress.plus diz bronze 2000
    guardian: [3, 10, 20, 90, 150], // ingress.plus diz 80/140
};

function slugify(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
    const res = await fetch(API, {headers: {'User-Agent': 'Mozilla/5.0'}});
    if (!res.ok) throw new Error(`ingress.plus respondeu ${res.status}`);
    const {items} = await res.json();

    const wanted = new Set(ORDER);
    const bySlug = new Map();
    for (const it of items) {
        const slug = slugify(it.title);
        if (!wanted.has(slug)) continue;
        if (!it.stat_line || !it.tier_values) continue;
        const statKey = COL_TO_KEY.get(it.stat_line);
        if (!statKey) {
            console.log(`  ! ${it.title}: stat_line "${it.stat_line}" não casa com nenhuma coluna — pulado`);
            continue;
        }
        bySlug.set(slug, {
            name: it.title,
            group: 'core',
            statKey,
            tiers: TIER_OVERRIDES[slug] || it.tier_values.split(',').map((n) => parseInt(n, 10)),
            requirement: (it.requirement || '').trim(),
            unobtainable: Boolean(it.unobtainable),
            ipId: it.id,
            ipArt: it.image,
        });
    }

    const missing = ORDER.filter((s) => !bySlug.has(s));
    if (missing.length) throw new Error(`Não achei no ingress.plus: ${missing.join(', ')}`);

    // Preserva as entradas non-core (evento/anomalia) já no arquivo.
    let existing = {};
    try {
        existing = JSON.parse(readFileSync(OUT, 'utf8'));
    } catch {
        /* arquivo ainda não existe */
    }
    const nonCore = Object.entries(existing).filter(([, e]) => e.group !== 'core');

    const catalog = {};
    for (const slug of ORDER) catalog[slug] = bySlug.get(slug);
    for (const [slug, e] of nonCore) catalog[slug] = e;

    const json = JSON.stringify(catalog, null, 2) + '\n';
    let current = '';
    try {
        current = readFileSync(OUT, 'utf8');
    } catch {
        /* arquivo ainda não existe */
    }

    if (json === current) {
        console.log(`${OUT.replace(ROOT, '.')}: já está atualizado (${ORDER.length} badges).`);
        return;
    }
    if (!process.argv.includes('--apply')) {
        console.log(`Mudaria ${OUT.replace(ROOT, '.')} (${ORDER.length} badges). Rode com --apply para gravar.`);
        return;
    }
    writeFileSync(OUT, json);
    console.log(`Gravado ${OUT.replace(ROOT, '.')} — ${ORDER.length} badges.`);
}

main().catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
});
