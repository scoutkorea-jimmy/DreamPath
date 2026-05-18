-- P2-5: PII at-rest encryption.
-- Add encrypted-column siblings for phone fields on users + inquiries.
-- Reads prefer the *_enc column; if it's NULL we fall back to the
-- plaintext column for legacy rows. New writes go to *_enc when
-- env.PII_ENCRYPTION_KEY is set; otherwise they stay on plaintext.
-- A backfill procedure (operator-run) can later sweep old rows.
--
-- Why columns and not a re-encryption of the existing column: keeping
-- a separate column means we don't lose data if the encryption key is
-- mis-set or a decrypt fails — the original plaintext is still there
-- as a recovery surface during the transition window.
ALTER TABLE users     ADD COLUMN phone_country_enc  TEXT DEFAULT NULL;
ALTER TABLE users     ADD COLUMN phone_national_enc TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN phone_enc          TEXT DEFAULT NULL;
