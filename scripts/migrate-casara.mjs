/**
 * Migração 001 — move as tabelas deste site para o schema/tenant "casara".
 *
 * Uso:  node scripts/migrate-casara.mjs           (dry-run: só mostra o estado)
 *       node scripts/migrate-casara.mjs --apply   (executa a migração)
 *
 * Lê DATABASE_URL de .env.local. O SQL equivalente, para rodar à mão no Neon
 * SQL Editor, está em lib/migrations/001-schema-casara.sql.
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

/** As 8 tabelas deste site e onde elas vivem antes da migração. */
const MOVES = [
    ['public', 'events'],
    ['geav', 'word_sessions'],
    ['geav', 'word_submissions'],
    ['geav', 'word_entries'],
    ['geav', 'quiz_sessions'],
    ['geav', 'quiz_questions'],
    ['geav', 'quiz_participants'],
    ['geav', 'quiz_answers'],
];

/**
 * Conta as linhas das 8 tabelas deste site, procurando cada uma tanto na
 * origem quanto no destino. Olhar só pelo nome da tabela não serve: geav.events
 * é do OUTRO site e tem o mesmo nome de public.events — por isso a busca é
 * sempre pelo par (schema, tabela), nunca pelo nome solto.
 */
async function snapshot(label) {
    console.log(`\n── ${label} ──`);
    const candidatos = MOVES.flatMap(([schema, table]) => [[schema, table], ['casara', table]]);

    const out = [];
    for (const [schema, table] of candidatos) {
        const [existe] = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_name = ${table} AND table_type = 'BASE TABLE'`;
        if (!existe) continue;
        const [{n}] = await sql.query(`SELECT COUNT(*)::int AS n FROM "${schema}"."${table}"`);
        out.push({tabela: `${schema}.${table}`, linhas: n});
    }
    console.table(out);
    return out;
}

const antes = await snapshot('ANTES');

if (!APPLY) {
    console.log('\nDry-run. Rode com --apply para executar a migração.');
    process.exit(0);
}

console.log('\nExecutando migração (transação única)...');
await sql.transaction([
    sql`CREATE SCHEMA IF NOT EXISTS casara`,
    ...MOVES.map(([schema, table]) => sql.query(`ALTER TABLE ${schema}.${table} SET SCHEMA casara`)),
]);
console.log('Migração aplicada.');

const depois = await snapshot('DEPOIS');

// ─── Verificação: nenhuma tabela deste site pode ter ficado fora de "casara",
// e a contagem de linhas de cada uma precisa bater exatamente com o "antes".
const erros = [];
for (const {tabela, linhas} of antes) {
    const nome = tabela.split('.')[1];
    const novo = depois.find((d) => d.tabela === `casara.${nome}`);
    if (!novo) erros.push(`${nome}: não chegou em casara`);
    else if (novo.linhas !== linhas) erros.push(`${nome}: ${linhas} linhas antes, ${novo.linhas} depois`);
}
for (const {tabela} of depois) {
    if (!tabela.startsWith('casara.')) erros.push(`${tabela}: ainda fora de casara`);
}

if (erros.length) {
    console.error('\n❌ VERIFICAÇÃO FALHOU:\n' + erros.join('\n'));
    process.exit(1);
}
console.log('\n✅ Verificação OK: as 8 tabelas estão em casara com a contagem de linhas intacta.');

// Sanidade extra: o schema do outro site continua completo.
const [{n: geavRestantes}] = await sql`
  SELECT COUNT(*)::int AS n FROM information_schema.tables
  WHERE table_schema = 'geav' AND table_type = 'BASE TABLE'`;
const [{n: geavEvents}] = await sql`SELECT COUNT(*)::int AS n FROM geav.events`;
console.log(`   GEAV intacto: ${geavRestantes} tabelas, geav.events com ${geavEvents} linhas.`);
