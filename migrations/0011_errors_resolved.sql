-- 0011_errors_resolved.sql — track whether a logged client error has been
-- resolved by the operator. Without this, every recurring noise event in the
-- error log demands manual triage. The admin Errors → Error logs tab now
-- ships a "Resolve" toggle per row + a filter for unresolved-only.

ALTER TABLE error_logs ADD COLUMN resolved      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE error_logs ADD COLUMN resolved_at   TEXT;
ALTER TABLE error_logs ADD COLUMN resolved_note TEXT;

CREATE INDEX IF NOT EXISTS idx_errors_resolved ON error_logs(resolved);
