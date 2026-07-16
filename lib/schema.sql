-- Execute este SQL no Neon SQL Editor (console.neon.tech ou aba Storage na Vercel)

CREATE TABLE IF NOT EXISTS events (
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

CREATE INDEX IF NOT EXISTS idx_events_name       ON events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_route      ON events (route);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_payload    ON events USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_events_country    ON events (country);

-- ─── Nuvem de Palavras ──────────────────────────────────────────────────────
-- Tabelas qualificadas com o schema/tenant "geav" (sem isso, caem em "public").

CREATE TABLE IF NOT EXISTS geav.word_sessions (
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

CREATE TABLE IF NOT EXISTS geav.word_submissions (
  id             BIGSERIAL PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES geav.word_sessions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, participant_id)
);

CREATE TABLE IF NOT EXISTS geav.word_entries (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   BIGINT NOT NULL REFERENCES geav.word_submissions(id) ON DELETE CASCADE,
  word            TEXT NOT NULL,
  word_normalized TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_word_submissions_session ON geav.word_submissions (session_id);
CREATE INDEX IF NOT EXISTS idx_word_entries_submission  ON geav.word_entries (submission_id);
CREATE INDEX IF NOT EXISTS idx_word_entries_norm        ON geav.word_entries (word_normalized);
