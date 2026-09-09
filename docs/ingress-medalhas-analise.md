# Medalhas do `/ingress` — análise da expansão

O Luiz jogou várias ideias para deixar as medalhas o centro da rota `/ingress`
(não os KPI). Este doc separa o que dá para fazer **agora** (com o snapshot do
app + prints que ele manda), o que precisa de **exports periódicos**, e o que só
o **dump GDPR** destrava. No fim, uma ordem de construção sugerida.

Contexto: a feature `/ingress` já está pronta na branch `feat/ingress` (ver
`.specs/features/ingress/`). Isto é uma expansão em cima dela.

---

## 1. Inventário de ideias

| # | Ideia (do Luiz) | Depende de |
| --- | --- | --- |
| A | Mais ênfase/detalhe nas badges — elas dão vida aos números | nada |
| B | Seção para as badges **não-estatística**: anomalia, evento, personagem, colecionável, "wings" | catálogo (ingress.plus) + saber **quais** o Luiz tem (prints ou dump) |
| C | Clique numa badge → painel com detalhe | nada (tier atual) / dump (datas) |
| D | No detalhe: **quando peguei** cada tier (e os anteriores) | dump GDPR (`game_log.tsv`) ou exports periódicos (aproximado) |
| E | **Timeline comum** entre as badges: uma linha do tempo mostrando quando cada uma foi conquistada | dump GDPR (datas exatas) — exports periódicos dão só aproximação por faixa |
| F | **Projeção**: quando devo bater os próximos tiers | ≥2 snapshots (taxa) — 1 export periódico já basta para começar |
| G | Hover num KPI → mostra a badge que aquela métrica alimenta | nada |

Ideias minhas que se encaixam:

| # | Ideia | Depende de |
| --- | --- | --- |
| H | "Próxima medalha mais perto" — destaque de qual badge está mais perto do próximo tier (% de progresso) | nada |
| I | Contagem de tiers: "X Onyx, Y Platina…" como um resumo do perfil | nada |
| J | Badges de contagem de evento (First Saturday ×24, Mission Day ×4, NL-1331 ×2) — o app já dá esses números no export | nada (já temos!) |
| K | Catálogo navegável de todas as 391 badges com as do Luiz destacadas | catálogo + lista do Luiz |

---

## 2. O que cada fonte de dado entrega

### Snapshot do app (temos hoje)
- Os 14 badges de estatística com valor atual → tier atual + progresso para o próximo (já feito).
- **Badges de contagem de evento**: `First Saturday Events` 24, `Second Sunday Events` 5, `Mission Day(s) Attended` 4, `NL-1331 Meetup(s) Attended` 2, `Clear Fields Events` 2, `Kinetic Capsules Completed` 151 → dá para mostrar essas badges com o número, hoje, sem print nenhum.
- `Recursions` 2 → badge Recursion.
- **NÃO diz** quais anomalias / personagens / colecionáveis o Luiz tem.

### Prints da tela de medalhas (o Luiz manda)
- Eu leio a imagem e transcrevo: nome da badge + tier (ouro/onyx/…) para um campo `eventBadges` no JSON.
- Casamento por nome contra o catálogo do ingress.plus (arte + categoria + descrição).
- Trabalhoso de manter (cada print novo = nova transcrição), mas é o único jeito antes do dump.

### Exports periódicos do app (o Luiz mandar de vez em quando)
- Cada `build` guarda um snapshot `{t, stats}` no histórico do perfil.
- Com 2+ snapshots: **taxa** de cada estatística (por dia) → **projeção** de quando bate o próximo tier (F, H).
- **Crossing aproximado**: se entre o snapshot de 07/09 e o de 07/10 o valor de `portalsCaptured` passou de 20.330 para 20.900, e o tier Onyx é 40.000, dá para dizer "no ritmo atual, Onyx em ~X meses". Não dá a data exata em que passou de um tier — só a faixa.

### Dump GDPR (`game_log.tsv`, ~30 dias)
- **Data e local exatos** de cada badge conquistada e de cada level-up (D, E).
- A **timeline comum** (E) fica precisa: um ponto por badge, no dia real.
- Séries temporais de cada estatística → projeção e crossing exatos.
- Lista completa e confiável das anomalias/eventos (não precisa de print).

---

## 3. Recomendação — 3 ondas

### Onda 1 — agora (snapshot + prints + catálogo)

O núcleo do pedido do Luiz, sem esperar nada:

1. **Badges viram o centro da página** (A). Sobem para logo abaixo do hero, acima
   dos KPI. Os 14 de estatística em destaque, com a arte real.
2. **Painel de detalhe** (C, H): clicar numa badge abre um painel com a escada
   de tiers (bronze→onyx, com os limiares e a arte de cada), onde o Luiz está,
   o valor exato da estatística, o texto do requisito (do ingress.plus), e
   "faltam X para \<tier\>". A data fica com um placeholder "history: aguardando
   dump / próximos exports".
3. **Seção "Conquistas"** (B, J): as badges de contagem que já saem do export
   (First Saturday ×24, Mission Day ×4, NL-1331 ×2, Second Sunday ×5, Clear
   Fields ×2, Kinetic Capsules ×151, Recursion ×2) + o que o Luiz transcrever
   dos prints (anomalias, personagens, colecionáveis). Cada uma com arte do
   ingress.plus.
4. **Hover no KPI → badge** (G): passar o mouse num número de estatística que
   alimenta uma badge mostra a medalha correspondente (mini-arte + tier) ao lado.
   No mobile, um toque no KPI faz o mesmo (ou o KPI já mostra um ícone pequeno
   da badge).
5. **Resumo de tiers** (I): "5 Onyx · 3 Platina · 6 Ouro" no cabeçalho da seção.
6. **Histórico começa a acumular**: `build` passa a guardar cada snapshot. Sem
   feature visível ainda, mas a partir do 2º export a Onda 2 liga sozinha.
7. **Catálogo** (K) — opcional na Onda 1: uma sub-página ou aba com as ~391
   badges do ingress.plus, as do Luiz destacadas. Pode ficar para a Onda 3.

### Onda 2 — quando houver 2+ snapshots (exports periódicos)

8. **Projeção de próximo tier** (F): taxa linear dos últimos snapshots →
   "Liberator Onyx em ~mar/2027 no ritmo atual". No painel de detalhe e como um
   card "próxima medalha".
9. **Evolução por estatística**: mini-sparkline no painel de detalhe mostrando o
   valor subindo entre os snapshots.
10. **Crossing aproximado**: "passou para Platina entre 07/09 e 07/10".

### Onda 3 — quando o dump GDPR chegar

11. **Timeline comum de conquistas** (D, E): o gráfico que o Luiz descreveu —
    uma linha do tempo com um marcador por badge/tier, no dia real em que foi
    conquistada, todas juntas. Vem do `game_log.tsv`.
12. **Data exata** no painel de detalhe: "Onyx em 12/03/2024, em \<portal\>".
13. **Lista de anomalias/eventos** confiável, sem depender de print.
14. **Projeção precisa** com a série temporal completa.

---

## 4. Modelo de dados (mudanças)

```jsonc
{
  // ... campos atuais ...
  "stats": { ... },              // continua = último snapshot (conveniência)
  "history": [                    // NOVO — um por export; alimenta projeção/timeline
    { "t": "2026-09-07T16:21:02", "stats": { ...54 chaves... } }
  ],
  "eventBadges": [                // NOVO — badges não-estatística que o Luiz tem
    { "catalog": "recursion", "count": 2 },
    { "catalog": "first-saturday", "count": 24 },
    { "catalog": "darsana-prime", "tier": "gold", "earnedAt": "2019-07-20" }
  ]
}
```

- `history` é preenchido pelo `build` (append se `capturedAt` mudou) e pelo
  `gdpr` (insere pontos antigos). `timeSeries` do modelo atual pode ser derivado
  de `history` ou mantido separado — decidir no design.
- `lib/ingress-badge-catalog.json` — NOVO, versionado: subset do ingress.plus
  (nome, slug, categoria, arte, requisito, `tier_values`) para as badges que
  importam. Não os 391 — os ~14 de stat + os de contagem de evento + o que o
  Luiz tiver. Cresce sob demanda.
- Arte das badges de evento: mesmo esquema de `public/ingress/medals/`, baixada
  do ingress.plus por um comando do CLI.

---

## 5. Ordem de construção sugerida

1. Onda 1 itens 1–6 (uma rodada de spec/tasks no `tlc-spec-driven`, em cima da
   spec existente).
2. Item 7 (catálogo) se o Luiz quiser — pode ser Onda 1 ou 3.
3. Onda 2 quando o 2º export chegar (é pequena — só o cálculo de taxa + um card).
4. Onda 3 quando o dump chegar (a parte grande: parser do `game_log.tsv` para
   eventos de badge, o gráfico de timeline comum).

**Riscos / decisões abertas para o design:**
- Painel de detalhe: modal, `<details>` que expande, ou rota `/ingress/medalha/<slug>`? (rota é compartilhável e boa pra SEO, modal é mais leve)
- Prints: quantos o Luiz consegue mandar de uma vez, e a tela do scanner mostra tier em cada badge ou só a arte? (decide o quanto dá pra transcrever)
- Catálogo de 391: baixar toda a arte (~15 KB × 391 ≈ 6 MB) é muito pro repo. Provavelmente linkar direto do ingress.plus no catálogo (aceitável lá, já que é navegação, não a página principal) e baixar só as do Luiz.
