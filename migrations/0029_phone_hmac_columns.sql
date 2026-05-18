-- v01.046: Deterministic HMAC columns so the operator can recover
-- exact-phone-number lookup after the v01.042 encryption rollout.
--
-- A row's phone is encrypted with a per-row IV (AES-GCM), so two
-- different rows holding the same phone number produce different
-- ciphertexts — you can't equality-match. The HMAC column carries
-- HMAC-SHA256(phone_national, key) which IS deterministic, so the
-- same phone always yields the same digest. Admin search can compute
-- the digest of the query and equality-match against this column.
--
-- The HMAC key is derived from PII_ENCRYPTION_KEY (SHA-256 of the
-- secret + a domain-separation string), so rotating the encryption
-- secret invalidates the HMACs too — that's intentional, it bounds
-- the lookup table's lifetime to the same trust boundary as the
-- ciphertext itself.
ALTER TABLE users     ADD COLUMN phone_national_h TEXT DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN phone_h          TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_h     ON users(phone_national_h);
CREATE INDEX IF NOT EXISTS idx_inquiries_phone_h ON inquiries(phone_h);
