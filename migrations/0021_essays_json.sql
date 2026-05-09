-- 0021_essays_json.sql
-- Apply form Step 4 now drives essay slots from c.essay_questions (admin-
-- editable, KV). The first 2 essays still write to legacy columns
-- (essay_title, essay_body, essay_title_2, essay_body_2) for backward
-- compat with existing reports + admin views, but any additional
-- questions added by the operator need their own home.
--
-- We store the FULL essays array as JSON here (including the first 2)
-- so a future cleanup can drop the 4 legacy columns without losing data.
-- Format: [{ "title": "...", "body": "..." }, ...]
--
-- NULL = legacy application submitted before v01.030 (use legacy cols).

ALTER TABLE applications ADD COLUMN essays_json TEXT;
