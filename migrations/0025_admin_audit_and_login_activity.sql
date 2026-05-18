-- P1-5: admin_audit — every destructive / privilege-changing admin action
-- writes one row here. Writes are fire-and-forget so the parent flow
-- never fails because of a logging glitch.
CREATE TABLE IF NOT EXISTS admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor_user_id TEXT,                          -- NULL when action used ADMIN_TOKEN bearer
  via_admin_token INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,                        -- e.g. 'user_delete', 'email_empty_trash', 'user_update'
  target_type TEXT,                            -- e.g. 'user', 'email', 'application'
  target_id TEXT,                              -- the affected row id, when applicable
  detail TEXT,                                 -- optional JSON blob with extra context
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_ts    ON admin_audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_act   ON admin_audit(action);

-- P1-6: login_activity — one row per successful login. Failed attempts
-- are aggregated on users.failed_login_attempts (migration 0023) so we
-- don't double-store. This table answers the breach-response question
-- "what IPs / agents have logged into this account?"
CREATE TABLE IF NOT EXISTS login_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_ts   ON login_activity(ts DESC);
