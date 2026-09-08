# Arte das medalhas

`BadgeMedal` / `TierLadder` procuram aqui um PNG com o nome `<slug>-<tier>.png`
(badges de contagem, 5 tiers) ou `<slug>.png` (badge de imagem única — evento,
anomalia). Se acha, mostra a arte real; se não, mostra o hexágono com a inicial.

As 26 badges de contagem × 5 tiers (130 PNGs, ~2,3 MB, thumbs 128px) foram
baixadas do **ingress.plus** por `node scripts/ingress.mjs medals --fetch`.
`slug` é o mesmo do `data/ingress/badge-catalog.json` (kebab-case).

## Adicionar mais arte

- Badges de evento/anomalia que o Luiz tem: `node scripts/ingress.mjs badges add
  <slug> ... --apply` acrescenta a entrada ao catálogo (buscando no ingress.plus),
  e `medals --fetch` baixa a arte.
- `node scripts/ingress.mjs medals` lista o que está presente e o que falta.

## Sobre direito autoral

As medalhas do Ingress são arte da Niantic; ingress.plus é um site da comunidade
que hospeda as imagens do jogo. A comunidade (biocards, trackers, IITC) usa essas
imagens há mais de dez anos sob tolerância de fato. Num portfólio pessoal e sem
fim comercial o risco é baixo, mas a decisão de usar a arte oficial aqui é do
dono do site. O código funciona sem elas.
