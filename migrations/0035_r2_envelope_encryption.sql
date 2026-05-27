-- v01.068.00 — envelope encryption for R2 attachments.
--
-- R2 already encrypts at rest (Cloudflare-held key). This round adds an
-- application-layer AES-GCM wrapper using PII_ENCRYPTION_KEY (operator-
-- held) so the trust boundary moves: even if an R2 access token leaks,
-- the attached files are useless without the operator secret.
--
-- Storage format inside R2:
--   12-byte IV || ciphertext || 16-byte tag
-- One per-file random IV. The encryption key is derived from
-- PII_ENCRYPTION_KEY via SHA-256 (same derivation as encryptPii() but
-- with a domain-separation salt 'r2-file', so a key compromise of one
-- domain doesn't help the other).
--
-- The r2_encrypted marker tells the read side whether to unwrap. Legacy
-- objects (r2_encrypted = 0) are served as-is; new puts after this
-- migration land with r2_encrypted = 1 when PII_ENCRYPTION_KEY is set.
ALTER TABLE email_attachments  ADD COLUMN r2_encrypted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE application_files  ADD COLUMN r2_encrypted INTEGER NOT NULL DEFAULT 0;
