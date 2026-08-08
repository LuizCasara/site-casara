/**
 * Migração 002 — abre `casara.books.status` para 'referencia' e 'quero-ler'.
 *
 * Uso:  node scripts/migrate-status-livros.mjs           (dry-run: mostra o estado)
 *       node scripts/migrate-status-livros.mjs --apply   (aplica)
 *
 * Lê DATABASE_URL de .env.local, mesmo parsing manual de migrate-casara.mjs. O
 * SQL equivalente, para rodar à mão no Neon SQL Editor, está em
 * lib/migrations/002-status-livros.sql.
 *
 * **Escreve em PRODUÇÃO** — daí o dry-run ser o padrão. A mudança é só na
 * restrição da coluna: nenhuma linha existente é lida ou alterada, e os dois
 * status antigos continuam válidos, então é seguro com o site no ar.
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
const STATUS_NOVOS = ['lendo', 'lido', 'referencia', 'quero-ler'];

async function restricaoAtual() {
    const linhas = await sql`
        SELECT pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'casara' AND t.relname = 'books' AND c.conname = 'books_status_check'
    `;
    return linhas[0]?.def ?? null;
}

async function main() {
    const antes = await restricaoAtual();
    console.log('restrição atual:', antes ?? '(nenhuma)');

    const contagem = await sql`
        SELECT status, COUNT(*)::int AS n FROM casara.books GROUP BY status ORDER BY status
    `;
    console.log('livros por status:', contagem.map((l) => `${l.status}=${l.n}`).join(', '));

    if (!APPLY) {
        console.log('\n(dry-run) rode com --apply para permitir:', STATUS_NOVOS.join(', '));
        return;
    }

    // Duas instruções, e não uma: um CHECK não se altera no lugar, cai e
    // nasce. `IF EXISTS` deixa o script repetível.
    await sql`ALTER TABLE casara.books DROP CONSTRAINT IF EXISTS books_status_check`;
    await sql`
        ALTER TABLE casara.books
        ADD CONSTRAINT books_status_check
        CHECK (status IN ('lendo', 'lido', 'referencia', 'quero-ler'))
    `;

    console.log('\nrestrição nova:', await restricaoAtual());
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
