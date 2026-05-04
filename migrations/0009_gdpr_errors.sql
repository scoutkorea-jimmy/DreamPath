-- Per-record consent log. Every "I agree" click records a row.
-- This is the audit trail for GDPR Art. 7 (demonstrable consent).
CREATE TABLE IF NOT EXISTS consents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,
  user_id       TEXT,                       -- nullable: pre-signup consents
  application_id TEXT,                      -- if collected during apply
  email         TEXT,                       -- preserved separately so consent
                                            -- traces survive account deletion
  consent_type  TEXT NOT NULL,              -- 'tos' | 'privacy_signup' | 'privacy_apply' | 'third_party' | 'analytics' | 'marketing'
  version       TEXT NOT NULL,              -- semver-ish; bumps invalidate prior
  granted       INTEGER NOT NULL,           -- 1 = agreed, 0 = revoked
  ip            TEXT,
  user_agent    TEXT,
  lang          TEXT
);
CREATE INDEX IF NOT EXISTS idx_consents_user  ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_email ON consents(email);
CREATE INDEX IF NOT EXISTS idx_consents_type  ON consents(consent_type, version);

-- Error log (server-side + client-side reports)
CREATE TABLE IF NOT EXISTS error_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT NOT NULL,
  level       TEXT NOT NULL,                -- 'error' | 'warn' | 'info'
  source      TEXT NOT NULL,                -- 'server' | 'client' | 'unhandled' | 'rejection'
  message     TEXT NOT NULL,
  stack       TEXT,
  path        TEXT,
  method      TEXT,
  status      INTEGER,
  user_id     TEXT,
  session_id  TEXT,
  ip          TEXT,
  user_agent  TEXT,
  meta        TEXT                          -- JSON-encoded extra context
);
CREATE INDEX IF NOT EXISTS idx_errors_ts     ON error_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_errors_level  ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_errors_source ON error_logs(source);

-- GDPR: soft delete + consent fingerprint on users
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN consent_versions TEXT;  -- JSON: { tos: '1.0', privacy_signup: '1.0' }

-- Per-application consent fingerprints
ALTER TABLE applications ADD COLUMN consent_personal_version TEXT;
ALTER TABLE applications ADD COLUMN consent_third_party_version TEXT;
ALTER TABLE applications ADD COLUMN consent_recorded_at TEXT;
