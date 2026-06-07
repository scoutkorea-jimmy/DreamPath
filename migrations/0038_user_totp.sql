-- 0038_user_totp.sql — per-account admin 2FA (TOTP).
--
-- v01.077 shipped a single shared TOTP secret (KV admin:totp_v1). But the admin
-- console actually logs in per-account (email/password → session), so 2FA should
-- be per admin user. Each admin enrolls their OWN Authenticator; the secret lives
-- on their users row, AES-GCM-encrypted with PII_ENCRYPTION_KEY (same scheme as
-- the other *_enc columns). The operator can reset a locked-out admin from the
-- member directory (NULLs these columns → forces re-enrollment).
--
-- The legacy KV admin:totp_v1 stays as the bare-ADMIN_TOKEN (curl/emergency)
-- fallback only. Pending (mid-enrollment) secrets live in short-lived KV, not here.

ALTER TABLE users ADD COLUMN totp_secret_enc  TEXT;
ALTER TABLE users ADD COLUMN totp_confirmed_at TEXT;
