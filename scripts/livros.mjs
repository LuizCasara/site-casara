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
import {createInterface} from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {writeFileSync, readFileSync as lerArquivo, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {buscarMetadados} from '../lib/book-sources/index.mjs';
import {baixarCapa} from '../lib/book-cover.mjs';
import {slugify, normalizeTag, tagKey} from '../lib/book-utils.mjs';
import {CATEGORY_IDS} from '../lib/book-categories.mjs';

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

const rl = () => createInterface({input: process.stdin, output: process.stdout});

/** Pergunta com valor padrão. Enter vazio aceita o padrão. */
async function perguntar(io, rotulo, padrao = '') {
    const sufixo = padrao ? ` [${padrao}]` : '';
    const resposta = (await io.question(`${rotulo}${sufixo}: `)).trim();
    return resposta || padrao;
}

async function confirmar(io, rotulo) {
    const r = (await io.question(`${rotulo} (s/N): `)).trim().toLowerCase();
    return r === 's' || r === 'sim';
}

/**
 * Pergunta a categoria e repete até ser uma das `CATEGORY_IDS` conhecidas.
 * Usada por `comandoAdd` e `comandoEdit` — cada um passa seu próprio padrão
 * (a primeira categoria da lista no `add`, a categoria atual do livro no
 * `edit`), mas o texto da pergunta e do erro é sempre o mesmo.
 */
async function perguntarCategoria(io, padrao) {
    let category = await perguntar(io, 'Categoria', padrao);
    while (!CATEGORY_IDS.includes(category)) {
        console.log(`"${category}" não existe. Escolha uma de: ${CATEGORY_IDS.join(', ')}`);
        category = await perguntar(io, 'Categoria', padrao);
    }
    return category;
}

/** Pergunta o status e repete até ser "lendo" ou "lido". */
async function perguntarStatus(io, padrao) {
    let status = await perguntar(io, 'Status (lendo/lido)', padrao);
    while (status !== 'lendo' && status !== 'lido') {
        status = await perguntar(io, 'Status precisa ser "lendo" ou "lido"', padrao);
    }
    return status;
}

/**
 * Pergunta o progresso (0-100, inteiro) e repete até ser válido. Quem chama
 * decide SE pergunta — só faz sentido quando o status é "lendo".
 *
 * Validado no cliente com reprompt pelo mesmo motivo do `perguntarNota`
 * abaixo: sem isso, um valor fora do CHECK do Postgres (`progress_pct`
 * entre 0 e 100) só falha depois de todo o resto já ter sido respondido —
 * no `add`, depois até da capa já ter sido baixada — jogando fora todo esse
 * trabalho com uma stack trace crua do driver.
 */
async function perguntarProgresso(io, padrao) {
    let bruto = await perguntar(io, 'Progresso (0-100)', padrao);
    let numero = Number(bruto);
    while (!Number.isInteger(numero) || numero < 0 || numero > 100) {
        bruto = await perguntar(io, 'Progresso precisa ser um número inteiro entre 0 e 100', padrao);
        numero = Number(bruto);
    }
    return numero;
}

/**
 * Pergunta a nota (0-5, decimal aceito, ex. 4.5) e repete até ser válida.
 * Vazio continua significando "sem nota" — devolve `null` nesse caso, sem
 * entrar no loop de reprompt. A repergunta usa sempre padrão vazio (não o
 * padrão original), igual ao comportamento anterior em `comandoAdd`/
 * `comandoEdit`.
 */
async function perguntarNota(io, padrao) {
    let bruto = await perguntar(io, 'Nota (0 a 5, pode ser 4.5)', padrao);
    let rating = null;
    while (bruto) {
        const n = Number(bruto);
        if (!Number.isNaN(n) && n >= 0 && n <= 5) {
            rating = n;
            break;
        }
        bruto = await perguntar(io, 'Nota precisa ser um número entre 0 e 5 (ou vazio)', '');
    }
    return rating;
}

/**
 * Abre o editor para escrever a resenha em Markdown.
 * O --wait no EDITOR é obrigatório — sem ele o spawnSync retorna antes de você
 * escrever qualquer coisa e a resenha vem vazia.
 *
 * Devolve { texto, alterado } em vez de só a string: `texto` sozinho não dá
 * pra distinguir "o usuário fechou sem mexer em nada" de "o usuário escreveu
 * algo igual ao texto inicial" — comparamos com `textoInicial` (ambos
 * .trim()'ados) e deixamos o CHAMADOR decidir o que "não alterado" significa.
 * Isso importa porque o texto inicial não é sempre vazio: no `add` é um
 * cabeçalho `# Título` (não alterado = resenha vazia, vira null); no futuro
 * `edit` (Task 7) o texto inicial é a resenha JÁ SALVA do livro (não alterado
 * = manter como está, nunca apagar). A função em si não grava null nem
 * decide — só relata o fato.
 */
function abrirEditor(textoInicial = '') {
    const arquivo = join(tmpdir(), `livro-${Date.now()}.md`);
    writeFileSync(arquivo, textoInicial, 'utf8');
    const editor = process.env.EDITOR || process.env.VISUAL || 'notepad';
    spawnSync(editor, [arquivo], {stdio: 'inherit', shell: true});
    const texto = lerArquivo(arquivo, 'utf8').trim();
    try {
        unlinkSync(arquivo);
    } catch {
        // Arquivo temporário — falhar em apagar não é motivo para abortar.
    }
    return {texto, alterado: texto !== textoInicial.trim()};
}

/** Lê as tags já usadas, para o autocomplete sugerir reuso em vez de duplicata. */
async function tagsExistentes(sql) {
    const linhas = await sql`SELECT DISTINCT unnest(tags) AS tag FROM casara.books ORDER BY tag`;
    return linhas.map((l) => l.tag);
}

/**
 * Converte a entrada de tags, casando com as já existentes por chave sem
 * acento — assim "politica" digitada hoje vira "política" se essa já existir.
 */
function resolverTags(entrada, existentes) {
    const porChave = new Map(existentes.map((t) => [tagKey(t), t]));
    const vistas = new Set();
    const saida = [];
    for (const bruta of entrada.split(',')) {
        const norm = normalizeTag(bruta);
        if (!norm) continue;
        const chave = tagKey(norm);
        if (vistas.has(chave)) continue;
        vistas.add(chave);
        saida.push(porChave.get(chave) ?? norm);
    }
    return saida;
}

/** Slug livre de colisão: tenta o base, depois com ano, depois com sufixo numérico. */
async function slugLivre(sql, base, ano) {
    const candidatos = [base, ano ? `${base}-${ano}` : null].filter(Boolean);
    for (const c of candidatos) {
        const [existe] = await sql`SELECT 1 FROM casara.books WHERE slug = ${c}`;
        if (!existe) return c;
    }
    for (let i = 2; i < 100; i++) {
        const c = `${base}-${i}`;
        const [existe] = await sql`SELECT 1 FROM casara.books WHERE slug = ${c}`;
        if (!existe) return c;
    }
    throw new Error(`Não consegui gerar um slug livre a partir de "${base}"`);
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

async function comandoAdd(sql, isbn, dryRun) {
    if (!isbn) {
        console.error('Faltou o ISBN. Uso: node scripts/livros.mjs add <isbn>');
        process.exitCode = 1;
        return;
    }

    const io = rl();
    try {
        console.log(`\nBuscando ISBN ${isbn}...`);
        const meta = await buscarMetadados(isbn);

        if (meta) {
            console.log(`Encontrado em ${meta.fonte}:`);
            console.table([{
                título: meta.title, autor: meta.author, ano: meta.year,
                editora: meta.publisher, páginas: meta.pages,
                capa: meta.coverUrl ? 'sim' : 'NÃO',
            }]);
            if (meta.subjects.length) {
                console.log(`Assuntos sugeridos: ${meta.subjects.slice(0, 8).join(', ')}`);
            }
        } else {
            console.log('Não encontrado. Caindo em cadastro manual.');
        }

        // Campos faltantes são caminho normal, não erro — a Open Library é
        // especialmente incompleta para edições brasileiras.
        const title = await perguntar(io, 'Título', meta?.title ?? '');
        if (!title) {
            console.error('Título é obrigatório.');
            process.exitCode = 1;
            return;
        }
        const author = await perguntar(io, 'Autor', meta?.author ?? '');
        const year = await perguntar(io, 'Ano', meta?.year ?? '');
        const publisher = await perguntar(io, 'Editora', meta?.publisher ?? '');
        const pages = await perguntar(io, 'Páginas', meta?.pages ?? '');

        console.log(`\nCategorias: ${CATEGORY_IDS.join(', ')}`);
        const category = await perguntarCategoria(io, CATEGORY_IDS[0]);

        const jaUsadas = await tagsExistentes(sql);
        if (jaUsadas.length) console.log(`Tags já usadas: ${jaUsadas.join(', ')}`);
        const tags = resolverTags(await perguntar(io, 'Tags (separadas por vírgula)'), jaUsadas);

        const status = await perguntarStatus(io, 'lido');
        const progress = status === 'lendo' ? await perguntarProgresso(io, '0') : null;
        const rating = await perguntarNota(io, '');

        const synopsis = await perguntar(io, 'Sinopse curta (uma frase)');

        const slugBase = slugify(title);
        const slug = await slugLivre(sql, slugBase, year || null);
        if (slug !== slugBase) console.log(`Slug "${slugBase}" já existia — usando "${slug}".`);

        console.log('\nBaixando capa...');
        const {coverPath, spineColor, placeholder} =
            await baixarCapa(meta?.coverUrl ?? null, slug, category, ROOT);
        if (placeholder) {
            console.log('⚠  Sem capa real — gerei um placeholder. Troque depois em '
                + `public${coverPath}`);
        } else {
            console.log(`Capa salva em public${coverPath}, cor da lombada ${spineColor}.`);
        }

        console.log('\nAbrindo o editor para a resenha (Markdown). Salve e feche para continuar.');
        const resenha = abrirEditor(`# ${title}\n\n`);
        if (!resenha.alterado) {
            console.log('Resenha vazia — o livro entra sem texto. Use "edit" depois.');
        }

        const linha = {
            slug, isbn, title,
            author: author || null,
            year: year ? Number(year) : null,
            publisher: publisher || null,
            pages: pages ? Number(pages) : null,
            synopsis: synopsis || null,
            cover_path: coverPath,
            spine_color: spineColor,
            rating,
            category,
            tags,
            status,
            progress_pct: progress,
            review: resenha.alterado ? resenha.texto : null,
        };

        console.log('\n─── Será gravado ───');
        console.table([linha]);

        if (dryRun) {
            console.log('\n--dry-run: nada foi gravado.');
            return;
        }
        if (!await confirmar(io, '\nGravar no banco de PRODUÇÃO?')) {
            console.log('Cancelado. Nada foi gravado.');
            return;
        }

        await sql`
            INSERT INTO casara.books
                (slug, isbn, title, author, year, publisher, pages, synopsis,
                 cover_path, spine_color, rating, category, tags, status,
                 progress_pct, review)
            VALUES (${linha.slug}, ${linha.isbn}, ${linha.title}, ${linha.author},
                    ${linha.year}, ${linha.publisher}, ${linha.pages}, ${linha.synopsis},
                    ${linha.cover_path}, ${linha.spine_color}, ${linha.rating},
                    ${linha.category}, ${linha.tags}, ${linha.status},
                    ${linha.progress_pct}, ${linha.review})`;

        console.log(`✅ Gravado. Veja em /livros/${slug}`);
    } finally {
        io.close();
    }
}

async function comandoEdit(sql, slug) {
    if (!slug) {
        console.error('Faltou o slug. Uso: node scripts/livros.mjs edit <slug>');
        process.exitCode = 1;
        return;
    }

    const [livro] = await sql`SELECT * FROM casara.books WHERE slug = ${slug}`;
    if (!livro) {
        console.error(`Não achei nenhum livro com slug "${slug}". Veja: livros.mjs list`);
        process.exitCode = 1;
        return;
    }

    const io = rl();
    try {
        console.log(`\nEditando "${livro.title}". Enter mantém o valor atual.`);

        const title = await perguntar(io, 'Título', livro.title);
        const author = await perguntar(io, 'Autor', livro.author ?? '');

        const category = await perguntarCategoria(io, livro.category);

        const jaUsadas = await tagsExistentes(sql);
        const tags = resolverTags(
            await perguntar(io, 'Tags', (livro.tags ?? []).join(', ')), jaUsadas);

        const status = await perguntarStatus(io, livro.status);

        // O padrão aqui é sempre o valor atual do livro (já passou pelo
        // CHECK do Postgres quando foi gravado), então aceitar com Enter
        // nunca cai em reprompt — só entradas novas e inválidas caem.
        const progress = status === 'lendo'
            ? await perguntarProgresso(io, String(livro.progress_pct ?? 0))
            : null;
        const rating = await perguntarNota(io, livro.rating != null ? String(livro.rating) : '');

        const synopsis = await perguntar(io, 'Sinopse', livro.synopsis ?? '');

        // review começa como a resenha já salva — só muda se o editor for
        // aberto E o conteúdo for de fato alterado. "Abriu e fechou sem
        // mexer" NUNCA apaga a resenha existente (ver comentário de
        // abrirEditor). Vazio-intencional (o usuário apagou tudo e salvou)
        // é a única forma de `review` virar null aqui.
        let review = livro.review;
        if (await confirmar(io, 'Abrir o editor para a resenha?')) {
            const resenha = abrirEditor(livro.review ?? `# ${title}\n\n`);
            if (resenha.alterado) {
                review = resenha.texto || null;
            }
        }

        console.log('\n─── Será atualizado ───');
        console.table([{slug, title, author, category, tags: tags.join(', '),
            status, progress_pct: progress, rating,
            resenha: review ? `${review.length} caracteres` : '(vazia)'}]);

        if (!await confirmar(io, '\nAtualizar no banco de PRODUÇÃO?')) {
            console.log('Cancelado. Nada foi alterado.');
            return;
        }

        // UPDATE sempre por slug — nunca por id ou posição.
        await sql`
            UPDATE casara.books
            SET title        = ${title},
                author       = ${author || null},
                rating       = ${rating},
                synopsis     = ${synopsis || null},
                category     = ${category},
                tags         = ${tags},
                status       = ${status},
                progress_pct = ${progress},
                review       = ${review},
                updated_at   = NOW()
            WHERE slug = ${slug}`;

        console.log(`✅ Atualizado. Veja em /livros/${slug}`);
    } finally {
        io.close();
    }
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
        case 'add': {
            const sql = abrirBanco();
            await comandoAdd(sql, argumento, process.argv.includes('--dry-run'));
            break;
        }
        case 'edit': {
            const sql = abrirBanco();
            await comandoEdit(sql, argumento);
            break;
        }
        default:
            console.error(`Comando desconhecido: ${comando}`);
            console.log(AJUDA);
            process.exitCode = 1;
    }
}

await main();
