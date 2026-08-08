/**
 * Aplica `pages` (estimadas) e `finished_at` (data de leitura) a partir de
 * scripts/seed/leitura.json.
 *
 * Escreve em PRODUÇÃO, igual a scripts/livros.mjs — por isso é dry-run por
 * padrão: sem `--apply` ele só imprime a tabela do que faria. Com `--apply`,
 * mostra a mesma tabela e pede confirmação antes de gravar.
 *
 *   node scripts/aplicar-leitura.mjs            # prévia, não grava nada
 *   node scripts/aplicar-leitura.mjs --apply    # grava, com confirmação
 *
 * Casa por TÍTULO e não por slug, pelo mesmo motivo do `seed` em
 * scripts/livros.mjs: o slug gravado pode ter ganhado sufixo em caso de
 * colisão e nunca mais bater com slugify(title).
 *
 * Idempotente nos dois campos: `pages` só é preenchido onde está NULL (nunca
 * sobrescreve o que a Open Library trouxe), e `finished_at` é recalculado
 * sempre — ele é derivado inteiro do JSON, então rodar de novo depois de
 * corrigir a ordem de leitura é a forma prevista de consertar.
 */

import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {neon} from '@neondatabase/serverless';
import {distribuirMeses} from '../lib/reading-dates.mjs';

const APLICAR = process.argv.includes('--apply');

function abrirBanco() {
    const url = readFileSync('.env.local', 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='))
        ?.slice('DATABASE_URL='.length)
        .replace(/^["']|["']$/g, '');
    if (!url) throw new Error('DATABASE_URL não encontrado em .env.local');
    return neon(url);
}

const dados = JSON.parse(readFileSync('scripts/seed/leitura.json', 'utf8'));
const sql = abrirBanco();

const doBanco = await sql`SELECT slug, title, pages FROM casara.books`;
const porTitulo = new Map(doBanco.map((l) => [l.title, l]));

// Mês limite do ano corrente: nada pode ser dado como lido no futuro.
const hoje = new Date();
const anoCorrente = hoje.getFullYear();
const mesCorrente = hoje.getMonth() + 1;

const planejado = [];
const ausentes = [];

for (const [anoStr, titulos] of Object.entries(dados.anos)) {
    const ano = Number(anoStr);

    const livros = titulos.map((title) => {
        const linha = porTitulo.get(title);
        if (!linha) {
            ausentes.push({ano, title});
            return null;
        }
        // A página que vale é a do banco quando existe; a estimativa só entra
        // no buraco. `pages` alimenta tanto a distribuição de meses aqui
        // quanto a espessura da lombada na sala 3D.
        const pages = linha.pages ?? dados.paginas_estimadas[title] ?? null;
        return {title, slug: linha.slug, pages, paginaEraNula: linha.pages == null};
    }).filter(Boolean);

    const limite = ano === anoCorrente ? mesCorrente : 12;
    planejado.push(...distribuirMeses(livros, ano, limite));
}

console.table(planejado.map((l) => ({
    ano: l.ano,
    data: l.finished_at,
    páginas: l.pages,
    origem_páginas: l.paginaEraNula ? 'estimada' : 'Open Library',
    título: l.title.length > 42 ? `${l.title.slice(0, 41)}…` : l.title,
})));

if (ausentes.length) {
    console.log('\n⚠ Títulos do leitura.json que NÃO existem no banco (nada será feito com eles):');
    for (const a of ausentes) console.log(`   ${a.ano}: ${a.title}`);
    console.log('   Cadastre-os antes (scripts/livros.mjs add / seed) e rode de novo.');
}

const vaiEstimar = planejado.filter((l) => l.paginaEraNula).length;
console.log(`\n${planejado.length} livros datados · ${vaiEstimar} ganham páginas estimadas · ${ausentes.length} ausentes`);

if (!APLICAR) {
    console.log('\nDry-run — nada foi gravado. Rode com --apply para gravar em produção.');
    process.exit(0);
}

const io = createInterface({input: process.stdin, output: process.stdout});
const resposta = await io.question('\nGravar isso em PRODUÇÃO? (s/N) ');
io.close();
if (resposta.trim().toLowerCase() !== 's') {
    console.log('Cancelado, nada foi gravado.');
    process.exit(0);
}

let gravados = 0;
for (const l of planejado) {
    await sql`
        UPDATE casara.books
        SET finished_at = ${l.finished_at}::date,
            pages       = COALESCE(pages, ${l.pages}),
            updated_at  = NOW()
        WHERE slug = ${l.slug}
    `;
    gravados++;
}

console.log(`\n${gravados} livros atualizados.`);
