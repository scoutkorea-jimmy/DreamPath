-- 0016_mailbox_extras.sql — extend the mailbox schema:
--   • soft-delete (trashed_at) on inbound + outbound so the operator can
--     restore from 휴지통 within 30 days
--   • email_attachments table — per-message attachment metadata.
--     Actual bytes live in R2 (binding ATTACHMENTS); this row stores the
--     R2 key + filename + mime + size for listing / download.

ALTER TABLE inbound_emails  ADD COLUMN trashed_at TEXT;
ALTER TABLE outbound_emails ADD COLUMN trashed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_inb_trashed ON inbound_emails(trashed_at);
CREATE INDEX IF NOT EXISTS idx_out_trashed ON outbound_emails(trashed_at);

CREATE TABLE IF NOT EXISTS email_attachments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id   INTEGER NOT NULL,
  side       TEXT NOT NULL,         -- 'inbound' | 'outbound'
  ts         TEXT NOT NULL,
  filename   TEXT NOT NULL,
  mime       TEXT,
  size       INTEGER NOT NULL,
  r2_key     TEXT NOT NULL          -- e.g. attachments/inbound/123/0/photo.jpg
);
CREATE INDEX IF NOT EXISTS idx_att_email ON email_attachments(side, email_id);
CREATE INDEX IF NOT EXISTS idx_att_r2    ON email_attachments(r2_key);
