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

`synopsis` já existe na tabela e já aparece nas duas telas. Hoje é digitada à
mão. A ideia é escrevê-la no chat durante o cadastro (o CLI só roda com uma
sessão do Claude Code do lado), com título/autor/assuntos como contexto —
português, 2-3 frases, sem spoiler, tom neutro. Sem API nova, sem chave nova.

Decidido assim depois de descartar a chamada automática de API dentro do CLI:
adicionava dependência, chave e um modo de falha novo para uma tarefa de baixa
frequência que nunca roda sozinha.

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
