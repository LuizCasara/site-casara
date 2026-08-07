# /livros — próximos passos

Ideias soltas que **não** entraram no V1. Nada aqui está prometido nem
priorizado: é o caderno do que ficou de fora, com o motivo, para a próxima
rodada não recomeçar da estaca zero.

O que já está decidido e implementado vive em [livros-sala-3d.md](livros-sala-3d.md).

---

## Sala

### Som ambiente lo-fi

O gancho já existe (`lib/sound.ts`, mesmo padrão do loop de giro do Sorteio) e o
monitor da direita já tem um estado "lofi". Faltam duas coisas: um botão
flutuante discreto, visível só na sala, e o arquivo
`public/sounds/lofi-loop.mp3` — que é diferente dos efeitos curtos já
existentes, precisa soar bem sem costura na volta ao início.

Sem persistência em `localStorage`: é preferência de sessão. Começa desligado —
autoplay sem interação seria bloqueado pelo navegador de qualquer jeito.

### Poeira no facho de luz

Estava na visão original da ambiência e nunca foi feito. Custa um shader ou um
sistema de partículas pequeno; o risco é ficar caro no mobile.

### Sala com baked lighting

O upgrade grande: trocar a sala montada em código por um modelo único com
iluminação assada, no espírito do [My Room in 3D](https://my-room-in-3d.vercel.app/).
O contrato de `Room.tsx` (cenário burro, publica âncoras) existe justamente para
permitir isso sem reescrever Bookshelf, DeskBooks e CameraRig. Exige Blender.

### Sombras de verdade nas paredes

Hoje a sala não tem sombra projetada, e é por isso que todo objeto de parede
precisa de volume próprio atrás. Com sombra, dava para pendurar coisas finas —
mochila, lenços, bastão de trilha, que já foram tentados e removidos por
parecerem flutuando.

### Objetos que ainda não têm lugar

Foram levantados nas fotos do escritório real e ficaram de fora: quadro de
cortiça com fotos e o recado da criança, aparador escuro com caixas
organizadoras e bonés, cortina. O chão em volta da estante amarela também está
deliberadamente vazio desde que o disco de vinil e a caixa de jogo saíram.

---

## Acervo e dados

### Sinopse gerada por IA, no cadastro

**Feito** (o fluxo; falta cobertura). A sinopse é escrita no chat durante o
cadastro (o CLI só roda com uma sessão do Claude Code do lado), com
título/autor/assuntos como contexto — português, 2-3 frases, sem spoiler, tom
neutro. Sem API nova, sem chave nova. O prompt do CLI pede as 2-3 frases, e
`synopsis` aparece acima da resenha tanto na página `/livros/[slug]` quanto no
`BookOverlay` (a visualização que abre ao clicar num livro).

Decidido assim depois de descartar a chamada automática de API dentro do CLI:
adicionava dependência, chave e um modo de falha novo para uma tarefa de baixa
frequência que nunca roda sozinha.

**37 sinopses foram escritas em lote** em 07/08/2026, revisadas antes de gravar
e aplicadas pelo `edit`. As 14 restantes ficaram de fora porque eu não conhecia
os livros o suficiente para escrever sem inventar — elas entram no mutirão
abaixo.

### Mutirão de preenchimento do acervo — EM ANDAMENTO

Começado em 07/08/2026. Um livro por vez, na ordem da tabela, pulando os que já
estão `✅`.

**O protocolo, para retomar em qualquer chat novo:**

1. Pegue a primeira linha `⬜` da tabela e apresente a **ficha completa** do
   livro: todos os campos que o `edit` do CLI cobre — título, autor, ano,
   editora, páginas, ISBN, categoria, tags, status, progresso, nota, sinopse,
   resenha — com o valor atual de cada um. **Não mostre só o que falta**: o
   Luiz quer ver o que já está gravado para poder corrigir de passagem (uma tag
   errada, uma nota que mudou de ideia), não apenas preencher buraco.
2. **A tabela da ficha não leva comentário nenhum.** Campo sem valor fica
   VAZIO, não "faltando", não "peça isso", não instrução de como preencher.
   Fica mais fácil de bater o olho e ver o que está em branco. Observações,
   se houver, vão em texto fora da tabela.
3. O Luiz responde com os dados e com o texto da sinopse e/ou da resenha. Ele
   pode responder só uma parte, e pode alterar campos que já tinham valor.
   **Peça o ISBN-13 quando faltar**: com ele, `lib/book-sources/` costuma
   devolver ano, editora e páginas de graça.
4. **Revise o texto antes de gravar**: ortografia, concordância e pontuação,
   mais sugestões pontuais de leitura — sem mudar o sentido nem a voz dele. A
   resenha é texto pessoal; corrigir não é reescrever.
5. Grave pelo `edit` de `scripts/livros.mjs` (nunca por SQL: o `\n` literal e o
   apóstrofo já morderam uma vez — ver o histórico da Metamorfose).
6. **Marque a linha na tabela**: remova os campos preenchidos da coluna "falta"
   e troque para `✅` quando não sobrar nada.
7. Apresente o próximo.

`rating` não entra na conta: os 6 livros sem nota são os 3 em `lendo`, os 2 em
`quero-ler` e a Bíblia — todos legitimamente sem nota ainda.

| # | slug | livro | falta | ok |
|---|------|-------|-------|----|
| 01 | `100-presente` | 100% Presente — Joel Jota | — | ✅ |
| 02 | `a-arte-da-guerra` | A Arte da Guerra — Sun Tzu | ISBN-13, editora, resenha | ⬜ |
| 03 | `a-coragem-de-nao-agradar` | A Coragem de Não Agradar — Ichiro Kishimi | ISBN-13, editora, resenha | ⬜ |
| 04 | `a-metamorfose` | A Metamorfose — Franz Kafka | — | ✅ |
| 05 | `a-nascente` | A Nascente — Ayn Rand | resenha | ⬜ |
| 06 | `a-outra-face` | A Outra Face — Sidney Sheldon | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 07 | `a-psicologia-financeira` | A Psicologia Financeira — Morgan Housel | ISBN-13, ano, editora, resenha | ⬜ |
| 08 | `a-revolta-de-atlas` | A Revolta de Atlas — Ayn Rand | ISBN-13, editora, resenha | ⬜ |
| 09 | `a-revolucao-dos-bichos` | A Revolução dos Bichos — George Orwell | ISBN-13, editora, resenha | ⬜ |
| 10 | `a-sutil-arte-de-ligar-o-f-da-se` | A Sutil Arte de Ligar o F*da-se — Mark Manson | ISBN-13, ano, editora, resenha | ⬜ |
| 11 | `a-vida-feliz` | A Vida Feliz — Sêneca | ISBN-13, ano, editora, págs, resenha | ⬜ |
| 12 | `animais-fantasticos-e-onde-habitam-o-roteiro-original` | Animais Fantásticos e Onde Habitam: O Roteiro Original — J. K. Rowling | resenha | ⬜ |
| 13 | `arrume-a-sua-cama` | Arrume a Sua Cama — William H. McRaven | resenha | ⬜ |
| 14 | `as-4-disciplinas-da-execucao` | As 4 Disciplinas da Execução — Chris McChesney | ISBN-13, ano, editora, resenha | ⬜ |
| 15 | `as-48-leis-do-poder` | As 48 Leis do Poder — Robert Greene | ISBN-13, ano, editora, resenha | ⬜ |
| 16 | `as-cavernas-de-aco` | As Cavernas de Aço — Isaac Asimov | ISBN-13, ano, editora, resenha | ⬜ |
| 17 | `bora-vender` | Bora Vender — Alfredo Soares | ISBN-13, ano, editora, resenha | ⬜ |
| 18 | `biblia-sagrada-nvi` | Bíblia Sagrada NVI | ISBN-13, ano, resenha | ⬜ |
| 19 | `cada-homem-um-guerreiro` | Cada Homem um Guerreiro — Lonnie Berger | ISBN-13, ano, editora, págs, resenha | ⬜ |
| 20 | `chaves-biblicas-para-o-homem-de-deus` | Chaves Bíblicas para o Homem de Deus — Sandro Antônio dos Santos | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 21 | `como-fazer-amigos-e-influenciar-pessoas` | Como Fazer Amigos e Influenciar Pessoas — Dale Carnegie | ISBN-13, editora, resenha | ⬜ |
| 22 | `decifre-e-influencie-pessoas` | Decifre e Influencie Pessoas — Paulo Vieira | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 23 | `disciplina-e-liberdade` | Disciplina é Liberdade — Jocko Willink | ISBN-13, ano, editora, resenha | ⬜ |
| 24 | `diario-estoico` | Diário Estoico — Ryan Holiday | resenha | ⬜ |
| 25 | `do-mil-ao-milhao` | Do Mil ao Milhão — Thiago Nigro | ISBN-13, editora, resenha | ⬜ |
| 26 | `em-busca-de-sentido` | Em Busca de Sentido — Viktor E. Frankl | ISBN-13, editora, resenha | ⬜ |
| 27 | `em-nome-do-povo` | Em Nome do Povo — Bruno Perini | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 28 | `escotismo-para-rapazes` | Escotismo para Rapazes — Robert Baden-Powell | ISBN-13, ano, editora, resenha | ⬜ |
| 29 | `factfulness` | Factfulness — Hans Rosling | ISBN-13, editora, resenha | ⬜ |
| 30 | `forward` | Forward — Blake Crouch | ISBN-13, editora, resenha | ⬜ |
| 31 | `geracao-de-valor-1` | Geração de Valor 1 — Flávio Augusto da Silva | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 32 | `geracao-de-valor-2` | Geração de Valor 2 — Flávio Augusto da Silva | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 33 | `geracao-de-valor-3` | Geração de Valor 3 — Flávio Augusto da Silva | ISBN-13, editora, sinopse, resenha | ⬜ |
| 34 | `leruth` | Leruth — Magno D'Azevedo | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 35 | `mais-esperto-que-o-diabo` | Mais Esperto que o Diabo — Napoleon Hill | ISBN-13, ano, editora, resenha | ⬜ |
| 36 | `o-almanaque-de-naval-ravikant` | O Almanaque de Naval Ravikant — Eric Jorgenson | ISBN-13, ano, editora, resenha | ⬜ |
| 37 | `o-codificador-limpo` | O Codificador Limpo — Robert C. Martin | ISBN-13, ano, editora, resenha | ⬜ |
| 38 | `o-hobbit` | O Hobbit — J.R.R. Tolkien | ISBN-13, ano, editora, resenha | ⬜ |
| 39 | `o-homem-mais-rico-da-babilonia` | O Homem Mais Rico da Babilônia — George S. Clason | ISBN-13, editora, resenha | ⬜ |
| 40 | `o-homem-que-comprou-o-tempo` | O Homem que Comprou o Tempo — Thiago Nigro | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 41 | `o-jogo-interior-do-tenis` | O Jogo Interior do Tênis — W. Timothy Gallwey | ISBN-13, ano, editora, resenha | ⬜ |
| 42 | `o-menino-que-descobriu-o-vento` | O Menino que Descobriu o Vento — William Kamkwamba | ISBN-13, ano, editora, resenha | ⬜ |
| 43 | `o-monge-e-o-executivo` | O Monge e o Executivo — James C. Hunter | ISBN-13, ano, editora, resenha | ⬜ |
| 44 | `o-mitico-homem-mes` | O Mítico Homem-Mês — Frederick P. Brooks Jr. | ISBN-13, ano, editora, resenha | ⬜ |
| 45 | `o-pequeno-principe` | O Pequeno Príncipe — Antoine de Saint-Exupéry | ISBN-13, ano, editora, resenha | ⬜ |
| 46 | `o-pior-ano-da-minha-vida` | O Pior Ano da Minha Vida — Pablo Marçal | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 47 | `o-segredo-de-todas-as-coisas` | O Segredo de Todas as Coisas — Anderson Luiz | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 48 | `pai-rico-pai-pobre` | Pai Rico, Pai Pobre — Robert T. Kiyosaki | ISBN-13, ano, editora, resenha | ⬜ |
| 49 | `ponto-de-inflexao` | Ponto de Inflexão — Flávio Augusto da Silva | ISBN-13, ano, editora, sinopse, resenha | ⬜ |
| 50 | `por-que-fazemos-o-que-fazemos` | Por que Fazemos o que Fazemos? — Mario Sergio Cortella | ISBN-13, editora, resenha | ⬜ |
| 51 | `por-que-generalistas-vencem-em-um-mundo-de-especialistas` | Por que Generalistas Vencem… — David Epstein | ISBN-13, ano, editora, resenha | ⬜ |
| 52 | `quem-pensa-enriquece` | Quem Pensa Enriquece — Napoleon Hill | ISBN-13, ano, editora, resenha | ⬜ |
| 53 | `rapido-e-devagar` | Rápido e Devagar — Daniel Kahneman | ISBN-13, editora, resenha | ⬜ |
| 54 | `sapiens-uma-breve-historia-da-humanidade` | Sapiens — Yuval Noah Harari | ISBN-13, ano, editora, págs, resenha | ⬜ |
| 55 | `sou-puta-doutor` | Sou Puta, Doutor! — Yuri Marques Peçanha | ISBN-13, ano, editora, sinopse, resenha | ⬜ |

### Data de leitura na UI

`finished_at` alimenta a estante por ano, mas não aparece em texto em lugar
nenhum. Faltam: "Lido em julho de 2026" na página do livro e no overlay, selo
compacto ("jul/2026") no `BookCard`, e `ORDER BY finished_at DESC NULLS LAST` na
listagem, no lugar do `shelf_order` que segue dormente.

### `shelf_order` dormente

Coluna existe, nada escreve nela, e a estante hoje se organiza por ano. Ou vira
o desempate manual dentro de um nicho, ou sai do schema.

### Sitemap / geração estática

`listarSlugs()` existiu para isso e foi removida por não ter consumidor. As
páginas usam `force-dynamic` e não há `generateStaticParams`. Se um dia a
indexação importar, é aqui que se mexe.

---

## Fontes de metadados

`lib/book-sources/` é um gancho com uma implementação só (Open Library). Skoob
entraria aqui se a API pública voltar. Outra frente possível: uma segunda fonte
para completar o que a Open Library não tem em edições brasileiras — páginas,
ano e capa faltando é rotina, não exceção.
