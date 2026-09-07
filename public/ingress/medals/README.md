# Arte das medalhas

`BadgeMedal` (em `components/ingress/`) procura aqui um PNG com o nome
`<key>-<tier>.png`. Se acha, mostra a arte real; se não, mostra o hexágono com a
inicial. **É incremental** — cada arquivo que você adiciona melhora uma medalha,
não precisa colocar todos de uma vez.

## Sobre direito autoral

As medalhas do Ingress são arte da Niantic. Não existe pacote com licença
aberta. A comunidade (biocards, sites de perfil, trackers, IITC) usa essas
imagens há mais de dez anos sob tolerância de fato. Num portfólio pessoal e sem
fim comercial o risco é baixo, mas a decisão de colocar a arte oficial aqui é
sua. O código funciona sem elas.

## O que o FencherLC precisa hoje (14 arquivos, um por medalha no tier atual)

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

Quadradas ou com fundo transparente, ~96–256px. Quando trocar de tier num
export futuro, é só adicionar o PNG do novo tier.
