# Modelos 3D da sala de leitura

28 arquivos `.glb`, ~3,8 MB no total. Todo modelo montado na sala está listado
aqui; se um arquivo desta pasta não aparecer em nenhuma tabela abaixo, ele é
órfão e pode sair.

## Atribuição OBRIGATÓRIA — CC BY 3.0

Estes onze modelos **não são domínio público**, e o crédito a eles não é
opcional. Baixados em 06/08/2026 via [poly.pizza](https://poly.pizza).

| Arquivo | Modelo | Autor |
|---|---|---|
| `lava-lamp.glb` | [Lava Lamp](https://poly.pizza/m/2ey-GJxzXQN) | Jarlan Perez |
| `sword-short.glb` | [Short Sword](https://poly.pizza/m/8euoHHy9Le) | joney_lol |
| `sword-long.glb` | [Sword](https://poly.pizza/m/2p9ISOpspS) | blaeksprut |
| `phone.glb` | [Phone](https://poly.pizza/m/1L9oJAw6nY2) | Alex Safayan |
| `headphone.glb` | [Headphones](https://poly.pizza/m/4QQ-QHSQhOI) | Poly by Google |
| `corda.glb` | [Rope](https://poly.pizza/m/dkNzi6oDQj) | J-Toastie |
| `lanterna.glb` | [Time Hotel 7.07](https://poly.pizza/m/8EnRYLQkHLn) | S. Paul Michael |
| `lampiao.glb` | [Lantern](https://poly.pizza/m/h1HBWwsIGk) | Nick Slough |
| `saco-de-dormir.glb` | [Bed roll](https://poly.pizza/m/3kczVpdqvGP) | Justin Randall |
| `walkie-talkie.glb` | [Walkie talkie](https://poly.pizza/m/aXjyPdwpnJo) | Poly by Google |
| `kettlebell.glb` | [Kettlebell](https://poly.pizza/m/08Gs4e3L1N8) | Poly by Google |

A CC BY permite uso comercial e modificação (o líquido da lava lamp foi
recolorido de vermelho para verde; a espada longa foi clareada, porque os
materiais dela vêm quase pretos e sumiriam na parede escura da sala), mas
**exige que os autores sejam creditados**.

> **Pendência conhecida:** este arquivo cumpre o crédito dentro do repositório,
> não para quem visita `/livros`. A CC BY pede atribuição no lugar onde a obra é
> exibida — falta uma linha de créditos visível na sala. Ver
> `docs/livros-proximos-passos.md`.

## Domínio público — CC0

Nenhum destes exige crédito; ficam anotados para não se perder a procedência.

| Arquivo | Modelo | Autor |
|---|---|---|
| `bookshelf-tall.glb` | [Bookshelf](https://poly.pizza/m/30Iealxb0p) | CreativeTrio |
| `kit-primeiros-socorros.glb` | [First Aid Kit](https://poly.pizza/m/Hp80p6148W) | Quaternius |
| `mochila.glb` | [Backpack](https://poly.pizza/m/2g9Jm7kvIU) | Quaternius |
| `isqueiro.glb` | [Lighter](https://poly.pizza/m/t8AmON8X5a) | MaverickFX |
| `xicara.glb` | [Cup Tea](https://poly.pizza/m/M2sVC8jbmi) | Kenney |

### Furniture Kit (Kenney) — CC0

Os demais vêm do **Furniture Kit** do [Kenney](https://kenney.nl/assets/furniture-kit),
baixados em 31/07/2026 via [poly.pizza](https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z),
que redistribui o mesmo pacote já convertido para glTF binário.

| Arquivo | Modelo original | Uso na sala |
|---|---|---|
| `lounge-chair.glb` | Lounge Chair | A poltrona de leitura |
| `desk-corner.glb` | Desk Corner | A mesa em L do canto de trabalho |
| `desk-chair.glb` | Desk Chair | A cadeira de escritório |
| `computer-screen.glb` | Computer Screen | Os dois monitores (usado duas vezes) |
| `computer-keyboard.glb` | Computer Keyboard | O teclado |
| `bookcase-open.glb` | Bookcase Open | A estante amarela |
| `side-table.glb` | Side Table | A mesa de centro |
| `rug-rectangle.glb` | Rug Rectangle | O tapete do canto de leitura |
| `rug-square.glb` | Rug Square | O tapete do canto de trabalho |
| `potted-plant.glb` | Potted Plant | As plantas (chão e prateleira aérea) |
| `lamp-round-floor.glb` | Lamp Round Floor | O abajur de leitura |
| `open-book.glb` | Open Book | A bíblia aberta na mesa de estudo |

## O emblema escoteiro

Meio a meio: o fundo, a corda circular e o nó são desenho próprio, mas a **flor
de lis** é [Fleur de lis flat](https://commons.wikimedia.org/wiki/File:Fleur_de_lis_flat.svg)
do Wikimedia Commons, em **CC0**. Os dois vivem juntos em
`public/livros/escoteiro-flor-de-lis.svg`, e o `.png` ao lado é gerado dele (ver
o comentário em `EscudoEscoteiro.tsx`).

O emblema oficial da WOSM é marca registrada; o que está ali é uma representação
decorativa simplificada, do mesmo espírito de um adesivo pregado na parede.

## Por que o Furniture Kit e não outro

Os modelos dele **não têm textura nenhuma** — cada material é uma cor lisa com
nome semântico (`wood`, `metal`, `carpet`, `lamp`, `plant`). É isso que torna
possível reaproveitá-los sem herdar a paleta de outra pessoa: a estante fica
amarela e a poltrona creme trocando uma cor por nome de material, em
`KenneyModel.tsx`, sem editar nenhum arquivo binário. Também é o que os deixa
minúsculos, contra os megabytes de um pacote equivalente com mapas de textura.

Os modelos escolhidos a dedo no poly.pizza não seguem essa regra, e o preço
aparece: `walkie-talkie.glb` sozinho tem **2,4 MB**, quase dois terços do peso
desta pasta inteira. É o primeiro candidato a substituição se a carga da sala
começar a pesar.
