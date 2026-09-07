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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
