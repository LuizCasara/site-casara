/**
 * CLI do acervo de livros.
 *
 * Uso:  node scripts/livros.mjs list
 *       node scripts/livros.mjs add <isbn> [--dry-run]
 *       node scripts/livros.mjs edit <slug>
 *
 * Roda APENAS na máquina do Luiz. O site não tem rota de admin nem sessão —
 * isso foi requisito explícito: zero superfície de ataque pública.
 *
 * ATENÇÃO: este script escreve no banco de PRODUÇÃO. Não existe staging.
 * Nada é gravado sem confirmação explícita com o resumo à vista.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {neon} from '@neondatabase/serverless';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function abrirBanco() {
    const url = readFileSync(join(ROOT, '.env.local'), 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='))
        ?.slice('DATABASE_URL='.length)
        .replace(/^["']|["']$/g, '');
    if (!url) throw new Error('DATABASE_URL não encontrado em .env.local');
    return neon(url);
}

const AJUDA = `
Acervo de livros — luizcasara.com

  node scripts/livros.mjs list
  node scripts/livros.mjs add <isbn> [--dry-run]
  node scripts/livros.mjs edit <slug>

O 'add' e o 'edit' abrem seu editor para escrever a resenha em Markdown.
Configure a variável de ambiente EDITOR — e NÃO ESQUEÇA do --wait, senão o
editor retorna na hora e o script grava um texto vazio:

  PowerShell:  $env:EDITOR = 'code --wait'
  VS Code:     code --wait
  IntelliJ:    idea --wait
  Notepad++:   notepad++ -multiInst -nosession

Sem EDITOR configurado, cai no notepad do Windows (que já espera por padrão).
`;

async function comandoList(sql) {
    const livros = await sql`
        SELECT slug, title, author, category, status, rating, pages
        FROM casara.books
        ORDER BY status, title`;

    if (!livros.length) {
        console.log('Acervo vazio. Use: node scripts/livros.mjs add <isbn>');
        return;
    }

    console.table(livros.map((l) => ({
        slug: l.slug,
        título: l.title,
        autor: l.author,
        categoria: l.category,
        status: l.status,
        nota: l.rating,
        págs: l.pages,
    })));
    console.log(`${livros.length} livro(s).`);
}

async function main() {
    const [, , comando, argumento] = process.argv;

    if (!comando || comando === '--help' || comando === '-h') {
        console.log(AJUDA);
        return;
    }

    switch (comando) {
        case 'list': {
            const sql = abrirBanco();
            await comandoList(sql);
            break;
        }
        default:
            console.error(`Comando desconhecido: ${comando}`);
            console.log(AJUDA);
            process.exitCode = 1;
    }
}

await main();
