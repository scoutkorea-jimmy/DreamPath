-- v01.071.00 — Phase 7b: drop NOT NULL constraints on legacy plaintext PII
-- columns that are now '' tombstones when the encrypted ciphertext column
-- carries the real value.
--
-- Affected columns:
--   inquiries.name / email / subject / body     (NOT NULL → nullable)
--   applications.name / email                    (NOT NULL → nullable)
--
-- Why this is safe right now:
--   1. Both tables are empty in production (0 rows each), so the rebuild
--      moves no data and can't get a row count wrong.
--   2. No inbound foreign-key references exist (verified by scanning
--      sqlite_master sql for every other table).
--   3. SQLite doesn't support ALTER COLUMN DROP NOT NULL directly, so we
--      use the canonical table-rebuild dance: CREATE new → INSERT FROM
--      old → DROP old → RENAME new → recreate indexes. Wrapped in a
--      single migration so wrangler runs it atomically.
--
-- After this, writers (submitInquiry / submitApplication / piiBackfillCron)
-- will be updated in the same release to store NULL instead of ''. Both
-- already work today; this is a schema-cleanliness round, not a security
-- fix.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. inquiries — drop NOT NULL on name / email / subject / body.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE inquiries_new (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  category    TEXT,
  subject     TEXT,
  body        TEXT,
  lang        TEXT,
  user_id     TEXT,
  ip          TEXT,
  user_agent  TEXT,
  phone_enc          TEXT DEFAULT NULL,
  phone_h            TEXT DEFAULT NULL,
  name_enc    TEXT DEFAULT NULL,
  email_enc   TEXT DEFAULT NULL,
  email_h     TEXT DEFAULT NULL,
  subject_enc TEXT DEFAULT NULL,
  body_enc    TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO inquiries_new (
  id, created_at, status,
  name, email, phone, category, subject, body,
  lang, user_id, ip, user_agent,
  phone_enc, phone_h, name_enc, email_enc, email_h, subject_enc, body_enc
) SELECT
  id, created_at, status,
  name, email, phone, category, subject, body,
  lang, user_id, ip, user_agent,
  phone_enc, phone_h, name_enc, email_enc, email_h, subject_enc, body_enc
FROM inquiries;

DROP TABLE inquiries;
ALTER TABLE inquiries_new RENAME TO inquiries;

CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_status     ON inquiries(status);
CREATE INDEX idx_inquiries_phone_h    ON inquiries(phone_h);
CREATE INDEX idx_inquiries_email_h    ON inquiries(email_h);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. applications — drop NOT NULL on name / email.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE applications_new (
  id              TEXT PRIMARY KEY,
  submitted_at    TEXT NOT NULL,
  status          TEXT NOT NULL,
  lang            TEXT NOT NULL,
  track           TEXT,
  partial_tier    TEXT,
  amount          INTEGER NOT NULL DEFAULT 0,
  program         TEXT,
  name            TEXT,
  email           TEXT,
  country         TEXT,
  birthdate       TEXT,
  prior_school    TEXT,
  prior_major     TEXT,
  prior_gpa       TEXT,
  transcript_note TEXT,
  essay_title     TEXT,
  essay_body      TEXT,
  nso             TEXT,
  recommender_name   TEXT,
  recommender_role   TEXT,
  recommender_email  TEXT,
  recommender_letter TEXT,
  payment_method  TEXT,
  card_last4      TEXT,
  ip              TEXT,
  user_agent      TEXT,
  user_id         TEXT,
  receipt_token   TEXT,
  paid_at         TEXT,
  currency        TEXT DEFAULT 'USD',
  admission_referrer_code TEXT,
  essay_title_2   TEXT,
  essay_body_2    TEXT,
  scout_member_country TEXT,
  scout_training_level TEXT,
  recommendation_letter_filename TEXT,
  recommendation_letter_size INTEGER,
  recommenders_json TEXT,
  consent_personal_version TEXT,
  consent_third_party_version TEXT,
  consent_recorded_at TEXT,
  essays_json     TEXT,
  birthdate_enc   TEXT DEFAULT NULL,
  name_enc                 TEXT DEFAULT NULL,
  email_enc                TEXT DEFAULT NULL,
  email_h                  TEXT DEFAULT NULL,
  essay_body_enc           TEXT DEFAULT NULL,
  essay_body_2_enc         TEXT DEFAULT NULL,
  essays_json_enc          TEXT DEFAULT NULL,
  recommender_name_enc     TEXT DEFAULT NULL,
  recommender_email_enc    TEXT DEFAULT NULL,
  recommender_email_h      TEXT DEFAULT NULL,
  recommender_letter_enc   TEXT DEFAULT NULL,
  recommenders_json_enc    TEXT DEFAULT NULL
);

INSERT INTO applications_new (
  id, submitted_at, status, lang, track, partial_tier, amount, program,
  name, email, country, birthdate,
  prior_school, prior_major, prior_gpa, transcript_note,
  essay_title, essay_body, nso,
  recommender_name, recommender_role, recommender_email, recommender_letter,
  payment_method, card_last4, ip, user_agent,
  user_id, receipt_token, paid_at, currency,
  admission_referrer_code, essay_title_2, essay_body_2,
  scout_member_country, scout_training_level,
  recommendation_letter_filename, recommendation_letter_size,
  recommenders_json, consent_personal_version, consent_third_party_version,
  consent_recorded_at, essays_json, birthdate_enc,
  name_enc, email_enc, email_h,
  essay_body_enc, essay_body_2_enc, essays_json_enc,
  recommender_name_enc, recommender_email_enc, recommender_email_h,
  recommender_letter_enc, recommenders_json_enc
) SELECT
  id, submitted_at, status, lang, track, partial_tier, amount, program,
  name, email, country, birthdate,
  prior_school, prior_major, prior_gpa, transcript_note,
  essay_title, essay_body, nso,
  recommender_name, recommender_role, recommender_email, recommender_letter,
  payment_method, card_last4, ip, user_agent,
  user_id, receipt_token, paid_at, currency,
  admission_referrer_code, essay_title_2, essay_body_2,
  scout_member_country, scout_training_level,
  recommendation_letter_filename, recommendation_letter_size,
  recommenders_json, consent_personal_version, consent_third_party_version,
  consent_recorded_at, essays_json, birthdate_enc,
  name_enc, email_enc, email_h,
  essay_body_enc, essay_body_2_enc, essays_json_enc,
  recommender_name_enc, recommender_email_enc, recommender_email_h,
  recommender_letter_enc, recommenders_json_enc
FROM applications;

DROP TABLE applications;
ALTER TABLE applications_new RENAME TO applications;

CREATE INDEX idx_applications_submitted_at        ON applications(submitted_at DESC);
CREATE INDEX idx_applications_track               ON applications(track);
CREATE INDEX idx_applications_status              ON applications(status);
CREATE INDEX idx_applications_user_id             ON applications(user_id);
CREATE INDEX idx_applications_receipt_token       ON applications(receipt_token);
CREATE INDEX idx_applications_email_h             ON applications(email_h);
CREATE INDEX idx_applications_recommender_email_h ON applications(recommender_email_h);
