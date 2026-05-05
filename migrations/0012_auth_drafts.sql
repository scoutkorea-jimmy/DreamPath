-- 0012_auth_drafts.sql — three sibling tables for the next round of auth UX:
--   * email_verifications  → tokens minted at signup; consumed by /verify
--   * password_resets      → tokens minted by "forgot password"; consumed by /reset
--   * apply_drafts         → server-side autosave for the multi-step Apply form
--                            so a user can finish on a different device.
-- All three include `expires_at` for opportunistic cleanup.
-- Email-sending pipeline is wired separately; this migration just lays the
-- token storage so the worker endpoints can mint + verify them.

CREATE TABLE IF NOT EXISTS email_verifications (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  consumed_at  TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_emailver_user    ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_emailver_expires ON email_verifications(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  consumed_at  TEXT,
  ip           TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user    ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_pwreset_expires ON password_resets(expires_at);

-- Server-side Apply draft. user_id = TEXT, NOT NULL, single row per user.
-- Body holds the JSON-serialised form + step. Cleared on submit.
CREATE TABLE IF NOT EXISTS apply_drafts (
  user_id     TEXT PRIMARY KEY,
  body        TEXT NOT NULL,        -- JSON: { form, step, ts }
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional users.email_verified flag so the public site can show a
-- "verify your email" prompt even after the user signs in. Default 0
-- means existing accounts stay treated as not-verified until they verify
-- once.
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
