-- ════════════════════════════════════════════════════════════════════════════
-- 003 — País do agente no ranking do Ingress
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- `/ingress/ranking` passa a exigir um país (ISO 3166-1 alpha-2) em toda
-- submissão nova, para exibir a bandeira do agente na tabela.
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- Adiciona `country_code CHAR(2)` a `casara.ingress_rankings`, com um CHECK
-- de formato (2 letras maiúsculas) quando presente. Coluna nullable de
-- propósito: as linhas já existentes não têm país, e não há fonte confiável
-- para preenchê-las retroativamente (ver spec da feature
-- ingress-ranking-country, Out of Scope). A obrigatoriedade em POSTs novos
-- vive na API (`app/api/ingress-rankings/route.ts`), não neste schema —
-- mesmo padrão já usado para `faction`/`codename`.
--
-- O QUE ELA NÃO TOCA
-- Nenhuma linha existente é reescrita; nenhum outro schema/tabela é afetado.
--
-- COMO RODAR
-- Cole no Neon SQL Editor. `ADD COLUMN IF NOT EXISTS` torna rodar duas vezes
-- seguro (a segunda execução é um no-op).

ALTER TABLE casara.ingress_rankings
  ADD COLUMN IF NOT EXISTS country_code CHAR(2)
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'casara' AND table_name = 'ingress_rankings' AND column_name = 'country_code';
