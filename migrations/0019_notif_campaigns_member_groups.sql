-- 0019_notif_campaigns_member_groups.sql
--
-- Two related features:
--
--   1. Notification campaigns — group every "send notification" action
--      into a single campaign row so the operator can audit who they sent
--      what + when, plus see the read rate. The existing notifications
--      rows (one per recipient) get a campaign_id back-reference.
--
--   2. Member groups — operator-curated groupings of users so the same
--      campaign can target a saved group without rebuilding the picker
--      every time. Many-to-many via a join table.

-- ─── Notification campaigns ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id              TEXT PRIMARY KEY,             -- "NTC-..." short id
  ts              TEXT NOT NULL,                -- ISO8601 send time
  sender          TEXT NOT NULL,                -- free-form label shown to recipients
  subject_ko      TEXT,
  subject_en      TEXT,
  body_ko         TEXT,
  body_en         TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,   -- how many notifications rows this spawned
  group_id        TEXT,                         -- nullable; populated when sent to a saved group
  actor_user      TEXT                          -- admin email/id who ran it (audit)
);
CREATE INDEX IF NOT EXISTS idx_notif_camp_ts    ON notification_campaigns(ts DESC);
CREATE INDEX IF NOT EXISTS idx_notif_camp_group ON notification_campaigns(group_id);

ALTER TABLE notifications ADD COLUMN campaign_id TEXT;
CREATE INDEX IF NOT EXISTS idx_notif_campaign ON notifications(campaign_id);

-- ─── Member groups ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_groups (
  id          TEXT PRIMARY KEY,                 -- "MG-..." short id
  name_ko     TEXT NOT NULL,
  name_en     TEXT,
  description TEXT,
  color       TEXT,                             -- optional pill color (hex or token)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_member_groups_name ON member_groups(name_ko);

CREATE TABLE IF NOT EXISTS member_group_members (
  group_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  added_at   TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES member_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)         ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mgm_user  ON member_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mgm_group ON member_group_members(group_id);
