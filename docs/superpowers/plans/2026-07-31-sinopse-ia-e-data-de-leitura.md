# Sinopse por IA e Data de Leitura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar os campos já existentes `finished_at` (data de leitura) e `synopsis` (sinopse) de ponta a ponta no acervo de livros — CLI, ordenação padrão e UI — e popular retroativamente a sinopse dos 51 livros já cadastrados.

**Architecture:** Nenhuma migração de schema (os campos já existem). Mudanças em três camadas independentes: (1) o CLI local `scripts/livros.mjs` passa a perguntar a data de leitura; (2) `lib/books.ts` muda a ordenação padrão pra usar essa data; (3) três componentes de UI (`BookOverlay`, a página de detalhe, `BookCard`) passam a exibir sinopse+resenha no layout aprovado (sinopse discreta em cima, resenha com barra âmbar de destaque embaixo) e a data formatada. Um script pontual aplica a sinopse dos 51 livros existentes, escrita nesta conversa.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Node.js puro pro CLI (`@neondatabase/serverless`), `node --test` pros testes de lógica pura.

## Global Constraints

- Todo arquivo `.mjs` compartilhado entre o CLI e o Next fica em `lib/*.mjs` (nunca `.ts`) — é a única forma de rodar sem etapa de build (ver `lib/book-utils.mjs`).
- Toda query SQL contra `casara.books` deve qualificar o schema explicitamente — o `search_path` da conexão não inclui `casara`.
- Este projeto não tem suíte de testes de UI. Mudanças em componentes React são verificadas manualmente rodando `npm run dev` e conferindo no navegador — não pule esse passo mesmo que pareça óbvio.
- Nenhuma dependência nova, nenhuma variável de ambiente nova é necessária neste plano (decisão revista durante o brainstorming — ver spec, seção "Decisões", item 1).
- `shelf_order` (posição física na estante 3D) está fora de escopo — não mexer.

Spec completa: `docs/superpowers/specs/2026-07-31-sinopse-ia-e-data-de-leitura-design.md`

---

### Task 1: Formatadores de data de leitura em `lib/book-utils.mjs`

**Files:**
- Modify: `lib/book-utils.mjs`
- Test: `lib/book-utils.test.mjs`

**Interfaces:**
- Produces: `formatarDataLeitura(data: Date | string | null): string | null` — `"julho de 2026"`. `formatarDataLeituraAbreviada(data: Date | string | null): string | null` — `"jul/2026"`. Ambas usadas pelas Tasks 4, 5 e 6.

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `lib/book-utils.test.mjs` (depois de importar as duas funções novas no topo do arquivo, junto das já existentes):

```js
import {slugify, normalizeTag, tagKey, extractYear,
    formatarDataLeitura, formatarDataLeituraAbreviada} from './book-utils.mjs';
```

```js
test('formatarDataLeitura escreve mês por extenso e ano', () => {
    assert.equal(formatarDataLeitura('2026-07-15'), 'julho de 2026');
    assert.equal(formatarDataLeitura(new Date('2026-01-01T00:00:00.000Z')), 'janeiro de 2026');
    assert.equal(formatarDataLeitura(null), null);
    assert.equal(formatarDataLeitura('data inválida'), null);
});

test('formatarDataLeitura usa componentes UTC (finished_at é DATE do Postgres)', () => {
    // 2026-12-31T00:00:00.000Z: se a função usasse getMonth()/getFullYear()
    // locais num fuso negativo (ex. America/Sao_Paulo, UTC-3), isso viraria
    // 30 de dezembro do dia anterior — o mesmo bug que o comentário sobre
    // `finished_at` em lib/books.ts já documenta.
    assert.equal(formatarDataLeitura('2026-12-31T00:00:00.000Z'), 'dezembro de 2026');
});

test('formatarDataLeituraAbreviada escreve mês abreviado e ano', () => {
    assert.equal(formatarDataLeituraAbreviada('2026-07-15'), 'jul/2026');
    assert.equal(formatarDataLeituraAbreviada('2026-01-01'), 'jan/2026');
    assert.equal(formatarDataLeituraAbreviada(null), null);
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — `formatarDataLeitura is not a function` (ou erro de import), porque a função ainda não existe em `lib/book-utils.mjs`.

- [ ] **Step 3: Implementar as funções**

No final de `lib/book-utils.mjs`, depois de `extractYear`, adicione:

```js
const MESES_PT = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_PT_ABREV = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * "julho de 2026", a partir de uma data (Date, string ISO, ou "AAAA-MM-DD").
 * `null` se a data for nula ou inválida. Lê com getUTC*, não com os
 * getters locais — `finished_at` é uma coluna DATE do Postgres, que o
 * driver devolve como meia-noite UTC (ver comentário em lib/books.ts);
 * ler local arriscaria cair no mês anterior num fuso negativo.
 */
export function formatarDataLeitura(data) {
    if (!data) return null;
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return null;
    return `${MESES_PT[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** "jul/2026" — mesma fonte e mesma regra de fuso de formatarDataLeitura. */
export function formatarDataLeituraAbreviada(data) {
    if (!data) return null;
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return null;
    return `${MESES_PT_ABREV[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — todos os testes de `lib/book-utils.test.mjs`, incluindo os quatro novos.

- [ ] **Step 5: Commit**

```bash
git add lib/book-utils.mjs lib/book-utils.test.mjs
git commit -m "feat(livros): adiciona formatadores de data de leitura"
```

---

### Task 2: CLI pergunta a data de leitura em `add` e `edit`

**Files:**
- Modify: `scripts/livros.mjs`

**Interfaces:**
- Consumes: nenhuma interface de outra task.
- Produces: coluna `finished_at` passa a ser gravada por `add`/`edit`. Nenhuma outra task depende de código deste arquivo (o CLI não é importado por ninguém).

- [ ] **Step 1: Adicionar o helper `hojeISO` e a função `perguntarData`**

Em `scripts/livros.mjs`, logo depois da função `perguntarInteiroOpcional` (termina na linha 135, antes do comentário `/** Abre o editor... */` na linha 137), adicione:

```js
/** "AAAA-MM-DD" de hoje, no fuso local — é o padrão sugerido pra "Data de leitura". */
function hojeISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Pergunta uma data no formato AAAA-MM-DD e repete até ser válida. Vazio
 * sempre significa "sem data" -> `null`, mesmo padrão de `perguntarNota`/
 * `perguntarInteiroOpcional` acima — reprompt só depois de uma entrada NÃO
 * vazia e inválida, sempre com padrão vazio nas repetições.
 */
async function perguntarData(io, rotulo, padrao) {
    const valida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
    let bruto = await perguntar(io, rotulo, padrao);
    while (bruto) {
        if (valida(bruto)) return bruto;
        bruto = await perguntar(io, `${rotulo} precisa ser uma data AAAA-MM-DD válida (ou vazio)`, '');
    }
    return null;
}
```

- [ ] **Step 2: Verificar que o Node aceita o arquivo (sintaxe válida)**

Run: `node --check scripts/livros.mjs`
Expected: sem saída (sucesso silencioso) — confirma que as duas funções novas não têm erro de sintaxe antes de seguir.

- [ ] **Step 3: Ligar o prompt em `comandoAdd`**

Em `comandoAdd`, a linha `const rating = await perguntarNota(io, '');` é seguida por uma linha em branco e `const synopsis = await perguntar(io, 'Sinopse curta (uma frase)');`. Troque esse trecho por:

```js
        const rating = await perguntarNota(io, '');
        const finishedAt = status === 'lido'
            ? await perguntarData(io, 'Data de leitura', hojeISO())
            : null;

        const synopsis = await perguntar(io, 'Sinopse curta (uma frase)');
```

Na definição do objeto `linha` (mesma função, alguns parágrafos abaixo), adicione o campo depois de `progress_pct`:

```js
            progress_pct: progress,
            finished_at: finishedAt,
            review: resenha.alterado ? resenha.texto : null,
```

No `INSERT INTO casara.books`, adicione a coluna e o valor:

```js
        await sql`
            INSERT INTO casara.books
                (slug, isbn, title, author, year, publisher, pages, synopsis,
                 cover_path, spine_color, rating, category, tags, status,
                 progress_pct, finished_at, review)
            VALUES (${linha.slug}, ${linha.isbn}, ${linha.title}, ${linha.author},
                    ${linha.year}, ${linha.publisher}, ${linha.pages}, ${linha.synopsis},
                    ${linha.cover_path}, ${linha.spine_color}, ${linha.rating},
                    ${linha.category}, ${linha.tags}, ${linha.status},
                    ${linha.progress_pct}, ${linha.finished_at}, ${linha.review})`;
```

- [ ] **Step 4: Ligar o prompt em `comandoEdit`**

Em `comandoEdit`, a linha `const rating = await perguntarNota(io, livro.rating != null ? String(livro.rating) : '');` é seguida por uma linha em branco e `const synopsis = await perguntar(io, 'Sinopse', livro.synopsis ?? '');`. Troque esse trecho por:

```js
        const rating = await perguntarNota(io, livro.rating != null ? String(livro.rating) : '');

        // Se o status for 'lendo', a data NUNCA é perguntada nem limpa aqui —
        // o valor gravado anteriormente (se houver) é preservado até o
        // usuário editar de novo com status 'lido'. Evita apagar
        // silenciosamente um finished_at de uma leitura anterior.
        let finishedAt = livro.finished_at
            ? new Date(livro.finished_at).toISOString().slice(0, 10)
            : null;
        if (status === 'lido') {
            finishedAt = await perguntarData(io, 'Data de leitura', finishedAt ?? hojeISO());
        }

        const synopsis = await perguntar(io, 'Sinopse', livro.synopsis ?? '');
```

No `console.table` de resumo antes da confirmação (`console.table([{slug, title, ...`), adicione o campo:

```js
        console.table([{slug, title, author, ano: year, editora: publisher,
            páginas: pages, isbn, category, tags: tags.join(', '),
            status, progress_pct: progress, rating, data_leitura: finishedAt,
            resenha: review ? `${review.length} caracteres` : '(vazia)'}]);
```

No `UPDATE casara.books`, adicione a coluna:

```js
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
                finished_at  = ${finishedAt},
                review       = ${review},
                updated_at   = NOW()
            WHERE slug = ${slug}`;
```

- [ ] **Step 5: Verificar sintaxe de novo**

Run: `node --check scripts/livros.mjs`
Expected: sem saída.

- [ ] **Step 6: Testar manualmente com `--dry-run`**

Run: `node scripts/livros.mjs add 9999999999999 --dry-run`
Expected: o CLI cai em cadastro manual (ISBN inexistente). Preencha título "Teste Plano" e status `lido` quando perguntado — o prompt "Data de leitura [AAAA-MM-DD]" deve aparecer com a data de hoje como padrão. Dê Enter pra aceitar, complete o resto, e confira que `finished_at` aparece na tabela final "Será gravado" com a data de hoje. Como é `--dry-run`, nada é gravado — cancele ou deixe terminar, tanto faz.

- [ ] **Step 7: Commit**

```bash
git add scripts/livros.mjs
git commit -m "feat(livros): CLI passa a perguntar a data de leitura em add/edit"
```

---

### Task 3: Ordenação padrão por data de leitura

**Files:**
- Modify: `lib/books.ts:62`

**Interfaces:**
- Consumes: coluna `finished_at`, já existente em `casara.books` (nenhuma dependência das Tasks 1 ou 2).
- Produces: nenhuma — é o fim da cadeia, consumido pelas páginas que já chamam `listarLivros`.

- [ ] **Step 1: Trocar o `ORDER BY`**

Em `lib/books.ts`, dentro de `listarLivros`, troque:

```ts
        ORDER BY (status = 'lendo') DESC, COALESCE(shelf_order, 32767), title
```

por:

```ts
        ORDER BY (status = 'lendo') DESC, finished_at DESC NULLS LAST, title
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev` (deixe rodando) e abra `http://localhost:3000/livros/lista` no navegador.
Expected: a página carrega sem erro. Como nenhum livro tem `finished_at` ainda (Task 7 ainda não rodou), a ordenação cai inteira no fallback `title` — a lista deve continuar em ordem alfabética por enquanto, sem quebrar nada. Depois que a Task 7 rodar, volte nessa URL e confirme que os livros com data aparecem antes dos sem data, do mais recente pro mais antigo.

- [ ] **Step 3: Commit**

```bash
git add lib/books.ts
git commit -m "feat(livros): ordena a listagem por data de leitura, mais recente primeiro"
```

---

### Task 4: Sinopse + resenha destacada no `BookOverlay` (popup da sala 3D)

**Files:**
- Modify: `components/livros/BookOverlay.tsx`

**Interfaces:**
- Consumes: `formatarDataLeitura` de `lib/book-utils.mjs` (Task 1). Campos `livro.synopsis`, `livro.review`, `livro.finished_at`, `livro.status` do tipo `Book` (já existem, nenhuma mudança de tipo necessária).

- [ ] **Step 1: Importar o formatador**

No topo de `components/livros/BookOverlay.tsx`, junto dos outros imports:

```tsx
import {formatarDataLeitura} from '@/lib/book-utils.mjs';
```

- [ ] **Step 2: Mostrar a data de leitura na coluna esquerda**

Logo depois de `<StarRating nota={livro.rating} tamanho="text-base"/>` (dentro da `<div className="flex flex-col gap-3">`), adicione:

```tsx
                <StarRating nota={livro.rating} tamanho="text-base"/>
                {livro.status === 'lido' && livro.finished_at && (
                    <p className="text-xs text-white/50">
                        Lido em {formatarDataLeitura(livro.finished_at)}
                    </p>
                )}
```

- [ ] **Step 3: Trocar o bloco de resenha pelo layout sinopse + resenha destacada**

Troque todo o bloco final:

```tsx
            <div className="prose prose-sm prose-invert max-h-[60vh] max-w-none overflow-y-auto pr-2">
                {livro.review ? (
                    <ReactMarkdown components={REMAP_HEADINGS}>{livro.review}</ReactMarkdown>
                ) : (
                    <p className="italic text-white/50">Resenha ainda não escrita.</p>
                )}
            </div>
```

por:

```tsx
            <div className="max-h-[60vh] max-w-none overflow-y-auto pr-2">
                {livro.synopsis && (
                    <p className="mb-5 border-l-2 border-white/20 pl-3 text-sm italic text-white/60">
                        {livro.synopsis}
                    </p>
                )}
                {livro.review ? (
                    <div className="border-l-[3px] border-amber-500 pl-3.5">
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500">
                            Minha resenha
                        </div>
                        <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown components={REMAP_HEADINGS}>{livro.review}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <p className="italic text-white/50">Resenha ainda não escrita.</p>
                )}
            </div>
```

- [ ] **Step 4: Verificar no navegador**

Run: `npm run dev` (se não estiver rodando) e abra `http://localhost:3000/livros`.
Expected: clique em "Estante", clique num livro que já tenha `review` preenchido (ex: "A Revolta de Atlas", que já tem resenha de sessões anteriores) — o popup abre por cima da sala 3D. Confirme visualmente: se `synopsis` estiver vazio (ainda não rodou a Task 7), só o bloco "Minha resenha" com a barra âmbar deve aparecer, sem quebrar layout. Depois que a Task 7 rodar, volte e confirme que a sinopse aparece acima, discreta, e a resenha abaixo com a barra âmbar.

- [ ] **Step 5: Commit**

```bash
git add components/livros/BookOverlay.tsx
git commit -m "feat(livros): BookOverlay ganha sinopse e resenha destacada com data"
```

---

### Task 5: Sinopse + resenha destacada na página de detalhe

**Files:**
- Modify: `app/livros/[slug]/page.tsx`

**Interfaces:**
- Consumes: `formatarDataLeitura` de `lib/book-utils.mjs` (Task 1).

- [ ] **Step 1: Importar o formatador**

No topo de `app/livros/[slug]/page.tsx`, junto dos outros imports:

```tsx
import {formatarDataLeitura} from '@/lib/book-utils.mjs';
```

- [ ] **Step 2: Mostrar a data de leitura**

Logo depois de `<StarRating nota={livro.rating} tamanho="text-lg"/>`, adicione:

```tsx
                        <StarRating nota={livro.rating} tamanho="text-lg"/>
                        {livro.status === 'lido' && livro.finished_at && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Lido em {formatarDataLeitura(livro.finished_at)}
                            </p>
                        )}
```

- [ ] **Step 3: Dar destaque visual à resenha (barra âmbar + label)**

Troque:

```tsx
                {livro.review && (
                    <article className="prose prose-sm mt-10 max-w-none dark:prose-invert">
                        {/*
                          O CLI de cadastro (scripts/livros.mjs) abre a resenha já com
                          "# <título>" — ou seja, todo review real começa com um heading nível 1.
                          Sem remapear, isso vira um segundo <h1> na página (o primeiro é o
                          título do livro logo acima), quebrando a hierarquia semântica. Por
                          isso cada nível do Markdown desce um degrau (h1->h2 ... h5->h6): a
                          resenha é uma seção da página, não um documento à parte.
                        */}
                        <ReactMarkdown components={{
                            // `node` é o nó hast que o react-markdown injeta em toda prop de
                            // componente; descartado aqui de propósito para não vazar como um
                            // atributo `node="[object Object]"` inválido no HTML renderizado.
                            /* eslint-disable @typescript-eslint/no-unused-vars */
                            h1: ({node, ...props}) => <h2 {...props}/>,
                            h2: ({node, ...props}) => <h3 {...props}/>,
                            h3: ({node, ...props}) => <h4 {...props}/>,
                            h4: ({node, ...props}) => <h5 {...props}/>,
                            h5: ({node, ...props}) => <h6 {...props}/>,
                            h6: ({node, ...props}) => <h6 {...props}/>,
                            /* eslint-enable @typescript-eslint/no-unused-vars */
                        }}>
                            {livro.review}
                        </ReactMarkdown>
                    </article>
                )}
```

por:

```tsx
                {livro.review && (
                    <div className="mt-10 border-l-[3px] border-amber-500 pl-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide
                                        text-amber-600 dark:text-amber-500">
                            Minha resenha
                        </div>
                        {/*
                          O CLI de cadastro (scripts/livros.mjs) abre a resenha já com
                          "# <título>" — ou seja, todo review real começa com um heading nível 1.
                          Sem remapear, isso vira um segundo <h1> na página (o primeiro é o
                          título do livro logo acima), quebrando a hierarquia semântica. Por
                          isso cada nível do Markdown desce um degrau (h1->h2 ... h5->h6): a
                          resenha é uma seção da página, não um documento à parte.
                        */}
                        <article className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown components={{
                                // `node` é o nó hast que o react-markdown injeta em toda prop de
                                // componente; descartado aqui de propósito para não vazar como um
                                // atributo `node="[object Object]"` inválido no HTML renderizado.
                                /* eslint-disable @typescript-eslint/no-unused-vars */
                                h1: ({node, ...props}) => <h2 {...props}/>,
                                h2: ({node, ...props}) => <h3 {...props}/>,
                                h3: ({node, ...props}) => <h4 {...props}/>,
                                h4: ({node, ...props}) => <h5 {...props}/>,
                                h5: ({node, ...props}) => <h6 {...props}/>,
                                h6: ({node, ...props}) => <h6 {...props}/>,
                                /* eslint-enable @typescript-eslint/no-unused-vars */
                            }}>
                                {livro.review}
                            </ReactMarkdown>
                        </article>
                    </div>
                )}
```

- [ ] **Step 4: Verificar no navegador**

Abra `http://localhost:3000/livros/a-revolta-de-atlas` diretamente (navegação de página inteira, não o popup da Task 4 — essa URL usa `app/livros/[slug]/page.tsx`).
Expected: a resenha aparece com uma barra âmbar à esquerda e o label "Minha resenha" acima do texto. A sinopse (se já preenchida) continua no formato de citação que já existia, sem mudança.

- [ ] **Step 5: Commit**

```bash
git add "app/livros/[slug]/page.tsx"
git commit -m "feat(livros): pagina de detalhe destaca a resenha pessoal e mostra a data de leitura"
```

---

### Task 6: Selo de data no `BookCard` da listagem

**Files:**
- Modify: `components/livros/BookCard.tsx`

**Interfaces:**
- Consumes: `formatarDataLeituraAbreviada` de `lib/book-utils.mjs` (Task 1).

- [ ] **Step 1: Importar o formatador**

No topo de `components/livros/BookCard.tsx`, junto dos outros imports:

```tsx
import {formatarDataLeituraAbreviada} from '@/lib/book-utils.mjs';
```

- [ ] **Step 2: Adicionar o selo abaixo da nota/categoria**

Depois do bloco:

```tsx
                <div className="mt-1 flex items-center gap-2">
                    <StarRating nota={livro.rating}/>
                    {categoria && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                  backgroundColor: categoria.cor,
                                  color: corDeTextoSobre(categoria.cor),
                              }}>
                            {categoria.nome}
                        </span>
                    )}
                </div>
```

adicione:

```tsx
                {livro.status === 'lido' && livro.finished_at && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatarDataLeituraAbreviada(livro.finished_at)}
                    </p>
                )}
```

- [ ] **Step 3: Verificar no navegador**

Abra `http://localhost:3000/livros/lista`.
Expected: cards de livros com `status: 'lido'` e `finished_at` preenchido mostram um selo pequeno tipo "jul/2026" abaixo da nota/categoria. Livros sem `finished_at` (a maioria, até a Task 7 rodar) não mostram nada ali — sem espaço vazio quebrando o layout do card.

- [ ] **Step 4: Commit**

```bash
git add components/livros/BookCard.tsx
git commit -m "feat(livros): selo de data de leitura no card da listagem"
```

---

### Task 7: Backfill da sinopse dos 51 livros existentes

**Files:**
- Create (temporário, apagado no Step 4): `scripts/_tmp-backfill-synopses.mjs`

**Interfaces:**
- Consumes: nenhuma das tasks anteriores — só precisa que `casara.books` já tenha as linhas dos 51 livros (já tem, do trabalho de povoamento anterior).
- Produces: nada consumido por outra task — é a última peça, popula o dado que as Tasks 3-6 já sabem exibir/ordenar.

- [ ] **Step 1: Criar o script com as 51 sinopses**

Crie `scripts/_tmp-backfill-synopses.mjs` com o conteúdo abaixo. As sinopses foram escritas nesta conversa a partir de título/autor/categoria/tags de cada livro — português, 2-3 frases, sem spoiler do desfecho, tom neutro (a opinião pessoal já está em `review`, gravado à parte).

```js
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {neon} from '@neondatabase/serverless';

const ROOT = 'C:\\projects\\site\\site-casara';

function abrirBanco() {
    const url = readFileSync(join(ROOT, '.env.local'), 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='))
        ?.slice('DATABASE_URL='.length)
        .replace(/^["']|["']$/g, '');
    if (!url) throw new Error('DATABASE_URL não encontrado em .env.local');
    return neon(url);
}

const SINOPSES = {
    '100-presente': 'Um guia prático sobre viver com atenção plena no dia a dia, evitando a dispersão entre passado e futuro. Joel Jota propõe hábitos simples para estar de corpo e mente no momento presente, aplicáveis ao trabalho, à família e às relações.',
    'a-arte-da-guerra': 'Tratado militar chinês de mais de dois mil anos que condensa princípios de estratégia, disciplina e liderança em campanhas de guerra. Tornou-se referência fora do contexto militar, citado com frequência em negócios e esportes por sua visão sobre preparação e vantagem competitiva.',
    'a-coragem-de-nao-agradar': 'Um diálogo entre um filósofo e um jovem cético que introduz os princípios da psicologia de Alfred Adler sobre liberdade, responsabilidade pelas próprias escolhas e desapego da aprovação alheia. Defende que a verdadeira liberdade nasce de deixar de viver para agradar os outros.',
    'a-metamorfose': 'Novela clássica que acompanha Gregor Samsa após acordar transformado num inseto monstruoso, e o modo como essa mudança abala sua relação com a família e o trabalho. Um dos textos mais estudados da literatura do século XX sobre alienação e identidade.',
    'a-outra-face': 'Thriller de suspense de Sidney Sheldon construído em torno de segredos, traição e reviravoltas que só se revelam aos poucos. Como boa parte da obra do autor, mistura drama pessoal com uma trama de ritmo acelerado.',
    'a-psicologia-financeira': 'Morgan Housel argumenta que sucesso com dinheiro depende menos de conhecimento técnico e mais de comportamento — paciência, humildade e a relação pessoal de cada um com risco e tempo. Uma coletânea de histórias curtas sobre como as pessoas realmente pensam sobre riqueza.',
    'a-revolta-de-atlas': 'Numa América em colapso econômico, os grandes empreendedores e criadores começam a desaparecer, um a um. Ayn Rand constrói uma fábula filosófica extensa sobre razão, individualismo e o preço de sustentar um mundo que despreza quem o move.',
    'a-revolucao-dos-bichos': 'Fábula satírica em que os animais de uma fazenda expulsam os humanos e tentam construir uma sociedade igualitária, até o poder começar a corromper seus próprios líderes. Uma alegoria clássica sobre revolução, propaganda e tirania.',
    'a-sutil-arte-de-ligar-o-f-da-se': 'Mark Manson questiona a cultura da positividade obrigatória e defende que uma vida melhor vem de escolher com cuidado o que realmente merece sua energia e preocupação. Um contraponto direto, às vezes provocador, ao discurso convencional de autoajuda.',
    'a-vida-feliz': 'Tratado do filósofo estoico romano Sêneca sobre o que constitui de fato uma vida boa, contrapondo a busca por prazer imediato à virtude e à razão como caminho para a felicidade duradoura. Um dos textos fundamentais do estoicismo clássico.',
    'arrume-a-sua-cama': 'Baseado num discurso de formatura, o almirante William McRaven usa sua experiência nos Navy SEALs para defender que pequenos hábitos de disciplina — a começar por arrumar a cama todo dia — sustentam mudanças maiores na vida. Dez lições curtas de resiliência aprendidas no treinamento militar.',
    'as-4-disciplinas-da-execucao': 'Um framework para transformar metas em resultados quando a rotina do dia a dia compete pela atenção: focar no que é mais importante, agir sobre indicadores que antecipam o resultado, manter um placar visível e criar ritmo de prestação de contas. Voltado a quem precisa executar estratégia em meio ao turbilhão operacional.',
    'as-48-leis-do-poder': 'Uma compilação de leis sobre como o poder é conquistado, mantido e perdido ao longo da história, ilustradas com exemplos de estrategistas, cortesãos e líderes de diferentes épocas. Um manual polêmico e frequentemente citado sobre a dinâmica das relações de poder.',
    'as-cavernas-de-aco': 'Numa Terra futura de cidades fechadas em cúpulas, um detetive humano é forçado a investigar um assassinato ao lado de um parceiro robô numa sociedade que teme e depende da tecnologia. Asimov combina mistério policial com ficção científica para explorar a convivência entre humanos e robôs.',
    'bora-vender': 'Guia prático de técnicas de vendas voltado a quem está no dia a dia comercial, cobrindo desde prospecção até fechamento e relacionamento com o cliente. Escrito num tom direto, focado em aplicação imediata.',
    'cada-homem-um-guerreiro': 'Reflexão sobre masculinidade e fé cristã, propondo um caminho de disciplina espiritual e caráter para o homem enfrentar suas batalhas internas e responsabilidades. Combina princípios bíblicos com formação pessoal.',
    'chaves-biblicas-para-o-homem-de-deus': 'Um estudo devocional que reúne princípios bíblicos voltados à vida espiritual e prática do homem cristão, cobrindo temas como propósito, família e caráter. Estruturado como guia de leitura e reflexão.',
    'como-fazer-amigos-e-influenciar-pessoas': 'Clássico de 1936 sobre como se relacionar melhor com as pessoas — ouvir de verdade, elogiar com sinceridade e ver as coisas pelo ponto de vista do outro. Um dos livros de desenvolvimento pessoal mais influentes do século XX, ainda citado como referência em comunicação.',
    'decifre-e-influencie-pessoas': 'Paulo Vieira propõe ferramentas de leitura de comportamento e comunicação persuasiva para entender melhor as pessoas ao redor e se comunicar de forma mais eficaz. Voltado a quem lida com vendas, liderança ou relacionamentos no dia a dia.',
    'disciplina-e-liberdade': 'Ex-oficial dos Navy SEALs, Jocko Willink defende que a disciplina — não a motivação — é o que sustenta liberdade real: sobre o corpo, a mente e as próprias escolhas. Um manifesto curto e direto sobre rotina, esforço físico e mentalidade militar aplicada à vida civil.',
    'diario-estoico': 'Reflexões diárias inspiradas nos filósofos estoicos — Sêneca, Epicteto, Marco Aurélio — organizadas em 366 entradas curtas para ler uma por dia. Ryan Holiday traduz ideias antigas sobre controle, aceitação e virtude para uma linguagem contemporânea.',
    'do-mil-ao-milhao': 'Guia introdutório de educação financeira e investimentos do criador do canal "O Primo Rico", cobrindo desde a organização das finanças pessoais até os primeiros passos na bolsa. Voltado a quem está começando a investir do zero.',
    'em-busca-de-sentido': 'O psiquiatra Viktor Frankl relata sua experiência nos campos de concentração nazistas e, a partir dela, desenvolve a logoterapia — a ideia de que encontrar sentido, mesmo no sofrimento extremo, é o que sustenta a vontade de viver. Um dos relatos mais citados sobre resiliência humana.',
    'em-nome-do-povo': 'Uma análise crítica de como decisões econômicas e políticas populistas afetam o bolso do cidadão comum, discutindo os efeitos de longo prazo de escolhas de curto prazo. Combina economia e política para explicar o custo real de certas promessas.',
    'escotismo-para-rapazes': 'O manual original que deu origem ao movimento escoteiro mundial, escrito pelo fundador Robert Baden-Powell com técnicas de vida ao ar livre, trabalho em equipe e formação de caráter para jovens. Um texto fundador sobre liderança e autodisciplina através da vivência prática.',
    'factfulness': 'Hans Rosling usa dados globais para mostrar como nossa percepção do mundo costuma ser mais pessimista e dramática do que a realidade, e identifica os instintos mentais que distorcem essa leitura. Um convite a formar opinião com base em fatos, não em impressões.',
    'forward': 'Coletânea de contos de ficção científica reunidos sob curadoria de Blake Crouch, cada um explorando um futuro próximo diferente — de viagem no tempo a inteligência artificial. Autores como Andy Weir e N.K. Jemisin dividem espaço com o próprio Crouch nesse conjunto de histórias independentes.',
    'geracao-de-valor-1': 'Primeiro volume da trilogia em que o empresário Flávio Augusto compartilha reflexões sobre empreendedorismo, propósito e construção de valor a partir da própria trajetória. Mistura relato pessoal com princípios práticos de negócios.',
    'geracao-de-valor-2': 'Continuação da trilogia, aprofundando temas de liderança, gestão e mentalidade empreendedora abordados no primeiro volume. Mantém o formato de reflexões curtas baseadas na experiência do autor.',
    'geracao-de-valor-3': 'Terceiro e último volume da trilogia, fechando as reflexões de Flávio Augusto sobre propósito, negócios e construção de legado. Reúne aprendizados acumulados ao longo da carreira do autor como empresário.',
    'leruth': 'Romance de fantasia que constrói um universo próprio de conflitos, magia e personagens em busca de seu lugar num mundo em transformação. Obra de fantasia nacional que segue a tradição de construção de mundos do gênero.',
    'mais-esperto-que-o-diabo': 'Registrado em 1938 mas publicado décadas depois, o livro apresenta uma entrevista fictícia entre Napoleon Hill e o "Diabo", usada como recurso literário para expor os mecanismos que levam pessoas a desperdiçar seu potencial — medo, procrastinação e falta de propósito definido. Complementa as ideias de "Quem Pensa Enriquece" por um ângulo mais sombrio.',
    'o-almanaque-de-naval-ravikant': 'Compilação organizada por Eric Jorgenson das ideias de Naval Ravikant sobre como construir riqueza sem depender de sorte e como cultivar felicidade de forma duradoura. Reúne tweets, entrevistas e ensaios de Naval num só volume estruturado por tema.',
    'o-codificador-limpo': 'Robert C. Martin ("Uncle Bob") discute o que separa um profissional de software de um simples programador — disciplina técnica, ética de trabalho e responsabilidade pelo que se entrega. Aborda estimativas, pressão de prazos e comportamento profissional na engenharia de software.',
    'o-hobbit': 'Bilbo Bolseiro, um hobbit pacato e caseiro, é arrastado numa jornada inesperada ao lado de anões e do mago Gandalf rumo à Montanha Solitária, guardada por um dragão. Romance de fantasia que antecede "O Senhor dos Anéis" e introduz a Terra-média a leitores de todas as idades.',
    'o-homem-mais-rico-da-babilonia': 'Parábolas ambientadas na Babilônia antiga que ensinam princípios atemporais de finanças pessoais — poupar uma parte do que se ganha, investir com sabedoria e proteger o capital. Um clássico da educação financeira publicado originalmente nos anos 1920.',
    'o-homem-que-comprou-o-tempo': 'Thiago Nigro discute como o tempo, e não o dinheiro, é o recurso mais escasso e valioso, propondo estratégias para recuperar o controle sobre a própria agenda e prioridades. Une produtividade pessoal com a mentalidade financeira que marca a obra do autor.',
    'o-jogo-interior-do-tenis': 'Escrito originalmente para tenistas, o livro argumenta que o maior adversário no esporte — e na vida — é o diálogo interno de dúvida e autocrítica, não o oponente do lado de fora. Tornou-se referência em coaching e alta performance muito além do tênis.',
    'o-monge-e-o-executivo': 'Uma fábula sobre um executivo em crise que passa uma semana num mosteiro e aprende, com um antigo colega virado monge, os princípios da liderança servidora — autoridade que nasce do serviço aos outros, não do cargo. Best-seller sobre liderança contado em formato de história.',
    'o-mitico-homem-mes': 'Clássico da engenharia de software escrito a partir da experiência de Brooks liderando o desenvolvimento do OS/360 da IBM, formulando a "Lei de Brooks" — adicionar pessoas a um projeto atrasado só o atrasa mais. Reflexões sobre estimativa, complexidade e gestão de equipes de software que continuam relevantes décadas depois.',
    'o-pequeno-principe': 'Um piloto perdido no deserto encontra um pequeno príncipe vindo de outro planeta, que conta suas viagens por mundos habitados por personagens estranhos até chegar à Terra. Fábula poética sobre infância, amizade e o que realmente importa, escrita para crianças e adultos.',
    'o-pior-ano-da-minha-vida': 'Relato pessoal de Pablo Marçal sobre um período de crise profunda e como ele reconstruiu a própria vida a partir dela, transformando a experiência em lições de superação. Combina biografia com princípios de desenvolvimento pessoal.',
    'o-segredo-de-todas-as-coisas': 'Reflexão sobre os princípios que sustentam realização pessoal e propósito de vida, na linha dos livros de desenvolvimento pessoal com forte apelo motivacional. Estruturado como um guia de autoconhecimento.',
    'pai-rico-pai-pobre': 'Kiyosaki compara os ensinamentos financeiros de duas figuras da própria vida — o "pai pobre", assalariado, e o "pai rico", empreendedor — para defender que educação financeira, não apenas trabalho duro, é o que constrói riqueza. Um dos livros mais vendidos do gênero, focado na diferença entre ativos e passivos.',
    'ponto-de-inflexao': 'Flávio Augusto reflete sobre os momentos decisivos que mudam o rumo de uma carreira ou negócio — os "pontos de inflexão" — e como reconhecê-los e agir sobre eles. Combina relato pessoal com princípios de empreendedorismo.',
    'por-que-fazemos-o-que-fazemos': 'O filósofo Mario Sergio Cortella discute o sentido do trabalho na vida contemporânea — por que trabalhamos, o que buscamos nele além do salário, e como equilibrar realização pessoal e produtividade. Reflexões acessíveis sobre propósito, escritas num tom de conversa.',
    'por-que-generalistas-vencem-em-um-mundo-de-especialistas': 'David Epstein reúne pesquisas e histórias mostrando que, em muitas áreas, experiência ampla e diversificada supera a especialização precoce — do esporte à ciência. Um contraponto à ideia de que dez mil horas numa única disciplina são sempre o melhor caminho.',
    'quem-pensa-enriquece': 'Baseado em entrevistas com dezenas de milionários da época, Napoleon Hill sistematiza princípios de mentalidade, desejo e persistência que, segundo ele, separam quem alcança grandes resultados de quem não alcança. Um dos livros de desenvolvimento pessoal e riqueza mais influentes já publicados.',
    'rapido-e-devagar': 'O ganhador do Nobel Daniel Kahneman descreve dois sistemas de pensamento que guiam nossas decisões — um rápido e intuitivo, outro lento e racional — e como vieses cognitivos distorcem julgamentos no dia a dia. Uma síntese acessível de décadas de pesquisa em psicologia comportamental.',
    'sapiens-uma-breve-historia-da-humanidade': 'Harari percorre a história da espécie humana desde os primeiros Homo sapiens até a era digital, argumentando que mitos compartilhados — dinheiro, nações, religiões — são o que permitiu cooperação em larga escala. Uma narrativa ampla que conecta biologia, história e antropologia.',
    'sou-puta-doutor': 'Narrativa que parte da relação entre um médico e uma paciente para explorar temas de moralidade, julgamento social e os bastidores de uma profissão marginalizada. Ficção brasileira contemporânea contada em tom direto e cru.',
};

const sql = abrirBanco();
const resultados = [];

for (const [slug, synopsis] of Object.entries(SINOPSES)) {
    const linhas = await sql`
        UPDATE casara.books
        SET synopsis = ${synopsis}
        WHERE slug = ${slug} AND synopsis IS NULL
        RETURNING slug
    `;
    resultados.push({slug, status: linhas.length ? 'ok' : 'pulado (já tinha sinopse ou slug não existe)'});
}

console.table(resultados);
const aplicados = resultados.filter((r) => r.status === 'ok').length;
console.log(`\n${aplicados}/${resultados.length} sinopses aplicadas.`);
```

- [ ] **Step 2: Rodar o script**

Run: `node scripts/_tmp-backfill-synopses.mjs`
Expected: uma tabela com exatamente 51 linhas, uma por slug do acervo, todas com `status: 'ok'` (a menos que algum já tivesse `synopsis` preenchida manualmente — nesse caso aparece "pulado"). Última linha: `51/51 sinopses aplicadas.` (ou menos, se algo já estava preenchido). Se a tabela tiver menos de 51 linhas, o objeto `SINOPSES` do Step 1 foi colado incompleto — confira contra a lista de slugs antes de seguir.

- [ ] **Step 3: Confirmar no banco e apagar o script temporário**

Run: `node scripts/livros.mjs list`
Expected: comando ainda funciona normalmente (ele não lista `synopsis`, é só uma checagem de sanidade de que o banco não quebrou).

Depois, apague o script — ele é descartável, mesmo padrão de `scripts/_tmp-apply-covers.mjs` usado antes nesta conversa para as capas:

```bash
rm scripts/_tmp-backfill-synopses.mjs
```

- [ ] **Step 4: Verificar no navegador**

Abra `http://localhost:3000/livros/lista` — os cards agora devem estar ordenados diferente do que na Task 3 (ainda por título, já que `finished_at` continua `null` pros 51 — a sinopse não muda a ordenação, só a Task 3 fazia isso). Abra `http://localhost:3000/livros/a-revolta-de-atlas` e confirme que a sinopse aparece na citação discreta acima da resenha.

Não crie um commit de código nesta task — é só dado (uma `UPDATE` em produção), sem arquivo pra versionar depois que o script temporário é apagado.
