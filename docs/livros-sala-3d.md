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
atrás (uma placa, um disco, mãos-francesas). Sem sombra projetada, imagem
colada em parede escura lê como adesivo.

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

Um trilho único, em loop: `[sala, mesa, estante, ano₁…anoₙ, PC]`. Setas
laterais e roda do mouse percorrem tudo; as setas verticais são um atalho para
pular de ano em ano dentro da estante.

Isso já foi dois eixos cruzados (laterais trocavam cena, verticais andavam nos
anos) e o efeito era ficar preso: chegando na estante, rolar só circulava entre
os nichos. O mesmo gesto significava coisas diferentes conforme onde se estava.

Fora do trilho ficam três estados que só se alcança clicando num objeto — o
Índice (lava lamp), o close no porta-retratos e o bilhete da gaveta —, todos com
saída por `Esc`. O bilhete é o único de dentro de outro: fechá-lo devolve a
gaveta aberta, e só o `Esc` seguinte fecha a gaveta.

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

**Chegar na parada não abre a gaveta; clicar abre.** Atravessar não é escolher —
a mesma lição que apagou o evento `room_scene_changed`. E sair da parada fecha,
senão o plano geral fica com uma gaveta escancarada embaixo da mesa. O clique
faz as duas coisas juntas (leva a câmera e abre), porque do plano aberto do
canto a gaveta é um puxador de dois centímetros na tela.

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

## Créditos dos modelos

Dezessete modelos da sala são CC BY 3.0, e essa licença **exige atribuição no lugar
onde a obra é exibida** — o `LICENSE.md` do repositório não cumpre isso para
quem visita o site. `components/livros/CreditosModelos.tsx` põe a linha no
rodapé, e o `Footer` a monta só em `/livros`. Mexeu no `LICENSE.md`, mexa lá.

## Fora de escopo, por decisão

- **Adapter de Skoob**: a API pública foi desligada em setembro de 2025 e não há
  exportação nativa. O gancho existe em `lib/book-sources/`.
