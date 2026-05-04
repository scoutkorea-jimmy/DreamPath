CREATE TABLE IF NOT EXISTS applications (
  id            TEXT PRIMARY KEY,
  submitted_at  TEXT NOT NULL,
  status        TEXT NOT NULL,
  lang          TEXT NOT NULL,
  track         TEXT,
  partial_tier  TEXT,
  amount        INTEGER NOT NULL DEFAULT 0,
  program       TEXT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  country       TEXT,
  birthdate     TEXT,
  prior_school  TEXT,
  prior_major   TEXT,
  prior_gpa     TEXT,
  transcript_note TEXT,
  essay_title   TEXT,
  essay_body    TEXT,
  nso           TEXT,
  recommender_name  TEXT,
  recommender_role  TEXT,
  recommender_email TEXT,
  recommender_letter TEXT,
  payment_method TEXT,
  card_last4    TEXT,
  ip            TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_track ON applications(track);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
