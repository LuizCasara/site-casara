-- ════════════════════════════════════════════════════════════════════════════
-- 007 — Backfill de um ponto-âncora em ingress_ranking_history
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- A migration 004 criou `casara.ingress_ranking_history`, mas deixou explícito
-- que "nenhuma linha histórica anterior ao deploy existe — o gráfico só
-- popula a partir da primeira escrita real pós-deploy de cada agente". Na
-- prática isso significa que quem já tinha uma linha em `ingress_rankings`
-- antes da 004 precisava de 2 envios NOVOS (pós-feature) pra ver qualquer
-- coisa no gráfico de evolução — o primeiro reenvio já é surpreendente o
-- bastante ("mandei e não apareceu nada") sem essa exigência dobrada.
--
-- O QUE ESTE SCRIPT FEZ (não é DDL — é um backfill de dados, rodado uma vez)
-- Um INSERT...SELECT que planta 1 linha de histórico pra cada codename_key em
-- `ingress_rankings` que ainda não tinha nenhuma em `ingress_ranking_history`,
-- usando os valores JÁ GRAVADOS (lifetime_ap/overall_score/axis_scores) e o
-- `updated_at` real da linha como `recorded_at`. Isso é preciso, não uma
-- aproximação: o UPSERT de `POST /api/ingress-rankings` sempre grava esses
-- campos junto com `updated_at` no mesmo statement, então o valor "atual" da
-- linha É por construção o snapshot daquele instante.
--
-- O QUE ELE NÃO FAZ
-- Não reconstrói uma curva de evolução real — quem atualizou várias vezes
-- antes da 004 teve os valores intermediários sobrescritos, e esse dado não
-- existe mais em lugar nenhum. O ganho é só reduzir de "2 envios novos" pra
-- "1 envio novo" o que falta pra cada agente pré-existente ver o gráfico.
--
-- Rodado uma vez em produção em 2026-09-14 (script descartável, via
-- @neondatabase/serverless com DATABASE_URL de .env.local — mesmo canal que
-- scripts/migrate-casara.mjs usa) — 5 linhas inseridas: gal0daxj,
-- IoriPossuido, Ober32, Skkibiri, zezextreme12cr. Este arquivo é o registro
-- histórico, seguindo o padrão de 001/004: não precisa (e não deve) ser
-- rodado de novo — o `WHERE NOT EXISTS` já o torna idempotente, mas não há
-- mais nenhuma linha pendente pra ele preencher.

INSERT INTO casara.ingress_ranking_history (codename_key, lifetime_ap, overall_score, axis_scores, recorded_at)
SELECT codename_key, lifetime_ap, overall_score, axis_scores, updated_at
FROM casara.ingress_rankings r
WHERE NOT EXISTS (
  SELECT 1 FROM casara.ingress_ranking_history h WHERE h.codename_key = r.codename_key
);

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT COUNT(*)::int AS sem_historico
-- FROM casara.ingress_rankings r
-- WHERE NOT EXISTS (SELECT 1 FROM casara.ingress_ranking_history h WHERE h.codename_key = r.codename_key);
-- -- esperado: 0
