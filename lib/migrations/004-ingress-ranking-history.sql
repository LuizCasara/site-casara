-- ════════════════════════════════════════════════════════════════════════════
-- 004 — Histórico de AP no ranking do Ingress
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- O painel expandido de `/ingress/ranking` ganha um gráfico de evolução de AP
-- total por agente (dia/mês/ano). Até aqui, cada escrita em
-- `casara.ingress_rankings` SOBRESCREVIA a linha do agente — nada guardava o
-- valor anterior.
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- Cria `casara.ingress_ranking_history`: um snapshot append-only por escrita
-- bem-sucedida (não-debounced) em `ingress_rankings` — nunca é atualizada nem
-- apagada, só cresce. `axis_scores` é guardado mesmo a v1 só plotando AP total,
-- de graça no mesmo INSERT (evita migrar de novo quando o gráfico por eixo for
-- feito). Sem essa migração, `GET /api/ingress-rankings/[codenameKey]/history`
-- falha com 500 em produção — a tabela não existe até este SQL rodar.
--
-- O QUE ELA NÃO TOCA
-- `casara.ingress_rankings` não é alterada. Nenhuma linha histórica anterior
-- ao deploy existe — o gráfico só populada a partir da primeira escrita real
-- pós-deploy de cada agente.
--
-- COMO RODAR
-- Cole no Neon SQL Editor. `CREATE TABLE/INDEX IF NOT EXISTS` torna rodar
-- duas vezes seguro (a segunda execução é um no-op).
--
-- NOTA: esta DDL já foi aplicada manualmente em produção (script descartável,
-- não commitado) antes deste arquivo existir — este arquivo é o registro
-- histórico da migração, seguindo o padrão de 001/002/003.

CREATE TABLE IF NOT EXISTS casara.ingress_ranking_history (
  id             BIGSERIAL PRIMARY KEY,
  codename_key   TEXT NOT NULL REFERENCES casara.ingress_rankings(codename_key) ON DELETE CASCADE,
  lifetime_ap    BIGINT NOT NULL,
  overall_score  NUMERIC(7,2) NOT NULL,
  axis_scores    JSONB NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingress_history_agent ON casara.ingress_ranking_history (codename_key, recorded_at DESC);

-- ─── Verificação pós-migração (rodar solto) ─────────────────────────────────
--
-- SELECT 1 FROM information_schema.tables
-- WHERE table_schema = 'casara' AND table_name = 'ingress_ranking_history';
