# Modelos 3D da sala de leitura

Todos os `.glb` desta pasta vêm do **Furniture Kit** do [Kenney](https://kenney.nl/assets/furniture-kit),
licenciado em **CC0 1.0 (domínio público)** — uso comercial livre, sem
obrigação de atribuição. O crédito abaixo é cortesia, não exigência.

Baixados em 31/07/2026 via [poly.pizza](https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z),
que redistribui o mesmo pacote já convertido para glTF binário.

| Arquivo | Modelo original | Uso na sala |
|---|---|---|
| `lounge-chair.glb` | Lounge Chair | A poltrona de leitura |
| `desk.glb` | Desk | A mesa de trabalho (canto tech) |
| `desk-chair.glb` | Desk Chair | A cadeira de escritório |
| `bookcase-open.glb` | Bookcase Open | A estante amarela |
| `side-table.glb` | Side Table | A mesinha do café |
| `rug-rectangle.glb` | Rug Rectangle | O tapete do canto de leitura |
| `potted-plant.glb` | Potted Plant | A planta |
| `lamp-round-floor.glb` | Lamp Round Floor | O abajur de leitura |
| `books.glb` | Books | Trecos na estante amarela |

## Por que estes modelos e não outros

Eles **não têm textura nenhuma** — cada material é uma cor lisa com nome
semântico (`wood`, `metal`, `carpet`, `lamp`, `plant`). Isso é o que torna
possível reaproveitá-los sem herdar a paleta de outra pessoa: a estante fica
amarela e a poltrona creme trocando uma cor por nome de material, em
`KenneyModel.tsx`, sem editar nenhum arquivo binário.

Também é o que os deixa minúsculos — os 9 modelos somam ~200 KB, contra os
megabytes de um pacote equivalente com mapas de textura.
