-- 0022_apply_drafts.sql
-- Server-side persistence for an applicant's in-progress application form.
-- Until v01.030 the draft only lived in sessionStorage, which meant a user
-- who switched devices, cleared cookies, ran out of session quota, or
-- simply closed the tab on some browsers would lose their work. Now the
-- draft is also saved to D1 (debounced ~5s after the last keystroke) for
-- any logged-in user.
--
-- Resolution rule (client side): when the user opens the Apply form,
--   1. If logged in AND server has a draft → use server draft, write it
--      back to sessionStorage so subsequent edits keep both in sync.
--   2. Else if sessionStorage has a draft → use it.
--   3. Else start fresh.
-- On successful submit the row is DELETEd; on explicit "Start over" the
-- client also issues a DELETE.
--
-- One row per user (PRIMARY KEY user_id) — multiple in-progress drafts
-- aren't supported and would only confuse the user.

CREATE TABLE IF NOT EXISTS apply_drafts (
  user_id     INTEGER PRIMARY KEY,
  form_json   TEXT NOT NULL,
  step        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_apply_drafts_updated ON apply_drafts(updated_at DESC);
