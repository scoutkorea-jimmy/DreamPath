-- 0020_application_files.sql
-- Real PDF / image attachments for applications. Until now the form only
-- stored filenames; actual files were emailed separately, which broke the
-- admission workflow. Files now upload directly to R2 and a row here links
-- the application to the bytes.
--
-- Categories ('kind'):
--   transcript    — applicant's school transcript
--   recommendation — letter from a recommender (recommender_idx 0-based)
--   portfolio     — optional supporting work
--   id_doc        — government ID (only when explicitly requested)
--
-- The application_id is loose — applications are inserted via the public
-- /api/applications endpoint which mints a TEXT id; we keep this as TEXT
-- to match without a hard FK so files can survive a DELETE on the parent
-- (until purged).

CREATE TABLE IF NOT EXISTS application_files (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id  TEXT NOT NULL,
  uploaded_at     TEXT NOT NULL,
  kind            TEXT NOT NULL,           -- 'transcript' | 'recommendation' | 'portfolio' | 'id_doc'
  recommender_idx INTEGER,                  -- 0-based index when kind='recommendation'
  filename        TEXT NOT NULL,
  mime            TEXT,
  size            INTEGER NOT NULL,
  r2_key          TEXT NOT NULL             -- e.g. apps/<application_id>/transcript/foo.pdf
);
CREATE INDEX IF NOT EXISTS idx_appfiles_app  ON application_files(application_id);
CREATE INDEX IF NOT EXISTS idx_appfiles_kind ON application_files(application_id, kind);
