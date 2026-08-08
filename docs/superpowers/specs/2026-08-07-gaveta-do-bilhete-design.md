# A gaveta da mesa do PC

Clicar na gaveta da mesa do computador leva a câmera até ela, a gaveta desliza
para fora revelando um bloco de notas, uma caneta e alguns post-its, e clicar no
bloco abre um painel com uma lista de frases — o "resumo de todos os livros" do
dono do acervo.

É um objeto novo no canto de trabalho, que **não é território congelado** e
portanto pode receber isto sem pedido explícito de mexer nele.

---

## Por que uma gaveta, e por que este conteúdo

A sala já diz o que foi lido (a estante), o que está sendo lido (a pilha na mesa
de centro) e o que se quer ler (a torre no chão). Faltava o que **sobrou** de ter
lido tudo isso.

A lista que a nota carrega — "Resumo de todos os livros… Não esquecer:" seguida
de doze aforismos e um fecho — é exatamente esse resto, e uma gaveta é onde ele deveria
estar: fechada por padrão, embaixo da mesa de estudo, achável só por quem foi
curioso o bastante para abrir. Não é um easter egg decorativo; é a tese da sala
guardada no lugar mais discreto dela.

---

## A gaveta já existe no modelo

Este é o fato que torna a coisa toda barata. Abrindo o `desk-corner.glb`:

```
nodes: deskCorner | deskCorner_1 | drawer
```

A gaveta é um **nó separado**, com puxador modelado. Não precisa ser construída —
precisa ser transladada.

Medidas lidas dos acessores do `.glb` e convertidas pela escala da mesa
(`alturaAlvo = 0.74` sobre uma altura de modelo de `0.3844` dá **1.925**):

| grandeza | valor |
|---|---|
| tamanho | 0,379 × 0,096 × 0,316 m (larg × alt × prof) |
| centro, fechada | `[1.010, 0.576, -1.026]` |
| topo (onde o conteúdo se apoia) | `y = 0.6245` |
| face frontal, fechada | `z = -0.869` |

O puxador fica no **-z local** do modelo. A mesa é montada com
`rotation-y = Math.PI`, que leva esse -z local para o **+z do mundo** — ou seja,
a gaveta abre na direção da sala e da câmera. Não é sorte de conveniência, é o
que faz a ideia funcionar sem virar a mesa.

**Curso de 22cm dos 32cm de profundidade** (~70%). Aberta até o batente, uma
gaveta parece prestes a cair; 70% já expõe o conteúdo inteiro.

### O bloco é maciço — a bandeja resolve

A gaveta do Kenney é uma caixa sólida, sem cavidade. Puxá-la revelaria a face de
cima de um bloco, e os objetos pareceriam apoiados numa prateleira, não guardados
dentro de algo.

A saída são **quatro paredinhas finas** (`boxGeometry`, ~2,5cm de altura) no
perímetro da face de cima, formando uma bandeja. O conteúdo se apoia no fundo
dela.

**As paredinhas e todo o conteúdo ficam `visible={false}` com a gaveta fechada.**
Isso não é otimização: é o que elimina o risco de eles aparecerem flutuando sob o
tampo caso a carcaça do móvel seja oca naquele ponto — coisa que não dá para
saber sem abrir a malha, e que não precisa ser sabida se o problema não existe.
Poupar draw calls no estado normal da sala é o bônus.

---

## Como o movimento é feito

### `KenneyModel` ganha um prop, e continua burro

```ts
/** Nós do modelo entregues por NOME, para quem precisa animá-los por fora. */
noRef?: Record<string, MutableRefObject<Object3D | null>>;
```

Mesmo endereçamento-por-nome que `cores`, `ocultos` e `texturas` já usam — com a
diferença de mirar o nome do **nó**, não o do material (a gaveta compartilha
`wood` e `metal` com a mesa inteira, então material não a endereça).

`KenneyModel` só preenche o ref a partir do clone que ele já monta. Não anima,
não roda `useFrame`, não sabe o que é uma gaveta. Ele já clona a cena por
instância (`scene.clone(true)`), então mexer nesse nó não move as gavetas de
nenhuma outra mesa que venha a existir.

### `decor/Gaveta.tsx` (novo) faz o resto

Um `useFrame` interpola uma abertura de 0→1 guardada em **ref, não em estado** —
60 re-renders por segundo numa cena com ~20 modelos seria o jeito errado — e move
duas coisas em sincronia:

1. **o nó `drawer`**, em unidades locais do clone: `no.position.z -= curso / 1.925`
2. **um `<group>` irmão com o conteúdo**, em metros de mundo: `position.z += curso`

São dois espaços diferentes porque o nó vive dentro do clone escalado e o
conteúdo não. Escrever o mesmo número nos dois é o erro óbvio a evitar, e a razão
de a escala aparecer explicitamente na conta.

`Gaveta.tsx` é **controlado**: recebe `aberta`, `onAlternar` e `onAbrirBilhete`.
Ele cuida da geometria e da animação; quem decide o que está aberto é o
`RoomCanvas`. É o mesmo princípio já escrito no `Room.tsx` — *controle mora no
RoomCanvas, a sala é cenário*.

---

## Navegação

### A gaveta vira a 5ª sub-parada do canto do PC

`FOCOS_DO_PC` passa a ser
`[recomendações, gaveta, monitores, alto-falante, bíblia]`.

A posição na lista sai da posição no mundo: o trilho varre o canto da esquerda
para a direita, e a gaveta está em `x ≈ 1.01`, entre o quadro de recados
(`x ≈ 0.68`) e os monitores (`x ≈ 1.84`).

O critério documentado para entrar em `FOCOS_DO_PC` é "objeto que TEM ação" — a
gaveta tem duas.

### A câmera precisa passar à esquerda da cadeira

Restrição real, não estética: a cadeira está em `[1.21, ~, -0.21]` com raio ~0,3m
e 0,95m de altura. Uma câmera que se aproxime da gaveta pela frente-centro
atravessa o encosto.

Valores de partida (afinados olhando, como todo enquadramento desta sala):

- **âncora**: `[1.01, 0.63, -0.90]` — o centro da bandeja com a gaveta aberta, e
  não com ela fechada: é onde o interessante vai estar, e a face fechada continua
  no quadro logo atrás.
- **direção alvo→câmera**: `[-0.55, 0.62, 0.56]`, distância `0.75` — daí a câmera
  cai em `x ≈ 0.61`, folgada à esquerda da cadeira.

`focoDeObjeto()` deriva os limites de giro sozinho, como para as outras quatro.

Esta parada é a única do canto que olha **de baixo da linha do tampo**. As outras
quatro miram de cima; qualquer uma delas esconderia a gaveta atrás da própria
mesa.

### O que abre o quê

| gesto | efeito |
|---|---|
| chegar na parada pela roda/setas | **nada** — a gaveta continua fechada |
| clique na gaveta | câmera vai para a parada **e** a gaveta abre |
| clique de novo | fecha (a câmera fica) |
| clique no bloco de notas, gaveta aberta | abre o painel do bilhete |
| `Esc` | fecha o bilhete; `Esc` de novo fecha a gaveta |
| sair da sub-parada | a gaveta fecha sozinha |

**Chegar não abre**, e isso é a mesma lição que apagou o evento
`room_scene_changed` do analytics: atravessar uma parada não é escolher nada.
Abrir é um gesto, e gesto é clique.

**Sair fecha**, senão o plano geral da sala fica com uma gaveta escancarada
embaixo da mesa.

Etiqueta de hover no mesmo padrão do monitor da direita: *"Abrir a gaveta"* /
*"Fechar"*, e *"Ler"* sobre o bloco. Em `isMobile`, tap único e sem etiqueta,
como o resto da sala.

### Estado, e onde ele mora

`RoomCanvas` ganha `gavetaAberta` e `bilheteAberto`, exatamente paralelos ao
`retratoAberto` que já existe. Os callbacks sobem por `Room` → `CantoDeTrabalho`
→ `Gaveta` do mesmo jeito que `onAbrirRetrato` já sobe hoje — o padrão está
posto, não se inventa um contexto novo para isto.

Precedência do `Esc`, de dentro para fora: **bilhete → gaveta → retrato →
índice**.

---

## O bilhete

Painel DOM por cima do canvas, nunca texto dentro do 3D — a regra da sala é
explícita: texto como textura fica borrado, não é selecionável e leitor de tela
não alcança.

`components/livros/BilheteOverlay.tsx` (novo), com o texto em `lib/bilhete.ts`
(novo) — um array de strings. A separação existe porque essa lista vai crescer:
editá-la deve ser mexer num array, não caçar `<li>` dentro de JSX.

### Visual

- **Papel**: fundo creme, pautado sutil, leve rotação de folha largada, sombra de
  papel solto. Tudo CSS.
- **Tipografia**: Quicksand no corpo, Space Mono no cabeçalho *"Resumo de todos
  os livros… Não esquecer:"*. **Nenhuma fonte nova.** Chegou a estar em mesa uma
  família manuscrita; caiu por causa do próprio conteúdo — letra de mão é ótima
  em três linhas e cansativa nas treze desta lista.
- **A última frase destacada** (*"Coma a metade, corra o dobro e sorria o
  triplo!"*): é a única imperativa da lista e fecha a folha com peso.
- Assinatura *"— Luiz"* à direita, menor.
- Fecha por `Esc`, por clique fora e por um botão explícito — como os outros
  painéis da sala.

### Texto

```
Resumo de todos os livros… Não esquecer:

O ambiente é a mão invisível que controla o mundo
Questionamento aponta a direção
Comparação gera frustração
Foco significa abrir mão
Quem é bom em dar desculpas, não é bom em mais nada
Pouco, mas constante
Não gaste energia com o que você não controla
O que aconteceria se você não desistisse?
A ausência de evidência NÃO é evidência de ausência
Quem tem um porquê aceita quase qualquer como
Quem aprende não depende
Não falta oportunidade, falta atitude

**Coma a metade, corra o dobro e sorria o triplo!**

— Luiz
```

Ortografia corrigida sobre o original (`direçao`, `oque`, `desistice`,
`ausencia`, `evidencia`, `cora`, e `um por que` → `um porquê`, substantivo) e os
pontos-e-vírgulas removidos: eles fazem
sentido em texto corrido e viram ruído numa lista de marcadores.

---

## Os objetos dentro da gaveta

| objeto | como | por quê |
|---|---|---|
| bloco de notas | GLB do poly.pizza | é o alvo de clique — precisa ler como bloco de papel de verdade |
| caneta | GLB do poly.pizza | idem, e uma caneta é difícil de fazer convincente com primitivas |
| post-its | **primitivas** (3 `planeGeometry` de ~5cm, giros e cores diferentes) | um post-it é literalmente um quadrado; o GLB custaria um download, um pré-carregamento e uma terceira atribuição CC-BY para chegar ao mesmo resultado nessa distância |

Se os post-its ficarem pobres na tela, trocar por GLB depois é uma linha. O
caminho contrário — descobrir tarde que se pagou por nada — é o caro.

Os dois GLBs entram na lista de pré-carregamento do fim de `KenneyModel.tsx`.
Eles são montados sempre (só invisíveis com a gaveta fechada), então baixam de
qualquer jeito na abertura da sala; pré-carregar só evita que a gaveta se
mobilie em cascata na frente de quem já chegou nela.

**Atribuição obrigatória**: os dois são CC BY. Entram em
`public/livros/modelos/LICENSE.md` e em `components/livros/CreditosModelos.tsx`.

---

## Analytics

Dois eventos, ambos por `trackRoomObjectClick`, que já existe e é genérico:

- `trackRoomObjectClick('gaveta', 'abrir' | 'fechar')`
- `trackRoomObjectClick('bilhete')`

Os dois passam no critério do `CLAUDE.md`: são gestos deliberados, e nenhum
`page_view` responde "alguém abriu a gaveta". A travessia da parada **não** vira
evento, pelo mesmo motivo de o `room_scene_changed` ter sido apagado.

---

## Testes

Nada de novo em `lib/*.mjs` que precise de teste próprio — a gaveta é cena e
animação, e a regra da sala é que isso se verifica olhando.

Mas `lib/livros-cenas.test.mjs` **vai quebrar** e é para quebrar: o trilho ganha
uma parada, e as asserções sobre o comprimento dele e sobre a ordem das
sub-paradas do PC precisam ser atualizadas junto. É o teste fazendo o trabalho
dele.

---

## Arquivos

**Novos**
- `components/livros/decor/Gaveta.tsx`
- `components/livros/BilheteOverlay.tsx`
- `lib/bilhete.ts`
- `public/livros/modelos/nota.glb`, `public/livros/modelos/caneta.glb`

**Alterados**
- `components/livros/decor/KenneyModel.tsx` — prop `noRef`, `MODELOS`, pré-carga
- `components/livros/decor/CantoDeTrabalho.tsx` — monta a `Gaveta`, publica a âncora em `ancorasDoCantoDeTrabalho`
- `components/livros/Room.tsx` — repassa os callbacks
- `components/livros/RoomCanvas.tsx` — `gavetaAberta`, `bilheteAberto`, `Esc`, monta o overlay
- `components/livros/CameraRig.tsx` — a 5ª entrada de `VIEWPOINTS_DO_PC`
- `lib/livros-cenas.mjs` + `lib/livros-cenas.test.mjs` — o 5º foco
- `public/livros/modelos/LICENSE.md`, `components/livros/CreditosModelos.tsx` — atribuição
- `docs/livros-sala-3d.md` — a seção que registra estas decisões

---

## Fora de escopo, por decisão

- **Escrever na nota, ou editar a lista pela tela.** A lista é conteúdo do dono
  do acervo e mora no código, como todo o resto do texto da sala. Nenhuma rota de
  admin, pela mesma razão do acervo inteiro.
- **Mais de uma gaveta.** O modelo tem uma; inventar as outras seria construir
  geometria para repetir um gesto que já foi feito.
- **Guardar livros na gaveta.** Livro tem lugar na sala pelo `status`, e são
  quatro lugares já definidos. Um quinto informal aqui dentro contradiria isso.
