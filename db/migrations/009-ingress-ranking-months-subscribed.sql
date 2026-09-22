-- ════════════════════════════════════════════════════════════════════════════
-- 009 — Meses de assinatura paga do agente no ranking do Ingress
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- A aba "Estatísticas para Nerds" de `/ingress/ranking` quer responder, de
-- forma honesta, "que fração da comunidade tem/teve assinatura paga do
-- Ingress" — o único dado real de monetização disponível no export do app
-- (coluna "Months Subscribed", já parseada por `lib/ingress-stats.mjs` como
-- `monthsSubscribed`, mas nunca persistida na tabela de ranking).
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- Adiciona `months_subscribed INTEGER` a `casara.ingress_rankings`, com um
-- CHECK de não-negativo quando presente. Coluna nullable de propósito: linhas
-- já existentes nunca gravaram esse número, e não há como preenchê-las
-- retroativamente — mostrar `NULL` (a UI mostra "sem dados suficientes") é
-- honesto, mostrar `0` seria uma mentira ("nunca assinou" != "não sabemos").
-- Toda submissão nova grava o valor real (mesmo padrão de `recursions` em
-- 005-ingress-ranking-recursions.sql), mas aqui também sem exigir —
-- monthsSubscribed é informativo, não faz parte do cálculo de nota/tier.
--
-- O QUE ELA NÃO TOCA
-- Nenhuma linha existente é reescrita; nenhum outro schema/tabela é afetado.
--
-- COMO RODAR
-- Cole no Neon SQL Editor. `ADD COLUMN IF NOT EXISTS` torna rodar duas vezes
-- seguro (a segunda execução é um no-op).

ALTER TABLE casara.ingress_rankings
  ADD COLUMN IF NOT EXISTS months_subscribed INTEGER
    CHECK (months_subscribed IS NULL OR months_subscribed >= 0);

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'casara' AND table_name = 'ingress_rankings' AND column_name = 'months_subscribed';
