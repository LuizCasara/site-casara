# Arte das medalhas

`BadgeMedal` (em `components/ingress/`) procura aqui um PNG com o nome
`<key>-<tier>.png`. Se acha, mostra a arte real; se não, mostra o hexágono com a
inicial. **É incremental** — cada arquivo que você adiciona melhora uma medalha.

Os 14 PNGs do tier atual do FencherLC já estão aqui, baixados de
**ingress.plus** (`/api/files/i37o5ykupb5voix/...`, thumbnails 128px). Para
outros tiers, veja a seção "Nomes completos possíveis" abaixo — mesma origem.

## Sobre direito autoral

As medalhas do Ingress são arte da Niantic. Não existe pacote com licença
aberta; ingress.plus é um site da comunidade que hospeda as imagens do jogo. A
comunidade (biocards, sites de perfil, trackers, IITC) usa essas imagens há mais
de dez anos sob tolerância de fato. Num portfólio pessoal e sem fim comercial o
risco é baixo, mas a decisão de usar a arte oficial aqui é sua. O código
funciona sem elas.

## Tier atual do FencherLC (os 14 que já estão aqui)

| Arquivo | Medalha · tier |
| --- | --- |
| `builder-platinum.png` | Builder · Platina |
| `connector-gold.png` | Connector · Ouro |
| `mindController-platinum.png` | Mind Controller · Platina |
| `illuminator-onyx.png` | Illuminator · Onyx |
| `liberator-platinum.png` | Liberator · Platina |
| `pioneer-gold.png` | Pioneer · Ouro |
| `explorer-gold.png` | Explorer · Ouro |
| `trekker-onyx.png` | Trekker · Onyx |
| `purifier-gold.png` | Purifier · Ouro |
| `hacker-gold.png` | Hacker · Ouro |
| `sojourner-onyx.png` | Sojourner · Onyx |
| `recharger-onyx.png` | Recharger · Onyx |
| `engineer-gold.png` | Engineer · Ouro |
| `specops-onyx.png` | SpecOps · Onyx |

`node scripts/ingress.mjs medals` lista o que está presente e o que falta.

## Nomes completos possíveis

`<key>` é uma de: `builder connector mindController illuminator liberator pioneer
explorer trekker purifier hacker sojourner recharger engineer specops`.
`<tier>` é um de: `bronze silver gold platinum onyx`.

Origem (ingress.plus, coleção `i37o5ykupb5voix`): o `id` de cada badge e os
nomes de arquivo por tier (`badge_<x>_<bronze|silver|gold|platinum|black>_<hash>.png`,
onde `black` = onyx) saem de
`https://ingress.plus/api/collections/i37o5ykupb5voix/records?perPage=400`.
A URL do arquivo é `https://ingress.plus/api/files/i37o5ykupb5voix/<id>/<filename>?thumb=128x128`.

Quando trocar de tier num export futuro, é só adicionar o PNG do novo tier.
