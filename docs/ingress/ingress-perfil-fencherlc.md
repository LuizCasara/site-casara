# Perfil FencherLC — export de estatísticas (snapshot)

Fonte: exportação de estatísticas do próprio app Ingress ("All Time"), copiada em
**2026-09-07 16:21:02**. É a linha `ALL TIME` de uma tabela TSV.

**É um snapshot único, não uma série temporal.** Cada número é o acumulado da
vida toda do agente naquele instante. Para ter histórico (progresso ano a ano,
mapa de portais por data etc.) é preciso o **dump GDPR** — ver
[ingress-contexto-e-restricoes.md](ingress-contexto-e-restricoes.md) seção 4.

O app permite exportar também recortes `NOW`, `WEEK`, `MONTH` etc. — se o Luiz
exportar periodicamente (ex.: toda semana), dá para montar uma série temporal
manual sem depender do dump. **Decisão de produto para a fase de spec.**

## Identidade

| Campo | Valor |
|---|---|
| Agent Name | FencherLC |
| Faction | Enlightened |
| Level | 13 |
| Recursions | 2 |
| Months Subscribed | 5 |
| Data do export | 2026-09-07 16:21:02 |

> **Recursions = 2**: o agente já "recursou" duas vezes (reset voluntário do
> nível de volta a 1, mantendo o Lifetime AP). Por isso o **Current AP
> (13.835.748)** é muito menor que o **Lifetime AP (94.990.303)** — o Current
> conta só a recursão atual.

## AP e XM

| Métrica | Valor |
|---|---|
| Lifetime AP | 94.990.303 |
| Current AP | 13.835.748 |
| XM Collected | 180.207.686 |
| XM Recharged | 96.946.933 |

## Portais

| Métrica | Valor |
|---|---|
| Unique Portals Visited | 3.486 |
| Portals Captured | 20.330 |
| Unique Portals Captured | 2.263 |
| Portals Neutralized | 12.550 |
| Resonators Deployed | 105.886 |
| Resonators Destroyed | 80.783 |
| Mods Deployed | 16.244 |

## Links e Campos

| Métrica | Valor |
|---|---|
| Links Created | 22.521 |
| Control Fields Created | 11.981 |
| Mind Units Captured | 19.150.217 |
| Longest Link Ever Created | 347 (km) |
| Largest Control Field | 894.825 (MUs) |
| Enemy Links Destroyed | 16.340 |
| Enemy Fields Destroyed | 9.788 |
| Max Link Length × Days | 7.700 |
| Largest Field MUs × Days | 3.330.600 |
| Max Time Portal Held | 281 (dias) |
| Max Time Link Maintained | 128 (dias) |
| Max Time Field Held | 78 (dias) |

## Hacking / Glyphs

| Métrica | Valor |
|---|---|
| Hacks | 55.542 |
| Glyph Hack Points | 80.953 |
| Completed Hackstreaks | 35 |
| Longest Sojourner Streak | 740 (dias consecutivos de hack) |

## Drones (Drone Mk-II)

| Métrica | Valor |
|---|---|
| Unique Portals Drone Visited | 362 |
| Furthest Drone Distance | 6 (km) |
| Drone Hacks | 1.047 |
| Drones Returned | 5 |
| Forced Drone Recalls | 38 |

## Machina (facção neutra / IA)

| Métrica | Valor |
|---|---|
| Machina Links Destroyed | 1.793 |
| Machina Resonators Destroyed | 12.430 |
| Machina Portals Neutralized | 1.365 |
| Machina Portals Reclaimed | 765 |

## Scanner / OPR / Scout

| Métrica | Valor |
|---|---|
| Seer Points | 225 |
| OPR Agreements | 6.775 |
| Portal Scans Uploaded | 18 |
| Uniques Scout Controlled | 22 |

## Exploração e eventos

| Métrica | Valor |
|---|---|
| Distance Walked | 3.977 (km) |
| Kinetic Capsules Completed | 151 |
| Unique Missions Completed | 869 |
| Research Bounties Completed | 712 |
| Research Days Completed | 150 |
| Mission Day(s) Attended | 4 |
| NL-1331 Meetup(s) Attended | 2 |
| First Saturday Events | 24 |
| Second Sunday Events | 5 |
| Clear Fields Events | 2 |
| Battle Beacon Combatant | 1 |
| Apollo Tokens | 8.930 |
| Apollo Mod Battle Points | 789 |
| Agents Recruited | 3 |

## Linha TSV crua (para parsing futuro)

Cabeçalho e valores exatamente como vieram do export:

```
Time Span	Agent Name	Agent Faction	Date (yyyy-mm-dd)	Time (hh:mm:ss)	Level	Lifetime AP	Current AP	Unique Portals Visited	Unique Portals Drone Visited	Furthest Drone Distance	Seer Points	XM Collected	OPR Agreements	Portal Scans Uploaded	Uniques Scout Controlled	Resonators Deployed	Links Created	Control Fields Created	Mind Units Captured	Longest Link Ever Created	Largest Control Field	XM Recharged	Portals Captured	Unique Portals Captured	Mods Deployed	Hacks	Drone Hacks	Glyph Hack Points	Completed Hackstreaks	Longest Sojourner Streak	Resonators Destroyed	Portals Neutralized	Enemy Links Destroyed	Enemy Fields Destroyed	Battle Beacon Combatant	Drones Returned	Machina Links Destroyed	Machina Resonators Destroyed	Machina Portals Neutralized	Machina Portals Reclaimed	Max Time Portal Held	Max Time Link Maintained	Max Link Length x Days	Max Time Field Held	Largest Field MUs x Days	Forced Drone Recalls	Distance Walked	Kinetic Capsules Completed	Unique Missions Completed	Research Bounties Completed	Research Days Completed	Mission Day(s) Attended	NL-1331 Meetup(s) Attended	First Saturday Events	Second Sunday Events	Clear Fields Events	Apollo Tokens	Apollo Mod Battle Points	Agents Recruited	Recursions	Months Subscribed
ALL TIME	FencherLC	Enlightened	2026-09-07	16:21:02	13	94990303	13835748	3486	362	6	225	180207686	6775	18	22	105886	22521	11981	19150217	347	894825	96946933	20330	2263	16244	55542	1047	80953	35	740	80783	12550	16340	9788	1	5	1793	12430	1365	765	281	128	7700	78	3330600	38	3977	151	869	712	150	4	2	24	5	2	8930	789	3	2	5
```

## Badges / medalhas a partir dos números

O export não lista medalhas diretamente, mas quase toda badge de contagem do
Ingress deriva de um destes números (Builder ← Resonators Deployed, Connector ←
Links Created, Liberator ← Portals Captured, Illuminator ← MUs, Trekker ← Distance
Walked, Purifier ← Resonators Destroyed, Sojourner ← Longest Sojourner Streak,
etc.).

**Os limiares oficiais por tier (Bronze/Silver/Gold/Platinum/Onyx) NÃO estão
transcritos aqui de propósito** — valores de memória saem errados. Devem ser
copiados da wiki oficial do Ingress durante a implementação, para um arquivo
`lib/ingress-badges.mjs` coberto por teste. Só então dá para dizer com certeza em
que tier o FencherLC está em cada medalha.
