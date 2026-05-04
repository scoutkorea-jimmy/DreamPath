-- Lightweight visitor analytics. One row per event.
-- Designed for ~1KB/event so a free D1 (5GB) holds millions of rows.
CREATE TABLE IF NOT EXISTS analytics_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT NOT NULL,                  -- ISO timestamp (UTC)
  day         TEXT NOT NULL,                  -- YYYY-MM-DD (for cheap GROUP BY)
  session_id  TEXT NOT NULL,                  -- per-visitor cookie/localStorage id
  user_id     TEXT,                           -- if logged in
  type        TEXT NOT NULL,                  -- 'pageview' | 'click' | 'event'
  view        TEXT,                           -- e.g. 'home', 'programs', 'apply'
  path        TEXT NOT NULL,                  -- /, /about, /program/foo
  target      TEXT,                           -- click target id/label
  referrer    TEXT,                           -- document.referrer
  source      TEXT,                           -- derived: direct | search | social | external | internal
  utm_source  TEXT,
  utm_medium  TEXT,
  utm_campaign TEXT,
  lang        TEXT,                           -- 'ko' | 'en'
  country     TEXT,                           -- cf-ipcountry
  device      TEXT,                           -- mobile | tablet | desktop
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_ev_day        ON analytics_events(day);
CREATE INDEX IF NOT EXISTS idx_ev_session    ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ev_type_path  ON analytics_events(type, path);
CREATE INDEX IF NOT EXISTS idx_ev_source     ON analytics_events(source);
