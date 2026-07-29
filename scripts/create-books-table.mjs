/**
 * Cria a tabela casara.books com seus 3 índices, de forma atômica.
 *
 * Uso:  node scripts/create-books-table.mjs           (dry-run: mostra o estado)
 *       node scripts/create-books-table.mjs --apply   (cria tabela e/ou índices faltantes)
 *
 * Verificação de integridade: consulta pg_indexes para confirmar a existência dos
 * 3 índices esperados. Se a tabela existe mas algum índice falta, reporta quais
 * faltam e, com --apply, cria os faltantes (CREATE INDEX IF NOT EXISTS).
 *
 * Atomicidade: CREATE TABLE + 3× CREATE INDEX rodam numa transação única,
 * evitando estados parciais após queda de conexão.
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

// ─── Índices esperados ──────────────────────────────────────────────────────

const EXPECTED_INDEXES = ['idx_books_status', 'idx_books_category', 'idx_books_tags'];

// ─── Verificação de estado ──────────────────────────────────────────────────

const [tabelaExiste] = await sql`
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'casara' AND table_name = 'books' AND table_type = 'BASE TABLE'`;

const indicesExistentes = tabelaExiste
    ? (await sql`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'casara' AND tablename = 'books'`).map((r) => r.indexname)
    : [];

const indicesFaltam = EXPECTED_INDEXES.filter((idx) => !indicesExistentes.includes(idx));

// ─── Estado e decisão ───────────────────────────────────────────────────────

if (!tabelaExiste) {
    console.log('casara.books NÃO existe (criar tabela + índices).');

    if (!APPLY) {
        console.log('Dry-run. Rode com --apply para criar a tabela e seus índices.');
        process.exit(0);
    }

    console.log('\nExecutando criação (transação única)...');
    await sql.transaction([
        sql`
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
          )`,
        sql`CREATE INDEX idx_books_status   ON casara.books (status)`,
        sql`CREATE INDEX idx_books_category ON casara.books (category)`,
        sql`CREATE INDEX idx_books_tags     ON casara.books USING GIN (tags)`,
    ]);
    console.log('Criação aplicada.');
} else if (indicesFaltam.length === 0) {
    const [{n}] = await sql`SELECT COUNT(*)::int AS n FROM casara.books`;
    console.log(`casara.books já existe, com ${n} linha(s) e os 3 índices presentes. Nada a fazer.`);
    process.exit(0);
} else {
    console.log(`casara.books existe, mas faltam ${indicesFaltam.length} índice(s):`);
    indicesFaltam.forEach((idx) => console.log(`  - ${idx}`));

    if (!APPLY) {
        console.log('Dry-run. Rode com --apply para criar os índices faltantes.');
        process.exit(0);
    }

    console.log('\nCriando índices faltantes...');
    const indexStatements = indicesFaltam.map((idx) => {
        if (idx === 'idx_books_status') {
            return sql`CREATE INDEX IF NOT EXISTS idx_books_status ON casara.books (status)`;
        } else if (idx === 'idx_books_category') {
            return sql`CREATE INDEX IF NOT EXISTS idx_books_category ON casara.books (category)`;
        } else if (idx === 'idx_books_tags') {
            return sql`CREATE INDEX IF NOT EXISTS idx_books_tags ON casara.books USING GIN (tags)`;
        }
    });

    await sql.transaction(indexStatements);
    console.log(`✅ ${indicesFaltam.length} índice(s) criado(s).`);
}

// ─── Sanidade final ─────────────────────────────────────────────────────────

const [{n: geav}] = await sql`
  SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'geav'`;
console.log(`\n✅ Verificação: GEAV intacto com ${geav} tabelas.`);
