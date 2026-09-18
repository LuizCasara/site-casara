# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Parser de arquivo externo: um AC de 'contagem de colunas divergente' não cobre 'o arquivo não é do tipo esperado'; exija também uma coluna-âncora obrigatória e teste o arquivo-errado-com-contagem-igual.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `lib/parsers` · harmful: 0
- features: ingress
- evidence: INGR-07 (lib/parsers)
- last seen: 2026-09-07T23:31:24Z

### L-002 - RegionCoverer com minLevel==maxLevel trava numa bbox grande; use maxLevel+maxCells para a cobertura grossa e uma BFS com teto para subdividir até o nível alvo.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `s2/geometry` · harmful: 0
- features: ingress
- evidence: lib/ingress-s2.mjs coverViewport (s2/geometry)
- last seen: 2026-09-07T23:31:24Z

### L-003 - Função que filtra por um campo precisa de teste com fixture que TEM entradas fora do filtro; testar só contra o dado real (onde todas passam) não discrimina — injete o dado.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `lib/pure-logic` · harmful: 0
- features: ingress
- evidence: lib/ingress-catalog.mjs coreBadges (lib/pure-logic)
- last seen: 2026-09-08T03:51:44Z

### L-004 - When an i18n retrofit phase translates a feature's pre-existing pages, explicitly re-check every component built in the feature's own earlier phases too -- new components are not automatically in scope just because they render on the same page as translated ones.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `i18n` · harmful: 0
- features: ingress-stats-ranking
- evidence: ISTATS-19 AC-2; components/ingress/ProfileRadar.tsx, components/ingress/stats/OverallScorePanel.tsx, components/ingress/stats/IngressRankingTable.tsx (i18n)
- last seen: 2026-09-12T01:06:57Z

### L-005 - A component that must become a Client Component (for useLang/state/events) cannot keep computing values via node:fs-backed helpers -- move that computation to the nearest Server Component caller and pass the result down as a prop instead.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: ingress-stats-ranking
- evidence: SPEC_DEVIATION markers in components/ingress/StatGroups.tsx:29, components/ingress/TierLadder.tsx:17, components/ingress/stats/IngressRankingTable.tsx:54 (tasks T10, T21, T29, T33-T35) (components)
- last seen: 2026-09-12T01:07:07Z

### L-006 - When an i18n retrofit adds a bilingual leaf component for a Server Component route's fallback/empty state, grep every sibling route with the same fallback pattern and give each an equivalent leaf -- a Done-when that says 'same treatment as route X' is not verified until compared string-for-string with X's actual bilingual output.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `i18n` · harmful: 0
- features: ingress-stats-ranking
- evidence: app/ingress/stats/page.tsx:52 (T12); cf. bilingual sibling components/ingress/IngressPagePanels.tsx:32 EmptySignalPanel (T33) (i18n)
- last seen: 2026-09-12T01:38:38Z

### L-007 - A lib module imported by any client component must not use Node-only APIs (fs, createRequire) to load static data, even for a small JSON file — bundlers refuse to bundle node:fs/node:module for the browser; use a static import (e.g. import data with {type:'json'}) instead of readFileSync+createRequire.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `next-bundling` · harmful: 0
- features: ingress-ranking-country
- evidence: lib/ingress-countries.mjs:6-11 (next-bundling)
- last seen: 2026-09-13T21:16:07Z

### L-008 - When a spec quotes an exact element order (e.g. badge/icon sequence), diff the rendered JSX order against that literal quote, not just check that every element is present.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: ingress-ranking-comparison
- evidence: components/ingress/AgentSelect.tsx:200 (components)
- last seen: 2026-09-18T05:46:10Z

### L-009 - A guard clause in an API route with no automated test (e.g. an a===b identity check) can be inverted by a one-character edit and still pass test+tsc+lint+build; flag such guards for manual re-check whenever the route is touched again.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: ingress-ranking-comparison
- evidence: app/api/ingress-rankings/compare/route.ts:46 (routes)
- last seen: 2026-09-18T05:46:15Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
