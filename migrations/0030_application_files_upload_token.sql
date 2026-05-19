-- 0030_application_files_upload_token.sql
-- Close orphan-file IDOR (P2-6, sec audit 2026-05-19).
--
-- Before: /api/applications/upload returned an auto-increment integer id and
-- stored the row with application_id = '' until the apply form was submitted.
-- /api/applications then adopted any orphaned row by id alone. An attacker
-- who could guess the integer id (sequential, casually probed) could submit
-- a minimal application claiming `file_ids:[victim_file_id]` during the
-- victim's mid-form window and download the victim's transcript / ID via
-- /api/me/application-files/:id/download.
--
-- Fix: bind every uploaded row to its uploader so the adoption step can
-- prove the submitter is the original uploader. Two independent bindings:
--   upload_token       — 128-bit random token returned at upload and
--                        echoed back by the client at submit. Sufficient
--                        on its own (anonymous flow also works).
--   uploader_user_id   — id of the logged-in user at upload time, if any.
--                        Allows adoption even if the client lost the token
--                        (e.g., reloaded the page mid-flow but still has
--                        the same session). Cross-checked against the
--                        submitter at adoption time.
--
-- Legacy rows have NULL for both columns. Those rows are no longer
-- adoptable by the new adoption SQL — any in-flight Apply form mid-deploy
-- needs a re-upload. Acceptable: the window is minutes.

ALTER TABLE application_files ADD COLUMN upload_token TEXT;
ALTER TABLE application_files ADD COLUMN uploader_user_id TEXT;

-- Speed up adoption lookups by token (single-row update on submit).
CREATE INDEX IF NOT EXISTS idx_appfiles_upload_token ON application_files(upload_token);
