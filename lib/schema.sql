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
