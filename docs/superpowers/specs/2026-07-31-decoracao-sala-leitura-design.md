# Decoração da Sala de Leitura 3D — Design

**Data:** 2026-07-31
**Status:** aprovado, pronto para plano de implementação
**Escopo:** fase 6 do spec pai — [2026-07-28-sala-de-leitura-3d-design.md](2026-07-28-sala-de-leitura-3d-design.md)

---

## Objetivo

A fase 6 do spec pai foi deixada deliberadamente aberta: "decoração da sala no
estilo do Luiz". Este documento fecha essa lacuna com um design concreto,
baseado em fotos reais do escritório do Luiz.

O pedido original, nas palavras dele: "quero que mais do que parecer algo em
específico de forma figurada, remeta ao meu íntimo, pessoal". Ou seja — o
critério de sucesso não é reproduzir o escritório real com fidelidade
fotográfica, é fazer a sala 3D evocar quem ele é, através de um punhado de
elementos reconhecíveis.

---

## Decisões estruturantes

### 1. Direção: escritório tech + leitura + camping/escotismo, não um tema literal

Três facetas da vida do Luiz, combinadas na mesma sala: o trabalho (bancada
com monitores), a leitura (poltrona, além da estante que já existe) e o
escotismo/camping (mochila e bastão de trilha na parede, um aceno ao emblema
escoteiro). Nenhuma domina — é a mistura que assina o espaço como pessoal, não
um "escritório gamer" nem uma "cabana de acampamento" genéricos.

### 2. Curadoria de destaques, não réplica

Das fotos do escritório real, foram extraídos **6 elementos-ícone** em vez de
uma reconstrução completa. Cada um carrega identidade sozinho; juntos,
compõem a cena sem virar um clone 1:1 nem sobrecarregar uma sala que hoje é
propositalmente enxuta (poucos objetos, baixo poly, ver decisão A1 do spec
pai). Ficam de fora, por ora: quadro de cortiça com fotos, aparador extra,
réplica de PCs, cortina — ver "Fora de escopo".

### 3. Paleta traduzida para o clima já estabelecido, não copiada

A sala 3D já tem um clima proposital de fim de tarde/noite aconchegante
(abajur quente, LED frio, poeira no facho de luz, bloom leve — decisão #4 do
spec pai). As fotos reais são de um ambiente bem iluminado de dia. Em vez de
copiar a luminosidade branca de "foto de catálogo", esta fase traduz a
**paleta e os objetos** (amarelo da estante, creme da poltrona, madeira
escura) para dentro do clima que já existe. O amarelo, por exemplo, é abafado
(`#d9a441`, não um amarelo saturado de tinta) para não estourar o
`luminanceThreshold` do bloom já configurado (0.4).

### 4. Puramente ambiente — sem novos pontos de vista, sem animação

Nem a poltrona nem a bancada ganham câmera/botão próprio como
`estante`/`mesa` têm hoje — são cenário visto ao fundo/lateral das cenas que
já existem. Nenhum objeto novo anima (`useFrame`); é geometria + material +
luz estática. Isso mantém `CameraRig.tsx`, `CENAS` e o trilho mobile
intocados, e cumpre o espírito da fase 6 no spec pai: decoração pura, a única
parte "que pode ser mexida infinitamente sem quebrar nada".

### 5. Som ambiente (lo-fi) entra nesta leva

O spec pai já cogitava um "toggle de lo-fi opcional reutilizando
`lib/sound.ts`" como parte da ambiência da sala. Como o gancho já existe
(mesmo padrão do loop de giro do Sorteio) e é pequeno, entra junto com o
resto da decoração em vez de virar um item separado.

---

## Objetos novos

Todos em `components/livros/RoomDecor.tsx`, montado ao lado de `<Room/>` no
`<Canvas>` do `RoomCanvas.tsx`. Todos em primitivas do three.js (sem GLB,
consistente com a decisão A1 do spec pai). `RoomDecor` não sabe nada sobre
livros e não toca em `ROOM_ANCHORS` — lê as posições/dimensões que já
existem (`estante`, `mesa`, largura da prateleira) só o suficiente para não
colidir com elas, e define suas próprias constantes de posição local.

| Objeto | Forma | Cor aprox. | Posição |
|---|---|---|---|
| **Prateleira amarela** | `boxGeometry` vazado, silhueta de estante aberta de 3-4 níveis | `#d9a441` | Encostada na parede de fundo, do lado oposto à mesa — acento de cor visto de longe, como na foto real |
| **Poltrona + almofada** | assento + encosto + 2 braços em caixas, 4 pernas finas (cilindro) | `#c9b9a3` (poltrona), almofada bicolor `#d9724c` / `#2f3e57` | Canto oposto à mesa, voltada para o centro da sala — o canto de "sentar e ler" |
| **Bancada tech** | tampo + 2 pernas em caixa, 2-3 "monitores" (caixas finas, tela apagada) + luminária articulada (haste fina + cúpula) | tampo `#2a1f18` (mesma família do `SHELF_BOARD_COLOR` já existente em `Room.tsx`), monitores `#111111` | Parede de fundo, lado esquerdo — fora da faixa de x ocupada pela prateleira de livros |
| **Mochila + bastão de trilha** | mochila = caixa arredondada + 2 alças finas; bastão = cilindro longo e fino | `#3b3f36` (mochila), cinza-claro (bastão) | Pendurados na parede, acima da bancada — o canto "camping" |
| **Prateleira de troféus + emblema** | prancha fina (`boxGeometry`) + 2-3 troféus (cone + cilindro pequenos) + disco achatado (emblema) | prancha na cor do `SHELF_BOARD_COLOR`, troféus `#c9a227`, emblema `#3a5f8a` / `#f0ece0` | Acima da bancada, como na foto real |
| **Tapete** | `planeGeometry` no chão, levemente acima do piso pra evitar z-fighting | `#a89584` | Sob a poltrona e a bancada |

Coordenadas exatas (metros) ficam para o plano de implementação — aqui é
posição relativa e intenção. Regra dura: nada colide com a caixa ocupada pela
prateleira de livros (`shelfWidthM`, calculada dinamicamente pelo número de
livros) nem com a mesa existente.

---

## Som ambiente

- `lib/sound.ts`: o union `SoundName` ganha `"lofi-loop"`.
- Novo `components/livros/LofiToggle.tsx`: botão flutuante discreto (ícone de
  nota musical), visível só quando `mode.kind === 'sala'` (mesma condição dos
  botões de cena existentes). Ao ligar, chama `startLoop("lofi-loop")`; ao
  desligar ou desmontar, chama a função de parada retornada — mesmo padrão
  já usado pelo loop de giro do Sorteio.
- Estado é local ao componente (`useState`), começa desligado — autoplay sem
  interação do usuário seria bloqueado pelo navegador de qualquer forma, e a
  interação de clique já resolve isso naturalmente. Sem persistência em
  `localStorage`: é uma preferência de sessão, não algo que precise
  sobreviver a uma nova visita.

### Asset novo necessário

`public/sounds/lofi-loop.mp3` — diferente dos efeitos curtos (12-110KB) já
existentes em `public/sounds/`, este é uma trilha de fundo pensada para
repetir em loop, então é um arquivo maior e precisa soar bem sem costura
perceptível na volta ao início. Sourcing fica como pendência (mesma origem
dos sons existentes — bibliotecas de áudio livre de royalties como o Mixkit,
que também tem uma seção de música, não só efeitos).

---

## Estrutura de arquivos

```
components/livros/
  RoomDecor.tsx      -- novo: mobília decorativa (poltrona, bancada, prateleira
                         amarela, mochila+bastão, prateleira de troféus, tapete)
  LofiToggle.tsx     -- novo: botão de som ambiente
lib/
  sound.ts           -- edita: adiciona "lofi-loop" ao SoundName
public/sounds/
  lofi-loop.mp3      -- novo asset (sourcing pendente)
```

`RoomCanvas.tsx` monta `<RoomDecor/>` ao lado de `<Room/>` dentro do
`<Canvas>`, e `<LofiToggle/>` junto aos outros overlays de UI (botões de
cena, botão de fechar livro) fora do `<Canvas>`.

---

## Testes

Mesma regra do spec pai: sem suite de testes para cena/animações/layout — se
verifica olhando. `RoomDecor.tsx` e `LofiToggle.tsx` não tocam em nenhuma
lógica pura hoje coberta por `node --test` (`lib/books.ts` e afins), então
não precisam de cobertura nova.

---

## Fora de escopo

Fica para uma iteração futura da mesma fase 6 (ela é, por definição, "a única
parte que pode ser mexida infinitamente"):

- Quadro de cortiça/imãs com fotos pessoais e o recado da criança.
- Aparador escuro extra (o das caixas organizadoras/bonés na foto).
- Réplica fiel de múltiplos monitores/torres de PC — a bancada tem uma
  versão estilizada, não uma reconstrução 1:1.
- Cortina, quadro de ar-condicionado e outros detalhes de fundo que não
  carregam identidade por si só.
- Qualquer micro-animação nos objetos novos (glow de monitor, flicker de
  luz) — deliberadamente fora, para manter esta leva 100% estática.

A tabela `casara.books` e o contrato de `ROOM_ANCHORS` não mudam por causa
de nenhum desses.
