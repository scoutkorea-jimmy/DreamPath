-- v01.065.00 — extend PII-at-rest encryption to inquiries.
--
-- Phone was already covered by 0026 (encrypted column) + 0029 (HMAC index
-- for exact-match search). This adds the remaining PII surface of a
-- public-facing inquiry: name, email, subject, body.
--
-- Storage pattern matches the existing phone/birthdate columns:
--   - *_enc holds base64(AES-GCM(iv || ciphertext || tag)).
--   - The legacy plaintext column stays NULL on new rows when the
--     PII_ENCRYPTION_KEY secret is set, but is preserved so old rows
--     keep working until the cron backfill rotates them.
--   - email_h is a deterministic HMAC-SHA256 over the normalized
--     (trim + lowercase) email so admin search can still exact-match
--     by address. LIKE / fragment search on encrypted body/name is
--     impossible by design (ciphertext is per-row random) — operators
--     looking for a specific inquiry now go through id or exact email.
ALTER TABLE inquiries ADD COLUMN name_enc    TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN email_enc   TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN email_h     TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN subject_enc TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN body_enc    TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_email_h ON inquiries(email_h);
