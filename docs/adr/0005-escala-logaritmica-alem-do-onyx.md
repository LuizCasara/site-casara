# 0005 — Escala logarítmica (log₂) para a nota do Ingress além do Onyx

## Status

Aceito (18/09/2026)

## Contexto

**O problema.** A "nota geral" do ranking do Ingress (`/ingress/ranking`) é a média de 5 eixos × 20 (Onyx em tudo = 100). Cada eixo é a média das "posições de tier" dos seus stats (Bronze = 1 … Onyx = 5). Depois do Onyx a posição continuava **em linha reta**: ×2 = 6, ×3 = 7, ×148 = 152.

Isso deixou uma única medalha decidir o placar. O Onyx de *Mind Units* (MU) é de só 4 milhões e os agentes reais têm centenas de milhões, então o MU chegava a 100–265× o Onyx. O caso que expôs o problema, na tela de comparação:

| | tm404 | BayBadMan |
|---|---|---|
| Construção / Destruição / Exploração / Hacking (nota do eixo) | 128 / 123 / 169 / 205 | 100 / 104 / 115 / 160 |
| Links e campos (nota do eixo) | 121 | **1070** |
| **Nota geral / posição** | 149 / 5º | 310 / 2º |

O tm404 era maior em quatro eixos e ficava atrás por causa de um stat. No ranking real, "Links e campos" chegava a valer **79%** da nota do 1º colocado (gal0daxj), e os quatro primeiros lugares eram decididos quase só pelo MU. Isso também tinha causa em MU não medir esforço: BayBadMan tem ~24 mil MU por campo criado, o tm404 ~175 — é campo gigante, não mais atividade.

Havia ainda uma **contradição na tela**: o radar travava cada stat em 2× Onyx antes de tirar a média (o BayBadMan aparecia com 95% em "Links e campos"), enquanto a nota geral não travava nada (1070). Duas escalas para o mesmo eixo, lado a lado.

**Alternativas simuladas** (sobre os 30 agentes reais, a partir de `stat_values`):

| Opção | Resultado | Por que não |
|---|---|---|
| Tirar o MU do eixo | Corrige o caso | Joga fora dado legítimo; e o problema volta com a próxima medalha disparada (Pontos de glifo já chega a 11× Onyx) |
| Travar cada stat em 2× / 3× / 4× Onyx | Top 5 quase igual ao log₂ | O teto zera qualquer diferença acima dele e comprime a nota (Top 5 entre 100 e 114 em 2×); "quem tem 4× e quem tem 400× empata" |
| log₄ | Funciona | Comprime demais (Top 5 entre 102 e 115); a regra "cada quadruplicação = +1" é menos intuitiva |
| **log₂ (escolhida)** | Funciona, sem teto | — |

## Decisão

Até o Onyx a posição continua **linear** entre os limiares de tier. A partir dele:

```
posição = 5 + log₂(valor ÷ Onyx)
```

Cada vez que o valor **dobra** em relação ao Onyx, a posição sobe exatamente 1 (×2 = 6, ×4 = 7, ×16 = 9, ×148 ≈ 12,2). Sem teto: o stat nunca deixa de somar, mas nenhuma medalha isolada define a nota. Em ×1 e ×2 o resultado é idêntico ao da escala antiga; a diferença aparece de ×3 em diante.

O radar passa a usar **a mesma escala e a mesma função**: o número do eixo no radar (nota do eixo, 100 = Onyx) é o mesmo que a Nota geral mostra. Os botões de escala `½× / Onyx / 2× / Estilo` viraram `Onyx / ×4 / ×16 / Estilo` (bordas em nota 100 / 140 / 180), porque 2× não comportava os agentes com stats muito acima do Onyx, e o padrão agora é **Estilo**. O raio continua linear na nota; a curva já está dentro dela.

## Consequências

**O depois (ranking real, 30 agentes):**

| # | Antes | Depois |
|---|---|---|
| 1 | gal0daxj 474 | Leon231480 134 |
| 2 | BayBadMan 310 | tm404 125 |
| 3 | Leon231480 297 | gal0daxj 122 |
| 4 | Rogerio1973 286 | BayBadMan 114 |
| 5 | tm404 149 | Rogerio1973 110 |

O eixo "Links e campos" passa a pesar entre 19% e 28% da nota do Top 6 (o "peso justo" de 1 eixo em 5 é 20%). O deslocamento médio de posição é o menor entre as alternativas testadas. Entre Leon231480 e tm404 a diferença é de poucos pontos: a escolha do 1º lugar continua sensível a qualquer regra.

**Onde vive a fórmula.** `lib/ingress-tier-position.mjs` é a única implementação (pura, sem I/O). O servidor (`lib/ingress-tier-score.mjs`, que grava `overall_score`, lendo os limiares do catálogo) e o navegador (`lib/ingress-radar.mjs`, que não pode importar o catálogo por causa do `fs`) chamam a mesma função. O navegador carrega uma **cópia dos limiares** em `RADAR_AXES[].parts[].tiers`; dois testes travam isso: um confere as cópias contra o catálogo, outro exige que radar e servidor deem a mesma nota para 200 conjuntos de stats aleatórios. Ao regenerar o catálogo (`scripts/ingress-catalog-gen.mjs`), rode `npm test`.

**Explicação na tela.** O bloco "Ver o que cada eixo mede…" do ranking descreve a regra, o motivo e um exemplo passo a passo. O exemplo é um agente fictício cujos números saem de `computeRadarAxes` — nada digitado à mão, então não desatualiza.

**Dado em produção.** `overall_score` e `axis_scores` de `casara.ingress_rankings` são recalculados a partir de `stat_values` (o dado bruto) por `scripts/ingress-rescore.mjs` (dry-run por padrão; `--backup`, `--apply`, `--rollback`), no momento do deploy do código — antes disso as duas escalas se misturariam no ranking. O backup fica em `casara.ingress_rankings_bkp_pre_log2_20260918` e `casara.ingress_ranking_history_bkp_pre_log2_20260918`, mais um JSON local em `scripts/backups/` (ignorado pelo git). O script só toca as colunas de nota: `updated_at`, `created_at` e AP ficam como estão. Rodar de novo é seguro (idempotente).

**O que não dá para recalcular.** `casara.ingress_ranking_history` guarda a nota mas **não** os stats, então só o snapshot mais recente de cada agente (que por construção é o retrato da linha atual) é reescrito. Os 8 snapshots mais antigos, de 5 agentes, ficam na escala antiga. O gráfico de evolução usa só AP e não é afetado; no feed de atividade, o evento mais recente desses agentes pode mostrar uma variação de nota que atravessa as duas escalas.

**Também mudou:** a mensagem de comparação enviada ao Telegram passou de "% do nível Onyx" para "nota do eixo" (100 = Onyx); nas linhas por stat da tabela de comparação, o número pequeno ao lado do valor agora é a pontuação do stat (o "% do Onyx" bruto ficou no tooltip e no painel de detalhe).

**Só vale enquanto** a premissa se mantiver: stats cumulativos com escalas muito diferentes de Onyx. Se o catálogo de badges mudar de limiares, ou uma medalha nova entrar no radar, revisitar. Reverter a decisão = novo ADR "Substitui ADR-0005" + `--rollback` do backup (e `git revert` do código, senão os próximos envios voltam a gravar na escala nova).
