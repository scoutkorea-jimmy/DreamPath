-- 0039_scholarship_posts.sql — admin-posted scholarship board (v01.090).
--
-- The /scholarships page is a board (게시판) of scholarship opportunities that
-- KoreaDreamPath admins post and maintain themselves (NOT just outbound links
-- to school sites). Each post is created/edited/deleted from the public
-- /scholarships page while signed in as an admin, mirroring the News board
-- (news_posts + /api/news). Public visitors read the list anonymously.
--
-- Fields map to the operator's intake form:
--   title      — 장학금 명칭 (scholarship name)
--   organizer  — 주최기관 (host / organizing institution)
--   category   — Government / University / Private · Foundation (filter chips)
--   summary    — 내용 (short overview shown on the card)
--   period     — 접수기간 (application period)
--   details    — 주요내용 (longer body, shown when expanded; plain text)
--   apply_url  — 신청하러가기 (external application link)
--   date       — posted date (YYYY.MM.DD) for ordering/display
--
-- All text is operator-authored and rendered as React text nodes (escaped),
-- so no HTML sanitization is required here. Writes are admin-only (server
-- enforces userIsAdmin); author_id records which admin created the row.

CREATE TABLE IF NOT EXISTS scholarship_posts (
  id         TEXT PRIMARY KEY,
  title      TEXT,
  organizer  TEXT,
  category   TEXT,
  summary    TEXT,
  period     TEXT,
  details    TEXT,
  apply_url  TEXT,
  date       TEXT,
  author_id  TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_scholarship_posts_date ON scholarship_posts (date DESC, created_at DESC);
