# Sinopse por IA e data de leitura

**Status:** aprovado, aguardando plano de implementação
**Contexto:** conversa de 2026-07-31, continuação do trabalho de povoamento do acervo (ver `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`)

## Problema

O pedido original era "adicionar 2 campos novos: data em que o livro foi lido, e uma resenha gerada por IA + minha resenha pessoal". Investigando o schema antes de desenhar qualquer coisa, descobri que **dois desses três pedaços já existem, adormecidos**:

- `casara.books.finished_at` (DATE) já existe na tabela e no tipo `Book` (`lib/books.ts`), mas nunca é perguntado no CLI, nunca aparece em nenhuma tela, e não entra no `ORDER BY` da listagem.
- `casara.books.synopsis` (sinopse curta) e `casara.books.review` (resenha pessoal, Markdown) já existem e **já estão divididos** em `/livros/[slug]/page.tsx` — sinopse em itálico/citação acima, resenha como artigo abaixo. O que falta é: (a) a sinopse é hoje digitada manualmente pelo Luiz, uma frase, no CLI — não gerada por IA; (b) esse mesmo split não existe em `BookOverlay.tsx` (o popup da sala 3D), que só mostra `review`.

Este spec cobre: ligar `finished_at` de ponta a ponta (CLI → ordenação → exibição), passar a preencher a sinopse com ajuda de IA no cadastro (via chat, não API), replicar o layout sinopse+resenha no overlay da sala 3D, e popular retroativamente a sinopse dos 51 livros já cadastrados.

**Fora de escopo:** `shelf_order` (posição física na estante 3D) continua dormente — é um problema de layout espacial, não de ordenação de listagem, e não foi pedido. Reordenar a estante 3D por data de leitura não faz parte deste spec.

## Decisões (via brainstorming, 2026-07-31)

1. **Geração da sinopse:** interativa via chat, não API. Decisão revista durante a revisão da spec — a proposta original era uma chamada de API automática (Vercel AI Gateway) dentro do CLI, mas o CLI só é operado com uma sessão do Claude Code do lado (nunca sozinho), então a automação não tinha uso real e só adicionava dependência nova, chave nova e um modo de falha (rede/chave ausente) pra uma tarefa de baixa frequência. Ver seção 3.
2. ~~Provedor de IA~~ — descartado junto com a decisão 1; nenhuma dependência ou variável de ambiente nova é necessária.
3. **Backfill dos 51 livros existentes:** só sinopse, escrita nesta própria conversa (ver seção 4). `finished_at` fica `null` nesses — não há como reconstruir a data retroativamente com precisão, e não foi pedido.
4. **Ordenação padrão de `/livros/lista`:** livros com status `lendo` continuam no topo (comportamento atual), depois os `lido` do mais recente pro mais antigo por `finished_at`. Livros sem `finished_at` caem no fim, ordenados por título.
5. **Layout do painel direito (confirmado no companion visual):** sinopse discreta (itálico, borda esquerda cinza, estilo citação) em cima; resenha pessoal com barra lateral âmbar de destaque e label "Minha resenha" abaixo — validado com mockup usando "A Revolta de Atlas" como exemplo real.
6. **Onde a data aparece:** na página de detalhe (`/livros/[slug]` e `BookOverlay.tsx`, formato "Lido em julho de 2026") e também como selo compacto no `BookCard.tsx` da grade (ex: "jul/2026").

## Design

### 1. Dados — sem migração de schema

`finished_at` e `synopsis` já existem em `casara.books` (`lib/schema.sql`) e no tipo `Book` (`lib/books.ts`). Nenhuma alteração de schema é necessária.

### 2. CLI (`scripts/livros.mjs`)

- **`add`**: quando `status === 'lido'`, novo prompt "Data de leitura" com padrão = hoje (`AAAA-MM-DD`; Enter aceita o padrão). Quando `status === 'lendo'`, fica `null`. O prompt "Sinopse curta" continua existindo tal como hoje — nenhuma mudança de código aqui. O que muda é o fluxo de trabalho: numa sessão do Claude Code, Luiz pede a sinopse ali no chat (com título/autor/assuntos como contexto) antes de responder ao prompt, e cola a frase.
- **`edit`**: ganha o mesmo prompt de data (padrão = valor atual do livro). O prompt de sinopse já existe (seção "edit" do CLI) e não muda. A resenha pessoal (`review`, aberta no `$EDITOR`) continua inteiramente manual, como já é hoje.

### 3. Geração da sinopse — interativa, sem API nova

Sem módulo novo, sem dependência nova, sem variável de ambiente nova. Quando um livro é cadastrado dentro de uma sessão do Claude Code (é como o CLI sempre roda — `scripts/livros.mjs` não tem uso fora dessas sessões hoje), Claude escreve a sinopse ali no chat a partir de título/autor/assuntos sugeridos pela Open Library, e Luiz cola no prompt "Sinopse curta" que já existe no `add`/`edit`. Instrução implícita de qualidade (seguida por Claude, não codificada em lugar nenhum): português, 2-3 frases, sem spoiler do desfecho, tom neutro — a opinião pessoal é papel do `review`, não da sinopse.

Se um dia o cadastro precisar rodar sem uma sessão do Claude Code por perto, a sinopse fica em branco (mesmo tratamento de "campo faltante é caminho normal" que já rege capa/páginas/ano) e pode ser preenchida depois via `edit`.

### 4. Backfill dos 51 livros existentes

Sem comando novo no CLI. Claude escreve as 51 sinopses nesta própria conversa (a partir de título/autor/tags já salvos no banco), e aplica em lote com um script pontual — mesmo padrão usado pro backfill de capas (`scripts/_tmp-apply-covers.mjs`, já executado e removido nesta sessão): um `UPDATE casara.books SET synopsis = ... WHERE slug = ...` por livro, dentro de um script descartável, com a lista completa mostrada pra revisão antes de rodar.

### 5. UI

- **`components/livros/BookOverlay.tsx`**: ganha o bloco de sinopse, que hoje não existe ali (só mostra `review`). Layout confirmado no companion: citação discreta (`border-left`, itálico, cinza) para `synopsis`, depois bloco de `review` com barra lateral âmbar (`border-left: 3px solid`, cor de destaque) e label "Minha resenha" acima do texto.
- **`app/livros/[slug]/page.tsx`**: a seção de `review` ganha a mesma barra lateral âmbar + label "Minha resenha" (hoje é só um `<article className="prose">` sem destaque visual próprio) — fica visualmente consistente com o overlay. A seção de `synopsis` já está no formato certo, não muda.
- Nos dois lugares, quando `status === 'lido'` e `finished_at` não é nulo, mostra "Lido em `<mês por extenso> de <ano>`" (ex: "Lido em julho de 2026") perto da nota/categoria — mês/ano, sem o dia, porque o dia exato raramente importa pra quem está navegando o acervo.
- **`components/livros/BookCard.tsx`**: selo compacto no card, formato abreviado tipo "jul/2026", mesmo critério (só quando `lido` + `finished_at` existe).
- **`lib/books.ts`**: `ORDER BY` de `listarLivros` muda de `(status = 'lendo') DESC, COALESCE(shelf_order, 32767), title` para `(status = 'lendo') DESC, finished_at DESC NULLS LAST, title`.

### 6. Testes

Não há lógica nova de IA pra testar (seção 3 é um fluxo de trabalho, não código). As mudanças de UI e o `ORDER BY` novo são verificados rodando `npm run dev` e conferindo visualmente no navegador antes de considerar a tarefa concluída — mesmo processo usado no fix do tamanho de fonte da lombada (ver commit relacionado).

## Erros e casos de borda

- **Livro com `status: 'lendo'` que já tem `finished_at` de uma edição anterior** (usuário voltou a ler um livro já marcado como lido): o campo não é limpo automaticamente pelo `edit` — fica como está até o usuário atualizar manualmente, mesmo espírito de "Enter mantém o valor atual" que já rege o resto do `edit`.
- **Backfill de sinopses rodado de novo**: o script pontual da seção 4 é descartável e roda uma vez; se algum dia precisar rodar de novo pra livros novos sem sinopse, a checagem natural é `WHERE synopsis IS NULL`, mesmo princípio do `seed` ser idempotente por título.
