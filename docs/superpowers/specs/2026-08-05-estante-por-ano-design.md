# Estante por Ano de Leitura — Design

**Data:** 2026-08-05
**Status:** aprovado, aguardando plano de implementação
**Substitui:** a divisão genérica em duas fileiras por largura (commit `a6e60dd`)

## Problema

A estante da sala 3D são hoje **duas tábuas escuras flutuando na parede**, com
os livros em fila contínua e ordem alfabética. Duas coisas dão errado nisso:

1. **Não lê como estante.** Sem laterais, fundo ou montantes, o objeto lê como
   prateleira de parede — e, no meio de uma parede de 6m, como um detalhe
   pequeno e solto.
2. **A ordem não significa nada.** O acervo é uma linha do tempo de leitura, e
   a estante não mostra isso. Era esse o pedido original ("estante por ano") que
   a divisão por largura não atendeu: ela parte a lista onde a régua manda, não
   onde o ano vira.

## Decisões

### D1 — O móvel é o modelo GLB escolhido pelo dono do acervo

`public/livros/modelos/bookshelf-tall.glb` ([poly.pizza/m/30Iealxb0p](https://poly.pizza/m/30Iealxb0p),
CC0, 24KB, já versionado) substitui as duas tábuas.

Este modelo já tinha sido **descartado** numa sessão anterior por três motivos:
os nichos são um zigue-zague, são 5 (menos que os 7 anos do acervo), e a
textura é embutida (não recolorível por nome de material como os modelos
Kenney). O dono do acervo reafirmou a escolha depois disso — **é o móvel que
ele quer na sala**, e as três objeções se mostraram administráveis:

- o zigue-zague desloca cada nicho só ±6cm, não é meia largura: **todo nicho
  tem a mesma largura útil**;
- 5 nichos comportam os 7 anos porque anos vizinhos pequenos dividem nicho
  (ver D3);
- a cor atual (marrom escuro) já combina com a sala; recolorir não é
  necessário, e se um dia for, um `color` multiplicando a textura resolve o
  tom (não a paleta).

### D2 — A escala é derivada do livro, não escolhida a olho

Medidas do modelo (extraídas do `.glb`, escala nativa `100` do nó raiz):

| Medida | Nativo | Escalado 1,45× |
|---|---|---|
| Largura total | 0,574m | 0,832m |
| Altura total | 1,320m | 1,914m |
| Profundidade | 0,154m | 0,223m |
| Vão livre de cada nicho (altura) | 0,235m | 0,341m |
| Largura útil de cada nicho | 0,409m | 0,593m |

O fator sai de `(BOOK_HEIGHT_BASE_M + folga) / vão nativo`. Com livro de 0,30m
e folga para o gesto de hover (que puxa o livro para fora e o inclina), isso dá
**≈1,45**. A profundidade passar a bater com os `BOOK_DEPTH_M = 0,20m` é
consequência, não coincidência — no tamanho nativo os livros ficariam 4,6cm
para fora do móvel.

**A estante assenta no chão**, encostada na parede de fundo: a âncora
`ROOM_ANCHORS.estante` sai de `[0, 0.9, -1.4]` e vira `[0, 0, -1.49]`
(`-1.6` da parede + metade da profundidade). Os 1,91m cabem com folga nos 3m
de pé-direito.

Geometria dos nichos, medida do modelo e escalada (Y = piso do nicho, X =
centro do vão; o modelo não é simétrico em torno de zero):

| Nicho | Y do piso | Centro X |
|---|---|---|
| 1 (base) | 0,046 | +0,082 |
| 2 | 0,419 | −0,096 |
| 3 | 0,792 | +0,082 |
| 4 | 1,166 | −0,096 |
| 5 (topo) | 1,540 | +0,082 |

Essas medidas viram constantes num módulo próprio, **com um teste que confere
que elas batem com o modelo** (soma dos vãos + espessura das prateleiras =
altura total). Trocar o `.glb` sem atualizar a tabela quebra o teste, em vez de
enterrar os livros na madeira silenciosamente.

### D3 — Agrupamento cronológico por capacidade, de baixo para cima

Uma função pura recebe os livros com data de leitura e devolve os grupos:

- percorre os anos **do mais antigo ao mais novo**, enchendo os nichos **de
  baixo para cima** — a cronologia sobe;
- um ano só divide nicho com o vizinho seguinte se a soma das lombadas couber
  nos 0,593m úteis; senão o nicho fecha e o ano seguinte começa o próximo;
- o agrupamento é calculado sobre o **acervo inteiro**, nunca sobre o filtrado
  (ver D5).

Com o acervo de hoje (≈1,9m de lombada em 49 livros lidos — o cálculo usa as
páginas de `scripts/seed/leitura.json`; os 9 títulos cujas páginas vieram da
Open Library sobem um pouco esse número), isso produz:

| Nicho | Anos | Livros | Largura |
|---|---|---|---|
| 5 (topo) | 2025-26 | 12 | 0,42m |
| 4 | 2024 | 9 | 0,40m |
| 3 | 2023 | 11 | 0,40m |
| 2 | 2022 | 9 | 0,35m |
| 1 (base) | 2020-21 | 8 | 0,28m |

Essa divisão **não está escrita em lugar nenhum** — cai do dado. Quando 2026
crescer, 2025 e 2026 se separam sozinhos.

### D4 — Navegação em dois níveis

O ponto de vista `estante` deixa de ser único e vira uma família:

- **Nível 1 — "Estante"**: enquadra o móvel inteiro (1,91m), a ~2,4m. A
  distância vem da altura da estante e do `fov`, com a folga extra que já se
  sabe necessária porque header e rodapé cobrem as bordas do canvas (`fixed
  inset-0`) — é a mesma correção que hoje mantém a visão estante a 1,25m em vez
  dos 0,95m que a conta pura daria.
- **Nível 2 — um ano**: alvo no centro do nicho (X com o deslocamento do
  zigue-zague daquele andar, Y no meio do vão), a ~0,8m. Fica **mais perto que
  a visão estante atual**, então as lombadas ficam mais legíveis do que hoje.
- Só a câmera se move: nenhum nicho escurece ou muda de cor, e as bordas dos
  vizinhos continuam no quadro — é o que mantém a noção de onde aquele ano fica
  dentro da estante.
- **Voltar**: clicar no ano já ativo, clicar em "Estante", ou `Esc`.

### D5 — Um controle: a etiqueta no próprio nicho

**Decidido em 06/08/2026, depois de rodar os dois.** Foram implementadas as
duas alternativas — uma segunda linha de botões na barra inferior e as
etiquetas 3D nos nichos — justamente para escolher com as duas no ar. A barra
saiu.

O que sobra: **etiqueta por nicho**, no mesmo `<Html>` do drei que desenha a
etiqueta de hover do livro, ancorada na borda frontal da prateleira, visível só
na cena da estante, com a do ano ativo destacada. Ela acumula as duas funções
que a barra dividia: diz que ano é aquela prateleira **e** é o botão que dá
zoom nele. A linha na barra repetia essa informação longe do objeto que ela
descreve.

Com filtro ativo, a etiqueta vira contador (`2023 · 4`) e o ano que zerou fica
apagado e sem clique — comportamento que morava nos botões da barra e migrou
para cá quando ela saiu.

### D6 — O ano manda; o Índice atua dentro dele

- Filtro de categoria/tag **apenas oculta** livros. O nicho fica mais vazio, e o
  botão do ano mostra quantos sobraram (`2023 · 4`). Ano que zerou fica
  desabilitado, não some.
- Ordenação (nota/ano de publicação/categoria) reordena **dentro de cada
  nicho**.
- O agrupamento nunca é recalculado com a lista filtrada — senão os anos
  trocariam de nicho debaixo do dedo de quem está filtrando.

### D7 — Crescimento: segunda estante ao lado

Capacidade total: 5 × 0,593m = **2,96m** de lombada. O acervo ocupa 1,86m e
cresce 0,2-0,4m por ano, então lota por volta de 2029.

Quando o agrupamento não couber nos 5 nichos, uma **segunda cópia do mesmo
móvel** aparece ao lado (espelhada em X, para o zigue-zague fazer par) e os
anos continuam nela. É uma condição no código, avaliada a cada render — não uma
tarefa manual agendada para o futuro. Nenhum livro precisa encolher e nenhum
ano perde identidade.

### D8 — Livro lido sem data de leitura

Entra no nicho mais recente, e a etiqueta daquele nicho ganha um `+ s/ data`.
Nunca desaparece da estante. O caso é raro por construção (o CLI passa a pedir
a data para todo livro com status `lido`), mas some silenciosamente seria o
pior comportamento possível para um acervo pessoal.

### D9 — Mobile perde o arrasto lateral

O `truckSpeed` hoje ativo só na visão estante existe porque a fila de livros era
mais larga que a tela. A estante nova é vertical e cabe inteira no quadro, então
o arrasto sai e a navegação passa a ser pelos botões de ano — mais preciso no
toque do que arrastar até achar o livro.

## Arquitetura

Duas peças puras novas em `lib/`, `.mjs` como todo o resto compartilhado entre
o CLI e o Next, cobertas por `node --test`:

- **medidas do modelo**: a tabela de nichos de D2 (pisos, centros, vãos,
  fator de escala derivado) + o teste que confere contra o `.glb`;
- **agrupamento**: a função de D3, que recebe os livros de estante e a
  capacidade de um nicho e devolve os grupos com seus rótulos — a peça onde os
  casos de borda (ano que não cabe, transbordo para a segunda estante, livro
  sem data) são decididos e testados sem tocar em three.js.

Nos componentes:

- `Bookshelf.tsx` posiciona por nicho, não mais por fileira; `splitShelfRows` e
  `SHELF_ROW_SPACING_M` saem de `lib/book-dimensions.mjs`;
- `Room.tsx` perde as pranchas geradas em código e passa a montar o(s) GLB(s);
  perde também a prop `larguraEstanteM`, que existia só para dimensionar a
  prancha;
- `CameraRig.tsx` ganha os viewpoints derivados dos nichos e perde o trilho de
  arrasto;
- `RoomCanvas.tsx` passa o ano selecionado adiante e desenha a segunda linha de
  botões.

## Fora de escopo

- Os **outros pontos de layout da sala** (composição geral, mesa, parede vazia,
  iluminação) — serão tratados numa rodada seguinte, com este design já no
  lugar.
- O plano `2026-07-31-sinopse-ia-e-data-de-leitura.md` (sinopse, exibição da
  data na UI, ordenação da listagem) continua pendente e independente.
- `spine_color` vir do fundo da capa placeholder (lombadas quase todas brancas)
  é um problema real e conhecido, mas de dado, não de layout.

## Dependência de dado

Esta feature **precisa de `finished_at` preenchido** — sem data de leitura não
há como agrupar por ano. Hoje o banco tem 0 dos 51 livros com data. O
`scripts/aplicar-leitura.mjs --apply` (já commitado, ainda não executado) é
pré-requisito da implementação, não parte dela.
