-- Users (members)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'member',  -- 'member' | 'admin'
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions (opaque token → user)
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Member career profile (one row per user, free-form fields stubbed for now)
CREATE TABLE IF NOT EXISTS member_profiles (
  user_id        TEXT PRIMARY KEY,
  country        TEXT,
  birthdate      TEXT,
  current_school TEXT,
  current_major  TEXT,
  goal           TEXT,
  interests      TEXT,  -- comma-separated tags
  korean_level   TEXT,
  english_level  TEXT,
  career_summary TEXT,
  updated_at     TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- News posts (moved from KV content blob to its own table so members
-- can edit news from the public site without rewriting the whole blob)
CREATE TABLE IF NOT EXISTS news_posts (
  id          TEXT PRIMARY KEY,
  tag         TEXT,
  tag_color   TEXT,
  date        TEXT,
  title_ko    TEXT,
  title_en    TEXT,
  body_ko     TEXT,
  body_en     TEXT,
  author_id   TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_news_date ON news_posts(date DESC);
