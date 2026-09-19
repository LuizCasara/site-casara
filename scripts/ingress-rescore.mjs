/**
 * Recalcula a nota do ranking do Ingress na escala log₂ além do Onyx
 * (ADR-0005) — `casara.ingress_rankings` (e o snapshot mais recente de
 * `casara.ingress_ranking_history`). ESCREVE EM PRODUÇÃO: por isso tem 4 modos,
 * e só um deles escreve sem antes exigir backup.
 *
 *   node scripts/ingress-rescore.mjs                      dry-run (padrão): mostra o que mudaria, não grava nada
 *   node scripts/ingress-rescore.mjs --backup <tag>       cria as tabelas de backup + dump JSON e VERIFICA a cópia
 *   node scripts/ingress-rescore.mjs --apply <tag>        recalcula (transação única) — exige o backup <tag> íntegro
 *   node scripts/ingress-rescore.mjs --rollback <tag>     mostra o que o rollback restauraria (dry-run)
 *   node scripts/ingress-rescore.mjs --rollback <tag> --apply   restaura a nota do backup <tag>
 *
 * `<tag>`: identificador do backup, `[a-z0-9_]{1,40}` (ex.: pre_log2_20260918).
 *
 * Só as colunas de nota são tocadas (`overall_score`, `axis_scores`) — nunca
 * `updated_at`, `created_at`, AP, faixas de stats ou qualquer outra coluna, então
 * "atualizado há N dias" e o desempate por "medido desde" seguem iguais.
 *
 * Lê DATABASE_URL de .env.local (mesmo parsing de scripts/migrate-casara.mjs) e
 * usa o mesmo cálculo que `POST /api/ingress-rankings` (lib/ingress-tier-score.mjs).
 * Rode a partir da raiz do repositório (o catálogo de badges é lido de `process.cwd()`).
 *
 * `--rankings-table` / `--history-table` (só nomes `ingress_*` do schema casara)
 * existem para ensaiar o script numa cópia, sem tocar nas tabelas reais.
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {neon} from '@neondatabase/serverless'
import {computeAxisScores, computeOverallScore} from '../lib/ingress-tier-score.mjs'
import {planRescore} from '../lib/ingress-rescore.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

function flagValue(name) {
    const i = args.indexOf(name)
    if (i === -1) return null
    const v = args[i + 1]
    return v && !v.startsWith('--') ? v : null
}

const APPLY = args.includes('--apply')
const BACKUP_TAG = flagValue('--backup')
const APPLY_TAG = APPLY && !args.includes('--rollback') ? flagValue('--apply') : null
const ROLLBACK_TAG = flagValue('--rollback')
const RANKINGS = flagValue('--rankings-table') ?? 'ingress_rankings'
const HISTORY = flagValue('--history-table') ?? 'ingress_ranking_history'

const die = (msg) => {
    console.error(`\n✖ ${msg}`)
    process.exit(1)
}

// Nomes vão para SQL como identificador (não dá pra parametrizar) — só passa o que é inequivocamente seguro.
for (const [flag, name] of [['--rankings-table', RANKINGS], ['--history-table', HISTORY]]) {
    if (!/^ingress_[a-z0-9_]{1,50}$/.test(name)) die(`${flag} inválido: "${name}" (esperado ingress_[a-z0-9_]+)`)
}
for (const [flag, tag] of [['--backup', BACKUP_TAG], ['--apply', APPLY_TAG], ['--rollback', ROLLBACK_TAG]]) {
    if (tag !== null && !/^[a-z0-9_]{1,40}$/.test(tag)) die(`${flag}: tag inválida "${tag}" (esperado [a-z0-9_]{1,40})`)
}
if (args.includes('--backup') && !BACKUP_TAG) die('--backup precisa de uma tag. Ex.: --backup pre_log2_20260918')
if (args.includes('--rollback') && !ROLLBACK_TAG) die('--rollback precisa da tag do backup. Ex.: --rollback pre_log2_20260918')
if (APPLY && !args.includes('--rollback') && !APPLY_TAG) die('--apply precisa da tag do backup. Ex.: --apply pre_log2_20260918')

const url = readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
    ?.slice('DATABASE_URL='.length)
    .replace(/^["']|["']$/g, '')
if (!url) die('DATABASE_URL não encontrado em .env.local')
const sql = neon(url)

// Tudo sempre qualificado com casara. — o search_path da conexão NÃO inclui esse schema (ver CLAUDE.md).
const T = {rankings: `casara.${RANKINGS}`, history: `casara.${HISTORY}`}
/** Nome qualificado do backup. Postgres trunca identificadores em 63 caracteres SEM avisar — aí o script criaria a tabela e nunca a acharia de novo. */
const bkp = (table, tag) => {
    const name = `${table}_bkp_${tag}`
    if (name.length > 63) die(`O nome do backup "${name}" tem ${name.length} caracteres (limite do Postgres: 63). Use uma tag mais curta.`)
    return `casara.${name}`
}

const fmt = (n, w = 8) => Number(n).toFixed(2).padStart(w)

// ────────────────────────────────────────────────────────────────── leitura

async function readRankings() {
    return sql.query(
        `SELECT codename_key, codename, lifetime_ap, overall_score, axis_scores, stat_values, created_at
         FROM ${T.rankings} ORDER BY codename_key`,
    )
}

/** Snapshot mais recente de cada agente + quantos snapshots ele tem. */
async function readLatestHistory() {
    const rows = await sql.query(
        `SELECT DISTINCT ON (codename_key) codename_key, id, lifetime_ap, overall_score, recorded_at,
                COUNT(*) OVER (PARTITION BY codename_key)::int AS snapshots
         FROM ${T.history}
         ORDER BY codename_key, recorded_at DESC, id DESC`,
    )
    return new Map(rows.map((r) => [r.codename_key, {id: r.id, lifetime_ap: r.lifetime_ap, overall_score: r.overall_score, snapshots: r.snapshots}]))
}

async function loadPlan() {
    const [rankings, latestHistory] = await Promise.all([readRankings(), readLatestHistory()])
    return {rankings, ...planRescore({rankings, latestHistory, computeAxisScores, computeOverallScore})}
}

// ────────────────────────────────────────────────────────────────── relatório

function printPlan({plans, summary}) {
    const rows = [...plans].sort((a, b) => a.newRank - b.newRank)
    console.log('\n  #novo #atual  agente             nota atual → nota nova   Δ')
    for (const p of rows) {
        const arrow = p.newRank < p.oldRank ? `▲${p.oldRank - p.newRank}` : p.newRank > p.oldRank ? `▼${p.newRank - p.oldRank}` : ' ='
        console.log(
            `  ${String(p.newRank).padStart(4)} ${String(p.oldRank).padStart(5)}  ${p.codename.padEnd(17)} ${fmt(p.oldScore)} → ${fmt(p.newScore)}  ${fmt(p.newScore - p.oldScore, 9)}  ${arrow}`,
        )
    }
    console.log('\n  Top 5 ATUAL :', [...plans].sort((a, b) => a.oldRank - b.oldRank).slice(0, 5).map((p) => `${p.oldRank}.${p.codename}(${p.oldScore.toFixed(0)})`).join('  '))
    console.log('  Top 5 NOVO  :', rows.slice(0, 5).map((p) => `${p.newRank}.${p.codename}(${p.newScore.toFixed(0)})`).join('  '))
    console.log('\n  Resumo:', summary)

    const skipped = plans.filter((p) => p.history.action === 'skip')
    if (skipped.length) {
        console.log('\n  ⚠ snapshots de histórico que NÃO serão reescritos:')
        for (const p of skipped) console.log(`    - ${p.codename}: ${p.history.reason}`)
    }
    const older = plans.filter((p) => p.history.olderSnapshots > 0)
    if (older.length) {
        console.log(
            `\n  ℹ ${summary.olderSnapshots} snapshot(s) ANTIGO(S) de ${older.length} agente(s) ficam na escala antiga — o histórico só guarda a nota, não os stats,` +
                `\n    então não há como recalculá-los. O gráfico de AP não é afetado (ele só usa AP); o feed de atividade mostrará, no evento mais recente desses` +
                `\n    agentes, uma variação de nota que atravessa as duas escalas: ${older.map((p) => p.codename).join(', ')}.`,
        )
    }
}

// ────────────────────────────────────────────────────────────────── backup

async function tableExists(qualified) {
    const [schema, table] = qualified.split('.')
    const [row] = await sql`SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = ${schema} AND table_name = ${table}`
    return !!row
}

/** Contagem + soma da nota + soma de AP de uma tabela — impressão digital pra comparar cópia com original. */
async function fingerprint(table, hasStats) {
    const [row] = await sql.query(
        `SELECT COUNT(*)::int AS n, COALESCE(SUM(overall_score), 0)::text AS score, COALESCE(SUM(lifetime_ap), 0)::text AS ap
                ${hasStats ? ", COALESCE(SUM(length(stat_values::text)), 0)::text AS statlen" : ''}
         FROM ${table}`,
    )
    return row
}

async function doBackup(tag) {
    const rTo = bkp(RANKINGS, tag)
    const hTo = bkp(HISTORY, tag)
    if ((await tableExists(rTo)) || (await tableExists(hTo))) die(`O backup "${tag}" já existe (${rTo} / ${hTo}). Use outra tag — backups nunca são sobrescritos.`)

    console.log(`\nCriando backup "${tag}" (transação única)…`)
    await sql.transaction([
        sql.query(`CREATE TABLE ${rTo} AS SELECT * FROM ${T.rankings}`),
        sql.query(`CREATE TABLE ${hTo} AS SELECT * FROM ${T.history}`),
    ])

    // Verificação: a cópia tem que ser idêntica à origem, senão não vale como backup.
    const [rSrc, rDst, hSrc, hDst] = await Promise.all([
        fingerprint(T.rankings, true),
        fingerprint(rTo, true),
        fingerprint(T.history, false),
        fingerprint(hTo, false),
    ])
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    console.log(`  ${T.rankings}: ${JSON.stringify(rSrc)}\n  ${rTo}: ${JSON.stringify(rDst)}`)
    console.log(`  ${T.history}: ${JSON.stringify(hSrc)}\n  ${hTo}: ${JSON.stringify(hDst)}`)
    if (!same(rSrc, rDst) || !same(hSrc, hDst)) die('A cópia NÃO bate com a origem. Não use este backup.')

    // Segunda cópia, fora do banco: um arquivo JSON local (ignorado pelo git) pra o caso do banco em si falhar.
    const dir = join(ROOT, 'scripts', 'backups')
    mkdirSync(dir, {recursive: true})
    const file = join(dir, `ingress-rescore-${tag}.json`)
    const [rankings, history] = await Promise.all([sql.query(`SELECT * FROM ${rTo} ORDER BY codename_key`), sql.query(`SELECT * FROM ${hTo} ORDER BY id`)])
    writeFileSync(file, JSON.stringify({tag, takenAt: new Date().toISOString(), rankings, history}, null, 2))
    console.log(`\n✔ Backup verificado: ${rTo}, ${hTo}\n✔ Dump local: ${file}`)
}

// ────────────────────────────────────────────────────────────────── apply

async function doApply(tag) {
    const rFrom = bkp(RANKINGS, tag)
    const hFrom = bkp(HISTORY, tag)
    if (!(await tableExists(rFrom)) || !(await tableExists(hFrom))) die(`Backup "${tag}" não encontrado. Rode antes: --backup ${tag}`)

    const plan = await loadPlan()
    printPlan(plan)

    const toWrite = plan.plans.filter((p) => p.changed)
    if (toWrite.length === 0) {
        console.log('\n✔ Nada a fazer: todas as notas já estão na escala log₂.')
        return
    }

    // O backup só serve de rollback se ainda for o retrato do que está no banco AGORA. Se alguém enviou stats
    // depois do backup, refazer é barato; aplicar sem conseguir voltar não é.
    const [rNow, rBkp, hNow, hBkp] = await Promise.all([
        fingerprint(T.rankings, true),
        fingerprint(rFrom, true),
        fingerprint(T.history, false),
        fingerprint(hFrom, false),
    ])
    if (JSON.stringify(rNow) !== JSON.stringify(rBkp) || JSON.stringify(hNow) !== JSON.stringify(hBkp)) {
        die(
            `O banco mudou desde o backup "${tag}" (alguém enviou stats?). Faça um backup novo (--backup <outra tag>) e aplique com ele.\n` +
                `  agora : ${JSON.stringify(rNow)} | ${JSON.stringify(hNow)}\n  backup: ${JSON.stringify(rBkp)} | ${JSON.stringify(hBkp)}`,
        )
    }

    console.log(`\nAplicando: ${toWrite.length} linha(s) em ${T.rankings} + ${toWrite.filter((p) => p.history.action === 'update').length} snapshot(s) em ${T.history} (transação única)…`)
    const statements = []
    for (const p of toWrite) {
        // `stat_values = $4` é a guarda de concorrência: se o agente reenviou stats entre a leitura e o UPDATE, a linha
        // não casa, nada é gravado para ela, e o RETURNING vazio abaixo denuncia.
        statements.push(
            sql.query(
                `UPDATE ${T.rankings} SET overall_score = $1, axis_scores = $2::jsonb
                 WHERE codename_key = $3 AND stat_values = $4::jsonb
                 RETURNING codename_key`,
                [p.newScore, JSON.stringify(p.axisScores), p.codenameKey, JSON.stringify(p.statValues)],
            ),
        )
        if (p.history.action === 'update') {
            statements.push(
                sql.query(`UPDATE ${T.history} SET overall_score = $1, axis_scores = $2::jsonb WHERE id = $3 RETURNING id`, [
                    p.newScore,
                    JSON.stringify(p.axisScores),
                    p.history.id,
                ]),
            )
        }
    }
    const results = await sql.transaction(statements)
    const empty = results.filter((r) => r.length === 0).length
    if (empty > 0) console.warn(`⚠ ${empty} UPDATE(s) não casaram com nenhuma linha (concorrência) — rode o script de novo.`)

    // Verificação independente: relê o banco e confere cada nota contra o cálculo, não contra o que acabei de mandar.
    const after = await loadPlan()
    const wrong = after.plans.filter((p) => p.changed)
    if (wrong.length) {
        console.error('\n✖ Verificação: linhas ainda fora da nova escala:', wrong.map((p) => p.codename).join(', '))
        process.exit(1)
    }
    console.log(`\n✔ Verificado: as ${after.summary.agents} notas do banco batem com o cálculo log₂. Reverter: --rollback ${tag} --apply`)
}

// ────────────────────────────────────────────────────────────────── rollback

async function doRollback(tag) {
    const rFrom = bkp(RANKINGS, tag)
    const hFrom = bkp(HISTORY, tag)
    if (!(await tableExists(rFrom)) || !(await tableExists(hFrom))) die(`Backup "${tag}" não encontrado.`)

    // Só volta a nota das linhas que continuam IGUAIS ao backup em stats e AP. Quem reenviou o status depois do
    // apply já tem stats/AP/nota novos e coerentes entre si; restaurar só a nota antiga deixaria a linha
    // inconsistente (stats novos, nota velha) até o próximo envio.
    const SAME_INPUTS = 't.stat_values = b.stat_values AND t.lifetime_ap = b.lifetime_ap'
    const diff = await sql.query(
        `SELECT t.codename, t.overall_score AS agora, b.overall_score AS backup
         FROM ${T.rankings} t JOIN ${rFrom} b USING (codename_key)
         WHERE ${SAME_INPUTS}
           AND (t.overall_score IS DISTINCT FROM b.overall_score OR t.axis_scores IS DISTINCT FROM b.axis_scores)
         ORDER BY b.overall_score DESC`,
    )
    const resubmitted = await sql.query(
        `SELECT t.codename FROM ${T.rankings} t JOIN ${rFrom} b USING (codename_key)
         WHERE NOT (${SAME_INPUTS}) ORDER BY t.codename`,
    )
    const [{n: novos}] = await sql.query(`SELECT COUNT(*)::int AS n FROM ${T.rankings} t WHERE NOT EXISTS (SELECT 1 FROM ${rFrom} b WHERE b.codename_key = t.codename_key)`)
    console.log(`\nRollback "${tag}": ${diff.length} linha(s) voltariam para a nota do backup.`)
    for (const d of diff) console.log(`  ${d.codename.padEnd(17)} ${fmt(d.agora)} → ${fmt(d.backup)}`)
    if (resubmitted.length > 0) {
        console.log(
            `\n  ⚠ ${resubmitted.length} agente(s) reenviaram o status depois do backup e NÃO serão tocados ` +
                `(stats/AP novos, nota já coerente com eles): ${resubmitted.map((r) => r.codename).join(', ')}`,
        )
    }
    if (novos > 0) console.log(`\n  ⚠ ${novos} agente(s) foram criados DEPOIS do backup e não serão tocados (ficam com a nota da escala em que foram gravados).`)

    if (!APPLY) {
        console.log(`\nDry-run. Para restaurar: --rollback ${tag} --apply`)
        return
    }
    await sql.transaction([
        sql.query(
            `UPDATE ${T.rankings} t SET overall_score = b.overall_score, axis_scores = b.axis_scores
             FROM ${rFrom} b WHERE t.codename_key = b.codename_key AND ${SAME_INPUTS}`,
        ),
        sql.query(
            `UPDATE ${T.history} t SET overall_score = b.overall_score, axis_scores = b.axis_scores
             FROM ${hFrom} b WHERE t.id = b.id`,
        ),
    ])
    const [chk] = await sql.query(
        `SELECT COUNT(*)::int AS n FROM ${T.rankings} t JOIN ${rFrom} b USING (codename_key)
         WHERE ${SAME_INPUTS} AND (t.overall_score IS DISTINCT FROM b.overall_score OR t.axis_scores IS DISTINCT FROM b.axis_scores)`,
    )
    if (chk.n !== 0) die(`Verificação do rollback: ${chk.n} linha(s) ainda diferem do backup.`)
    console.log('\n✔ Rollback aplicado e verificado. Lembre de reverter também o deploy do código (git revert) — senão os próximos envios voltam a gravar na escala log₂.')
}

// ────────────────────────────────────────────────────────────────── main

if (BACKUP_TAG) {
    await doBackup(BACKUP_TAG)
} else if (ROLLBACK_TAG) {
    await doRollback(ROLLBACK_TAG)
} else if (APPLY_TAG) {
    await doApply(APPLY_TAG)
} else {
    printPlan(await loadPlan())
    console.log('\nDry-run — nada foi gravado. Próximos passos: --backup <tag>, depois --apply <tag>.')
}
