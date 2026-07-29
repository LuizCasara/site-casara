/**
 * Cria a tabela casara.books.
 *
 * Uso:  node scripts/create-books-table.mjs           (dry-run: mostra o estado)
 *       node scripts/create-books-table.mjs --apply   (cria a tabela)
 *
 * Lê DATABASE_URL de .env.local, mesmo parsing de scripts/migrate-casara.mjs.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {neon} from '@neondatabase/serverless';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const url = readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
    ?.slice('DATABASE_URL='.length)
    .replace(/^["']|["']$/g, '');

if (!url) throw new Error('DATABASE_URL não encontrado em .env.local');

const sql = neon(url);

const [existe] = await sql`
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'casara' AND table_name = 'books' AND table_type = 'BASE TABLE'`;

if (existe) {
    const [{n}] = await sql`SELECT COUNT(*)::int AS n FROM casara.books`;
    console.log(`casara.books já existe, com ${n} linha(s). Nada a fazer.`);
    process.exit(0);
}

console.log('casara.books NÃO existe.');

if (!APPLY) {
    console.log('Dry-run. Rode com --apply para criar a tabela.');
    process.exit(0);
}

await sql`
  CREATE TABLE casara.books (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    isbn         TEXT,
    title        TEXT NOT NULL,
    author       TEXT,
    year         SMALLINT,
    publisher    TEXT,
    pages        SMALLINT,
    synopsis     TEXT,
    cover_path   TEXT,
    spine_color  TEXT,
    rating       NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
    category     TEXT NOT NULL,
    tags         TEXT[] NOT NULL DEFAULT '{}',
    status       TEXT NOT NULL CHECK (status IN ('lendo','lido')),
    progress_pct SMALLINT CHECK (progress_pct BETWEEN 0 AND 100),
    finished_at  DATE,
    review       TEXT,
    shelf_order  SMALLINT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

await sql`CREATE INDEX idx_books_status   ON casara.books (status)`;
await sql`CREATE INDEX idx_books_category ON casara.books (category)`;
await sql`CREATE INDEX idx_books_tags     ON casara.books USING GIN (tags)`;

console.log('✅ casara.books criada com os 3 índices.');

// Sanidade: o outro site continua intacto.
const [{n: geav}] = await sql`
  SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'geav'`;
console.log(`   GEAV intacto: ${geav} tabelas.`);
