-- ════════════════════════════════════════════════════════════════════════════
-- 001 — Isolamento de tenant: tudo deste site passa para o schema "casara"
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO
-- O banco Neon é compartilhado com outro site (GEAV). Antes desta migração as
-- tabelas deste site estavam espalhadas:
--   • public.events                          → analytics deste site (6.341 linhas)
--   • geav.word_* / geav.quiz_*              → dinâmicas ao vivo deste site
-- enquanto o outro site usa geav.events, geav.cancoes, geav.planos, geav.users…
--
-- O QUE ESTA MIGRAÇÃO FAZ
-- Move (não copia) as 8 tabelas deste site para o schema "casara" usando
-- ALTER TABLE ... SET SCHEMA: operação de metadados, instantânea, que leva
-- junto os dados, índices, sequences (BIGSERIAL) e foreign keys. Zero perda.
--
-- O QUE ELA NÃO TOCA
-- Nada do schema "geav" além das 7 tabelas word_*/quiz_* listadas abaixo.
-- geav.events e as 18 tabelas do outro site continuam intactas.
--
-- COMO RODAR
-- Tudo dentro de uma transação: ou aplica inteiro, ou nada. Cole no Neon SQL
-- Editor, ou rode via `node scripts/migrate-casara.mjs`.
-- Rodar duas vezes é seguro: a segunda execução não encontra as tabelas de
-- origem e falha inteira no ALTER, sem efeito colateral.

BEGIN;

CREATE SCHEMA IF NOT EXISTS casara;

-- ─── Analytics: public.events → casara.events ───────────────────────────────
-- Leva junto: idx_events_name/route/created_at/payload/country e a sequence
-- events_id_seq (dona da coluna id), então o BIGSERIAL continua de onde parou.
ALTER TABLE public.events SET SCHEMA casara;

-- ─── Nuvem de Palavras: geav.* → casara.* ───────────────────────────────────
-- Ordem irrelevante: as FKs são resolvidas por OID, não por nome qualificado,
-- então continuam apontando para a tabela certa durante e depois do move.
ALTER TABLE geav.word_sessions    SET SCHEMA casara;
ALTER TABLE geav.word_submissions SET SCHEMA casara;
ALTER TABLE geav.word_entries     SET SCHEMA casara;

-- ─── Quiz ao Vivo: geav.* → casara.* ────────────────────────────────────────
ALTER TABLE geav.quiz_sessions     SET SCHEMA casara;
ALTER TABLE geav.quiz_questions    SET SCHEMA casara;
ALTER TABLE geav.quiz_participants SET SCHEMA casara;
ALTER TABLE geav.quiz_answers      SET SCHEMA casara;

COMMIT;

-- ─── Verificação pós-migração (rodar solto, fora da transação) ──────────────
-- Esperado: 8 linhas em casara, e geav sem nenhuma word_*/quiz_*.
--
-- SELECT table_schema, table_name
-- FROM information_schema.tables
-- WHERE table_name IN ('events','word_sessions','word_submissions','word_entries',
--                      'quiz_sessions','quiz_questions','quiz_participants','quiz_answers')
-- ORDER BY 1, 2;
