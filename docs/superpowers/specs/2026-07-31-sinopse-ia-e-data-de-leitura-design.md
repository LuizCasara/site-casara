# Sinopse por IA e data de leitura

**Status:** aprovado, aguardando plano de implementação
**Contexto:** conversa de 2026-07-31, continuação do trabalho de povoamento do acervo (ver `docs/superpowers/specs/2026-07-28-sala-de-leitura-3d-design.md`)

## Problema

O pedido original era "adicionar 2 campos novos: data em que o livro foi lido, e uma resenha gerada por IA + minha resenha pessoal". Investigando o schema antes de desenhar qualquer coisa, descobri que **dois desses três pedaços já existem, adormecidos**:

- `casara.books.finished_at` (DATE) já existe na tabela e no tipo `Book` (`lib/books.ts`), mas nunca é perguntado no CLI, nunca aparece em nenhuma tela, e não entra no `ORDER BY` da listagem.
- `casara.books.synopsis` (sinopse curta) e `casara.books.review` (resenha pessoal, Markdown) já existem e **já estão divididos** em `/livros/[slug]/page.tsx` — sinopse em itálico/citação acima, resenha como artigo abaixo. O que falta é: (a) a sinopse é hoje digitada manualmente pelo Luiz, uma frase, no CLI — não gerada por IA; (b) esse mesmo split não existe em `BookOverlay.tsx` (o popup da sala 3D), que só mostra `review`.

Este spec cobre: ligar `finished_at` de ponta a ponta (CLI → ordenação → exibição), trocar a sinopse manual por gerada via IA no cadastro, replicar o layout sinopse+resenha no overlay da sala 3D, e popular retroativamente a sinopse dos 51 livros já cadastrados.

**Fora de escopo:** `shelf_order` (posição física na estante 3D) continua dormente — é um problema de layout espacial, não de ordenação de listagem, e não foi pedido. Reordenar a estante 3D por data de leitura não faz parte deste spec.

## Decisões (via brainstorming, 2026-07-31)

1. **Geração da sinopse:** chamada de API automática dentro do fluxo do CLI (não depende de uma sessão do Claude Code aberta).
2. **Provedor de IA:** Vercel AI Gateway (`AI_GATEWAY_API_KEY`), não uma chave direta de provedor — segue a convenção que o resto do ecossistema Vercel deste projeto usa.
3. **Backfill dos 51 livros existentes:** só sinopse em lote. `finished_at` fica `null` nesses — não há como reconstruir a data retroativamente com precisão, e não foi pedido.
4. **Ordenação padrão de `/livros/lista`:** livros com status `lendo` continuam no topo (comportamento atual), depois os `lido` do mais recente pro mais antigo por `finished_at`. Livros sem `finished_at` caem no fim, ordenados por título.
5. **Layout do painel direito (confirmado no companion visual):** sinopse discreta (itálico, borda esquerda cinza, estilo citação) em cima; resenha pessoal com barra lateral âmbar de destaque e label "Minha resenha" abaixo — validado com mockup usando "A Revolta de Atlas" como exemplo real.
6. **Onde a data aparece:** na página de detalhe (`/livros/[slug]` e `BookOverlay.tsx`, formato "Lido em julho de 2026") e também como selo compacto no `BookCard.tsx` da grade (ex: "jul/2026").

## Design

### 1. Dados — sem migração de schema

`finished_at` e `synopsis` já existem em `casara.books` (`lib/schema.sql`) e no tipo `Book` (`lib/books.ts`). Nenhuma alteração de schema é necessária.

### 2. CLI (`scripts/livros.mjs`)

- **`add`**: quando `status === 'lido'`, novo prompt "Data de leitura" com padrão = hoje (`AAAA-MM-DD`; Enter aceita o padrão). Quando `status === 'lendo'`, fica `null`. O prompt manual "Sinopse curta (uma frase)" é removido; no lugar, depois que título/autor/tags estão confirmados, o CLI chama `lib/book-synopsis.mjs` (seção 3) e mostra o resultado na mesma tela de resumo "Será gravado" que já existe hoje — a sinopse gerada passa pela mesma confirmação manual de qualquer outro campo antes de ir pro banco. Se a chamada de IA falhar (rede, chave ausente, etc.), o campo fica vazio e o cadastro segue normalmente — mesmo espírito de "campo faltante é caminho normal" que já rege capa/páginas/ano nesse fluxo.
- **`edit`**: ganha o mesmo prompt de data (padrão = valor atual do livro) e uma pergunta opcional "Regerar sinopse por IA?" (padrão não). A resenha pessoal (`review`, aberta no `$EDITOR`) continua inteiramente manual — a IA nunca escreve nela.

### 3. Geração da sinopse — `lib/book-synopsis.mjs`

Módulo novo, `.mjs` puro (mesma convenção de `lib/book-utils.mjs`, `lib/book-cover.mjs` — importável tanto pelo CLI quanto por um teste `node --test`, sem depender de build do Next). Chamado **só pelo CLI**, nunca por uma rota do Next — mantém o princípio "zero rota de admin pública" do projeto.

- Usa a lib `ai` (AI SDK) apontando pro Vercel AI Gateway via string no formato `"anthropic/claude-haiku-4-5-<versão>"` — modelo rápido/barato, adequado pra uma tarefa de 2-3 frases. Confirmar o identificador exato disponível no Gateway no momento da implementação.
- Prompt recebe `title`, `author` e os "assuntos sugeridos" que a Open Library já retorna hoje em `meta.subjects` (já buscado no `add`, hoje só exibido no console, nunca usado como insumo) — isso ancora a sinopse em dados reais do livro e reduz alucinação, no mesmo espírito da nota do projeto sobre a Open Library "devolver lixo" pra autor/título quando não tem contexto suficiente.
- Instrução explícita: português, 2-3 frases, sem spoiler do desfecho, tom neutro (não é a opinião do Luiz — isso é papel do `review`).
- Nova variável em `.env.local`: `AI_GATEWAY_API_KEY`.
- Nova dependência: `ai` (não instalada hoje no projeto).

### 4. Backfill dos 51 livros existentes

Novo comando `node scripts/livros.mjs backfill-sinopses [--apply]`: seleciona os livros com `synopsis IS NULL`, gera cada sinopse via `lib/book-synopsis.mjs` usando `title`/`author`/`tags` já salvos no banco como contexto (não há `subjects` da Open Library guardado pra esses — os `tags` do `acervo.json` fazem esse papel), mostra a lista completa pra revisão e pede confirmação em lote antes de gravar — mesmo padrão dry-run/`--apply` do comando `seed`.

### 5. UI

- **`components/livros/BookOverlay.tsx`**: ganha o bloco de sinopse, que hoje não existe ali (só mostra `review`). Layout confirmado no companion: citação discreta (`border-left`, itálico, cinza) para `synopsis`, depois bloco de `review` com barra lateral âmbar (`border-left: 3px solid`, cor de destaque) e label "Minha resenha" acima do texto.
- **`app/livros/[slug]/page.tsx`**: a seção de `review` ganha a mesma barra lateral âmbar + label "Minha resenha" (hoje é só um `<article className="prose">` sem destaque visual próprio) — fica visualmente consistente com o overlay. A seção de `synopsis` já está no formato certo, não muda.
- Nos dois lugares, quando `status === 'lido'` e `finished_at` não é nulo, mostra "Lido em `<mês por extenso> de <ano>`" (ex: "Lido em julho de 2026") perto da nota/categoria — mês/ano, sem o dia, porque o dia exato raramente importa pra quem está navegando o acervo.
- **`components/livros/BookCard.tsx`**: selo compacto no card, formato abreviado tipo "jul/2026", mesmo critério (só quando `lido` + `finished_at` existe).
- **`lib/books.ts`**: `ORDER BY` de `listarLivros` muda de `(status = 'lendo') DESC, COALESCE(shelf_order, 32767), title` para `(status = 'lendo') DESC, finished_at DESC NULLS LAST, title`.

### 6. Testes

`lib/book-synopsis.mjs` é coberto por `node --test`, mockando a chamada de IA (nenhum teste bate na API de verdade). As mudanças de UI são verificadas rodando `npm run dev` e conferindo visualmente no navegador antes de considerar a tarefa concluída — mesmo processo usado no fix do tamanho de fonte da lombada (ver commit relacionado).

## Erros e casos de borda

- **Chamada de IA falha no `add`**: sinopse fica vazia, cadastro segue (não bloqueia). Mensagem de aviso no console, mesmo padrão de "capa não encontrada".
- **`AI_GATEWAY_API_KEY` ausente**: mesmo comportamento — falha tratada como "sem sinopse", não como erro fatal do comando.
- **Livro com `status: 'lendo'` que já tem `finished_at` de uma edição anterior** (usuário voltou a ler um livro já marcado como lido): o campo não é limpo automaticamter pelo `edit` — fica como está até o usuário atualizar manualmente, mesmo espírito de "Enter mantém o valor atual" que já rege o resto do `edit`.
- **`backfill-sinopses` rodado de novo**: idempotente por `synopsis IS NULL`, mesmo princípio do `seed` ser idempotente por título — livros que já ganharam sinopse não entram na fila de novo.
