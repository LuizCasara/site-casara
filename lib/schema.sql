-- Execute este SQL no Neon SQL Editor (console.neon.tech ou aba Storage na Vercel)
--
-- IMPORTANTE: todas as tabelas deste site vivem no schema/tenant "casara".
-- O banco Neon é compartilhado com outro site (que usa o schema "geav") e o
-- search_path da conexão é apenas `"$user", public` — ou seja, NADA resolve
-- para "casara" automaticamente. Toda query da aplicação precisa qualificar
-- explicitamente: casara.events, casara.word_sessions, casara.quiz_sessions...
--
-- Para migrar um banco que já tinha as tabelas espalhadas em public/geav,
-- use lib/migrations/001-schema-casara.sql em vez deste arquivo.

CREATE SCHEMA IF NOT EXISTS casara;

-- ─── Analytics ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.events (
  id         BIGSERIAL    PRIMARY KEY,
  event_name TEXT         NOT NULL,
  route      TEXT,
  payload    JSONB        NOT NULL DEFAULT '{}',
  country    TEXT,
  city       TEXT,
  browser    TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_name       ON casara.events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_route      ON casara.events (route);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON casara.events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_payload    ON casara.events USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_events_country    ON casara.events (country);

-- ─── Nuvem de Palavras ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.word_sessions (
  id                  TEXT PRIMARY KEY,
  host_token          TEXT NOT NULL,
  results_token       TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  mode                TEXT NOT NULL CHECK (mode IN ('fixed','open')),
  fixed_words         JSONB,
  max_words           SMALLINT NOT NULL DEFAULT 1,
  accepting_responses BOOLEAN NOT NULL DEFAULT TRUE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','saved','discarded')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS casara.word_submissions (
  id             BIGSERIAL PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES casara.word_sessions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, participant_id)
);

CREATE TABLE IF NOT EXISTS casara.word_entries (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   BIGINT NOT NULL REFERENCES casara.word_submissions(id) ON DELETE CASCADE,
  word            TEXT NOT NULL,
  word_normalized TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_word_submissions_session ON casara.word_submissions (session_id);
CREATE INDEX IF NOT EXISTS idx_word_entries_submission  ON casara.word_entries (submission_id);
CREATE INDEX IF NOT EXISTS idx_word_entries_norm        ON casara.word_entries (word_normalized);

-- ─── Quiz ao Vivo ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.quiz_sessions (
  id                           TEXT PRIMARY KEY,
  host_token                   TEXT NOT NULL,
  results_token                TEXT NOT NULL,
  title                        TEXT NOT NULL,
  description                  TEXT,
  status                       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','saved','discarded')),
  phase                        TEXT NOT NULL DEFAULT 'lobby' CHECK (phase IN ('lobby','question','reveal','finished')),
  current_question_index       SMALLINT,
  current_question_started_at  TIMESTAMPTZ,
  finished_at                  TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS casara.quiz_questions (
  id                    BIGSERIAL PRIMARY KEY,
  session_id            TEXT NOT NULL REFERENCES casara.quiz_sessions(id) ON DELETE CASCADE,
  order_index           SMALLINT NOT NULL,
  prompt                TEXT NOT NULL,
  options               JSONB NOT NULL,
  correct_option_index  SMALLINT NOT NULL,
  time_limit_seconds    SMALLINT,
  UNIQUE (session_id, order_index),
  CHECK (jsonb_array_length(options) BETWEEN 2 AND 6),
  CHECK (correct_option_index >= 0 AND correct_option_index < jsonb_array_length(options))
);

CREATE TABLE IF NOT EXISTS casara.quiz_participants (
  session_id     TEXT NOT NULL REFERENCES casara.quiz_sessions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  name           TEXT NOT NULL,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, participant_id)
);

-- Garante nomes únicos (case-insensitive) por sessão de forma atômica —
-- conflito nesse índice é distinto do conflito na PK acima, então a rota de
-- entrada consegue diferenciar "já sou eu de novo" (ON CONFLICT na PK, ok)
-- de "esse nome já existe" (conflito aqui, erro pro usuário escolher outro).
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_participants_name
  ON casara.quiz_participants (session_id, lower(name));

CREATE TABLE IF NOT EXISTS casara.quiz_answers (
  id                     BIGSERIAL PRIMARY KEY,
  question_id            BIGINT NOT NULL REFERENCES casara.quiz_questions(id) ON DELETE CASCADE,
  session_id             TEXT NOT NULL,
  participant_id         TEXT NOT NULL,
  selected_option_index  SMALLINT NOT NULL,
  is_correct             BOOLEAN NOT NULL,
  points_awarded         INT NOT NULL DEFAULT 0,
  answered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, participant_id),
  -- Garante no banco que só quem já entrou (quiz_participants) pode responder.
  FOREIGN KEY (session_id, participant_id)
    REFERENCES casara.quiz_participants (session_id, participant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON casara.quiz_answers (session_id);

-- ─── Acervo de Livros ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.books (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  isbn         TEXT,
  title        TEXT NOT NULL,
  author       TEXT,
  year         SMALLINT,
  publisher    TEXT,
  pages        SMALLINT,
  synopsis     TEXT,
  cover_path   TEXT,
  spine_color  TEXT,
  rating       NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  category     TEXT NOT NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  -- 'lendo'      pilha sobre a mesa de centro, na sala 3D
  -- 'lido'       estante do acervo, agrupado por ano de leitura
  -- 'quero-ler'  torre no chão ao lado da estante — a fila de leitura
  -- 'referencia' só a página própria; fora da estante, da lista e dos filtros
  --              (hoje: a Bíblia aberta na mesa do PC)
  -- Ver lib/migrations/002-status-livros.sql.
  status       TEXT NOT NULL CHECK (status IN ('lendo','lido','referencia','quero-ler')),
  progress_pct SMALLINT CHECK (progress_pct BETWEEN 0 AND 100),
  finished_at  DATE,
  review       TEXT,
  shelf_order  SMALLINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_status   ON casara.books (status);
CREATE INDEX IF NOT EXISTS idx_books_category ON casara.books (category);
CREATE INDEX IF NOT EXISTS idx_books_tags     ON casara.books USING GIN (tags);

-- ─── Ingress Stats & Ranking ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS casara.ingress_rankings (
  codename_key   TEXT PRIMARY KEY,
  codename       TEXT NOT NULL,
  faction        TEXT NOT NULL CHECK (faction IN ('enlightened','resistance')),
  lifetime_ap    BIGINT NOT NULL DEFAULT 0,
  overall_score  NUMERIC(7,2) NOT NULL,
  axis_scores    JSONB NOT NULL,
  stat_values    JSONB NOT NULL,
  -- ISO 3166-1 alpha-2, nullable (obrigatório só em POSTs novos, validado na
  -- API — ver lib/migrations/003-ingress-ranking-country.sql).
  country_code   CHAR(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  -- Nullable, sem exigir em POSTs novos (informativo, não entra na nota) —
  -- ver lib/migrations/005-ingress-ranking-recursions.sql.
  recursions     INTEGER CHECK (recursions IS NULL OR recursions >= 0),
  -- Balde pra tudo do export sem coluna/eixo dedicado ainda (level, meses de
  -- assinatura, e as ~40 stats fora do radar) — gravado, mas o GET não
  -- devolve nada disto por ora. Ver lib/migrations/006-ingress-ranking-extra-stats.sql.
  extra_stats    JSONB,
  -- created_at = "medido desde": a primeira vez que este agente foi medido
  -- NESTE ranking, não a data de criação da conta no Ingress (nenhuma fonte
  -- de dado disponível contém essa data real).
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingress_rankings_score ON casara.ingress_rankings (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ingress_rankings_ap    ON casara.ingress_rankings (lifetime_ap DESC);

-- Um snapshot por escrita bem-sucedida (não-debounced) em casara.ingress_rankings
-- — nunca é atualizado nem apagado, só cresce. Alimenta o gráfico de evolução
-- (dia/mês/ano) no painel expandido do ranking.
CREATE TABLE IF NOT EXISTS casara.ingress_ranking_history (
  id             BIGSERIAL PRIMARY KEY,
  codename_key   TEXT NOT NULL REFERENCES casara.ingress_rankings(codename_key) ON DELETE CASCADE,
  lifetime_ap    BIGINT NOT NULL,
  overall_score  NUMERIC(7,2) NOT NULL,
  axis_scores    JSONB NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingress_history_agent ON casara.ingress_ranking_history (codename_key, recorded_at DESC);
