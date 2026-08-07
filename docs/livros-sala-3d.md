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

Fora do trilho ficam dois estados que só se alcança clicando num objeto — o
Índice (lava lamp) e o close no porta-retratos —, ambos com saída por `Esc`.

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

## Créditos dos modelos

Dez modelos da sala são CC BY 3.0, e essa licença **exige atribuição no lugar
onde a obra é exibida** — o `LICENSE.md` do repositório não cumpre isso para
quem visita o site. `components/livros/CreditosModelos.tsx` põe a linha no
rodapé, e o `Footer` a monta só em `/livros`. Mexeu no `LICENSE.md`, mexa lá.

## Fora de escopo, por decisão

- **Adapter de Skoob**: a API pública foi desligada em setembro de 2025 e não há
  exportação nativa. O gancho existe em `lib/book-sources/`.
