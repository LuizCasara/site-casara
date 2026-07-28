# Acervo de Livros — Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um acervo de livros publicado e compartilhável — tabela no banco, CLI local de cadastro alimentado pela Open Library, e as páginas `/livros/lista` e `/livros/[slug]` server-rendered — **sem nenhum 3D**.

**Architecture:** A lógica pura (slug, tags, dimensões, parsing da Open Library) vive em módulos `.mjs` sem dependências, importados tanto pelo CLI Node quanto pelo Next. As queries e tipos TypeScript ficam em `lib/books.ts`. O cadastro acontece exclusivamente por um script local — o site não ganha nenhuma rota autenticada.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (não-estrito), Tailwind 3, Neon Postgres via `@neondatabase/serverless`, Node 22+ (`node:test`, `node:readline/promises`), `sharp` (devDependency), `react-markdown`.

**Spec:** `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`

## Global Constraints

- **Toda tabela vive no schema `casara` e toda query precisa qualificar explicitamente** (`casara.books`). O `search_path` da conexão é apenas `"$user", public` — `FROM books` sem qualificação **falha ou resolve no lugar errado**. O schema `geav` pertence a outro site e nunca deve ser lido nem escrito.
- **`tsconfig.json` tem `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`.** Não escreva código que dependa de checagem estrita.
- **Imports internos usam o alias `@/`** (ex.: `@/lib/db`), configurado em `tsconfig.json` → `paths`.
- **A conexão com o banco é `import sql from '@/lib/db'`** — default export, tagged template, lazy. Nunca chame `neon()` diretamente em código de aplicação.
- **`/livros` é somente em português.** O `LanguageProvider` cobre apenas home, about, projects e a listagem `/app`; mini-apps, dinâmicas e testes são pt-only, e `/livros` segue esse padrão porque as resenhas são prosa pessoal em português.
- **A lógica compartilhada entre o CLI e o Next fica em `.mjs`**, não `.ts`. Scripts `.mjs` não conseguem importar `.ts` sem build, e este projeto não tem etapa de build para scripts.
- **Nenhuma variável de ambiente nova.** O CLI lê `DATABASE_URL` de `.env.local` com o mesmo parsing manual de `scripts/migrate-casara.mjs`.
- **Comentários e textos de interface em português**, seguindo o restante do repositório.
- Este projeto **não tem suite de testes**. As tarefas 1 e 4 introduzem `node --test` cobrindo **apenas lógica pura**. Não escreva testes de componente React nem de banco.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/book-utils.mjs` | Lógica pura, zero dependências: slug, tags, dimensões, parsing |
| `lib/book-utils.test.mjs` | `node --test` da lógica pura |
| `lib/book-categories.mjs` | Taxonomia fechada: id, nome, cor |
| `lib/book-sources/openlibrary.mjs` | Busca metadados por ISBN |
| `lib/book-sources/index.mjs` | Interface `buscarMetadados(isbn)` — gancho para futuras fontes |
| `lib/book-cover.mjs` | Baixa capa, redimensiona, extrai cor dominante |
| `lib/books.ts` | Tipo `Book` + queries do Next |
| `lib/schema.sql` | DDL de `casara.books` (arquivo existente, acrescentar) |
| `scripts/create-books-table.mjs` | Cria a tabela, com dry-run |
| `scripts/livros.mjs` | CLI de cadastro |
| `app/livros/page.tsx` | Redireciona para `/livros/lista` (vira a sala 3D na fase 2) |
| `app/livros/lista/page.tsx` | Grade de capas com filtros |
| `app/livros/[slug]/page.tsx` | Página do livro |
| `components/livros/BookCard.tsx` | Card de capa da grade |
| `components/livros/BookFilters.tsx` | Filtros por categoria/tag/status |
| `components/livros/StarRating.tsx` | Nota em estrelas |

`lib/book-utils.mjs` e `lib/books.ts` têm nomes distintos de propósito: `@/lib/books` precisa resolver sem ambiguidade para o arquivo TypeScript.

---

### Task 1: Lógica pura e infraestrutura de teste

**Files:**
- Create: `lib/book-utils.mjs`
- Create: `lib/book-utils.test.mjs`
- Create: `lib/book-categories.mjs`
- Modify: `package.json` (adicionar script `test`)

**Interfaces:**
- Consumes: nada
- Produces:
  - `slugify(texto: string) => string`
  - `normalizeTag(tag: string) => string`
  - `tagKey(tag: string) => string`
  - `bookThickness(pages: number|null, medianPages: number) => number` (metros)
  - `bookHeight(slug: string) => number` (metros)
  - `extractYear(publishDate: string|null) => number|null`
  - `CATEGORIES: Array<{id, nome, cor}>`, `getCategory(id)`, `CATEGORY_IDS: string[]`

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/book-utils.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    slugify,
    normalizeTag,
    tagKey,
    bookThickness,
    bookHeight,
    extractYear,
} from './book-utils.mjs';

test('slugify remove acentos e normaliza', () => {
    assert.equal(slugify('A Revolta de Atlas'), 'a-revolta-de-atlas');
    assert.equal(slugify('Ensaio sobre a Cegueira'), 'ensaio-sobre-a-cegueira');
    assert.equal(slugify('  Duna   '), 'duna');
    assert.equal(slugify('O Senhor dos Anéis: A Sociedade do Anel'),
        'o-senhor-dos-aneis-a-sociedade-do-anel');
    assert.equal(slugify('1984'), '1984');
});

test('slugify nunca devolve string vazia nem hifens nas pontas', () => {
    assert.equal(slugify('!!!'), 'livro');
    assert.equal(slugify('---abc---'), 'abc');
});

test('normalizeTag preserva acento, tagKey remove', () => {
    assert.equal(normalizeTag('  Política  '), 'política');
    assert.equal(normalizeTag('FICÇÃO   CIENTÍFICA'), 'ficção científica');
    // Três grafias diferentes precisam colidir na mesma chave.
    assert.equal(tagKey('Política'), tagKey('politica'));
    assert.equal(tagKey('POLÍTICA'), 'politica');
});

test('bookThickness deriva de páginas com clamp nas duas pontas', () => {
    // 400 páginas * 0.055mm = 22mm = 0.022m
    assert.equal(bookThickness(400, 300), 0.022);
    // 90 páginas cairia em 4.95mm — clampeado no mínimo de 12mm.
    assert.equal(bookThickness(90, 300), 0.012);
    // 1200 páginas daria 66mm — clampeado no máximo de 60mm.
    assert.equal(bookThickness(1200, 300), 0.06);
    // Sem páginas, usa a mediana do acervo.
    assert.equal(bookThickness(null, 400), 0.022);
});

test('bookHeight é determinístico e fica na faixa realista', () => {
    const a = bookHeight('duna');
    assert.equal(a, bookHeight('duna'), 'mesmo slug precisa dar sempre a mesma altura');
    assert.notEqual(bookHeight('duna'), bookHeight('1984'));
    for (const slug of ['duna', '1984', 'a-revolta-de-atlas', 'ensaio-sobre-a-cegueira']) {
        const h = bookHeight(slug);
        assert.ok(h >= 0.185 && h <= 0.23, `${slug} fora da faixa: ${h}`);
    }
});

test('extractYear aceita os formatos que a Open Library devolve', () => {
    assert.equal(extractYear('2009'), 2009);
    assert.equal(extractYear('March 2009'), 2009);
    assert.equal(extractYear('1st ed. 1985, reprint 2001'), 1985);
    assert.equal(extractYear(null), null);
    assert.equal(extractYear('sem data'), null);
});
```

- [ ] **Step 2: Adicione o script de teste e rode para ver falhar**

Modify `package.json`, adicionando dentro de `"scripts"`:

```json
"test": "node --test lib/*.test.mjs"
```

Run: `npm test`
Expected: FAIL — `Cannot find module './book-utils.mjs'`

- [ ] **Step 3: Implemente a lógica pura**

Create `lib/book-utils.mjs`:

```js
/**
 * Lógica pura do acervo de livros — sem dependências, sem I/O.
 *
 * Este arquivo é .mjs de propósito: ele é importado tanto pelo CLI
 * (scripts/livros.mjs, Node puro) quanto pelo Next. Um .ts não pode ser
 * importado por um script Node sem etapa de build, e este projeto não tem uma.
 */

/** Milímetros de lombada por página. Valor médio de papel offset comercial. */
const MM_POR_PAGINA = 0.055;
const ESPESSURA_MIN_M = 0.012;
const ESPESSURA_MAX_M = 0.060;

const ALTURA_MIN_M = 0.185;
const ALTURA_MAX_M = 0.230;

/** Remove acentos: decompõe em base + diacrítico e joga os diacríticos fora. */
function semAcento(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** "A Revolta de Atlas" -> "a-revolta-de-atlas". Nunca devolve vazio. */
export function slugify(texto) {
    const slug = semAcento(String(texto))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'livro';
}

/** Forma de exibição da tag: minúscula, sem espaço sobrando, acento preservado. */
export function normalizeTag(tag) {
    return String(tag).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Chave de comparação da tag: sem acento, para que "política" e "politica"
 * sejam reconhecidas como a mesma tag e o autocomplete do CLI evite duplicatas.
 */
export function tagKey(tag) {
    return semAcento(normalizeTag(tag)).replace(/[^a-z0-9 ]/g, '');
}

/**
 * Espessura do livro em metros, a partir do número de páginas.
 *
 * O clamp existe para o 3D: sem ele um livro de 90 páginas vira uma folha
 * invisível na estante e um de 1200 vira um tijolo que domina a prateleira.
 */
export function bookThickness(pages, medianPages) {
    const p = Number(pages) > 0 ? Number(pages) : Number(medianPages);
    const metros = (p * MM_POR_PAGINA) / 1000;
    return Math.round(Math.min(Math.max(metros, ESPESSURA_MIN_M), ESPESSURA_MAX_M) * 1000) / 1000;
}

/** Hash FNV-1a — determinístico, rápido, e não precisa ser criptográfico. */
function hashString(texto) {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Altura do livro em metros, derivada do slug.
 *
 * Determinística de propósito: se fosse Math.random(), o livro mudaria de
 * tamanho a cada render e a estante ficaria "respirando".
 */
export function bookHeight(slug) {
    const t = (hashString(String(slug)) % 1000) / 1000;
    return Math.round((ALTURA_MIN_M + t * (ALTURA_MAX_M - ALTURA_MIN_M)) * 1000) / 1000;
}

/**
 * Extrai o ano de publicação. A Open Library devolve esse campo como texto
 * livre — "2009", "March 2009", "1st ed. 1985, reprint 2001" são todos reais.
 * Pega o primeiro ano plausível encontrado.
 */
export function extractYear(publishDate) {
    if (!publishDate) return null;
    const m = String(publishDate).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return m ? Number(m[1]) : null;
}
```

- [ ] **Step 4: Rode os testes para ver passar**

Run: `npm test`
Expected: PASS — 6 testes.

- [ ] **Step 5: Crie a taxonomia de categorias**

Create `lib/book-categories.mjs`:

```js
/**
 * Taxonomia fechada de categorias.
 *
 * Um livro tem UMA categoria (define onde ele mora na estante e sua cor) e N
 * tags livres (o eixo transversal de busca). Se um livro pudesse ter várias
 * categorias, sua posição na prateleira seria ambígua.
 *
 * Esta lista foi DERIVADA do acervo real (scripts/seed/acervo.json), agrupando
 * os 51 livros e nomeando os agrupamentos — não foi inventada antes dos dados.
 * A quantidade ao lado de cada uma é a contagem no acervo inicial.
 *
 * Não existe categoria "Fantasia": os dois livros que cairiam nela (O Hobbit,
 * As Cavernas de Aço) ficam em Ficção com as tags "fantasia" e "ficção
 * científica". Uma categoria de dois itens não justifica uma prateleira.
 */
export const CATEGORIES = [
    {id: 'desenvolvimento-pessoal', nome: 'Desenvolvimento Pessoal', cor: '#ec4899'}, // 18
    {id: 'ficcao', nome: 'Ficção', cor: '#6366f1'},                                   //  9
    {id: 'negocios-financas', nome: 'Negócios e Finanças', cor: '#10b981'},           //  7
    {id: 'lideranca-estrategia', nome: 'Liderança e Estratégia', cor: '#ef4444'},     //  4
    {id: 'filosofia', nome: 'Filosofia', cor: '#8b5cf6'},                             //  4
    {id: 'ciencia-sociedade', nome: 'Ciência e Sociedade', cor: '#06b6d4'},           //  4
    {id: 'tecnologia', nome: 'Tecnologia', cor: '#f59e0b'},                           //  2
    {id: 'espiritualidade', nome: 'Espiritualidade', cor: '#84cc16'},                 //  2
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id) {
    return CATEGORIES.find((c) => c.id === id) ?? null;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/book-utils.mjs lib/book-utils.test.mjs lib/book-categories.mjs package.json
git commit -m "feat(livros): add pure book utils, category taxonomy and node --test setup"
```

---

### Task 2: Tabela `casara.books`

**Files:**
- Modify: `lib/schema.sql` (acrescentar ao final)
- Create: `scripts/create-books-table.mjs`

**Interfaces:**
- Consumes: `CATEGORY_IDS` de `lib/book-categories.mjs`
- Produces: tabela `casara.books` no banco

- [ ] **Step 1: Acrescente o DDL ao schema**

Modify `lib/schema.sql`, adicionando ao final do arquivo:

```sql
-- ─── Acervo de Livros ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.books (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  isbn         TEXT,
  title        TEXT NOT NULL,
  author       TEXT NOT NULL,
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
);

CREATE INDEX IF NOT EXISTS idx_books_status   ON casara.books (status);
CREATE INDEX IF NOT EXISTS idx_books_category ON casara.books (category);
CREATE INDEX IF NOT EXISTS idx_books_tags     ON casara.books USING GIN (tags);
```

Nota: `category` não tem `CHECK` no banco. A taxonomia vive em
`lib/book-categories.mjs` e mudará; um `CHECK` obrigaria uma migração a cada
ajuste da lista. A validação acontece no CLI, que é o único caminho de escrita.

- [ ] **Step 2: Escreva o script de criação**

Create `scripts/create-books-table.mjs`:

```js
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
    author       TEXT NOT NULL,
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
```

- [ ] **Step 3: Rode o dry-run**

Run: `node scripts/create-books-table.mjs`
Expected: imprime `casara.books NÃO existe.` e `Dry-run. Rode com --apply...`

- [ ] **Step 4: Crie a tabela**

Run: `node scripts/create-books-table.mjs --apply`
Expected: `✅ casara.books criada com os 3 índices.`

- [ ] **Step 5: Verifique que rodar de novo é seguro**

Run: `node scripts/create-books-table.mjs --apply`
Expected: `casara.books já existe, com 0 linha(s). Nada a fazer.`

- [ ] **Step 6: Commit**

```bash
git add lib/schema.sql scripts/create-books-table.mjs
git commit -m "feat(livros): add casara.books table and idempotent creation script"
```

---

### Task 3: Fonte de metadados (Open Library)

**Files:**
- Create: `lib/book-sources/openlibrary.mjs`
- Create: `lib/book-sources/index.mjs`
- Create: `lib/book-sources/openlibrary.test.mjs`
- Modify: `package.json` (o script `test` precisa cobrir a pasta nova)

**Interfaces:**
- Consumes: `extractYear` de `lib/book-utils.mjs`
- Produces:
  - `parseOpenLibrary(json: object, isbn: string) => BookMetadata | null`
  - `buscarMetadados(isbn: string) => Promise<BookMetadata | null>`
  - `BookMetadata = {isbn, title, author, year, publisher, pages, coverUrl, subjects}` — todos os campos exceto `title` podem ser `null`; `subjects` é sempre array.

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/book-sources/openlibrary.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOpenLibrary} from './openlibrary.mjs';

/** Resposta real da Open Library, formato jscmd=data. */
const RESPOSTA_COMPLETA = {
    'ISBN:9780441013593': {
        title: 'Dune',
        authors: [{name: 'Frank Herbert'}],
        number_of_pages: 604,
        publish_date: 'August 2005',
        publishers: [{name: 'Ace'}],
        cover: {
            small: 'https://covers.openlibrary.org/b/id/1-S.jpg',
            medium: 'https://covers.openlibrary.org/b/id/1-M.jpg',
            large: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
        subjects: [{name: 'Science fiction'}, {name: 'Desert'}],
    },
};

test('parseOpenLibrary extrai os campos da resposta completa', () => {
    const m = parseOpenLibrary(RESPOSTA_COMPLETA, '9780441013593');
    assert.equal(m.title, 'Dune');
    assert.equal(m.author, 'Frank Herbert');
    assert.equal(m.pages, 604);
    assert.equal(m.year, 2005);
    assert.equal(m.publisher, 'Ace');
    assert.equal(m.coverUrl, 'https://covers.openlibrary.org/b/id/1-L.jpg');
    assert.deepEqual(m.subjects, ['Science fiction', 'Desert']);
});

test('parseOpenLibrary devolve null quando o ISBN não está na resposta', () => {
    assert.equal(parseOpenLibrary({}, '9780441013593'), null);
    assert.equal(parseOpenLibrary(RESPOSTA_COMPLETA, '9999999999999'), null);
});

test('campos ausentes viram null em vez de quebrar — o caso comum em livro BR', () => {
    const m = parseOpenLibrary({'ISBN:123': {title: 'Só o título'}}, '123');
    assert.equal(m.title, 'Só o título');
    assert.equal(m.author, null);
    assert.equal(m.pages, null);
    assert.equal(m.year, null);
    assert.equal(m.publisher, null);
    assert.equal(m.coverUrl, null);
    assert.deepEqual(m.subjects, []);
});

test('múltiplos autores viram uma string só', () => {
    const m = parseOpenLibrary(
        {'ISBN:123': {title: 'X', authors: [{name: 'Ana'}, {name: 'Bruno'}]}}, '123');
    assert.equal(m.author, 'Ana, Bruno');
});

test('cai para medium quando large não existe', () => {
    const m = parseOpenLibrary(
        {'ISBN:123': {title: 'X', cover: {medium: 'http://m.jpg'}}}, '123');
    assert.equal(m.coverUrl, 'http://m.jpg');
});
```

- [ ] **Step 2: Amplie o script de teste e rode para ver falhar**

Modify `package.json`, trocando o script `test` por:

```json
"test": "node --test \"lib/**/*.test.mjs\""
```

Run: `npm test`
Expected: FAIL — `Cannot find module './openlibrary.mjs'`

- [ ] **Step 3: Implemente o parser e a busca**

Create `lib/book-sources/openlibrary.mjs`:

```js
/**
 * Fonte de metadados: Open Library.
 *
 * Grátis, sem chave de API, sem cadastro. Porém INCOMPLETA — especialmente para
 * edições brasileiras, onde faltar number_of_pages ou capa é rotina, não
 * exceção. Por isso todo campo (menos o título) pode voltar null, e o CLI
 * trata isso como caminho normal.
 */
import {extractYear} from '../book-utils.mjs';

const ENDPOINT = 'https://openlibrary.org/api/books';

/**
 * Converte a resposta bruta em BookMetadata.
 * Separado de buscarMetadados para ser testável sem rede.
 */
export function parseOpenLibrary(json, isbn) {
    const dados = json?.[`ISBN:${isbn}`];
    if (!dados || !dados.title) return null;

    const autores = Array.isArray(dados.authors)
        ? dados.authors.map((a) => a?.name).filter(Boolean)
        : [];

    return {
        isbn,
        title: dados.title,
        author: autores.length ? autores.join(', ') : null,
        year: extractYear(dados.publish_date ?? null),
        publisher: dados.publishers?.[0]?.name ?? null,
        pages: Number(dados.number_of_pages) || null,
        coverUrl: dados.cover?.large ?? dados.cover?.medium ?? dados.cover?.small ?? null,
        subjects: Array.isArray(dados.subjects)
            ? dados.subjects.map((s) => s?.name).filter(Boolean)
            : [],
    };
}

/** Busca por ISBN. Devolve null se não encontrar ou se a rede falhar. */
export async function buscarPorIsbn(isbn) {
    const url = `${ENDPOINT}?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    try {
        const res = await fetch(url, {headers: {'User-Agent': 'luizcasara.com/livros'}});
        if (!res.ok) return null;
        return parseOpenLibrary(await res.json(), isbn);
    } catch {
        return null;
    }
}
```

Create `lib/book-sources/index.mjs`:

```js
/**
 * Interface única de busca de metadados.
 *
 * Existe para que uma segunda fonte (ex.: um adapter de Skoob) possa entrar
 * sem tocar no CLI. A API pública do Skoob foi desligada em setembro de 2025 —
 * ver o spec para o histórico.
 */
import {buscarPorIsbn} from './openlibrary.mjs';

const FONTES = [{nome: 'Open Library', buscar: buscarPorIsbn}];

/** Tenta cada fonte em ordem e devolve a primeira que encontrar algo. */
export async function buscarMetadados(isbn) {
    for (const fonte of FONTES) {
        const r = await fonte.buscar(isbn);
        if (r) return {...r, fonte: fonte.nome};
    }
    return null;
}
```

- [ ] **Step 4: Rode os testes para ver passar**

Run: `npm test`
Expected: PASS — 11 testes no total (6 da Task 1 + 5 desta).

- [ ] **Step 5: Verifique contra a API real**

Run:
```bash
node -e "import('./lib/book-sources/index.mjs').then(async m => console.log(await m.buscarMetadados('9780441013593')))"
```
Expected: imprime o objeto de *Dune* com `fonte: 'Open Library'`. Se vier `null`, a rede ou a API está fora — confirme antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add lib/book-sources package.json
git commit -m "feat(livros): add Open Library metadata source behind a pluggable interface"
```

---

### Task 4: Pipeline de capa

**Files:**
- Create: `lib/book-cover.mjs`
- Modify: `package.json` (adicionar `sharp` em `devDependencies`)
- Create: `public/livros/capas/.gitkeep`

**Interfaces:**
- Consumes: `getCategory` de `lib/book-categories.mjs`
- Produces:
  - `baixarCapa(coverUrl: string|null, slug: string, categoryId: string, root: string) => Promise<{coverPath: string, spineColor: string, placeholder: boolean}>`

- [ ] **Step 1: Instale o sharp**

Run: `npm install --save-dev sharp`

`sharp` é devDependency porque só o CLI usa. Ele nunca entra no bundle do site.

- [ ] **Step 2: Crie a pasta de capas**

Run: `mkdir -p public/livros/capas && touch public/livros/capas/.gitkeep`

- [ ] **Step 3: Implemente o pipeline**

Create `lib/book-cover.mjs`:

```js
/**
 * Baixa, redimensiona e analisa a capa do livro.
 *
 * A capa é BAIXADA, não linkada: a API de covers da Open Library tem rate
 * limit, e linkar direto faria cada visitante bater no servidor deles.
 * Baixando, next/image funciona e a capa não some se eles mudarem de ideia.
 */
import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {getCategory} from './book-categories.mjs';

const LARGURA_MAX = 400;

/**
 * Respostas menores que isto não são capa de verdade — a Open Library devolve
 * um pixel transparente quando não tem a imagem, em vez de dar 404.
 */
const BYTES_MINIMOS = 3000;

function rgbParaHex({r, g, b}) {
    const h = (n) => Math.round(n).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/** Capa placeholder: retângulo na cor da categoria com o título escrito. */
async function gerarPlaceholder(slug, categoryId, destino) {
    const cor = getCategory(categoryId)?.cor ?? '#64748b';
    const titulo = slug.replace(/-/g, ' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
  <rect width="400" height="600" fill="${cor}"/>
  <text x="200" y="300" font-family="sans-serif" font-size="28" fill="#ffffff"
        text-anchor="middle" dominant-baseline="middle">${titulo}</text>
</svg>`;
    await sharp(Buffer.from(svg)).jpeg({quality: 82}).toFile(destino);
    return cor;
}

/**
 * Devolve { coverPath, spineColor, placeholder }.
 * `coverPath` é o caminho público (/livros/capas/<slug>.jpg), não o do disco.
 */
export async function baixarCapa(coverUrl, slug, categoryId, root) {
    const pasta = join(root, 'public', 'livros', 'capas');
    await mkdir(pasta, {recursive: true});
    const destino = join(pasta, `${slug}.jpg`);
    const coverPath = `/livros/capas/${slug}.jpg`;

    if (!coverUrl) {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    let buffer;
    try {
        const res = await fetch(coverUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buffer = Buffer.from(await res.arrayBuffer());
    } catch {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    if (buffer.length < BYTES_MINIMOS) {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    // stats().dominant é a cor dominante calculada pelo próprio sharp.
    const {dominant} = await sharp(buffer).stats();
    await sharp(buffer)
        .resize(LARGURA_MAX, null, {fit: 'inside', withoutEnlargement: true})
        .jpeg({quality: 82})
        .toFile(destino);

    return {coverPath, spineColor: rgbParaHex(dominant), placeholder: false};
}
```

- [ ] **Step 4: Verifique com uma capa real**

Run:
```bash
node -e "import('./lib/book-cover.mjs').then(async m => console.log(await m.baixarCapa('https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg','teste-duna','ficcao-cientifica',process.cwd())))"
```
Expected: imprime `{coverPath: '/livros/capas/teste-duna.jpg', spineColor: '#...', placeholder: false}` e o arquivo existe.

- [ ] **Step 5: Verifique o caminho do placeholder**

Run:
```bash
node -e "import('./lib/book-cover.mjs').then(async m => console.log(await m.baixarCapa(null,'teste-sem-capa','fantasia',process.cwd())))"
```
Expected: `placeholder: true` e `spineColor: '#6366f1'` (a cor de fantasia).

- [ ] **Step 6: Limpe os arquivos de teste e commit**

```bash
rm public/livros/capas/teste-duna.jpg public/livros/capas/teste-sem-capa.jpg
git add lib/book-cover.mjs package.json package-lock.json public/livros/capas/.gitkeep
git commit -m "feat(livros): add cover download pipeline with dominant color extraction"
```

---

### Task 5: CLI — esqueleto e `list`

**Files:**
- Create: `scripts/livros.mjs`

**Interfaces:**
- Consumes: `buscarMetadados`, `CATEGORIES`, `lib/db` não (o CLI usa `neon()` direto, como `migrate-casara.mjs`)
- Produces:
  - `abrirBanco() => NeonQueryFunction` (interno)
  - subcomando `list`

- [ ] **Step 1: Escreva o esqueleto com `list`**

Create `scripts/livros.mjs`:

```js
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

const [, , comando, argumento] = process.argv;

if (!comando || comando === '--help' || comando === '-h') {
    console.log(AJUDA);
    process.exit(0);
}

const sql = abrirBanco();

switch (comando) {
    case 'list':
        await comandoList(sql);
        break;
    default:
        console.error(`Comando desconhecido: ${comando}`);
        console.log(AJUDA);
        process.exit(1);
}
```

- [ ] **Step 2: Rode o `list` no acervo vazio**

Run: `node scripts/livros.mjs list`
Expected: `Acervo vazio. Use: node scripts/livros.mjs add <isbn>`

- [ ] **Step 3: Rode a ajuda**

Run: `node scripts/livros.mjs --help`
Expected: imprime o bloco de ajuda, incluindo o aviso sobre `--wait`.

- [ ] **Step 4: Commit**

```bash
git add scripts/livros.mjs
git commit -m "feat(livros): add CLI skeleton with list command"
```

---

### Task 6: CLI — comando `add`

**Files:**
- Modify: `scripts/livros.mjs`

**Interfaces:**
- Consumes: `buscarMetadados` (`lib/book-sources/index.mjs`), `baixarCapa` (`lib/book-cover.mjs`), `slugify`/`normalizeTag`/`tagKey` (`lib/book-utils.mjs`), `CATEGORIES` (`lib/book-categories.mjs`)
- Produces: subcomando `add <isbn> [--dry-run]`

- [ ] **Step 1: Acrescente os imports e os helpers de prompt**

Modify `scripts/livros.mjs`, adicionando após o import do `neon`:

```js
import {createInterface} from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {writeFileSync, readFileSync as lerArquivo, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {buscarMetadados} from '../lib/book-sources/index.mjs';
import {baixarCapa} from '../lib/book-cover.mjs';
import {slugify, normalizeTag, tagKey} from '../lib/book-utils.mjs';
import {CATEGORY_IDS} from '../lib/book-categories.mjs';
```

E adicione antes da constante `AJUDA`:

```js
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
 * Abre o editor para escrever a resenha em Markdown.
 * O --wait no EDITOR é obrigatório — sem ele o spawnSync retorna antes de você
 * escrever qualquer coisa e a resenha vem vazia.
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
    return texto;
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
```

- [ ] **Step 2: Implemente o comando `add`**

Modify `scripts/livros.mjs`, adicionando antes do bloco `const [, , comando...]`:

```js
async function comandoAdd(sql, isbn, dryRun) {
    if (!isbn) {
        console.error('Faltou o ISBN. Uso: node scripts/livros.mjs add <isbn>');
        process.exit(1);
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
            process.exit(1);
        }
        const author = await perguntar(io, 'Autor', meta?.author ?? '');
        const year = await perguntar(io, 'Ano', meta?.year ?? '');
        const publisher = await perguntar(io, 'Editora', meta?.publisher ?? '');
        const pages = await perguntar(io, 'Páginas', meta?.pages ?? '');

        console.log(`\nCategorias: ${CATEGORY_IDS.join(', ')}`);
        let category = await perguntar(io, 'Categoria', CATEGORY_IDS[0]);
        while (!CATEGORY_IDS.includes(category)) {
            console.log(`"${category}" não existe. Escolha uma de: ${CATEGORY_IDS.join(', ')}`);
            category = await perguntar(io, 'Categoria', CATEGORY_IDS[0]);
        }

        const jaUsadas = await tagsExistentes(sql);
        if (jaUsadas.length) console.log(`Tags já usadas: ${jaUsadas.join(', ')}`);
        const tags = resolverTags(await perguntar(io, 'Tags (separadas por vírgula)'), jaUsadas);

        let status = await perguntar(io, 'Status (lendo/lido)', 'lido');
        while (status !== 'lendo' && status !== 'lido') {
            status = await perguntar(io, 'Status precisa ser "lendo" ou "lido"', 'lido');
        }

        const progress = status === 'lendo'
            ? Number(await perguntar(io, 'Progresso (0-100)', '0')) : null;
        const rating = await perguntar(io, 'Nota (0 a 5, pode ser 4.5)', '');
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
        const review = abrirEditor(`# ${title}\n\n`);
        if (!review) console.log('Resenha vazia — o livro entra sem texto. Use "edit" depois.');

        const linha = {
            slug, isbn, title,
            author: author || null,
            year: year ? Number(year) : null,
            publisher: publisher || null,
            pages: pages ? Number(pages) : null,
            synopsis: synopsis || null,
            cover_path: coverPath,
            spine_color: spineColor,
            rating: rating ? Number(rating) : null,
            category,
            tags,
            status,
            progress_pct: progress,
            review: review || null,
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
```

E acrescente o caso no `switch`:

```js
    case 'add':
        await comandoAdd(sql, argumento, process.argv.includes('--dry-run'));
        break;
```

- [ ] **Step 3: Rode com `--dry-run`**

Run: `node scripts/livros.mjs add 9780441013593 --dry-run`

Responda os prompts (aceitando os padrões com Enter), escreva algo no editor e feche.
Expected: mostra a tabela do que seria gravado e termina com `--dry-run: nada foi gravado.` Confirme que `casara.books` continua vazia com `node scripts/livros.mjs list`.

- [ ] **Step 4: Cadastre um livro de verdade**

Run: `node scripts/livros.mjs add 9780441013593`
Expected: pede confirmação, grava, e imprime `✅ Gravado. Veja em /livros/dune`

Run: `node scripts/livros.mjs list`
Expected: a tabela mostra 1 livro.

- [ ] **Step 5: Verifique a proteção contra slug duplicado**

Run: `node scripts/livros.mjs add 9780441013593 --dry-run`
Expected: imprime `Slug "dune" já existia — usando "dune-2005".` (ou similar, conforme o ano).

- [ ] **Step 6: Commit**

```bash
git add scripts/livros.mjs
git commit -m "feat(livros): add CLI add command with Open Library lookup and editor prompt"
```

---

### Task 7: CLI — comando `edit`

**Files:**
- Modify: `scripts/livros.mjs`

**Interfaces:**
- Consumes: helpers da Task 6 (`perguntar`, `confirmar`, `abrirEditor`, `resolverTags`, `tagsExistentes`)
- Produces: subcomando `edit <slug>`

- [ ] **Step 1: Implemente o `edit`**

Modify `scripts/livros.mjs`, adicionando após `comandoAdd`:

```js
async function comandoEdit(sql, slug) {
    if (!slug) {
        console.error('Faltou o slug. Uso: node scripts/livros.mjs edit <slug>');
        process.exit(1);
    }

    const [livro] = await sql`SELECT * FROM casara.books WHERE slug = ${slug}`;
    if (!livro) {
        console.error(`Não achei nenhum livro com slug "${slug}". Veja: livros.mjs list`);
        process.exit(1);
    }

    const io = rl();
    try {
        console.log(`\nEditando "${livro.title}". Enter mantém o valor atual.`);

        const title = await perguntar(io, 'Título', livro.title);
        const author = await perguntar(io, 'Autor', livro.author ?? '');
        const rating = await perguntar(io, 'Nota', livro.rating ?? '');
        const synopsis = await perguntar(io, 'Sinopse', livro.synopsis ?? '');

        let category = await perguntar(io, 'Categoria', livro.category);
        while (!CATEGORY_IDS.includes(category)) {
            console.log(`"${category}" não existe. Escolha uma de: ${CATEGORY_IDS.join(', ')}`);
            category = await perguntar(io, 'Categoria', livro.category);
        }

        const jaUsadas = await tagsExistentes(sql);
        const tags = resolverTags(
            await perguntar(io, 'Tags', (livro.tags ?? []).join(', ')), jaUsadas);

        let status = await perguntar(io, 'Status (lendo/lido)', livro.status);
        while (status !== 'lendo' && status !== 'lido') {
            status = await perguntar(io, 'Status precisa ser "lendo" ou "lido"', livro.status);
        }
        const progress = status === 'lendo'
            ? Number(await perguntar(io, 'Progresso (0-100)', livro.progress_pct ?? '0'))
            : null;

        const review = await confirmar(io, 'Abrir o editor para a resenha?')
            ? abrirEditor(livro.review ?? `# ${title}\n\n`)
            : livro.review;

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
                rating       = ${rating ? Number(rating) : null},
                synopsis     = ${synopsis || null},
                category     = ${category},
                tags         = ${tags},
                status       = ${status},
                progress_pct = ${progress},
                review       = ${review || null},
                updated_at   = NOW()
            WHERE slug = ${slug}`;

        console.log(`✅ Atualizado. Veja em /livros/${slug}`);
    } finally {
        io.close();
    }
}
```

E acrescente o caso no `switch`:

```js
    case 'edit':
        await comandoEdit(sql, argumento);
        break;
```

- [ ] **Step 2: Teste o slug inexistente**

Run: `node scripts/livros.mjs edit nao-existe`
Expected: `Não achei nenhum livro com slug "nao-existe". Veja: livros.mjs list` e sai com código 1.

- [ ] **Step 3: Edite o livro cadastrado**

Run: `node scripts/livros.mjs edit dune`
Aceite os padrões, responda `n` para o editor, e confirme.
Expected: `✅ Atualizado.`

- [ ] **Step 4: Teste o cancelamento**

Run: `node scripts/livros.mjs edit dune`, mude o título, e responda `n` na confirmação final.
Expected: `Cancelado. Nada foi alterado.` — confirme com `list` que o título antigo permanece.

- [ ] **Step 5: Commit**

```bash
git add scripts/livros.mjs
git commit -m "feat(livros): add CLI edit command"
```

---

### Task 8: Queries e tipos do Next

**Files:**
- Create: `lib/books.ts`

**Interfaces:**
- Consumes: `sql` de `@/lib/db`
- Produces:
  - `type Book` — todos os campos da tabela
  - `type BookFilters = {categoria?: string, tag?: string, status?: string}`
  - `listarLivros(filtros: BookFilters) => Promise<Book[]>`
  - `buscarLivroPorSlug(slug: string) => Promise<Book | null>`
  - `listarTags() => Promise<string[]>`
  - `listarSlugs() => Promise<string[]>`

- [ ] **Step 1: Implemente as queries**

Create `lib/books.ts`:

```ts
import sql from '@/lib/db';

export type BookStatus = 'lendo' | 'lido';

export type Book = {
    id: number;
    slug: string;
    isbn: string | null;
    title: string;
    author: string | null;
    year: number | null;
    publisher: string | null;
    pages: number | null;
    synopsis: string | null;
    cover_path: string | null;
    spine_color: string | null;
    rating: string | null;   // NUMERIC volta como string do driver do Neon
    category: string;
    tags: string[];
    status: BookStatus;
    progress_pct: number | null;
    finished_at: string | null;
    review: string | null;
    shelf_order: number | null;
};

export type BookFilters = {
    categoria?: string;
    tag?: string;
    status?: string;
};

/**
 * Lista com filtros opcionais.
 *
 * Cada filtro é aplicado como `(<param> IS NULL OR <coluna> = <param>)`, então
 * a query é uma só e continua parametrizada — nada de concatenar SQL.
 * `casara.` é obrigatório: o search_path da conexão não inclui esse schema.
 */
export async function listarLivros(filtros: BookFilters = {}): Promise<Book[]> {
    const categoria = filtros.categoria || null;
    const tag = filtros.tag || null;
    const status = filtros.status || null;

    return (await sql`
        SELECT *
        FROM casara.books
        WHERE (${categoria}::text IS NULL OR category = ${categoria})
          AND (${tag}::text IS NULL OR ${tag} = ANY (tags))
          AND (${status}::text IS NULL OR status = ${status})
        ORDER BY status DESC, COALESCE(shelf_order, 32767), title
    `) as Book[];
}

export async function buscarLivroPorSlug(slug: string): Promise<Book | null> {
    const linhas = (await sql`
        SELECT * FROM casara.books WHERE slug = ${slug}
    `) as Book[];
    return linhas[0] ?? null;
}

/** Tags distintas do acervo, para montar os filtros. */
export async function listarTags(): Promise<string[]> {
    const linhas = (await sql`
        SELECT DISTINCT unnest(tags) AS tag FROM casara.books ORDER BY tag
    `) as {tag: string}[];
    return linhas.map((l) => l.tag);
}

/** Usado pelo generateStaticParams da página do livro. */
export async function listarSlugs(): Promise<string[]> {
    const linhas = (await sql`SELECT slug FROM casara.books`) as {slug: string}[];
    return linhas.map((l) => l.slug);
}
```

- [ ] **Step 2: Verifique que compila**

Run: `rtk tsc --noEmit`
Expected: nenhum erro em `lib/books.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/books.ts
git commit -m "feat(livros): add book queries and types for the Next side"
```

---

### Task 9: Componentes de apresentação

**Files:**
- Create: `components/livros/StarRating.tsx`
- Create: `components/livros/BookCard.tsx`
- Create: `components/livros/BookFilters.tsx`

**Interfaces:**
- Consumes: `Book` de `@/lib/books`, `getCategory` de `@/lib/book-categories.mjs`
- Produces:
  - `<StarRating nota={string|number|null} />`
  - `<BookCard livro={Book} />`
  - `<BookFilters categorias={{id,nome,cor}[]} tags={string[]} ativos={BookFilters} />`

- [ ] **Step 1: Crie o StarRating**

Create `components/livros/StarRating.tsx`:

```tsx
import {FaStar, FaStarHalfAlt, FaRegStar} from 'react-icons/fa';

/**
 * Nota em estrelas. Aceita string porque o driver do Neon devolve NUMERIC
 * como string.
 */
export default function StarRating({nota, tamanho = 'text-sm'}: {
    nota: string | number | null;
    tamanho?: string;
}) {
    if (nota === null || nota === undefined || nota === '') return null;
    const valor = Number(nota);
    if (Number.isNaN(valor)) return null;

    return (
        <span className={`inline-flex items-center gap-0.5 text-amber-500 ${tamanho}`}
              aria-label={`Nota ${valor} de 5`}>
            {[1, 2, 3, 4, 5].map((i) => {
                if (valor >= i) return <FaStar key={i} aria-hidden/>;
                if (valor >= i - 0.5) return <FaStarHalfAlt key={i} aria-hidden/>;
                return <FaRegStar key={i} aria-hidden/>;
            })}
        </span>
    );
}
```

- [ ] **Step 2: Crie o BookCard**

Create `components/livros/BookCard.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import type {Book} from '@/lib/books';
import {getCategory} from '@/lib/book-categories.mjs';
import StarRating from './StarRating';

export default function BookCard({livro}: {livro: Book}) {
    const categoria = getCategory(livro.category);

    return (
        <Link href={`/livros/${livro.slug}`}
              className="group flex flex-col gap-2 rounded-lg p-2 transition
                         hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded shadow-md">
                {livro.cover_path && (
                    <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill
                           sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"
                           className="object-cover transition group-hover:scale-105"/>
                )}
                {livro.status === 'lendo' && (
                    <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5
                                     text-[10px] font-bold uppercase text-white">
                        lendo
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
                    {livro.title}
                </h2>
                {livro.author && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{livro.author}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                    <StarRating nota={livro.rating}/>
                    {categoria && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{backgroundColor: categoria.cor}}>
                            {categoria.nome}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
```

- [ ] **Step 3: Crie o BookFilters**

Os filtros são links, não estado de cliente — assim cada combinação tem URL
própria e continua compartilhável, e o componente permanece server-side.

Create `components/livros/BookFilters.tsx`:

```tsx
import Link from 'next/link';
import type {BookFilters as Filtros} from '@/lib/books';

type Categoria = {id: string; nome: string; cor: string};

/** Monta a query string preservando os outros filtros ativos. */
function href(ativos: Filtros, campo: keyof Filtros, valor: string | null) {
    const params = new URLSearchParams();
    const proximo = {...ativos, [campo]: valor ?? undefined};
    for (const [k, v] of Object.entries(proximo)) if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/livros/lista?${qs}` : '/livros/lista';
}

function Chip({ativo, children, url, cor}: {
    ativo: boolean; children: React.ReactNode; url: string; cor?: string;
}) {
    return (
        <Link href={url}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  ativo
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ' +
                        'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              style={ativo && cor ? {backgroundColor: cor} : undefined}>
            {children}
        </Link>
    );
}

export default function BookFilters({categorias, tags, ativos}: {
    categorias: Categoria[];
    tags: string[];
    ativos: Filtros;
}) {
    const temFiltro = Boolean(ativos.categoria || ativos.tag || ativos.status);

    return (
        <div className="mb-8 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Status</span>
                <Chip ativo={ativos.status === 'lendo'} cor="#059669"
                      url={href(ativos, 'status', ativos.status === 'lendo' ? null : 'lendo')}>
                    Lendo agora
                </Chip>
                <Chip ativo={ativos.status === 'lido'} cor="#475569"
                      url={href(ativos, 'status', ativos.status === 'lido' ? null : 'lido')}>
                    Já li
                </Chip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Categoria</span>
                {categorias.map((c) => (
                    <Chip key={c.id} ativo={ativos.categoria === c.id} cor={c.cor}
                          url={href(ativos, 'categoria', ativos.categoria === c.id ? null : c.id)}>
                        {c.nome}
                    </Chip>
                ))}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-400">Tags</span>
                    {tags.map((t) => (
                        <Chip key={t} ativo={ativos.tag === t} cor="#0ea5e9"
                              url={href(ativos, 'tag', ativos.tag === t ? null : t)}>
                            {t}
                        </Chip>
                    ))}
                </div>
            )}

            {temFiltro && (
                <Link href="/livros/lista"
                      className="self-start text-xs text-gray-500 underline hover:text-gray-800
                                 dark:hover:text-gray-200">
                    limpar filtros
                </Link>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Verifique que compila**

Run: `rtk tsc --noEmit`
Expected: nenhum erro nos três arquivos novos.

- [ ] **Step 5: Commit**

```bash
git add components/livros
git commit -m "feat(livros): add book card, star rating and URL-driven filters"
```

---

### Task 10: Páginas `/livros`, `/livros/lista` e `/livros/[slug]`

**Files:**
- Create: `app/livros/page.tsx`
- Create: `app/livros/lista/page.tsx`
- Create: `app/livros/[slug]/page.tsx`
- Modify: `package.json` (adicionar `react-markdown`)

**Interfaces:**
- Consumes: `listarLivros`, `buscarLivroPorSlug`, `listarTags` de `@/lib/books`; `CATEGORIES`, `getCategory` de `@/lib/book-categories.mjs`; componentes da Task 9
- Produces: as três rotas

- [ ] **Step 1: Instale o react-markdown e o plugin de tipografia**

Run: `npm install react-markdown && npm install -D @tailwindcss/typography`

Modify `tailwind.config.ts`, trocando `plugins: []` por:

```ts
  plugins: [require("@tailwindcss/typography")],
```

O plugin fornece as classes `prose` usadas para renderizar a resenha. Sem ele o
Markdown sai sem hierarquia tipográfica — títulos do mesmo tamanho do corpo,
listas sem recuo.

- [ ] **Step 2: Crie o redirecionamento de `/livros`**

Na fase 1 `/livros` apenas redireciona. Na fase 2 este arquivo é substituído
pela sala 3D, e `/livros/lista` permanece intocada — por isso o redirect, e não
renderizar a lista aqui: evita uma renomeação de rota depois.

Create `app/livros/page.tsx`:

```tsx
import {redirect} from 'next/navigation';

/** Fase 1: a lista é a única visão. Na fase 2 este arquivo vira a sala 3D. */
export default function LivrosPage() {
    redirect('/livros/lista');
}
```

- [ ] **Step 3: Crie a lista**

Create `app/livros/lista/page.tsx`:

```tsx
import type {Metadata} from 'next';
import {listarLivros, listarTags} from '@/lib/books';
import {CATEGORIES} from '@/lib/book-categories.mjs';
import BookCard from '@/components/livros/BookCard';
import BookFilters from '@/components/livros/BookFilters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Livros',
    description: 'Os livros que li e o que penso sobre cada um deles.',
};

export default async function ListaPage({searchParams}: {
    searchParams: Promise<{categoria?: string; tag?: string; status?: string}>;
}) {
    const filtros = await searchParams;
    const [livros, tags] = await Promise.all([listarLivros(filtros), listarTags()]);

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10">
                    <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
                        Livros
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        Os livros que li e o que penso sobre cada um deles.
                    </p>
                </div>

                <BookFilters categorias={CATEGORIES} tags={tags} ativos={filtros}/>

                {livros.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">
                        Nenhum livro por aqui ainda.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {livros.map((l) => <BookCard key={l.slug} livro={l}/>)}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Crie a página do livro**

Create `app/livros/[slug]/page.tsx`:

```tsx
import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {buscarLivroPorSlug} from '@/lib/books';
import {getCategory} from '@/lib/book-categories.mjs';
import StarRating from '@/components/livros/StarRating';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {
    params: Promise<{slug: string}>;
}): Promise<Metadata> {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) return {title: 'Livro não encontrado'};

    const descricao = livro.synopsis
        ?? `${livro.title}${livro.author ? `, de ${livro.author}` : ''} — o que achei do livro.`;

    return {
        title: livro.title,
        description: descricao,
        openGraph: {
            title: livro.title,
            description: descricao,
            type: 'article',
            images: livro.cover_path ? [livro.cover_path] : undefined,
        },
    };
}

export default async function LivroPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const livro = await buscarLivroPorSlug(slug);
    if (!livro) notFound();

    const categoria = getCategory(livro.category);

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <Link href="/livros/lista"
                      className="mb-8 inline-block text-sm text-gray-500 underline
                                 hover:text-gray-800 dark:hover:text-gray-200">
                    ← todos os livros
                </Link>

                <div className="flex flex-col gap-8 sm:flex-row">
                    {livro.cover_path && (
                        <div className="relative aspect-[2/3] w-40 shrink-0 self-start
                                        overflow-hidden rounded shadow-lg">
                            <Image src={livro.cover_path} alt={`Capa de ${livro.title}`} fill
                                   sizes="160px" className="object-cover" priority/>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {livro.title}
                        </h1>
                        {livro.author && (
                            <p className="text-gray-600 dark:text-gray-300">{livro.author}</p>
                        )}

                        <StarRating nota={livro.rating} tamanho="text-lg"/>

                        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm
                                       text-gray-500 dark:text-gray-400">
                            {livro.year && (<><dt className="font-medium">Ano</dt><dd>{livro.year}</dd></>)}
                            {livro.publisher && (<><dt className="font-medium">Editora</dt><dd>{livro.publisher}</dd></>)}
                            {livro.pages && (<><dt className="font-medium">Páginas</dt><dd>{livro.pages}</dd></>)}
                        </dl>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {categoria && (
                                <span className="rounded px-2 py-0.5 text-xs font-medium text-white"
                                      style={{backgroundColor: categoria.cor}}>
                                    {categoria.nome}
                                </span>
                            )}
                            {livro.tags.map((t) => (
                                <Link key={t} href={`/livros/lista?tag=${encodeURIComponent(t)}`}
                                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs
                                                 text-gray-600 hover:bg-gray-200
                                                 dark:bg-gray-800 dark:text-gray-300">
                                    {t}
                                </Link>
                            ))}
                        </div>

                        {livro.status === 'lendo' && livro.progress_pct !== null && (
                            <p className="mt-2 text-sm font-medium text-emerald-600">
                                Lendo agora — {livro.progress_pct}%
                            </p>
                        )}
                    </div>
                </div>

                {livro.synopsis && (
                    <p className="mt-10 border-l-2 border-gray-300 pl-4 text-sm italic
                                  text-gray-600 dark:border-gray-700 dark:text-gray-400">
                        {livro.synopsis}
                    </p>
                )}

                {livro.review && (
                    <article className="prose prose-sm mt-10 max-w-none dark:prose-invert">
                        <ReactMarkdown>{livro.review}</ReactMarkdown>
                    </article>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Rode o dev server e verifique as três rotas**

Run: `npm run dev`

Verifique:
- `http://localhost:3000/livros` → redireciona para `/livros/lista`
- `http://localhost:3000/livros/lista` → mostra o livro cadastrado na Task 6
- `http://localhost:3000/livros/lista?status=lendo` → lista vazia (o livro é `lido`)
- `http://localhost:3000/livros/dune` → página completa com capa e ficha
- `http://localhost:3000/livros/nao-existe` → página 404

- [ ] **Step 6: Rode o build**

Run: `rtk next build`
Expected: build sem erros; as rotas `/livros`, `/livros/lista` e `/livros/[slug]` aparecem na saída.

- [ ] **Step 7: Commit**

```bash
git add app/livros package.json package-lock.json
git commit -m "feat(livros): add list and book detail pages"
```

---

### Task 11: Integração com rotas, analytics e documentação

**Files:**
- Modify: `lib/routes.ts`
- Modify: `utils/analytics.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nada
- Produces: `trackBookOpened(slug)`, `trackBookFilter(campo, valor)` em `utils/analytics.ts`

- [ ] **Step 1: Registre as rotas novas**

Sem isto o `middleware.ts` descarta os `page_view` de `/livros` como se fossem
varredura de bot, e a seção fica invisível no `/stats`.

Modify `lib/routes.ts`, trocando a linha:

```ts
  `|^/(about|projects|app|casamento|stats)$` +
```

por:

```ts
  `|^/(about|projects|app|casamento|stats)$` +
  `|^/livros$` +
  `|^/livros/lista$` +
  `|^/livros/[a-z0-9-]+$` +
```

- [ ] **Step 2: Verifique que o regex casa o esperado**

Create `lib/routes.check.mjs` (arquivo temporário, apagado no Step 3):

```js
// Cópia literal do padrão de lib/routes.ts, só para conferir o comportamento.
import {readFileSync} from 'node:fs';

const fonte = readFileSync('lib/routes.ts', 'utf8');
const trechos = [...fonte.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
const padrao = trechos.filter((t) => t.startsWith('^') || t.startsWith('|^')).join('');
const re = new RegExp(padrao);

const casos = [
    ['/livros', true],
    ['/livros/lista', true],
    ['/livros/dune', true],
    ['/livros/a-revolta-de-atlas', true],
    ['/livros/capas/x.jpg', false],
    ['/livros/DUNE', false],
    ['/about', true],
];

let falhou = false;
for (const [rota, esperado] of casos) {
    const real = re.test(rota);
    if (real !== esperado) falhou = true;
    console.log(`${real === esperado ? 'OK    ' : 'FALHOU'} ${rota} (esperado ${esperado})`);
}
process.exit(falhou ? 1 : 0);
```

Run: `node lib/routes.check.mjs`
Expected: sete linhas `OK` e saída com código 0.

Se a extração do padrão falhar, cole o valor de `REAL_ROUTE_PATTERN` direto
dentro do arquivo — o objetivo do passo é conferir o comportamento do regex, não
o parsing do arquivo.

- [ ] **Step 3: Apague o arquivo de verificação**

Run: `rm lib/routes.check.mjs`

Ele não pode ficar: `npm test` roda `lib/**/*.test.mjs` e este arquivo não é um
teste, mas deixá-lo em `lib/` confunde quem for ler a pasta depois.

- [ ] **Step 4: Adicione os eventos de analytics**

Modify `utils/analytics.ts`, adicionando ao final do arquivo:

```ts
// ─── Livros ───────────────────────────────────────────────────────────────────

export const trackBookOpened = (slug: string) =>
  trackEvent('book_opened', { slug });

export const trackBookFilter = (campo: string, valor: string) =>
  trackEvent('book_filter', { campo, valor });
```

Os eventos `room_loaded`, `shelf_sorted`, `index_opened` e `list_fallback` do
spec pertencem à sala 3D e entram nas fases seguintes.

- [ ] **Step 5: Documente a arquitetura no CLAUDE.md**

Modify `CLAUDE.md`, adicionando uma seção nova depois de "Sorteio (raffle/random draw)":

```markdown
### Acervo de Livros

`/livros` (fase 1: redireciona para `/livros/lista`; vira a sala 3D na fase 2),
`/livros/lista` (grade com filtros por categoria/tag/status, todos via query
param para serem compartilháveis) e `/livros/[slug]` (página do livro,
server-rendered para SEO). Ver `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`.

- **Não existe rota de admin.** O cadastro acontece só por `scripts/livros.mjs`,
  rodando localmente — foi requisito explícito de não criar superfície de ataque
  pública. O script lê `DATABASE_URL` de `.env.local` com o mesmo parsing manual
  de `scripts/migrate-casara.mjs`, escreve em **produção**, e por isso sempre
  mostra o que vai gravar e pede confirmação; tem `--dry-run`
- **A lógica pura vive em `.mjs`, não `.ts`** (`lib/book-utils.mjs`,
  `lib/book-categories.mjs`, `lib/book-sources/`, `lib/book-cover.mjs`): o CLI é
  Node puro e não consegue importar `.ts` sem build. Esses arquivos são
  importados tanto pelo CLI quanto pelo Next, e são os únicos cobertos por teste
  (`npm test`, via `node --test`) — porque um bug ali corrompe dado permanente
- `lib/books.ts` é o lado Next: tipo `Book` e queries. Sempre `casara.books`
- **Um livro tem UMA `category`** (taxonomia fechada em `lib/book-categories.mjs`,
  define a cor e, na fase 2, a posição na estante) **e N `tags` livres** (eixo
  transversal de busca). Multi-categoria tornaria a posição na prateleira ambígua
- **Capas são baixadas, não linkadas** (`public/livros/capas/<slug>.jpg`): a API
  de covers da Open Library tem rate limit e linkar direto faria cada visitante
  bater no servidor deles. `spine_color` é a cor dominante, extraída uma vez no
  cadastro pelo `sharp` — o navegador nunca faz esse trabalho
- **A Open Library é incompleta**, sobretudo para edições brasileiras: faltar
  `number_of_pages` ou capa é rotina. O CLI trata isso como caminho normal
  (pergunta no terminal, gera capa placeholder), não como erro
- Skoob **não** é uma fonte: a API pública foi desligada em setembro de 2025 e
  não há exportação nativa. `lib/book-sources/index.mjs` existe como gancho caso
  isso mude
- `/livros` é **só em português**, como os mini-apps e as dinâmicas — o
  `LanguageProvider` cobre apenas home, about, projects e a listagem `/app`
```

- [ ] **Step 6: Rode a suite completa e o build**

Run: `npm test && rtk next build`
Expected: 11 testes passando e build sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/routes.ts utils/analytics.ts CLAUDE.md
git commit -m "feat(livros): register routes for analytics, add tracking and document architecture"
```

---

### Task 12: CLI — comando `seed` (importação em lote)

**Files:**
- Create: `lib/book-sources/openlibrary-search.mjs`
- Create: `lib/book-sources/openlibrary-search.test.mjs`
- Modify: `scripts/livros.mjs`
- Já existe (não criar): `scripts/seed/acervo.json`

**Por que este comando existe:** o `add` funciona por ISBN, um livro por vez —
é o fluxo do dia a dia. O acervo inicial tem 51 livros e **nenhum ISBN**, só
título e autor. São caminhos diferentes na Open Library: `/api/books` (lookup por
ISBN) versus `/search.json` (busca por título+autor).

**A regra que evita dado sujo:** `scripts/seed/acervo.json` é a **fonte da
verdade** para `title`, `author`, `rating`, `category`, `tags` e `status`. A
Open Library fornece **apenas** capa, páginas e ano. Isso não é preferência —
é necessidade verificada: a busca por "A Revolta de Atlas" devolve, dentro de
`author_name`, um texto de marketing ("Best-seller há mais de 50 anos, com 11
milhões de exemplares vendidos...") como se fosse um segundo autor, e casa com o
box de 3 volumes (1232 páginas) em vez do livro.

**Interfaces:**
- Consumes: `buscarPorIsbn` não; usa `baixarCapa`, `slugify`, `slugLivre`, `resolverTags`, `tagsExistentes`, `CATEGORY_IDS`
- Produces:
  - `montarUrlBusca(title: string, author: string) => string`
  - `parseBusca(json: object) => {pages, year, coverUrl} | null`
  - `buscarPorTitulo(title: string, author: string) => Promise<{pages, year, coverUrl} | null>`
  - subcomando `seed [--limit N] [--apply] [--incluir-revisar]`

- [ ] **Step 1: Escreva o teste que falha**

Create `lib/book-sources/openlibrary-search.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {montarUrlBusca, parseBusca} from './openlibrary-search.mjs';

test('montarUrlBusca escapa acentos e espaços', () => {
    const url = montarUrlBusca('A Revolução dos Bichos', 'George Orwell');
    assert.ok(url.startsWith('https://openlibrary.org/search.json?'));
    assert.ok(url.includes('title=A+Revolu%C3%A7%C3%A3o+dos+Bichos'));
    assert.ok(url.includes('author=George+Orwell'));
    assert.ok(url.includes('limit=1'));
});

test('parseBusca monta a URL da capa a partir do cover_i', () => {
    const r = parseBusca({
        numFound: 1,
        docs: [{
            title: 'O Hobbit',
            cover_i: 15121777,
            first_publish_year: 1937,
            number_of_pages_median: 310,
        }],
    });
    assert.equal(r.coverUrl, 'https://covers.openlibrary.org/b/id/15121777-L.jpg');
    assert.equal(r.pages, 310);
    assert.equal(r.year, 1937);
});

test('parseBusca devolve null quando não há resultado', () => {
    assert.equal(parseBusca({numFound: 0, docs: []}), null);
    assert.equal(parseBusca({}), null);
});

test('campos ausentes viram null, e a ausência de capa não invalida o resultado', () => {
    const r = parseBusca({docs: [{title: 'X'}]});
    assert.equal(r.coverUrl, null);
    assert.equal(r.pages, null);
    assert.equal(r.year, null);
});

test('parseBusca NUNCA devolve autor — o arquivo de seed é a fonte da verdade', () => {
    // O registro real de "A Revolta de Atlas" traz marketing em author_name.
    const r = parseBusca({
        docs: [{
            title: 'Box A Revolta de Atlas - 3 Volumes',
            author_name: ['Ayn Rand', 'Best-seller há mais de 50 anos, com 11 milhões...'],
            cover_i: 10489048,
        }],
    });
    assert.equal(r.author, undefined);
    assert.equal(r.title, undefined);
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module './openlibrary-search.mjs'`

- [ ] **Step 3: Implemente a busca**

Create `lib/book-sources/openlibrary-search.mjs`:

```js
/**
 * Busca na Open Library por título + autor.
 *
 * Endpoint diferente do lookup por ISBN (openlibrary.mjs): /search.json em vez
 * de /api/books. Usado só pelo comando `seed`, onde não existem ISBNs.
 *
 * Devolve APENAS pages, year e coverUrl. Nunca título nem autor: a busca da
 * Open Library é suja nesses campos — o registro de "A Revolta de Atlas" traz
 * um texto publicitário dentro de author_name, e a melhor correspondência de
 * título costuma ser um box ou uma edição estrangeira.
 */
const ENDPOINT = 'https://openlibrary.org/search.json';
const CAMPOS = 'title,author_name,first_publish_year,number_of_pages_median,cover_i';

export function montarUrlBusca(title, author) {
    const p = new URLSearchParams({
        title: String(title),
        author: String(author ?? ''),
        limit: '1',
        fields: CAMPOS,
    });
    return `${ENDPOINT}?${p}`;
}

/** Extrai só o que é confiável do primeiro resultado. */
export function parseBusca(json) {
    const doc = json?.docs?.[0];
    if (!doc) return null;
    return {
        pages: Number(doc.number_of_pages_median) || null,
        year: Number(doc.first_publish_year) || null,
        coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
            : null,
    };
}

export async function buscarPorTitulo(title, author) {
    try {
        const res = await fetch(montarUrlBusca(title, author), {
            headers: {'User-Agent': 'luizcasara.com/livros'},
        });
        if (!res.ok) return null;
        return parseBusca(await res.json());
    } catch {
        return null;
    }
}
```

- [ ] **Step 4: Rode os testes para ver passar**

Run: `npm test`
Expected: PASS — 16 testes no total (11 anteriores + 5 desta task).

- [ ] **Step 5: Implemente o comando `seed`**

Modify `scripts/livros.mjs`, adicionando aos imports:

```js
import {buscarPorTitulo} from '../lib/book-sources/openlibrary-search.mjs';
```

E adicionando a função, antes do bloco `const [, , comando...]`:

```js
/** Pausa entre requisições — a Open Library não gosta de rajada. */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function comandoSeed(sql, {limite, apply, incluirRevisar}) {
    const arquivo = join(ROOT, 'scripts', 'seed', 'acervo.json');
    const {livros} = JSON.parse(lerArquivo(arquivo, 'utf8'));

    // Validação antes de qualquer rede: categoria inválida no arquivo é erro
    // de digitação, e é melhor descobrir agora do que no livro 40.
    const invalidos = livros.filter((l) => !CATEGORY_IDS.includes(l.category));
    if (invalidos.length) {
        console.error('Categorias inválidas no acervo.json:');
        for (const l of invalidos) console.error(`  ${l.title} -> "${l.category}"`);
        console.error(`Válidas: ${CATEGORY_IDS.join(', ')}`);
        process.exit(1);
    }

    const jaExistem = new Set(
        (await sql`SELECT slug FROM casara.books`).map((l) => l.slug));

    let fila = livros.filter((l) => !jaExistem.has(slugify(l.title)));
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

    console.log(`\nImportando ${fila.length} livro(s)${apply ? '' : ' (DRY-RUN)'}...\n`);
    const jaUsadas = await tagsExistentes(sql);
    const resumo = [];

    for (const livro of fila) {
        const encontrado = await buscarPorTitulo(livro.title, livro.author);
        await dormir(400);

        const slug = await slugLivre(sql, slugify(livro.title), encontrado?.year ?? null);
        const tags = resolverTags((livro.tags ?? []).join(','), jaUsadas);

        const {coverPath, spineColor, placeholder} =
            await baixarCapa(encontrado?.coverUrl ?? null, slug, livro.category, ROOT);

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
            achou: encontrado ? 'sim' : 'NÃO',
            capa: placeholder ? 'placeholder' : 'real',
            págs: linha.pages ?? '—',
            ano: linha.year ?? '—',
        });

        if (apply) {
            await sql`
                INSERT INTO casara.books
                    (slug, title, author, year, pages, cover_path, spine_color,
                     rating, category, tags, status, progress_pct)
                VALUES (${linha.slug}, ${linha.title}, ${linha.author}, ${linha.year},
                        ${linha.pages}, ${linha.cover_path}, ${linha.spine_color},
                        ${linha.rating}, ${linha.category}, ${linha.tags},
                        ${linha.status}, ${linha.progress_pct})`;
        }
        console.log(`  ${apply ? '✓' : '·'} ${livro.title}`);
    }

    console.table(resumo);

    const semCapa = resumo.filter((r) => r.capa === 'placeholder');
    if (semCapa.length) {
        console.log(`\n⚠  ${semCapa.length} livro(s) ficaram com capa placeholder.`);
        console.log('   Coloque o JPG certo em public/livros/capas/<slug>.jpg (mesmo nome).');
    }

    if (!apply) {
        console.log('\nDRY-RUN: nada foi gravado. Rode com --apply para importar.');
        console.log('AVISO: as capas JÁ foram baixadas para public/livros/capas/ mesmo no dry-run.');
    } else {
        console.log(`\n✅ ${fila.length} livro(s) importado(s). As resenhas entram depois, com "edit".`);
    }
}
```

E acrescente o caso no `switch`:

```js
    case 'seed': {
        const i = process.argv.indexOf('--limit');
        await comandoSeed(sql, {
            limite: i > -1 ? Number(process.argv[i + 1]) : null,
            apply: process.argv.includes('--apply'),
            incluirRevisar: process.argv.includes('--incluir-revisar'),
        });
        break;
    }
```

E atualize a constante `AJUDA`, acrescentando após a linha do `edit`:

```
  node scripts/livros.mjs seed [--limit N] [--apply] [--incluir-revisar]
```

- [ ] **Step 6: Dry-run com 3 livros**

Run: `node scripts/livros.mjs seed --limit 3`
Expected: processa 3 livros, mostra a tabela com `achou`/`capa`/`págs`/`ano`, e
termina com `DRY-RUN: nada foi gravado.` Confirme com `node scripts/livros.mjs list`
que o banco não mudou.

- [ ] **Step 7: Importe 3 livros de verdade**

Run: `node scripts/livros.mjs seed --limit 3 --apply`
Expected: `✅ 3 livro(s) importado(s).`

Run: `node scripts/livros.mjs list`
Expected: os 3 livros aparecem.

Abra `http://localhost:3000/livros/lista` e confirme que as capas renderizam e
que os filtros de categoria funcionam.

- [ ] **Step 8: Verifique a idempotência**

Run: `node scripts/livros.mjs seed --limit 3 --apply`
Expected: os 3 primeiros são pulados por já existirem, e ele importa os 3
seguintes — ou seja, rodar de novo **não duplica**. Confirme com `list`.

- [ ] **Step 9: Commit**

```bash
git add lib/book-sources/openlibrary-search.mjs lib/book-sources/openlibrary-search.test.mjs scripts/livros.mjs
git commit -m "feat(livros): add bulk seed command using Open Library title+author search"
```

---

## Definição de pronto

Ao fim da Task 12:

- `npm test` passa com 16 testes de lógica pura.
- `rtk next build` completa sem erros.
- `node scripts/livros.mjs add <isbn>` cadastra um livro de ponta a ponta, com
  capa baixada, cor extraída e resenha escrita no editor.
- `node scripts/livros.mjs list` e `edit <slug>` funcionam.
- `node scripts/livros.mjs seed --limit 3 --apply` importa 3 livros do
  `scripts/seed/acervo.json`, e rodar de novo não duplica. Os 48 restantes ficam
  para serem importados aos poucos — é a decisão explícita do Luiz, não uma
  pendência.
- `/livros/lista` mostra a grade e os filtros por categoria, tag e status
  funcionam via URL compartilhável.
- `/livros/<slug>` renderiza ficha, resenha em Markdown e metadados OG.
- `/livros` redireciona para a lista.
- O `page_view` de `/livros/lista` aparece no `/stats` (confirma que o
  `REAL_ROUTE_PATTERN` foi atualizado corretamente).

**Fase 2 começa aqui:** substituir `app/livros/page.tsx` pela sala 3D, mover o
`<Canvas>` para `app/livros/layout.tsx`, e adicionar `three`,
`@react-three/fiber`, `@react-three/drei` e `@react-three/postprocessing`.

## Risco a observar

**Importar `.mjs` de dentro de arquivos `.tsx`** (Task 9 e 10 fazem
`import {getCategory} from '@/lib/book-categories.mjs'`). Isso deve funcionar:
`tsconfig.json` tem `allowJs: true` e `noImplicitAny: false`, então um módulo JS
sem tipos entra como `any` em vez de virar erro, e o alias `@/*` resolve para a
raiz do projeto. Note que `.mjs` **não** está no `include` do tsconfig — o que é
correto, esses arquivos não devem ser typechecked.

Se `rtk tsc --noEmit` reclamar de resolução na Task 9 Step 4, a correção é criar
`lib/book-categories.d.ts` declarando os tipos:

```ts
export declare const CATEGORIES: {id: string; nome: string; cor: string}[];
export declare const CATEGORY_IDS: string[];
export declare function getCategory(id: string): {id: string; nome: string; cor: string} | null;
```

Não crie esse arquivo preventivamente — só se o erro aparecer.

## Pendências conhecidas

- **Três livros do acervo estão marcados com `_revisar`** e o `seed` os pula por
  padrão: *Forward* (de "Blake" — não consegui identificar o livro), *Sou Puta,
  Doutor!* (título e autor incertos) e os dois sem nota na lista original
  (*Disciplina é Liberdade*, *O Almanaque de Naval Ravikant*). Corrija o
  `acervo.json` ou rode com `--incluir-revisar`.
- **Capas serão baixadas mesmo em `seed --dry-run`.** É deliberado — é assim que
  se descobre quais ficaram placeholder antes de gravar — mas significa que o
  dry-run escreve em `public/livros/capas/`.
- **As resenhas de todos os livros importados por `seed` começam vazias.** O
  campo `review` é preenchido depois, um a um, com `edit <slug>`.
- **`shelf_order` e `finished_at` não são preenchidos pelo CLI** nesta fase.
  `shelf_order` só importa para a estante 3D (fase 2); `finished_at` fica para
  quando houver uma visão de linha do tempo.
