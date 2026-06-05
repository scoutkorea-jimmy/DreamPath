-- 0037_messages.sql — member-to-member direct messages (v01.073).
--
-- Powers the /team "send a message" feature and the My-page Messages
-- section. A message belongs to a thread (conversation) between two users:
-- the sender and the recipient. Replies reuse the same thread_id so a
-- conversation reads top-to-bottom.
--
-- subject/body are PII (user-written) so they follow the project's at-rest
-- encryption convention: when PII_ENCRYPTION_KEY is set we store the
-- ciphertext in *_enc and NULL the plaintext column; otherwise plaintext.
-- Sender/recipient are opaque user ids (not PII) and stay plaintext so the
-- inbox/sent queries and unread counts work without decryption.

CREATE TABLE IF NOT EXISTS messages (
  id                TEXT PRIMARY KEY,
  thread_id         TEXT NOT NULL,
  sender_id         TEXT NOT NULL,
  recipient_id      TEXT NOT NULL,
  subject           TEXT,
  subject_enc       TEXT DEFAULT NULL,
  body              TEXT,
  body_enc          TEXT DEFAULT NULL,
  created_at        TEXT NOT NULL,
  read_at           TEXT DEFAULT NULL,
  sender_deleted    INTEGER NOT NULL DEFAULT 0,
  recipient_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(thread_id, created_at ASC);
