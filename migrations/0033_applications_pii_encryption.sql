-- v01.066.00 — extend PII-at-rest encryption to applications.
--
-- The applications table holds the highest-PII content on the site:
-- full applicant name + email, free-text essays (often containing
-- family / financial / health detail), and recommender contact info
-- (third-party PII). This round encrypts every one of those fields at
-- rest with AES-GCM, mirroring the inquiries pattern from 0032.
--
-- Coverage in this migration:
--   - name_enc        — applicant full name (legacy column was NOT NULL,
--                       so on insert the plaintext column gets ''
--                       tombstoned until Phase 7 rebuilds the table)
--   - email_enc + email_h — applicant email + HMAC for exact-match search
--   - essay_body_enc + essay_body_2_enc — primary + secondary essays
--   - essays_json_enc — full essays array (v01.031 admin-editable count)
--   - recommender_name_enc / recommender_email_enc / recommender_email_h
--     / recommender_letter_enc — third-party (legacy single-recommender)
--   - recommenders_json_enc — current multi-recommender JSON blob
--
-- Not covered here (deferred to a later round):
--   - prior_school / prior_major / prior_gpa / transcript_note — academic
--     record fields, lower PII tier.
--   - nso / scout_member_country / scout_training_level — legacy columns
--     kept for back-compat; the public form no longer collects these.
--   - essay_title / essay_title_2 — short non-narrative strings.
--
-- birthdate_enc already exists (0028). card_last4 stays plaintext because
-- it's already minimized to four digits (PCI-bounded).
ALTER TABLE applications ADD COLUMN name_enc                 TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN email_enc                TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN email_h                  TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN essay_body_enc           TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN essay_body_2_enc         TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN essays_json_enc          TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN recommender_name_enc     TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN recommender_email_enc    TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN recommender_email_h      TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN recommender_letter_enc   TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN recommenders_json_enc    TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_email_h            ON applications(email_h);
CREATE INDEX IF NOT EXISTS idx_applications_recommender_email_h ON applications(recommender_email_h);
