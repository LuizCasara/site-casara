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
  status       TEXT NOT NULL CHECK (status IN ('lendo','lido')),
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
