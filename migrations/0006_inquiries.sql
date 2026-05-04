CREATE TABLE IF NOT EXISTS inquiries (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',  -- new | seen | replied | closed
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  category    TEXT,                           -- general | program | partnership | media | bug
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  lang        TEXT,
  user_id     TEXT,
  ip          TEXT,
  user_agent  TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
