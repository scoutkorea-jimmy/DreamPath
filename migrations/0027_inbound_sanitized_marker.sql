-- P1-1 backfill (v01.043): add a marker column so the cron knows which
-- inbound_emails rows still hold pre-v01.040 (un-sanitized) HTML in
-- body_html. New rows set sanitized_at on INSERT; the cron sweeps any
-- row where sanitized_at IS NULL, re-sanitizes its body_html in place,
-- and stamps the column.
--
-- Why a column rather than KV cursor: the column makes the predicate
-- precise + idempotent. Cron crashes / partial sweeps recover for free
-- — the next run picks up exactly where the previous left off.
ALTER TABLE inbound_emails ADD COLUMN sanitized_at TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_sanitized ON inbound_emails(sanitized_at);
