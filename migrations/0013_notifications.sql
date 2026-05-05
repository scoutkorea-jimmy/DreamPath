-- 0013_notifications.sql — internal "email-like" messages from admin to a
-- specific user. Visible only to the recipient; rendered in their My Page.
--
-- Design
--   * One row per (recipient × message).  Sending to N users writes N rows
--     so each recipient owns their own read state and can delete without
--     affecting others.
--   * subject + body both KO/EN paired so the recipient can switch lang.
--   * read_at = NULL means unread; the My Page shows an unread badge.
--   * sender is a free-form label (e.g. 'admin' or actor user_id) so the
--     UI can show "from KoreaDreamPath team" without a join.

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  ts          TEXT NOT NULL,
  sender      TEXT NOT NULL DEFAULT 'admin',
  subject_ko  TEXT,
  subject_en  TEXT,
  body_ko     TEXT,
  body_en     TEXT,
  read_at     TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notif_user_ts     ON notifications(user_id, ts DESC);
