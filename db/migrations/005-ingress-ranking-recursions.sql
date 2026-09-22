-- ════════════════════════════════════════════════════════════════════════════
-- 005 — Recursões do agente no ranking do Ingress
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- O painel expandido de `/ingress/ranking` (sub-linha "Forma") passa a
-- mostrar, ao lado do codinome, quantas vezes o agente já recursou — dado
-- que já existe em toda submissão (coluna "Recursions" do export do app,
-- parseada por `lib/ingress-stats.mjs`), mas nunca tinha sido persistido
-- na tabela de ranking.
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- Adiciona `recursions INTEGER` a `casara.ingress_rankings`, com um CHECK
-- de não-negativo quando presente. Coluna nullable de propósito: linhas já
-- existentes nunca gravaram esse número, e não há como preenchê-las
-- retroativamente — mostrar `NULL` (a UI simplesmente omite o bloco) é
-- honesto, mostrar `0` seria uma mentira ("nunca recursou" != "não sabemos").
-- Toda submissão nova grava o valor real (mesmo padrão de `country_code` em
-- 003-ingress-ranking-country.sql), mas aqui sem exigir — recursions é
-- informativo, não faz parte do cálculo de nota/tier.
--
-- O QUE ELA NÃO TOCA
-- Nenhuma linha existente é reescrita; nenhum outro schema/tabela é afetado.
--
-- COMO RODAR
-- Cole no Neon SQL Editor. `ADD COLUMN IF NOT EXISTS` torna rodar duas vezes
-- seguro (a segunda execução é um no-op).

ALTER TABLE casara.ingress_rankings
  ADD COLUMN IF NOT EXISTS recursions INTEGER
    CHECK (recursions IS NULL OR recursions >= 0);

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'casara' AND table_name = 'ingress_rankings' AND column_name = 'recursions';
