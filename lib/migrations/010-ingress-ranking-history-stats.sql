-- ════════════════════════════════════════════════════════════════════════════
-- 010 — Stats por snapshot no histórico do ranking do Ingress
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- `casara.ingress_ranking_history` (004) guarda um snapshot por envio, mas só
-- com `lifetime_ap`, `overall_score` e `axis_scores`. Os valores de cada stat
-- (`stat_values` = os 12 do radar, `extra_stats` = o resto do export) só
-- existem na linha ATUAL de `ingress_rankings`, que é sobrescrita a cada
-- envio. Por isso o painel de evolução não consegue dizer "o que mudou entre
-- dois envios": o valor antigo de cada stat foi perdido.
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- 1. Adiciona `stat_values JSONB` e `extra_stats JSONB` ao histórico. Nullable
--    de propósito: os snapshots já gravados nunca tiveram esses valores e não
--    há como reconstruí-los — NULL significa "não sei", e a UI trata assim.
-- 2. Backfill de UM snapshot por agente: o mais recente (por DATA, não por
--    id: o ponto-âncora da 008 tem id maior e data mais antiga) recebe os
--    valores atuais de `ingress_rankings`. O último snapshot é, por construção, o
--    estado atual (toda escrita bem-sucedida grava snapshot na mesma rota),
--    então o próximo envio do agente já produz uma comparação em vez de
--    esperar dois envios novos. Só preenche onde ainda está NULL, e só se o
--    AP do snapshot bate com o da linha atual — se divergir (escrita que
--    perdeu o snapshot, ou linha ajustada à mão), não chuta.
--
-- O QUE ELA NÃO TOCA
-- Nenhum snapshot antigo além do mais recente de cada agente é alterado;
-- nenhuma outra tabela/schema (o `geav` é de outro site) é afetado.
--
-- COMO RODAR
-- Cole no Neon SQL Editor. `ADD COLUMN IF NOT EXISTS` e o `WHERE ... IS NULL`
-- do backfill tornam rodar duas vezes seguro. RODE ANTES do deploy que
-- passa a gravar essas colunas: a rota grava o snapshot dentro de um
-- try/catch, então sem a coluna ela não quebra, mas perde o snapshot.

ALTER TABLE casara.ingress_ranking_history
  ADD COLUMN IF NOT EXISTS stat_values JSONB,
  ADD COLUMN IF NOT EXISTS extra_stats JSONB;

UPDATE casara.ingress_ranking_history h
SET stat_values = r.stat_values,
    extra_stats = r.extra_stats
FROM casara.ingress_rankings r
WHERE r.codename_key = h.codename_key
  AND h.stat_values IS NULL
  AND h.lifetime_ap = r.lifetime_ap
  AND h.id = (
    SELECT h2.id FROM casara.ingress_ranking_history h2
    WHERE h2.codename_key = h.codename_key
    ORDER BY h2.recorded_at DESC, h2.id DESC
    LIMIT 1
  );

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'casara' AND table_name = 'ingress_ranking_history'
--   AND column_name IN ('stat_values', 'extra_stats');
--
-- -- quantos agentes ficaram com o snapshot mais recente preenchido:
-- SELECT COUNT(*) FILTER (WHERE stat_values IS NOT NULL) AS com_stats, COUNT(*) AS total
-- FROM casara.ingress_ranking_history;
