# Estrutura do dump GDPR do Ingress

O que esperar dentro do `.zip` que a Niantic manda quando você pede o dump GDPR
(ver [ingress-contexto-e-restricoes.md](ingress-contexto-e-restricoes.md) seção
4). Compilado da leitura do parser open-source `ingresspub/ingress.data.gdpr`
(GPL-3, parsers em Java) e do `Maxr1998/IngressDataDumpExplorer`.

> **Aviso de versão:** esses parsers são de ~2021 (era Prime). O dump real de
> 2026 traz **mais arquivos** — drones (Mk-II), Machina, Scout Controller,
> Kinetic Capsules, OPR/Wayfarer atualizado. Mas o **formato** de cada arquivo é
> estável: ou é uma série temporal `timestamp → valor`, ou é uma lista com
> coordenadas, ou é o log de eventos. O plano de dados abaixo vale para o dump
> novo; só a lista exata de arquivos vai crescer.

---

## Os três formatos que importam

### 1. Série temporal de uma estatística — `timestamp \t valor`

**Dezenas de arquivos**, um por estatística. Cada linha é um ponto de medição
(a Niantic amostra semanalmente). É **isto** que destrava os gráficos de
evolução que o snapshot do app não permite.

Exemplos de nomes de arquivo (lista de 2021, vai crescer):

| Arquivo | Estatística |
|---|---|
| `kilometers_walked.tsv` | Distância caminhada |
| `xm_collected.tsv` | XM coletado |
| `xm_recharged.tsv` | XM recarregado |
| `hacks.tsv` | Hacks |
| `glyph_hack_points.tsv` | Pontos de glyph hack |
| `glyph_hack_1_perfect.tsv` / `_3_` / `_4_` / `_5_perfect.tsv` | Glyphs perfeitos por tamanho |
| `portals_captured.tsv` | Portais capturados |
| `portals_owned.tsv` | Portais possuídos |
| `portals_visited.tsv` | Portais visitados (contagem) |
| `portals_neutralized.tsv` | Portais neutralizados |
| `neutralizer_unique_portals_neutralized.tsv` | Portais únicos neutralizados |
| `deploys.tsv` | Ressonadores implantados |
| `mods_deployed.tsv` | Mods implantados |
| `resonators_destroyed.tsv` | Ressonadores destruídos |
| `links_created.tsv` / `links_active.tsv` | Links criados / ativos |
| `link_length_kilometers.tsv` | Km de link |
| `link_length_kilometers_times_days_held.tsv` | Km-link × dias |
| `link_held_days.tsv` | Dias que um link durou |
| `fields_created.tsv` / `fields_active.tsv` | Campos criados / ativos |
| `field_held_days.tsv` | Dias que um campo durou |
| `mind_units_controlled.tsv` / `_active.tsv` | MUs controladas / ativas |
| `mind_units_times_days_held.tsv` | MU × dias |
| `portal_held_days.tsv` | Dias que um portal durou |
| `link_destroyed.tsv` / `fields_destroyed.tsv` | Links / campos inimigos destruídos |
| `agents_recruited.tsv` | Agentes recrutados |
| `mission_day_points.tsv` | Pontos de Mission Day |
| `exo5_controller_fields_created.tsv` | Campos EXO5 |
| `magnus_builder_slots_deployed.tsv` | Slots Magnus Builder |
| `opr_agreements.tsv` | Concordâncias OPR/Wayfarer |
| `missions_completed.tsv` | Missões completas (contagem) |

**Parsing:** pular a 1ª linha (header). Cada linha seguinte: `coluna[0]` =
timestamp (fuso Pacífico/US), `coluna[1..]` = valor (int/float/long). Algumas
têm mais de uma coluna de valor.

### 2. Lista de portais com coordenadas — para mapa/heatmap

| Arquivo | Conteúdo |
|---|---|
| `all_portals_approved.tsv` | Portais que você submeteu e foram aprovados |
| `seer_portals.tsv` | Portais com pontos Seer (ordem de descoberta) |
| `portals_visited.tsv` | Lista de portais visitados (com lat/lng e nome) |

Dão para montar **mapa de calor de atividade** e **mapa de portais submetidos**.

### 3. Log de eventos — `game_log.tsv`

O arquivo mais rico. **5 ou 6 colunas**, separadas por tab:

```
timestamp \t lat \t lng \t <tracker/tipo> \t <descrição> \t [coluna extra opcional]
```

- `lat`/`lng` podem ser a string literal `None` (evento sem localização).
- Contém: level-ups, aquisição de medalhas (com local!), capturas, destruições,
  hackstreaks, entradas de COMM, etc.
- **Armadilha conhecida:** linhas terminando em `None\tNone` precisam de
  `sed -i 's/None\tNone$/None/g' game_log.tsv` antes de processar (bug do
  próprio dump).

De `game_log.tsv` saem: **linha do tempo de medalhas**, **mapa de onde cada
badge foi conquistada**, **primeira captura**, **marcos históricos**.

---

## Outros arquivos (contexto, menos úteis pra tela)

| Arquivo | Conteúdo |
|---|---|
| `profile.txt` | O perfil do agente em texto — versão texto do export que já temos |
| `devices.txt` | Aparelhos usados para logar |
| `comm_mentions.tsv` | Menções ao seu codinome no COMM |
| `missions.tsv` | Missões (estrutura aninhada: missão → versão → waypoints, 7/10/11 colunas por nível) |
| `OprProfile.csv`, `OprAssignmentLog.csv`, `OprSubmissionLog.csv`, `OprSkippedLog.csv` | Histórico de análise Wayfarer/OPR |
| `zendesk_records.tsv` | Tickets de suporte |
| `store_purchases.tsv` | Compras na loja |

---

## Implicação para a arquitetura da feature

O modelo de dados da tela deve prever **duas fontes que preenchem os mesmos
campos**:

1. **Export do app** (o que temos hoje) — um snapshot, todos os stats acumulados
   num instante. Preenche os cards/números.
2. **Dump GDPR** (depois) — as séries temporais preenchem os gráficos de
   evolução; `game_log.tsv` preenche a timeline de medalhas; as listas de portais
   preenchem o mapa.

O script de ingestão (ver spec) deve aceitar **os dois** e produzir um JSON
único e estável que a tela consome, marcando quais seções têm dado real e quais
estão em modo "aguardando dump".
