-- Long-form program content stored separately from the lightweight content blob.
-- Each program may have rich body sections that admin edits per-program.
CREATE TABLE IF NOT EXISTS program_details (
  program_id        TEXT PRIMARY KEY,        -- matches programs[].id in KV content
  -- Long descriptions (HTML from TipTap)
  overview_ko       TEXT,
  overview_en       TEXT,
  curriculum_ko     TEXT,
  curriculum_en     TEXT,
  outcomes_ko       TEXT,
  outcomes_en       TEXT,
  prerequisites_ko  TEXT,
  prerequisites_en  TEXT,
  -- Structured details
  duration          TEXT,
  format            TEXT,                     -- 'online' | 'hybrid' | 'onsite'
  language_required TEXT,                     -- e.g. 'EN B2 or KR TOPIK 3'
  start_date        TEXT,
  cohort_size       INTEGER,
  certification     TEXT,
  instructor_name   TEXT,
  instructor_title  TEXT,
  instructor_bio_ko TEXT,
  instructor_bio_en TEXT,
  cost_full         INTEGER,                  -- USD or local
  cost_currency     TEXT DEFAULT 'USD',
  -- Meta
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
