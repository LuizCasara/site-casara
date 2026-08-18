# Sala de leitura 3D — decisões que valem

**O que é este arquivo:** o registro do que ficou decidido em `/livros` e por
quê. Ele substitui os 12 specs e planos de fase que guiaram a construção
(jul–ago/2026) e foram apagados depois de executados — o que sobrevive a um
plano é a decisão, não o roteiro.

Regras de dado (categoria única, capas baixadas, CLI, schema `casara`) ficam no
`CLAUDE.md`. Aqui é a sala.

---

## O que a sala é

`/livros` é uma sala 3D onde os livros lidos são lombadas numa estante, os
"lendo agora" são uma pilha deitada na mesa de centro e os "quero ler" são uma
torre no chão. Passar o mouse destaca; clicar abre a página do livro.

Três metas, em ordem: encantar quem chega, falar sobre livros, e — ainda não
implementado — interagir com visitantes.

**Premissa de volume: ~50 livros hoje, ~60 em dois anos.** É ela que sustenta
uma estante sem paginação, sem instancing, cena inteira carregada de uma vez.
Acima de ~200 livros o design muda de verdade.

---

## Decisões estruturantes

### O conteúdo existe fora do canvas

Uma rota 100% WebGL não tem SEO, não gera link por livro e some para quem não
roda 3D. Portanto `/livros/[slug]` é server-rendered de verdade, e a sala é
**uma lente sobre os dados**, não a única porta de entrada. `/livros/lista`
acumula três papéis: fallback de degradação, versão acessível e grade
filtrável com query params compartilháveis.

### O `<Canvas>` mora no layout, nunca numa page

`app/livros/layout.tsx`. Numa page ele desmonta a cada navegação e o efeito
inteiro se perde. Clicar num livro muda a URL via **intercepting route**
(`@livro/(.)[slug]`) e a cena continua de pé; o botão "voltar" fecha o livro.

> **Armadilha, verificada no navegador:** para o interceptador `(.)[slug]`,
> qualquer segmento sob `/livros/` é um slug — inclusive `/livros/lista`. Numa
> navegação suave ele intercepta, procura um livro chamado "lista", não acha e
> mostra "Livro não encontrado", enquanto o `children` congela na página
> anterior (comportamento normal de interceptação: o conteúdo de trás fica como
> estava, que é o que faz o modal do livro funcionar). Com F5 tudo funciona,
> porque interceptação só ocorre em navegação client-side.
>
> **O único antídoto que funciona é navegar duro** — `<a href>`, não `<Link>`;
> `window.location`, não `router.replace`. Está encapsulado em
> `components/livros/LinkParaLista.tsx`, e todo caminho para a listagem passa
> por lá. Duas tentativas mais elegantes falharam: declarar o segmento estático
> dentro do slot (`@livro/lista/page.tsx`) não adianta, porque a interceptação é
> resolvida numa passada própria, antes da precedência entre estático e
> dinâmico; e `default.tsx` só entra quando nenhuma rota do slot casa, enquanto
> aqui o problema é uma casar quando não devia.
>
> Pelo mesmo motivo, a sincronia de URL dos filtros usa
> `history.replaceState` e não `router.replace`: o router dispararia uma
> navegação interceptável a cada clique num filtro.

### Link externo entrega conteúdo primeiro

Quem abre `/livros/<slug>` de fora recebe o HTML na hora; a sala materializa
atrás, já com o livro aberto e **sem animação** — não houve clique que a
justificasse. Se o 3D falhar, a página continua funcionando.

### Sem WebGL, reduced-motion ou GPU fraca → `/livros/lista`

Com uma exceção: em `/livros/<slug>` degradar significa só "não mostrar o 3D",
nunca redirecionar para longe de um conteúdo que já funciona.

### A sala é montada com modelos GLB, não com primitivas

A ideia original era vender a sala pela iluminação, com tudo em `boxGeometry`.
Não se sustentou: primitiva lê como adesivo flutuando. Hoje a mobília vem do
Furniture Kit CC0 do Kenney mais peças escolhidas a dedo no poly.pizza (ver
`public/livros/modelos/LICENSE.md`). Primitiva sobrou só onde o kit não tem
peça e a forma é trivial — gabinete, mouse, canetas, troféus.

`KenneyModel.tsx` é o contrato: **tamanho em metros, e `position` é sempre o
ponto do chão sob o centro da peça.** A unidade interna de cada `.glb` é
imprevisível e o pivô raramente está no centro, então "escala 1.9" não
significa nada sem abrir o arquivo.

**Regra aprendida três vezes:** objeto de parede precisa de volume próprio
atrás (uma placa, um disco, mãos-francesas). Nasceu de a sala não ter sombra
projetada, o que fazia imagem colada em parede escura ler como adesivo — hoje
tem (ver "Sombra projetada" abaixo), então a regra virou recomendação: o volume
continua ajudando, mas não é mais a única coisa segurando a peça na parede.

### `Room.tsx` não sabe que livros existem

Ele desenha cenário e publica âncoras nomeadas; Bookshelf, DeskBooks e
CameraRig se posicionam a partir delas. É o que mantém aberta a porta de trocar
a sala inteira por um modelo com baked lighting sem reescrever nada em volta.

Corolário: o que é **controle** não mora em `Room.tsx`. A lava lamp é montada
em `RoomCanvas.tsx` porque virou o botão do Índice; `Room` só publica onde ela
fica.

### Territórios congelados

`decor/EstanteDoAcervo.tsx` e `decor/CantoDeLeitura.tsx` (poltrona, abajur,
mesa de centro) estão aprovados e **só se mexe neles com pedido explícito**.
Existem como arquivos separados justamente para que rodadas de layout aconteçam
em `Room.tsx` sem tocar ali. O canto de trabalho, ao contrário, é o pedaço em
que ainda se mexe.

---

## A estante por ano de leitura

O acervo é uma linha do tempo, e a estante mostra isso: cada nicho guarda um
ano, ou dois anos vizinhos quando os dois cabem juntos.

- **O móvel é `bookshelf-tall.glb`**, escolhido pelo dono do acervo. Já tinha
  sido descartado uma vez (nichos em zigue-zague, só 5 deles, textura embutida
  em vez de materiais recoloríveis) e reafirmado depois — as três objeções se
  mostraram administráveis.
- **A escala não é escolhida a olho.** `BOOKSHELF_SCALE` é a menor que faz o
  livro caber no vão com folga para o gesto de hover. Sai em ~1,45, e a
  profundidade passar a acomodar os 20cm do livro é consequência, não sorte.
- **As medidas dos nichos são medidas, não estimadas** — lidas dos vértices do
  `.glb` e conferidas por `lib/bookshelf-model.test.mjs`. Trocar o arquivo sem
  atualizar a tabela quebra o teste em vez de enterrar os livros na madeira.
- **A divisão em anos cai do dado**, não está escrita em lugar nenhum: percorre
  os anos do mais antigo ao mais novo, enchendo os nichos de baixo para cima
  (a cronologia sobe), e só junta ano consecutivo se a soma das lombadas couber.
  Quando 2026 crescer, ele se separa de 2025 sozinho.
- **Ano que não cabe fica sozinho mesmo assim.** Partir um ano ao meio mentiria
  sobre o que o nicho guarda; quem resolve espaço é a segunda estante.
- **Cresce para o lado:** quando os grupos não cabem nos 5 nichos, uma segunda
  cópia do móvel aparece ao lado. É uma condição avaliada a cada render, não uma
  tarefa agendada.
- **Livro lido sem data** entra no nicho mais recente e a etiqueta ganha
  `+ s/ data`. Sumir seria o pior desfecho para um acervo pessoal.

**Um controle só: a etiqueta no próprio nicho.** Chegaram a existir as duas
alternativas no ar ao mesmo tempo — uma segunda linha de botões na barra
inferior e as etiquetas 3D. A barra saiu: a etiqueta diz que ano é aquela
prateleira **e** é o botão que dá zoom nele, enquanto a linha embaixo repetia a
informação longe do objeto.

**O ano manda; o Índice atua dentro dele.** Filtrar apenas oculta livros (a
etiqueta vira contador, `2023 · 4`); ordenar reordena dentro de cada nicho. O
agrupamento **nunca** é recalculado com a lista filtrada — senão os anos
trocariam de prateleira debaixo do dedo de quem está filtrando.

---

## Navegação

Um trilho único, em loop: `[sala, mesa, estante, anoₙ…ano₁, PC]`. Setas
laterais e roda do mouse percorrem tudo; as setas verticais são um atalho para
pular de ano em ano dentro da estante.

Isso já foi dois eixos cruzados (laterais trocavam cena, verticais andavam nos
anos) e o efeito era ficar preso: chegando na estante, rolar só circulava entre
os nichos. O mesmo gesto significava coisas diferentes conforme onde se estava.

**O trilho desce a estante: entra pelo ano mais RECENTE, no topo, e termina no
mais antigo, na base.** É o único lugar em que a ordem do trilho não é a do
mundo, e a razão é que o trilho apresenta — quem chega quer ver primeiro o que
foi lido por último, como uma linha do tempo que abre no post mais novo. A
estante em si continua montada de baixo para cima (a cronologia sobe, ver
"Estante por ano"), e as setas ↑/↓ continuam seguindo o mundo: subir é subir na
estante. São dois eixos com significados diferentes de propósito — o de andar
pela sala e o de andar pelo móvel.

Fora do trilho ficam os estados que só se alcança clicando num objeto — o Índice
(lava lamp), o close no porta-retratos, o bilhete, a carteira de caçador e **a
própria parada da gaveta** —, todos com saída por `Esc`. O bilhete é o único de
dentro de outro: fechá-lo devolve a gaveta aberta, e só o `Esc` seguinte fecha a
gaveta. A carteira é o oposto — camada única, e o `Esc` devolve a sala
exatamente onde estava, porque a câmera nunca saiu do lugar para abri-la (ver
"A carteira de caçador").

**A câmera nunca se move ao abrir um livro.** Existiu um ponto de vista que
recuava até o centro da sala, e o zoom dava um solavanco no mesmo instante em
que o livro saía da prateleira: dois movimentos brigando. O livro se apresenta
onde está.

**Sem órbita livre.** A câmera trafega entre pontos de vista nomeados, com
órbita curta e limitada dentro de cada um.

---

## Como um livro é representado

Uma `boxGeometry` com 6 materiais. Espessura proporcional às páginas, com piso e
teto; altura variando levemente por slug (determinístico, não aleatório, senão a
estante muda de cara a cada render).

**A escala é maior que a de um livro real, de propósito.** O texto da lombada
corre na vertical, então a altura das letras é limitada pela ESPESSURA do livro
— com espessura realista o título fica com ~7mm e vira 4px na tela.

**A lombada é gerada, não fotografada:** nenhuma API de livros fornece imagem de
lombada. Um `<canvas>` pinta o fundo e escreve título e autor na vertical em
Quicksand, a fonte que o site já carrega. Essa limitação técnica virou a regra
estética, e ela coincide com o pedido original: lidos de lombada na estante,
lendo de capa virada na mesa.

**Todas as lombadas vão para um atlas único.** A estante inteira custa uma
textura; a capa real só é baixada quando o livro abre (a API de covers da Open
Library tem rate limit). Exceção: os "lendo agora", que são 1 a 3.

**O texto não é renderizado dentro do 3D.** Texto como textura fica borrado, não
é selecionável, leitor de tela não alcança. O livro 3D fornece o quadro; o
conteúdo aparece como painel DOM por cima.

**A cor da lombada passa pela paleta da sala** (`lib/cor-lombada.mjs`) antes de
virar tinta: a cor crua da capa serve para identificar o livro, mas capas de
fundo branco viram lombadas quase brancas que estouram no `<Bloom>` e engolem o
próprio título.

---

## Mobile

Mesma cena. `pointer: coarse` é o sinal (não o tamanho de tela — um notebook
estreito não deve ganhar comportamento de toque), tap único abre o livro sem
hover intermediário, DPR reduzido. O problema real do mobile aqui é de
interação, não de GPU.

---

## Testes

Cena, animações e layout se verificam olhando. O que tem teste é a lógica pura
em `lib/*.mjs`, por `node --test` — porque um bug ali corrompe dado permanente
ou enterra livro em madeira. `.mjs` e não `.ts` porque o CLI é Node puro e não
importa TypeScript sem build.

---

## Falar com quem visita: WhatsApp, não banco de dados

Recomendar um livro (o quadro branco na parede) e comentar sobre um livro (o
botão no card) abrem o WhatsApp com uma mensagem pronta — `lib/whatsapp-livros.mjs`.

A alternativa era gravar isso numa tabela e exibir no site, e ela foi descartada
de propósito: **conteúdo público de terceiros traz moderação e spam**, problema
que este site não tem hoje e que custaria muito mais do que a feature vale. O
link entrega o mesmo resultado — quem realmente quer falar, fala — sem nenhuma
superfície nova. Mantém também a regra da sala de que toda função tem um objeto
físico: o recado sai do quadro de recados.

## Cache de navegação

`staleTimes: {dynamic: 60}` no `next.config.ts` mais `router.prefetch` dos dois
livros vizinhos em `RoomCanvas.tsx`.

O padrão do Next 15 é não reaproveitar nada: cada navegação client-side para uma
rota dinâmica refaz o request, então folhear o acervo disparava um GET por livro
e ir e voltar entre dois disparava dois GETs iguais. As duas peças só funcionam
juntas — sem o `staleTimes`, a resposta pré-carregada é descartada antes de ser
usada e o prefetch vira request desperdiçado.

Para o que sobra (primeiro livro da sessão, conexão ruim), o esqueleto em
`@livro/(.)[slug]/loading.tsx` segura o layout no lugar.

## Som ambiente

O monitor da direita manda no áudio da sala; a caixa de som da prateleira aérea
manda no volume. `components/livros/decor/use-radio.ts` é o dono de tudo, e
`lib/radio.ts` é o ponto único de configuração da estação.

**A sala abre em silêncio, com a tela apagada.** Não é gosto: desde que a tela
passou a mandar no som, começar em `lofi` seria mostrar um player que nenhum
navegador deixaria tocar sem um gesto da pessoa. Nascendo apagada, cada estado
quer dizer exatamente o que se vê e se ouve, e o primeiro clique não é um caso
especial. O monitor da esquerda continua aceso, então o canto não fica morto.

| estado | tela | som |
|---|---|---|
| `desligada` *(inicial)* | preta, sem emissivo | silêncio |
| `lofi` | player ao vivo | stream da rádio |
| `chuva` | chuva desenhada | ruído sintetizado |

### A tela é um player de verdade, não um papel de parede

`use-textura-de-player.ts` desenha capa, faixa, artista, barra de progresso,
espectro e contador de ouvintes quadro a quadro — irmão do
`use-textura-de-chuva.ts`, mesmo tamanho e mesmo "só desenha quando ativa".

A barra de progresso **interpola com o relógio local** a partir da posição que a
estação informou; ela anda a 60fps sem pedir nada à rede. E o próximo pedido de
"tocando agora" é agendado para o fim da faixa (`proximoPollMs`), não num
intervalo fixo — um `setInterval` de 5s faria dezenas de requisições inúteis no
meio de uma música de três minutos.

**Foi cogitado usar os wallpapers da própria estação e isso foi recusado**: a
API `v2/backgrounds` devolve frames de anime comercial (5 Centímetros por
Segundo, entre outros), e as próprias strings do site da estação dizem que os
fundos pertencem a seus autores. Exibir capa ao lado de "tocando agora" é o que
todo player faz; republicar o filme de alguém não é a mesma coisa. Este projeto
já leva licença a sério em `CreditosModelos.tsx` — seria contradizer o próprio
padrão.

### Três degradações, nenhuma delas um erro

O `crossOrigin` do `<audio>` é **tudo-ou-nada**: sem ele o Web Audio recusa
analisar o sinal, mas com ele um dia sem CORS do outro lado pararia o áudio por
completo. Daí a escada: stream com `crossOrigin` (toca + espectro) → stream sem
ele (toca, tela sem barras) → `FAIXA_DE_RESERVA`, se houver → "Estação fora do
ar" na tela. Nenhum degrau estoura exceção na cena.

`FAIXA_DE_RESERVA` é nula hoje, e de propósito: não há arquivo de música que
este repositório possa versionar sem alguém escolher a licença.

### A chuva é sintetizada, não é arquivo

Mesma decisão (e o mesmo motivo) do `use-textura-de-chuva.ts`: não há arquivo
para baixar, o loop não tem emenda, e mudar a densidade é mexer em meia dúzia de
números. Com ruído a ausência de emenda é ainda mais forte que na imagem —
ruído não tem altura nem ritmo, então não há ponto de repetição a reconhecer.

Ruído marrom (o corpo do aguaceiro) + branco (o estalo das gotas), passando por
um passa-baixas e um passa-altas em paralelo. O oscilador de ~25s varrendo a
frequência do passa-baixas é o que separa "chuva" de "chiado de rádio".

### A caixa de som existe pelo LED

O controle do que toca está no monitor; a caixa serve para **avisar que a sala
tem som**. Quem chega com tudo desligado não tem por que imaginar que existe
áudio ali — um LED pulsando na batida resolve isso sem texto na tela.

Três níveis discretos no clique, sem slider: arrastar dentro da cena disputa o
gesto com o OrbitControls, num alvo de 10cm no fundo da prateleira. Clique não
tem esse problema e funciona igual no celular, que não tem hover. E **sem mute**
— mutar já é desligar a tela, e dois caminhos para o mesmo silêncio seriam dois
modelos mentais disputando o mesmo resultado.

### O proxy da capa

`app/api/livros/capa-radio` existe porque `i.plaza.one` serve a imagem sem
`Access-Control-Allow-Origin`, e textura WebGL de outra origem sem CORS é
recusada. A **allowlist de host é a razão de ser do arquivo**: um proxy que
busca qualquer URL é um SSRF. Como a URL de origem é endereçada por conteúdo, a
resposta vai com `immutable` e a CDN absorve — na prática uma invocação por
faixa no mundo, não por visitante.

## O relógio da prateleira

Marca a hora de quem está vendo, entre os dois vasos da prateleira aérea.
`RelogioDigital.tsx` mais `use-textura-de-relogio.ts`, com as medidas em
`lib/relogio-model.mjs`.

**Os algarismos do `.glb` são geometria, não textura.** O material azul do
modelo não é um painel liso esperando imagem: são cinco blocos extrudados — dois
numerais, os dois pontos e uma barra — que desenham um horário fixo dentro do
plástico. Não há como formar 14:37 com eles. Então a peça entra como **carcaça**:
o material dos dígitos é escondido (`ocultos`, novo no `KenneyModel`) e um plano
aceso ocupa o vão que eles deixaram.

Isso não contradiz a regra do monitor ("acender é recolorir o material, nunca
colar um plano na frente"). Lá o plano ficaria **por cima** de uma tela
existente e sairia como adesivo desalinhado; aqui ele **substitui** a geometria
removida, no lugar exato dela. Exato porque as cinco frações que o posicionam
foram lidas dos vértices e são reconferidas a cada `npm test` — mesmo tratamento
dos nichos da estante, e pelo mesmo motivo: trocar o arquivo sem atualizar a
tabela quebra o teste em vez de deixar um retângulo aceso pairando ao lado do
relógio.

**O arquivo é Z-up**, ao contrário de toda a mobília. O `KenneyModel` mede a
caixa envolvente antes de qualquer rotação, então `alturaAlvo` aqui recebe a
LARGURA, e o quarto de volta que põe a peça em pé exige as mesmas duas
compensações do `DeitadoNoTampo` — pelo motivo espelhado: lá a peça vem em pé e
precisa deitar.

**Sete segmentos desenhados à mão, não texto com fonte.** É o que um relógio de
cabeceira tem, e evita a corrida com o carregamento da fonte: um `fillText` em
Quicksand antes de a fonte chegar sairia na fonte de sistema e nunca mais
redesenharia, porque nada nesta tela força um quadro novo.

**Não usa `useFrame`**, ao contrário da chuva e do player. Um relógio muda duas
vezes por segundo (o pisca dos pontos) e uma por minuto; pendurá-lo no laço de
render seria pedir 60 verificações por segundo para descartar 59, e ainda daria
um pisca fora de compasso. O `setTimeout` encadeado mira a próxima **borda** de
meio segundo, e não 500ms corridos, pelo mesmo motivo que o `proximoPollMs` da
rádio não é um `setInterval`.

Sem clique: um relógio já cumpre a regra de que toda função tem um objeto
físico. A função dele é dizer a hora, e ele diz sozinho.

## Sombra projetada

A mobília projeta sombra desde 18/08/2026. O trabalho não estava nas luzes: está
em `KenneyModel.tsx`, porque `castShadow` é propriedade de `Object3D` e **o three
não a herda de pai para filho** — marcá-la no `<primitive>` não alcança a árvore
que veio do `.glb`, que é a mobília inteira. Vai malha por malha, no traverse que
já existia para clonar material. Material transparente fica de fora: o mapa de
sombra ignora alfa e o vidro da janela lançaria um retângulo preto sólido.

**Paredes e chão recebem, nunca projetam.** Uma parede projetora fica entre a luz
do teto e metade da sala, e apaga a cena inteira.

**As duas fontes se revezam, nunca somam**: com o teto aceso é ele quem sombreia;
apagado, o abajur assume. No máximo um cubemap ativo por quadro. O revezamento
não é só economia — é o que dá sombra ao modo escuro, que de outro jeito ficaria
sem nenhuma, e a luz baixa do abajur projeta sombra longa na parede, bem mais
dramática que a do teto. Detalhe que torna isso obrigatório: **o three renderiza
o mapa de sombra de toda luz com `castShadow`, sem consultar `intensity`**, então
`castShadow` fixo em `true` custaria seis passes de profundidade por quadro
desenhando um mapa que ninguém vê com o teto apagado. Daí `castShadow={acesa}`.

**A janela foi testada como fonte e descartada.** Um spotLight custaria um mapa
só, contra as seis faces do cubemap de uma pointLight, mas a luz dela morre à
noite e com a cortina fechada — a sala trocava de aparência sozinha. Não repita
esse teste sem um motivo novo.

Os LIVROS ficaram de fora, de propósito e por decidir: são meshes próprios em
`Book.tsx`, fora do `KenneyModel`. Sombra sobre eles mexe na legibilidade da
lombada, que é o assunto inteiro da página.

## O interruptor e a luz do teto

Uma espelheira na parede lateral, abaixo do stand de espadas, apaga as duas
pontuais do teto. O que sobra aceso é o abajur da poltrona, a lava lamp do
Índice, as telas do canto do PC e o display do relógio — todos em outros
arquivos, nenhum passando pelo interruptor. **Apagar o teto é o que faz cada um
deles finalmente aparecer**: eles sempre estiveram lá, competindo com 22 candelas
de luz quente.

**Apagado não é zero em tudo.** As pontuais zeram, porque elas *são* a luz do
teto. Mas o `hemisphereLight` e o `ambientLight` caem para um piso baixo (0,18 e
0,07) em vez de sumirem — sem ele a estante fica preta, e as lombadas, que são o
assunto inteiro da página, deixariam de ser legíveis. O modo escuro precisa ser
um clima, não um beco sem saída. Esses dois números são o botão para mexer se
ficar escuro ou claro demais.

**A transição usa `MathUtils.damp`, não `lerp`.** Damp é exponencial e
independente de frame rate; um lerp de fator fixo apagaria a sala no dobro do
tempo num monitor de 144Hz. O `delta` entra capado em 0,1s porque uma aba que
volta do background entrega um salto de vários segundos e o damp viraria corte
seco.

**Nenhuma peça se mexe no clique**, e isso é escolha. O modelo tem uma tecla, mas
ela é simétrica em Y (medido: −0,143 a 0,146), então virá-la de cabeça para baixo
não mudaria pixel nenhum. A resposta ao clique é a sala inteira escurecendo — não
vale inventar geometria para produzir uma animação de 4mm quando o efeito
verdadeiro é esse.

O estado mora no `RoomCanvas`, como o da lava lamp, e pelo mesmo motivo: é
controle, e `Room.tsx` é cenário — a sala recebe `luzes` e ilumina, sem saber que
existe um objeto clicável mandando nela. Sem `localStorage`, como o volume:
preferência de sessão.

## Três interruptores, um estado só

Depois do teto vieram o **abajur da poltrona** e a **lanterna da estante
amarela**, e as três luzes passaram a ser um conceito único: `luzes = {teto,
abajur, lanterna}`, um objeto em vez de seis props soltos. Quem lê
`luzes.abajur` não precisa descobrir qual booleano casa com qual callback.

Teto e abajur abrem acesos; a lanterna, não. Uma lanterna esquecida acesa numa
prateleira não é o estado de repouso de uma lanterna, e o facho na parede vale
muito mais como coisa que se descobre clicando.

`use-luz-suave.ts` é o `MathUtils.damp` compartilhado pelos três. **Cuidado ao
mexer:** a `intensity` no JSX passa a ser só o valor INICIAL e precisa ser
CONSTANTE — a partir do primeiro quadro quem escreve nela é o hook, e um valor
que muda entre renders (`aceso ? 7 : 0`) é reaplicado pelo R3F a cada clique,
atropelando a suavização com o corte seco que ela existe para evitar.

**O abajur apaga a cúpula junto com a luz.** A `lamp` do modelo é um creme claro
que significa "cúpula iluminada por dentro"; apagando só a `pointLight`, o abajur
ficaria brilhando com nada acontecendo em volta — o mesmo defeito que a tela do
monitor evita ao separar "tela preta" de "tela mostrando preto".

### A mira da lanterna é derivada, não escolhida

`lib/lanterna.mjs` guarda o PONTO da parede do fundo onde o facho deve cair, e o
ângulo da lanterna sai dele. O contrário — ângulo escrito à mão — já estava
errado sem ninguém notar: com o giro decorativo que a peça tinha, o facho batia a
9cm da quina e metade da poça dobrava no canto. Um feixe apontado para o lugar
errado não quebra build nem teste, só some.

Derivado, mover a estante de parede re-mira o facho sozinho. `lanterna.test.mjs`
confere as duas coisas que fazem o efeito existir: que a poça cabe no vão entre a
quina e a moldura do pôster, e que o feixe chega quase perpendicular — a mais de
~15° de inclinação ela deixa de ser redonda e vira elipse.

A lente acende por `emissivos` nos dois materiais transparentes do `.glb` (a
ponta gorda, raio 0,104; a fina, 0,068, é a traseira). O corpo de metal fica de
fora: acendê-lo faria a lanterna inteira virar uma barra de luz.

O que **não** foi feito: o cone visível no ar. Um `spotLight` dá a poça redonda
na parede, que era o pedido; facho volumétrico é outra técnica, e encosta na
ideia de "poeira no facho de luz" que segue em
[livros-proximos-passos.md](livros-proximos-passos.md).

## A cadeira do canto do PC

Trocada em 07/08/2026 pela "Office Chair" de CMHT Oculus — a do Furniture Kit era
um banquinho genérico, e o canto inteiro é montado em volta dela. Custa 60KB
contra os ~20KB do kit, o que é caro para um enfeite e barato para o móvel
central; ainda assim é quatro vezes menor que a espada longa.

Duas armadilhas, ambas resolvidas: ela **nasce virada para +z**, ao contrário do
kit inteiro, então leva meia volta que nenhuma outra peça do canto leva — e o
desvio de 0,3 troca de sinal junto, porque depois da meia volta um ajuste
positivo gira a frente para +x. E os materiais dela **não têm nome semântico**
(`Executive__1`, `__2`, `__3`): quem é o quê saiu de medir a faixa de altura de
cada um.

**Ela recua 0,62 do centro da mesa, não 0,45** — foi empurrada para trás em
07/08/2026 para abrir caminho até a gaveta (ver abaixo). Encostada na mesa, ela
ficava exatamente na frente do único ângulo de onde a câmera consegue olhar a
gaveta, e a parada atravessava o encosto. Recuar mais do que isso começa a
plantá-la no meio da sala: o limite é o tapete e os dois kettlebells no chão.

## A gaveta e o bilhete

A sala já diz o que foi lido (a estante), o que está sendo lido (a pilha na mesa
de centro) e o que se quer ler (a torre no chão). **Faltava o que sobrou de ter
lido tudo isso** — e é o que está na gaveta da mesa do PC: um bloco de notas com
uma lista de frases, o "resumo de todos os livros". `Gaveta.tsx`,
`BilheteOverlay.tsx`, `lib/gaveta-model.mjs`, `lib/bilhete.ts`.

**A gaveta já vinha no `desk-corner.glb`**, como nó próprio (`drawer`), com
puxador modelado. Foi isso que tornou a ideia barata: ela não precisou ser
construída, só transladada. O movimento sai pelo `articulados` do `KenneyModel`
— a mesma porta que as cortinas da janela usam, e a única endereçada por NÓ em
vez de material, porque a gaveta divide `wood` e `metal` com a mesa inteira.

**O bloco do Kenney é maciço, sem cavidade.** Abrir revelaria a face de cima de
uma caixa, então quatro paredinhas finas sobre ela fazem a bandeja, e é nela que
o conteúdo se apoia. Bandeja e conteúdo **somem com a gaveta fechada**: resolve
de uma vez o risco de aparecerem flutuando sob o tampo se a carcaça for oca ali,
sem depender de como o `.glb` foi modelado por dentro.

**O tampo continua por cima de parte da bandeja mesmo aberta**, e isso é medido:
ele avança 1,9cm além da frente da gaveta fechada, e o curso de 22cm não tira os
31,6cm de profundidade inteiros de baixo dele. Da parada da câmera sobram ~7cm
de fundo na sombra, e é por isso que **tudo mora na metade da frente da
bandeja** — que, de resto, é onde as coisas ficam quando se puxa uma gaveta de
verdade. Abaixar a câmera resolveria também, e foi testado: a 0,96m ela entra na
altura do encosto da cadeira.

**Só o clique chega na gaveta.** A parada dela existe em `VIEWPOINTS_DO_PC` como
as outras, mas está marcada `foraDoTrilho`: roda e setas passam direto do quadro
de recados para os monitores, e nada em percorrer a sala revela que há uma
gaveta ali. Atravessar não é escolher — a mesma lição que apagou o evento
`room_scene_changed` —, e uma gaveta que só se abre para quem a procurou é uma
coisa que se descobre, não uma que se recebe pronta ao rolar a página. O clique
faz as duas coisas juntas (leva a câmera e abre), porque do plano aberto do
canto a gaveta é um puxador de dois centímetros na tela. E sair da parada fecha,
senão o plano geral fica com uma gaveta escancarada embaixo da mesa.

Isso obriga `paradaVizinha` a procurar num trilho COMPLETO (com as ocultas) e a
chegar num VISÍVEL: quem está na gaveta está numa parada que o trilho não
conhece, e sem os dois a primeira rolada depois de abri-la teletransportaria a
câmera para o começo da sala. Pelo mesmo motivo, as sub-paradas de uma cena são
uma LISTA de índices e não uma contagem — com a gaveta fora, os índices do canto
do PC são `[0, 2, 3, 4]`, e um `total = 4` faria a navegação parar na caixa de
som e nunca chegar à bíblia.

**Os post-its são primitivas, não um quarto `.glb`.** Um post-it é um quadrado
de cinco centímetros: três planos girados resolvem igual a esta distância e
poupam um download, uma pré-carga e uma terceira atribuição CC BY.

**O bilhete é painel DOM, nunca texto no 3D** — mesma regra da ficha de um
livro. O visual é de papel (creme, pautado, folha torta, margem vermelha, tudo
CSS), mas a tipografia é a do site: chegou a estar em mesa uma família
manuscrita e ela caiu pelo próprio conteúdo, porque letra de mão é ótima em três
linhas e cansativa nas treze desta lista.

## A janela e a hora do dia

Na parede lateral direita, entre a quina do canto de trabalho e o stand de
espadas: uma janela com cortina, e do lado de fora **a hora de verdade de quem
está vendo**. De manhã o sol subindo e luz quente entrando no chão; à noite o
céu escuro com estrelas e uma luz fria. `Janela.tsx`, `lib/luz-do-dia.mjs`,
`lib/janela-model.mjs`.

**A cortina abre fechada, e é ela a feature.** Fechada, não se revela nada — o
lado de fora existe para quem clica. Uma janela já aberta entregaria o efeito de
graça, e a sala perderia mais uma coisa a descobrir, que é a mesma razão de a
lanterna nascer apagada.

**Nada disso é um segundo estado.** A luz que entra é zerada com a cortina
fechada, mas o que esconde o céu são **as duas cortinas cobrindo o vidro**, por
geometria. Não existe o par impossível "cortina fechada e céu à mostra", porque
não há um booleano dizendo se o céu deveria aparecer.

**A hora é a do relógio de quem está vendo** — a mesma que o display da
prateleira aérea mostra. Não é economia de código: as duas coisas aparecem na
mesma tela, e um céu de meio-dia ao lado de um display marcando 21:00 seria a
sala se contradizendo sozinha. De minuto em minuto (`use-hora-do-dia.ts`), com o
`setTimeout` mirando a borda do minuto, como o relógio e o poll da rádio.

### O céu é pintado no próprio vidro

O `mat25` do `.glb` é um **quad de quatro vértices**, que é o caso exato em que
o `normalizarUV` do `KenneyModel` não é aproximação. Então o lado de fora é o
material do vidro recebendo textura, e **não há plano nenhum colado atrás da
parede** — mesma regra da tela do monitor: acender é recolorir o material que já
existe.

Uma linha nova no `KenneyModel` veio disso: **material que recebe imagem vira
opaco**. As telas do Furniture Kit já eram, mas o vidro vem `alphaMode: BLEND`
com alfa 0,4, e o céu apareceria com a parede da sala atravessando por trás.

O desenho é canvas, quinta tela desenhada da sala (chuva, player, relógio,
lombadas, céu): degradê da hora, estrelas que aparecem pela ESCURIDÃO do céu e
não por um horário, sol ou lua crescente, e uma silhueta de morros e coníferas
na cor do horizonte bem escurecida — nunca preto fixo, senão o entardecer vira
recorte de cartolina contra o laranja. **Nenhum arquivo de imagem entrou no
repositório**, pelo mesmo motivo da chuva sintetizada.

O `emissiveIntensity` é CONSTANTE, e isso importa: `emissivos` entra na chave do
memo do `KenneyModel`, então um valor variando com a hora refaria o clone do
modelo inteiro a cada minuto. Quem escurece à noite são os pixels da textura.

### A cortina franze, não desliza

No arquivo as duas cortinas nascem **entreabertas** — 16cm de fresta sobre 68cm
de vidro. Fechar é trazer cada pano até se cruzarem 2cm no meio; abrir **não é
deslizar para o lado**, e isso não é capricho: a ponta do varão está a 3cm da
borda externa da cortina, então translação pura abriria a janela em três
centímetros e depois penduraria o tecido no ar. Cortina de verdade se amontoa na
lateral. Aqui ela encolhe em X com a borda externa presa (`escala` + `desloc`
com pivô na ponta), que é o gesto certo E o único que cabe.

`FRANZIDO = 0,30` é o maior valor que ainda libera o vidro inteiro dos dois
lados — o teste é que sabe disso, não o olho.

**As medidas foram lidas dos vértices**, como os nichos da estante e o vão do
relógio, e `janela-model.test.mjs` confere o que o olho não confere sozinho: que
fechada cobre o vidro todo, que aberta não encosta nele, que em nenhum ponto do
movimento o pano passa da ponta do varão, e que a animação não volta no meio do
caminho. Elas estão em **unidades do modelo, não em metros**: o `KenneyModel`
escala a peça inteira, e um movimento em centímetros precisaria saber por
quanto.

### `articulados`: a única porta por NÓ do `KenneyModel`

Todas as outras (`cores`, `emissivos`, `texturas`, `ocultos`) endereçam
**material**, porque mexem em aparência. Mover uma peça é coisa de **nó**, e
aqui não havia escolha: as duas cortinas dividem o material `mat13`, então
nenhum mapa por material distingue esquerda de direita.

Os nomes de nó são lixo do `obj2gltf` (`group1329612974`) e ficam nomeados uma
vez só, em `janela-model.mjs`. Os materiais também não têm nome semântico
(`mat13`, `mat20`…) — mesma armadilha da cadeira executiva, e quem é o quê saiu
de medir a faixa de cada um.

### A mancha de luz no chão é derivada

Um `spotLight` no vão, mirando um objeto vazio no piso cuja distância da parede
sai da hora (`profundidadeDaLuz`): sol a pino entra quase reto e a mancha fica
rente à parede; sol baixo entra atravessado e alcança o meio do cômodo. Com um
alvo fixo, as seis da tarde bateriam no mesmo lugar do meio-dia e a hora
deixaria de se ler no chão — é a mesma lição da mira da lanterna.

**"Não há sol" não é "sol rente ao horizonte", e confundir os dois apagou a
noite inteira.** A primeira versão derivava a distância direto de
`alturaDoSol`, que devolve 0 tanto às três da manhã quanto no instante do
nascer. Resultado: a luz da madrugada saía com o ângulo mais raso possível E a
maior distância — as duas coisas que mais gastam luz — e chegava ao chão com
0,25 de irradiância, contra 0,07 do ambiente com o teto apagado. Estava lá e não
dava para ver.

A correção tem duas partes, e a segunda importa mais que a primeira:

1. O piso noturno da curva subiu de 2,2 para 4,5 candelas. **A referência da luz
   noturna é a sala APAGADA (0,07 de ambiente), não as 22 candelas do teto
   aceso** — foi contra o teto que os 2,2 foram escolhidos, e é por isso que
   estavam errados.
2. `fracaoDeSol` separa os dois regimes, e à noite a mancha cai perto da janela
   em vez de no fundo da sala. Sozinha, essa mudança vale quase quatro vezes,
   porque a queda é com o quadrado da distância.

Juntas: **de 0,25 para 1,49 no chão, seis vezes mais, e vinte vezes o ambiente**
— enquanto o dia fica onde estava (0,9× a 1,1×), que era o pedido.

O cone também apertou (0,5 rad, penumbra 0,55). `angle` **não** muda a candela —
o three mede intensidade por esferorradiano —, então abrir o cone não clareia
nada, só espalha a mesma luz por mais chão. Com penumbra em 0,8 quase tudo era
degradê e não sobrava núcleo para se ver.

No crepúsculo a mancha **recolhe** para o pé da parede em vez de esticar até o
poente. É o contrário do que o rasante faria, e é assumido: os dois regimes
estão em pontas opostas da faixa, então a transição varre a faixa inteira de um
jeito ou de outro — em 42 minutos, ou num único quadro. Na tela lê como a luz se
retirando da sala.

**Nada disso consulta o interruptor do teto**, e é de propósito: o luar não
fica mais forte porque alguém apagou a luz. Ele aparece porque o que competia
com ele sumiu — a mesma frase que já valia para o abajur, a lava lamp e as
telas.

Sem `castShadow`: a mancha É o cone do refletor, e mais um mapa de sombra numa
cena que já tem quatro luzes gerais, o abajur e a lanterna se paga em quadros
por segundo sem mudar nada que se veja.

### O que ficou de fora, por decisão

- **Raios volumétricos no ar.** Mesma recusa do facho da lanterna, e continua
  em [livros-proximos-passos.md](livros-proximos-passos.md) junto com a poeira.
- **Azimute solar real por geolocalização e data.** A janela olha para um lado
  só, então jamais mostraria nascer e pôr pelo mesmo vidro — o astro atravessa
  o vão da esquerda para a direita porque é o que se lê como "o dia passando".
  Precisão astronômica custaria permissão de localização e entregaria a mesma
  imagem.
- **Clima de verdade.** A chuva do monitor é música ambiente, não meteorologia;
  amarrar as duas criaria dois climas discordando na mesma sala. A janela fala
  só de hora.

## Os quadros, e por que nenhum é enfeite mudo

São três, em duas paredes: o pôster do Gorillaz e o quadro de recados na do
fundo, e o de Hunter x Hunter na lateral esquerda (acrescentado em 10/08/2026).
**Todos os três respondem ao clique** — dois abrem uma playlist no YouTube, o
terceiro abre o WhatsApp. Vale manter assim: um quarto quadro sem ação passaria
a ser a exceção que ninguém tem como adivinhar olhando.

Os dois links externos seguem a mecânica do escudo escoteiro —
`trackOutboundClick` disparado ANTES do `window.open`, porque depois dele a aba
pode já ter perdido o foco e o lote de eventos do cliente ainda não teria saído;
e `noopener`, sem o qual a página aberta ganha uma referência a esta pelo
`window.opener`.

A imagem de Hunter x Hunter é um quadro de transmissão **recortado**, e o
recorte é a parte que importa: o original é 16:9 e traz a marca d'água da
emissora no canto. Foi fechado em 4:3 preservando os quatro personagens e
deixando a marca de fora — o mesmo tratamento que a `quadro-recomendacoes.jpg`
levou, onde só o miolo branco virou textura e a moldura de alumínio da foto real
ficou de fora. As duas artes são de terceiros, como já era o caso do pôster do
Gorillaz, e não entram no `CreditosModelos.tsx`, que existe para a atribuição
CC BY dos modelos 3D.

**`Quadro` passou a SOMAR o `rotationY` ao quarto de volta da parede**, em vez de
ignorá-lo. Antes, passar os dois juntos não fazia nada e nada dizia — um ajuste
silenciosamente descartado. Agora um quadro de parede lateral também fica
levemente torto, que é a regra da sala inteira (a xícara, os óculos, os pôsteres
do fundo).

### Por que o de Hunter x Hunter não ficou na parede do fundo

Ele nasceu lá, no vão de 78cm entre o Gorillaz e a estante, e saiu no mesmo dia.
Dois motivos, e o segundo só apareceu depois de montado:

1. **O vão não é estável.** Quem o fecha pela direita é a estante do acervo, que
   ganha uma cópia a cada cinco grupos de ano com o conjunto sempre centrado na
   parede — cada móvel novo empurra a borda por cima do que está pendurado.
2. **A luminária do canto de leitura ficava na frente.** Ela está em x = −0,94
   com a cúpula a 1,33m, e o pôster ocupava x de −1,09 a −0,53, y de 1,29 a
   1,71. As duas faixas se cruzam: 1,45m de abajur plantado no meio do quadro.
   Nenhuma conta de parede pega isso, porque a luminária não está NA parede.

Na lateral esquerda o vão é de 1,15m, entre a estante amarela (que vai até
z ≈ −0,35) e a quina do fundo, com ~34cm de folga de cada lado. **É a única
faixa de parede da sala que nenhum móvel disputa**, e por isso o pôster de lá
não passa por `parede-do-fundo.mjs`: não há o que colidir.

### A parede do fundo tem um ocupante que cresce sozinho

`lib/parede-do-fundo.mjs` guarda a geometria dos quadros do fundo e a regra de
que nada se sobrepõe; `Room.tsx` lê as medidas de lá, e o teste monta a lista de
ocupantes. **Um quadro enterrado em madeira não estoura exceção nem quebra
build — só some**, exatamente como o facho da lanterna apontado para a quina.

O teste registra três estados, e os dois últimos como asserção e não como falha
(uma suíte vermelha por um estado futuro é ruído, não aviso):

| estantes | o que acontece |
|---|---|
| 1 *(hoje)* | parede livre |
| 2 | **o quadro de recados é engolido pela segunda estante** — 40cm dos 44 |
| 3 | o Gorillaz também entra na primeira, por 11cm |

**O caso de duas estantes é um problema real e pendente, anterior a qualquer
pôster:** o quadro de recados está em x = 0,68 desde que existe, e a segunda
estante avança até 0,87. É o próximo passo do crescimento do acervo, não um
cenário remoto. Quando chegar, o quadro de recados precisa subir ou mudar de
faixa — a mesma saída que o pôster de Hunter x Hunter já tomou.

A `FOLGA_MINIMA_M` de 3cm foi **medida, não escolhida**: o par mais apertado que
a sala tem hoje e funciona é o quadro de recados contra a estante, a 4,2cm. Um
limiar de 5cm reprovaria a sala como ela está. Um teste próprio guarda esse
número, para ele não virar falso positivo em silêncio.

O único valor duplicado em tudo isso é o `ESTANTE_GAP_M` dentro do teste. Ele
mora em `EstanteDoAcervo.tsx`, que é território congelado e um `.tsx` que
`node --test` não importa sem build. É a constante menos provável de mudar — o
que cresce é a QUANTIDADE de estantes, e disso o teste sabe sozinho. A
prateleira aérea do canto de trabalho também está fora do modelo, porque as
medidas dela nascem da quina das paredes dentro de `CantoDeTrabalho` e trazê-las
para cá seria copiar coordenada de móvel, que é o que este arquivo evita.

## A Licença Hunter

Um cartão largado na vitrine do **nicho 2** da estante, dois andares abaixo da
lava lamp. Clicar abre um painel com a arte ampliada e uma ficha do acervo.
`decor/CarteiraHunter.tsx`, `CarteiraOverlay.tsx`, `lib/carteira.ts`,
`lib/ficha-do-acervo.mjs`.

O objeto se chama **Licença Hunter** em todo lugar em que aparece — a etiqueta de
hover no 3D, o título do painel e o `aria-label` do diálogo. Os arquivos ainda se
chamam `Carteira*`, e isso é dívida deliberada: renomeá-los custaria mexer em
quatro imports para trocar uma palavra que o visitante nunca lê.

**Nicho 2, e não 1 nem 0.** As vitrines alternam de lado a cada andar — é isso
que o zigue-zague do móvel significa —, e a do nicho 1 cai do MESMO lado da lava
lamp: os dois objetos clicáveis ficariam empilhados na mesma coluna. O 2 fica na
diagonal, do lado oposto. O 0 está rente ao chão, na sombra, onde nenhuma parada
da câmera chega perto o bastante para se descobrir um cartão de dez centímetros.

**O cartão é primitiva, não um `.glb`** — mesma decisão dos post-its da gaveta:
um retângulo com uma arte na frente resolve igual a esta distância e poupa um
download, uma pré-carga e mais uma atribuição de licença.

**Ele fica DEITADO de frente para cima**, largado na prateleira como um cartão
que alguém tirou do bolso e pousou ali. Chegou a ficar escorado no fundo do
móvel, inclinado, e não é isso: escorado lê como item exposto em vitrine de loja,
deitado lê como coisa esquecida — que é o que um easter egg deve parecer.

Deitado, ele depende de a câmera olhar **de cima**, e é o nicho que resolve isso:
as paradas da sala ficam entre 1,2m e 1,6m mirando um pouco para baixo, e a
vitrine do nicho 2 está a 79cm. Num nicho alto a mesma pose deixaria o cartão de
perfil e praticamente invisível. Ele também avança 3,5cm em relação ao centro da
estante, pelo mesmo motivo do `+0,04` da lava lamp: sai da sombra do tampo de
cima.

Os 10cm de largura são 16% mais que um cartão real, pela mesma razão que os
livros desta sala são maiores que livros reais: a peça precisa dizer o que é a
três metros. Deitado, ele ocupa 10 × 6,3cm numa vitrine de 14,9cm, com 4,6cm de
folga até a frente da prateleira.

**Dois sinais que parecem detalhe e não são.** O quarto de volta que deita a peça
é NEGATIVO: com +90° a arte encararia o chão e o que se veria na prateleira seria
o verso branco do plástico. E a etiqueta de hover se desloca em **Z local**, não
em Y — o grupo está deitado, então é o +Z local que aponta para cima no mundo, e
um `[0, 0.08, 0]` jogaria o balão para dentro do fundo da estante.

### O clique NÃO mexe na câmera

É a diferença que separa a carteira da gaveta, e ela não é economia. O conteúdo
da gaveta **é 3D** — sem aproximar, o bloco de notas aparece longe demais para
se ver o que surgiu lá dentro. O da carteira é um painel DOM, que já chega em
tamanho de leitura e tapa a cena inteira: o zoom aconteceria atrás dele, sem
ninguém ver, e seria o segundo movimento brigando com o primeiro. É a mesma
razão pela qual a câmera não se move ao abrir um livro.

Consequência prática: `carteiraAberta` é um `useState` solto no `RoomCanvas`, e
**não** uma sub-parada. Não poderia ser nem por engano — os índices de
sub-parada da cena "estante" SÃO os grupos de ano (ver `grupoFocado`), e um a
mais ali passaria a apontar para um nicho que não existe.

Ela se descobre olhando a estante de perto, como a lanterna e o interruptor: dar
zoom naquele ano põe a vitrine no quadro.

### A ficha sai do acervo, não de um arquivo escrito à mão

`lib/ficha-do-acervo.mjs` calcula livros lidos, páginas, "caçando desde",
categoria mais lida e nota média a partir da lista que o `RoomCanvas` **já
recebe** — `app/livros/layout.tsx` entrega os livros com `pages`, `finished_at`,
`rating` e `category` porque a estante precisa deles de qualquer forma.
**Nenhuma query nova, nenhuma rota nova, nada no banco.** Escrever esses números
à mão significaria vir corrigir um arquivo a cada livro cadastrado, e errar em
silêncio quando alguém esquecesse.

Vem de `books` e não de `shelfBooksBase` porque `toShelfBooks` troca `pages` pela
espessura da lombada; e não da lista FILTRADA porque a carteira fala do acervo,
não do recorte que está na tela.

`.mjs` com teste `node --test`, como toda lógica pura daqui. O que o teste
protege não é óbvio de olho:

- **`rating` é NUMERIC, e o driver do Neon devolve NUMERIC como STRING.** Somar
  direto concatenaria texto (`"4"+"5" = "45"`) e a média sairia absurda sem nada
  quebrar.
- **O ano vem de `anoDeLeitura`, com `getUTCFullYear`** — a mesma armadilha dos
  nichos: `DATE` volta como meia-noite UTC, e lido em America/Sao_Paulo um livro
  de 1º de janeiro pularia para o ano anterior.
- **O desempate de categoria é alfabético.** A ordem da lista que chega muda com
  o critério do Índice, e "a primeira que apareceu" faria a carteira trocar de
  especialidade conforme a ordenação escolhida na tela.
- **Campo sem dado devolve `null`, e a linha some do painel** em vez de mostrar
  "desde —". Um acervo recém cadastrado pode ter os 50 livros e nenhuma data.

O texto fixo (nome, lema, privilégios) mora em `lib/carteira.ts`, separado do
componente pelo mesmo motivo do `lib/bilhete.ts`: quem edita é o dono do acervo,
não quem mexe em layout. O lema é uma citação, e o autor é **campo próprio** e
não parte da string — o painel o tipografa como assinatura (`blockquote` +
`cite`), que não é a mesma coisa que a frase.

E, como o bilhete e a ficha de um livro, o painel é **DOM e nunca texto no 3D**.
O cartão de 10cm fornece o objeto; o conteúdo aparece por cima. Ele é escuro nos
dois temas, pela mesma razão que o papel do bilhete é claro nos dois: é objeto
físico da sala, não superfície da interface.

### O painel se divide como um documento, não como duas colunas

A primeira versão punha a arte à esquerda e **todo** o resto à direita, e ficava
torta: uma coluna cheia ao lado de uma imagem solta. O layout de hoje segue a
anatomia de um documento de identificação:

- **cabeçalho e rodapé atravessam** as duas metades — quem identifica o documento
  inteiro manda nas duas, não pertence a uma;
- **embaixo da imagem**, o dado carimbado: os quatro números do acervo;
- **do outro lado**, o que está escrito no documento: a citação, a especialidade
  e os privilégios.

Os quatro números são **stat tiles numa grade, não linhas de tabela**. São
grandezas independentes e sem escala em comum — livros, páginas, um ano, uma nota
—, e empilhá-las com rótulo à esquerda e valor à direita as fazia parecer linhas
de uma mesma tabela, sugerindo uma comparação que não existe. Pela mesma lógica
não há gráfico nenhum aqui: quatro escalares soltos não têm o que plotar.

**O valor vai em tinta, nunca em cor.** A única coisa colorida da ficha é o ponto
da categoria mais lida, porque ali a cor codifica identidade de verdade — e ela
vem da taxonomia (`lib/book-categories.mjs`), a mesma que pinta a categoria no
card do livro, não de um tom escolhido para este painel. O nome sempre acompanha
o ponto, então a identidade nunca depende só da cor.

Sem `tabular-nums` nos valores: ele dá a todo dígito a largura de um `0`, o que
é certo numa coluna de números que precisa alinhar e errado num valor grande e
solto, onde deixa o número frouxo.

## Coisas que ninguém repara

A sala tem 17 objetos que respondem ao clique, e quase ninguém encontra mais que
três. Esta camada transforma isso numa lista que se preenche, e premeia quem
completa com um caderno de anotações no braço da poltrona. O design completo está
em [specs/2026-08-10-coisas-que-ninguem-repara-design.md](superpowers/specs/2026-08-10-coisas-que-ninguem-repara-design.md).

Três peças: a **folha da bancada de estudo** vira clicável e abre a lista
(`FolhaOverlay.tsx`); o **progresso mora no `localStorage`**, sem backend e sem
conta; e ao completar, o **caderno aparece no braço da poltrona**
(`decor/CadernoDoPremio.tsx` + `CadernoOverlay.tsx`), alimentado por arquivos
`.md` em `content/caderno/`.

**Não é fechadura.** Nada na sala fica trancado, em momento nenhum: a gaveta abre
no primeiro clique de quem chegou agora, e o bilhete dela continua onde está. Um
objeto que diz "não" a quem acabou de chegar custa mais do que rende. O prêmio
*aparece*, não destranca.

**Não é segredo.** O conteúdo do caderno é servido por `GET /api/caderno`; quem
abrir o DevTools lê tudo sem jogar. Travar de verdade exigiria segredo no
servidor, e o progresso mora no navegador — não existe segredo possível. Mesma
honestidade da nota do pódio do quiz: **isto é ritmo, não segurança.**

**Não é placar.** Sem ranking, sem tempo, sem comparação. É lista de observação,
não corrida.

### A fonte única, e as regras de quem acrescentar o item 18

`lib/coisas-da-sala.mjs` — um array de `{id, texto, dica}` de onde saem tanto o
`N` do contador quanto as linhas da folha. Os `id` reaproveitam os que
`trackRoomObjectClick` já usava; onde não existia (a folha, o índice da lava
lamp, abrir um livro, os dois pôsteres, o escudo), o id nasce ali e passa a ser o
nome canônico do objeto.

- **Objeto que cicla estados conta uma vez.** O monitor tem três e a caixa de som
  tem três: qualquer um marca. Exigir os três vira tarefa, não descoberta.
- **Link externo entra, WhatsApp não.** Os dois pôsteres e o escudo contam. O
  quadro "Sugerir um livro" ficou de fora porque abre o WhatsApp — exigir que
  alguém mande mensagem para ganhar prêmio é cobrança.
- **Navegação não conta.** Paradas de câmera, filtros e ordenação ficam fora:
  atravessar a sala não é reparar em nada. É a mesma lição que derrubou o
  `room_scene_changed` na auditoria de agosto de 2026.
- **A folha é o item 1** e se marca sozinha na primeira abertura, para a lista
  nunca aparecer zerada e a primeira linha ensinar a mecânica pelo exemplo.

### `marcarCoisa` é função de módulo, não prop nem contexto

Metade dos objetos é controlada pelo `RoomCanvas` (interruptor, cortina,
gaveta…), mas a outra metade decide sozinha dentro do próprio componente — a
Bíblia em `ItensDeEstudo`, o escudo, os pôsteres em `Room.tsx`. Um handler por
prop obrigaria a atravessar a árvore 3D inteira com uma prop nova, **incluindo
`Room.tsx`, que por contrato é cenário burro e não deve saber que existe um
jogo**. Uma função importada direto é exatamente como `trackRoomObjectClick` já é
usada nesses mesmos arquivos. Quem quer REAGIR assina `useProgressoDaSala()`
(`lib/progresso-da-sala.ts`, com `useSyncExternalStore`).

**O lado do navegador tem nome diferente de propósito.** Ele já se chamou
`coisas-da-sala.ts`, e com os dois arquivos de mesmo basename na pasta,
`import … from '@/lib/coisas-da-sala'` resolvia para o `.mjs` — a ordem de
extensões do bundler põe `.mjs` antes de `.ts`. Todo import de `marcarCoisa`
virava `undefined`, com o build passando e só um aviso no meio do log.

### `premiadoEm` é o que impede o prêmio de ser retirado

O formato guardado é `{v, achados, premiadoEm}` na chave
`coisas-que-ninguem-repara`.

- `achados` é um **conjunto de ids**, não um contador: um número não sobreviveria
  a clicar duas vezes no mesmo objeto, e não teria como riscar as linhas certas.
- Uma vez preenchido com a data ISO da conquista, `premiadoEm` deixa o caderno na
  sala **para sempre** — mesmo que um item 18 entre depois e o contador volte a
  marcar `17 de 18`. Sem esse campo, acrescentar um objeto puniria justamente
  quem já tinha completado.
- `v` existe para o dia em que o formato mudar: **versão desconhecida = começar do
  zero**, sem tentar migrar.
- Ids desconhecidos são ignorados na leitura, nunca apagados na escrita — quem
  voltar a uma versão anterior não perde progresso.
- `localStorage` indisponível (aba anônima restrita, cota estourada) degrada para
  "nada é lembrado". Nunca lança.

### O reveal: nada é sequestrado

Ao achar o 17º item aparece **uma linha discreta no rodapé** ("Você encontrou
tudo. Ver o prêmio?"), e mais nada. A pessoa pode estar com um livro aberto ou ter
acabado de voltar de um link externo, e modal, confete ou voo de câmera automático
seriam a sala decidindo o momento por ela. Só no clique a câmera voa para a parada
da poltrona (`VIEWPOINT_DO_CADERNO`, fora do trilho como o `retrato`), o caderno
pousa ao lado da caneta, e uma batida depois ele abre.

Fechar sem clicar não perde nada: a condição é `achou tudo && premiadoEm === null`
— **estado, não evento** —, então o aviso volta na próxima visita. É a mesma razão
pela qual ele aparece na volta de um link externo ou da página da Bíblia.

**A caneta está no braço desde o primeiro segundo**, muito antes de existir
caderno. Uma caneta sozinha no braço de uma poltrona é uma pergunta silenciosa:
dá antecipação sem negar nada a quem chegou agora, e faz o caderno chegar
completando uma cena que estava incompleta desde o começo, em vez de materializar
do nada. É o mesmo `caneta.glb` da gaveta — nenhum arquivo novo entrou.

**Um efeito sonoro, e é a única exceção da sala a `lib/sound.ts`.** Fechar as 17
toca `reveal.mp3` a 45% de volume. O design original pedia reveal mudo e foi
revertido depois de testar: sem som, completar a lista não tinha resposta
nenhuma. A regra de que `/livros` não passa por `lib/sound.ts` continua valendo
para o que ela foi escrita — o RÁDIO e a chuva, que precisam de grafo de Web
Audio (ganho, analisador, síntese) e não de um `<audio>`. Um clipe de meio
segundo tocado uma vez é exatamente o caso de `playSound`. **Nenhum arquivo de
áudio novo entrou**: `reveal.mp3` já servia o pódio do quiz. Os 45% existem
porque o reveal pode acontecer com a rádio lofi tocando, e efeito em volume cheio
por cima de música é ruído.

O disparo é de BORDA, com o ref inicializado pelo valor da montagem: quem volta
de um link externo com a lista já completa não leva um som ao abrir a página — e
nem levaria, porque sem gesto o navegador bloquearia o autoplay de qualquer
forma. Quem acabou de clicar no 17º objeto, sim.

**O aviso pulsa** (`.pulso-do-aviso`, em `globals.css`). Ele nasceu discreto de
propósito e ficou discreto demais: uma linha branca a mais numa fileira de botões
brancos, no rodapé de um canvas 3D. O pulso é `box-shadow`, **nunca
`transform: scale`** — sombra não ocupa espaço no layout, então a barra medida por
`useAlturaDoElemento` mantém a altura e o enquadramento da câmera não oscila a
cada ciclo.

### O caderno é primitiva, e o braço foi medido

`decor/CadernoDoPremio.tsx` é uma capa, um miolo de páginas recuado em três lados
(o quarto é a lombada) e um elástico atravessado — três caixas. Mesma decisão dos
post-its da gaveta e do cartão da Licença Hunter: um `.glb` custaria download,
pré-carga e provavelmente mais uma atribuição CC BY para um objeto de 15cm. O
requisito de forma continua atendido: ele é fisicamente outra coisa que o
`nota.glb` da gaveta, que é um bloco plano.

**Onde ele pousa saiu dos vértices do `.glb`, não de chute**:
`lib/poltrona-model.mjs` guarda a caixa da poltrona e o platô do braço (o trecho
em que a face de cima é plana e tem a largura inteira), e `bracoEmMetros()` os
converte pela altura pedida ao móvel. Mesmo tratamento da gaveta, das cortinas e
do vão do relógio, e pelo mesmo motivo: trocar o modelo sem atualizar a tabela
quebra o teste, em vez de deixar um caderno boiando ao lado de uma poltrona que
encolheu. `pontoNoBraco()` em `CantoDeLeitura.tsx` leva isso para o mundo — irmão
de `pontoNoTampo`, e publicado pela mesma razão: o conjunto está congelado, o que
se apoia nele não.

**Braço do lado +x local**, o oposto ao do abajur: do outro lado o caderno
ficaria embaixo da cúpula.

### As páginas, e o marcador que fecha o círculo

`content/caderno/*.md`, **fora de `public/`** — lá, `/caderno/01-….md` serviria o
texto cru. Ordem pelo nome do arquivo; título opcional (`# alguma coisa` na
primeira linha); sem frontmatter, porque o projeto não tem parser de YAML e não
vale trazer um por duas linhas. Renderizadas com `react-markdown` +
`@tailwindcss/typography` e o `REMAP_HEADINGS` das resenhas — o caderno é seção
da página, não documento à parte.

`GET /api/caderno` só é chamado quando o caderno abre. As razões não são segredo:
o conteúdo não pesa na carga da sala para os 99% que nunca vão abrir, e não fica
no HTML inicial de todo mundo. **A pasta precisa estar em
`outputFileTracingIncludes` no `next.config.ts`**: o caminho é montado em runtime,
o tracing do Next só enxerga `import`, e sem aquela linha a rota funciona no
`npm run dev` e devolve zero páginas em produção.

**A última página do caderno É o marcador** (`utils/marcador-pdf.tsx`), e não um
botão flutuante no canto: quem folheia até o fim encontra uma página que manda
arrancar aquela. Reusa o `renderElementToPdf` dos dois testes de personalidade.
Frente: a pergunta, tipografia grande, muita folga, pouca tinta — vai sair de
impressora doméstica. Verso: **duas frases sorteadas do bloco de notas da gaveta**
(`lib/bilhete.ts` tem doze, e não cabem num papel de 5cm — cada marcador leva as
suas, o que é feature: dois impressos em dias diferentes não são o mesmo papel),
a linha de `encontrado por` e o endereço do site no pé. **Sem formulário de
nome**: o prêmio de um caderno de anotações ser um papel que pede para ser escrito
à mão fecha o círculo.

**As linhas de preencher são `borderBottom`, nunca uma fila de `_`.** A primeira
versão usava underscores e a linha vazava para fora do tracejado: o underscore
mede o que a FONTE diz e o papel mede o que o CORTE diz, então qualquer ajuste de
corpo estoura de novo — em silêncio, dentro de um PDF que ninguém revisa. O
marcador também foi de 190×570 para 240×720 px (mesma proporção 1:3), o que é a
outra metade da correção.

O sorteio das frases roda **uma vez por abertura do caderno**, num inicializador
preguiçoso de `useState`. No corpo do render, o papel mudaria de conteúdo entre a
pessoa ler a página e clicar em baixar.

A pergunta `o que fica quando o livro acaba?` atravessa as três peças: é a última
linha da folha (fora da contagem, sem tarja e sem dica — a única que pergunta), é
o que está impresso no marcador, e é o que o caderno responde.

### Analytics: um evento, só um

`caderno_desbloqueado`, disparado quando `premiadoEm` é gravado. Passa nos dois
testes da auditoria de agosto de 2026: responde algo que nenhum `page_view`
responde (quantas pessoas chegam ao fim) e é gesto deliberado. **Nenhum evento por
item** — os 17 cliques já são medidos por `trackRoomObjectClick` e pelos eventos
de saída, e duplicá-los seria gravar a mesma informação duas vezes, o erro que
derrubou o `book_opened`.

### Para testar o reveal

Não há UI de reset, de propósito. Apague a chave `coisas-que-ninguem-repara` no
DevTools — fica registrado aqui em vez de virar um botão que ninguém deveria ver.

## Créditos dos modelos

Dezessete modelos da sala são CC BY 3.0, e essa licença **exige atribuição no lugar
onde a obra é exibida** — o `LICENSE.md` do repositório não cumpre isso para
quem visita o site. `components/livros/CreditosModelos.tsx` põe a linha no
rodapé, e o `Footer` a monta só em `/livros`. Mexeu no `LICENSE.md`, mexa lá.

## Fora de escopo, por decisão

- **Adapter de Skoob**: a API pública foi desligada em setembro de 2025 e não há
  exportação nativa. O gancho existe em `lib/book-sources/`.
- **Clique nos objetos que hoje não fazem nada** (stand de espadas, relógio
  digital, kettlebells, óculos): cada um viraria um item novo da folha, mas custa
  inventar o que o clique *faz* — e um clique que só marca ponto é justamente o
  que a sala evitou até aqui.
- **Sincronizar o progresso entre dispositivos**: quem completa no celular não
  completa no desktop, e está certo assim. Exigir conta para uma caça a cliques
  seria trocar a graça inteira por um formulário.
