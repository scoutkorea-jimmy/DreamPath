-- 0014_mailbox.sql — admin-managed mailbox: receive via Cloudflare Email
-- Workers, send via Resend. Two parallel tables so reads/sends don't
-- contaminate each other's indexes.
--
-- Pre-req: operator enables Cloudflare Email Routing for koreadreampath.com
-- and adds rules for hello@/partner@/info@ pointing to the dream-path worker
-- (see admin → Setup → API · 통합 → 받은 메일 가이드).

CREATE TABLE IF NOT EXISTS inbound_emails (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,
  to_addr       TEXT NOT NULL,                  -- which mailbox received it
  from_addr     TEXT NOT NULL,
  from_name     TEXT,
  subject       TEXT,
  body_text     TEXT,
  body_html     TEXT,
  raw_size      INTEGER,
  message_id    TEXT,
  in_reply_to   TEXT,
  read_at       TEXT,
  starred       INTEGER NOT NULL DEFAULT 0,
  spam          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inb_to_ts   ON inbound_emails(to_addr, ts DESC);
CREATE INDEX IF NOT EXISTS idx_inb_unread  ON inbound_emails(read_at);
CREATE INDEX IF NOT EXISTS idx_inb_subject ON inbound_emails(subject);

CREATE TABLE IF NOT EXISTS outbound_emails (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,
  from_addr     TEXT NOT NULL,
  to_addr       TEXT NOT NULL,
  subject       TEXT,
  body_text     TEXT,
  in_reply_to   TEXT,                           -- linked inbound message_id (threading)
  resend_id     TEXT,                           -- id returned by Resend
  status        TEXT NOT NULL DEFAULT 'sent',   -- sent | failed | queued
  error         TEXT,
  actor_user    TEXT                            -- admin actor for audit
);
CREATE INDEX IF NOT EXISTS idx_out_from_ts ON outbound_emails(from_addr, ts DESC);
CREATE INDEX IF NOT EXISTS idx_out_status  ON outbound_emails(status);
