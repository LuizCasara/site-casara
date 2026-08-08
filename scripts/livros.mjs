/**
 * CLI do acervo de livros.
 *
 * Uso:  node scripts/livros.mjs list
 *       node scripts/livros.mjs add <isbn> [--dry-run]
 *       node scripts/livros.mjs edit <slug>
 *       node scripts/livros.mjs seed [--limit N] [--apply] [--incluir-revisar]
 *
 * Roda APENAS na máquina do Luiz. O site não tem rota de admin nem sessão —
 * isso foi requisito explícito: zero superfície de ataque pública.
 *
 * ATENÇÃO: este script escreve no banco de PRODUÇÃO. Não existe staging.
 * Nada é gravado sem confirmação explícita com o resumo à vista.
 */
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {neon} from '@neondatabase/serverless';
import {createInterface} from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {writeFileSync, readFileSync as lerArquivo, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {buscarMetadados} from '../lib/book-sources/index.mjs';
import {buscarComRetentativa} from '../lib/book-sources/openlibrary-search.mjs';
import {baixarCapa, capaDaAmazon} from '../lib/book-cover.mjs';
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

/**
 * Os quatro status possíveis, e o que cada um significa na sala 3D. A mesma
 * lista está no CHECK da coluna (lib/schema.sql) — se divergirem, o banco
 * recusa a linha na hora do INSERT, que é o comportamento certo.
 */
const STATUS_VALIDOS = ['lendo', 'lido', 'quero-ler', 'referencia'];

/** Pergunta o status e repete até ser um dos válidos. */
async function perguntarStatus(io, padrao) {
    const lista = STATUS_VALIDOS.join('/');
    let status = await perguntar(io, `Status (${lista})`, padrao);
    while (!STATUS_VALIDOS.includes(status)) {
        status = await perguntar(io, `Status precisa ser um de: ${lista}`, padrao);
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
 * O `progress_pct` que corresponde ao status — só 'lendo' é perguntado.
 *
 * 'lido' é 100 por definição: deixá-lo nulo obrigava quem lê o dado a saber
 * que "sem progresso + status lido" significa "terminado", o que é uma regra
 * implícita a mais para um número que já podemos escrever. Os outros dois
 * status não têm progresso nenhum a registrar — um livro que você ainda quer
 * ler não está 0% lido, está fora da conta.
 */
async function resolverProgresso(io, status, padrao) {
    if (status === 'lendo') return perguntarProgresso(io, padrao);
    return status === 'lido' ? 100 : null;
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
 * Pergunta um inteiro positivo opcional (ano, páginas) e repete até ser
 * válido. Vazio sempre significa "sem valor" -> `null`, sem entrar no loop de
 * reprompt — mesmo padrão de `perguntarNota` acima: reprompt só acontece
 * depois de uma entrada NÃO vazia e inválida, e usa sempre padrão vazio (não
 * o padrão original) nas repetições.
 */
async function perguntarInteiroOpcional(io, rotulo, padrao) {
    let bruto = await perguntar(io, rotulo, padrao);
    while (bruto) {
        const n = Number(bruto);
        if (Number.isInteger(n) && n > 0) return n;
        bruto = await perguntar(io, `${rotulo} precisa ser um número inteiro positivo (ou vazio)`, '');
    }
    return null;
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

/**
 * Slugs que nunca podem ser atribuídos a um livro, mesmo que estejam livres
 * no banco: colidiriam com uma rota estática ou com o diretório de assets.
 * "lista" é `app/livros/lista/page.tsx` — o Next resolve a rota estática
 * antes da dinâmica `[slug]`, então um livro com esse slug ficaria inacessível
 * para sempre. "capas" é `public/livros/capas/`, o diretório onde as próprias
 * imagens de capa são salvas. Tratados como "já ocupados" para caírem no
 * mesmo mecanismo de sufixo usado para colisão real.
 */
const SLUGS_RESERVADOS = new Set(['lista', 'capas']);

/** Slug livre de colisão: tenta o base, depois com ano, depois com sufixo numérico. */
async function slugLivre(sql, base, ano) {
    async function ocupado(c) {
        if (SLUGS_RESERVADOS.has(c)) return true;
        const [existe] = await sql`SELECT 1 FROM casara.books WHERE slug = ${c}`;
        return Boolean(existe);
    }

    const candidatos = [base, ano ? `${base}-${ano}` : null].filter(Boolean);
    for (const c of candidatos) {
        if (!(await ocupado(c))) return c;
    }
    for (let i = 2; i < 100; i++) {
        const c = `${base}-${i}`;
        if (!(await ocupado(c))) return c;
    }
    throw new Error(`Não consegui gerar um slug livre a partir de "${base}"`);
}

const AJUDA = `
Acervo de livros — luizcasara.com

  node scripts/livros.mjs list
  node scripts/livros.mjs add <isbn> [--dry-run]
  node scripts/livros.mjs edit <slug>
  node scripts/livros.mjs capa <slug> [url] [--dry-run]
  node scripts/livros.mjs seed [--limit N] [--apply] [--incluir-revisar]

O 'capa' troca a capa de um livro já cadastrado e recalcula a cor da lombada —
é o conserto para os livros que ficaram com capa placeholder. Sem a url, ele
tenta a capa da Amazon deduzida do ISBN gravado.

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
        const progress = await resolverProgresso(io, status, '0');
        const rating = await perguntarNota(io, '');

        // 2-3 frases, não uma: é o que docs/livros-proximos-passos.md definiu
        // para a sinopse escrita por IA durante o cadastro, e o que as duas
        // telas que a exibem comportam.
        const synopsis = await perguntar(io, 'Sinopse (2-3 frases, do que trata o livro)');

        const slugBase = slugify(title);
        const slug = await slugLivre(sql, slugBase, year || null);
        if (slug !== slugBase) console.log(`Slug "${slugBase}" já existia — usando "${slug}".`);

        console.log('\nBaixando capa...');
        const {coverPath, spineColor, placeholder} =
            await baixarCapa(meta?.coverUrl ?? null, slug, category, ROOT, title);
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

        // Estes quatro ficam nulos na maioria dos livros vindos do `seed` (a
        // Open Library falha para a maioria das edições brasileiras — ver
        // CLAUDE.md), e até agora o `edit` não tinha como preenchê-los: o
        // único jeito era SQL cru contra produção. Mesmo estilo de pergunta
        // dos demais campos, Enter mantém o valor atual.
        const year = await perguntarInteiroOpcional(io, 'Ano', livro.year != null ? String(livro.year) : '');
        const publisher = await perguntar(io, 'Editora', livro.publisher ?? '');
        const pages = await perguntarInteiroOpcional(io, 'Páginas', livro.pages != null ? String(livro.pages) : '');
        const isbn = await perguntar(io, 'ISBN', livro.isbn ?? '');

        const category = await perguntarCategoria(io, livro.category);

        const jaUsadas = await tagsExistentes(sql);
        const tags = resolverTags(
            await perguntar(io, 'Tags', (livro.tags ?? []).join(', ')), jaUsadas);

        const status = await perguntarStatus(io, livro.status);

        // O padrão aqui é sempre o valor atual do livro (já passou pelo
        // CHECK do Postgres quando foi gravado), então aceitar com Enter
        // nunca cai em reprompt — só entradas novas e inválidas caem.
        const progress = await resolverProgresso(io, status, String(livro.progress_pct ?? 0));
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
        console.table([{slug, title, author, ano: year, editora: publisher,
            páginas: pages, isbn, category, tags: tags.join(', '),
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
                year         = ${year},
                publisher    = ${publisher || null},
                pages        = ${pages},
                isbn         = ${isbn || null},
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

/**
 * Troca a capa de um livro já cadastrado e recalcula a cor da lombada.
 *
 * Existe porque capa placeholder é ROTINA, não exceção: a Open Library não tem
 * a maioria das edições brasileiras, e até aqui o único conserto era trocar o
 * JPG na mão em public/livros/capas/ — o que deixava `spine_color` com a cor
 * genérica da categoria para sempre, já que só o cadastro a calculava. A cor
 * da lombada é o que a estante 3D desenha, então a sala continuava errada
 * mesmo depois de a capa certa estar no disco.
 *
 * Sem `url`, tenta a Amazon a partir do ISBN gravado (ver `capaDaAmazon`).
 */
async function comandoCapa(sql, slug, url, dryRun) {
    if (!slug) {
        console.error('Faltou o slug. Uso: node scripts/livros.mjs capa <slug> [url]');
        process.exitCode = 1;
        return;
    }

    const [livro] = await sql`
        SELECT slug, title, isbn, category, spine_color FROM casara.books WHERE slug = ${slug}`;
    if (!livro) {
        console.error(`Não achei nenhum livro com slug "${slug}". Veja: livros.mjs list`);
        process.exitCode = 1;
        return;
    }

    const origem = url ?? capaDaAmazon(livro.isbn);
    if (!origem) {
        console.error(`"${livro.title}" não tem ISBN-13 gravado, então não dá para deduzir a `
            + 'capa da Amazon. Passe a URL: livros.mjs capa <slug> <url>');
        process.exitCode = 1;
        return;
    }
    console.log(`\n${livro.title}\n  de: ${origem}${url ? '' : '  (deduzida do ISBN)'}`);

    // O arquivo é guardado ANTES do download porque baixarCapa escreve o
    // placeholder por cima quando a origem falha — sem isto, apontar para uma
    // URL ruim destruiria uma capa boa que já estava lá.
    const destino = join(ROOT, 'public', 'livros', 'capas', `${slug}.jpg`);
    const anterior = existsSync(destino) ? lerArquivo(destino) : null;

    const {coverPath, spineColor, placeholder} =
        await baixarCapa(origem, slug, livro.category, ROOT, livro.title);

    if (placeholder) {
        if (anterior) writeFileSync(destino, anterior);
        console.error('\n✗ A URL não devolveu uma imagem de capa utilizável (a Amazon responde '
            + '200 com\n  um GIF de 43 bytes quando não tem a capa). Nada foi alterado.');
        process.exitCode = 1;
        return;
    }

    console.log(`\n─── Será atualizado ───`);
    console.table([{
        slug,
        arquivo: `public${coverPath}`,
        lombada_antes: livro.spine_color,
        lombada_depois: spineColor,
    }]);

    // Mesma convenção do `seed`: o dry-run é do BANCO, não do disco. O JPG novo
    // já está gravado, e é assim que se confere a capa antes de assumir a cor.
    if (dryRun) {
        console.log('\n--dry-run: o JPG foi trocado, mas spine_color NÃO foi atualizado no banco.');
        console.log(`   Olhe public${coverPath} e rode de novo sem --dry-run para confirmar.`);
        return;
    }

    const io = rl();
    try {
        if (!await confirmar(io, '\nAtualizar spine_color no banco de PRODUÇÃO?')) {
            console.log('Cancelado. O JPG novo ficou no disco, mas o banco não mudou.');
            return;
        }
    } finally {
        io.close();
    }

    await sql`
        UPDATE casara.books
        SET spine_color = ${spineColor}, updated_at = NOW()
        WHERE slug = ${slug}`;

    console.log(`✅ Atualizado. Lembre do commit: a capa só aparece no site depois do deploy.`);
}

/** Pausa entre requisições — a Open Library não gosta de rajada. */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function comandoSeed(sql, {limite, apply, incluirRevisar}) {
    const arquivo = join(ROOT, 'scripts', 'seed', 'acervo.json');
    const {livros} = JSON.parse(lerArquivo(arquivo, 'utf8'));

    // Validação antes de qualquer rede: um valor inválido no arquivo é erro
    // de digitação, e é melhor descobrir agora do que no livro 40 — depois de
    // 29 já terem sido gravados, o laço parar no meio (rejeição do CHECK do
    // Postgres) e sobrar capa órfã no disco. As três validações (categoria,
    // status, nota) seguem o mesmo formato de mensagem.
    const invalidos = livros.filter((l) => !CATEGORY_IDS.includes(l.category));
    if (invalidos.length) {
        console.error('Categorias inválidas no acervo.json:');
        for (const l of invalidos) console.error(`  ${l.title} -> "${l.category}"`);
        console.error(`Válidas: ${CATEGORY_IDS.join(', ')}`);
        process.exitCode = 1;
        return;
    }

    const statusInvalidos = livros.filter((l) => l.status !== 'lendo' && l.status !== 'lido');
    if (statusInvalidos.length) {
        console.error('Status inválidos no acervo.json:');
        for (const l of statusInvalidos) console.error(`  ${l.title} -> ${JSON.stringify(l.status)}`);
        console.error('Válidos: lendo, lido');
        process.exitCode = 1;
        return;
    }

    const ratingInvalidos = livros.filter((l) =>
        l.rating != null && (typeof l.rating !== 'number' || l.rating < 0 || l.rating > 5));
    if (ratingInvalidos.length) {
        console.error('Notas inválidas no acervo.json:');
        for (const l of ratingInvalidos) console.error(`  ${l.title} -> ${JSON.stringify(l.rating)}`);
        console.error('Válidas: número entre 0 e 5, ou ausente (sem nota)');
        process.exitCode = 1;
        return;
    }

    // Comparamos por TÍTULO, não por slug. O slug de fato gravado vem de
    // slugLivre(), que em caso de colisão devolve "<base>-<ano>" ou
    // "<base>-2" — nunca slugify(title) puro. Se um livro foi gravado como
    // "duna-1965", na próxima execução slugify(title) produz "duna", que não
    // bate com nada no banco, e o livro seria importado de novo, duplicado.
    // O título é o campo estável do qual o acervo.json é fonte da verdade.
    const jaExistem = new Set(
        (await sql`SELECT title FROM casara.books`).map((l) => l.title));

    let fila = livros.filter((l) => !jaExistem.has(l.title));
    if (!incluirRevisar) {
        const pulados = fila.filter((l) => l._revisar);
        for (const l of pulados) {
            console.log(`⊘ pulando "${l.title}" — ${l._revisar}`);
        }
        fila = fila.filter((l) => !l._revisar);
    }
    if (limite) fila = fila.slice(0, limite);

    if (!fila.length) {
        console.log('Nada a importar. Todos os livros do acervo.json já estão no banco.');
        return;
    }

    // Confirmação ANTES da rodada de rede — não depois, com o resumo
    // completo à vista como em add/edit. Para o seed, montar o resumo
    // completo (achou/capa/págs/ano) exige buscar cada livro na Open Library
    // e baixar cada capa, que é justamente o trabalho que uma resposta "não"
    // deveria evitar. Título e contagem, que já temos sem rede nenhuma, são
    // suficientes para a decisão de "gravar ou não" — é o que este bloco
    // mostra. O readline só é aberto aqui, quando --apply está presente:
    // um dry-run não pergunta nada, então não precisa do handle.
    if (apply) {
        const nomes = fila.slice(0, 20).map((l) => `  - ${l.title}`).join('\n');
        const resto = fila.length > 20 ? `\n  ... e mais ${fila.length - 20}` : '';
        console.log(`\nSerão importados ${fila.length} livro(s):\n${nomes}${resto}`);

        const io = rl();
        let confirmado;
        try {
            confirmado = await confirmar(io, `\nImportar ${fila.length} livro(s) no banco de PRODUÇÃO?`);
        } finally {
            io.close();
        }
        if (!confirmado) {
            console.log('Cancelado. Nada foi gravado.');
            return;
        }
    }

    console.log(`\nImportando ${fila.length} livro(s)${apply ? '' : ' (DRY-RUN)'}...\n`);
    const jaUsadas = await tagsExistentes(sql);
    const resumo = [];

    for (const livro of fila) {
        const {resultado: encontrado, falhouRede} =
            await buscarComRetentativa(livro.title, livro.author);
        await dormir(400);

        const slug = await slugLivre(sql, slugify(livro.title), encontrado?.year ?? null);
        const tags = resolverTags((livro.tags ?? []).join(','), jaUsadas);
        // jaUsadas precisa crescer dentro do próprio loop: se dois livros do
        // mesmo lote introduzem a mesma tag nova com grafia diferente, o
        // segundo só a casa com a canônica do primeiro se ela já estiver
        // aqui — buscar isso do banco de novo a cada iteração seria uma
        // query por livro só pra isso, então só empilha localmente.
        for (const tag of tags) {
            if (!jaUsadas.includes(tag)) jaUsadas.push(tag);
        }

        const {coverPath, spineColor, placeholder} =
            await baixarCapa(encontrado?.coverUrl ?? null, slug, livro.category, ROOT, livro.title);

        const linha = {
            slug,
            title: livro.title,
            author: livro.author ?? null,
            year: encontrado?.year ?? null,
            pages: encontrado?.pages ?? null,
            cover_path: coverPath,
            spine_color: spineColor,
            rating: livro.rating ?? null,
            category: livro.category,
            tags,
            status: livro.status,
            progress_pct: livro.status === 'lendo' ? (livro.progress_pct ?? 0) : null,
        };

        resumo.push({
            título: livro.title,
            slug,
            // Distinto de "sim"/"NÃO": uma falha de rede não é o mesmo que a
            // Open Library responder e não ter o livro — ver buscarComRetentativa.
            achou: falhouRede ? 'ERRO DE REDE' : (encontrado ? 'sim' : 'NÃO'),
            capa: placeholder ? 'placeholder' : 'real',
            págs: linha.pages ?? '—',
            ano: linha.year ?? '—',
        });

        // Livro com falha de rede NÃO é gravado, mesmo com --apply — de
        // propósito. Se ele entrasse no banco assim (com year/pages/capa
        // vazios), a checagem de idempotência por título (acima) o
        // consideraria "já importado" para sempre, e o aviso de "rode de
        // novo" logo abaixo seria uma mentira: rodar de novo não faria nada.
        // Ficando de fora do banco, ele continua elegível e a próxima
        // execução tenta buscá-lo de novo automaticamente.
        if (apply && !falhouRede) {
            await sql`
                INSERT INTO casara.books
                    (slug, title, author, year, pages, cover_path, spine_color,
                     rating, category, tags, status, progress_pct)
                VALUES (${linha.slug}, ${linha.title}, ${linha.author}, ${linha.year},
                        ${linha.pages}, ${linha.cover_path}, ${linha.spine_color},
                        ${linha.rating}, ${linha.category}, ${linha.tags},
                        ${linha.status}, ${linha.progress_pct})`;
            console.log(`  ✓ ${livro.title}`);
        } else if (apply && falhouRede) {
            console.log(`  ✗ ${livro.title} — NÃO gravado (falha de rede), tente de novo depois`);
        } else {
            console.log(`  · ${livro.title}`);
        }
    }

    console.table(resumo);

    const semCapa = resumo.filter((r) => r.capa === 'placeholder');
    if (semCapa.length) {
        console.log(`\n⚠  ${semCapa.length} livro(s) ficaram com capa placeholder.`);
        console.log('   Coloque o JPG certo em public/livros/capas/<slug>.jpg (mesmo nome).');
    }

    const falhasRede = resumo.filter((r) => r.achou === 'ERRO DE REDE');
    const importados = resumo.filter((r) => r.achou !== 'ERRO DE REDE').length;

    if (!apply) {
        console.log('\nDRY-RUN: nada foi gravado NO BANCO. Rode com --apply para importar.');
        console.log('   Atenção: as capas JÁ foram baixadas para public/livros/capas/ —');
        console.log('   isso é intencional, é como você descobre quais ficaram placeholder');
        console.log('   antes de gravar. O dry-run é do banco, não do disco.');
    } else {
        console.log(`\n✅ ${importados} livro(s) importado(s). As resenhas entram depois, com "edit".`);
    }

    if (falhasRede.length) {
        console.log(`\n⚠  ${falhasRede.length} livro(s) falharam por ERRO DE REDE (diferente de `
            + '"não encontrado" — a Open Library pode nem ter sido consultada de fato):');
        for (const r of falhasRede) console.log(`   - ${r.título}`);
        console.log('   Eles NÃO foram gravados no banco. Rode o comando de novo (mesmos');
        console.log('   argumentos) para tentar buscá-los de novo — a fila os inclui automaticamente.');
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
        case 'capa': {
            // A URL é o 2º argumento posicional e é OPCIONAL — sem ela, o
            // comando deduz a da Amazon pelo ISBN. Filtramos as flags para que
            // `capa <slug> --dry-run` não tome "--dry-run" como sendo a URL.
            const url = process.argv[4]?.startsWith('--') ? undefined : process.argv[4];
            const sql = abrirBanco();
            await comandoCapa(sql, argumento, url, process.argv.includes('--dry-run'));
            break;
        }
        case 'seed': {
            // Validado ANTES de abrir o banco: --limit inválido (NaN, zero,
            // negativo, ou a flag sem valor nenhum) não pode virar "sem
            // limite" por acidente. Number('abc') e Number(undefined) são
            // ambos falsy o bastante para escapar de um `if (limite)`
            // ingênuo, e combinado com --apply isso gravaria o acervo
            // inteiro na primeira vez que alguém errar a digitação.
            const i = process.argv.indexOf('--limit');
            let limite = null;
            if (i > -1) {
                const bruto = process.argv[i + 1];
                const numero = Number(bruto);
                if (bruto === undefined || !Number.isInteger(numero) || numero <= 0) {
                    console.error(`--limit precisa de um número inteiro positivo. `
                        + `Recebido: ${JSON.stringify(bruto)}`);
                    process.exitCode = 1;
                    break;
                }
                limite = numero;
            }

            const sql = abrirBanco();
            await comandoSeed(sql, {
                limite,
                apply: process.argv.includes('--apply'),
                incluirRevisar: process.argv.includes('--incluir-revisar'),
            });
            break;
        }
        default:
            console.error(`Comando desconhecido: ${comando}`);
            console.log(AJUDA);
            process.exitCode = 1;
    }
}

await main();
