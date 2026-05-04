-- 0010_member_audits.sql — admin audit trail for member-account changes.
--
-- Every admin-initiated create/update/delete on a user row writes one row
-- here per changed field, so the operator can answer "who changed what,
-- when, and from what" months later. The audit is queried by the admin
-- detail panel under Members → 회원 목록 → row click.

CREATE TABLE IF NOT EXISTS member_audits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,                         -- target user being modified
  ts          TEXT NOT NULL,                         -- ISO timestamp
  actor       TEXT NOT NULL,                         -- 'admin' (token) or another user_id (future)
  action      TEXT NOT NULL,                         -- 'create' | 'update' | 'delete' | 'password_reset'
  field       TEXT,                                  -- which column ('name','email','role',...) for action='update'
  old_value   TEXT,                                  -- previous value, nullable
  new_value   TEXT,                                  -- new value, nullable
  note        TEXT                                   -- free-form admin note
);

CREATE INDEX IF NOT EXISTS idx_member_audits_user_id ON member_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_member_audits_ts      ON member_audits(ts);
