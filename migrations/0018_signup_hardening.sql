-- 0018_signup_hardening.sql — gate accounts behind email activation.
--
-- Flow:
--   1. signup() inserts user with activated_at = NULL + mints a 6-digit code
--      (numeric, easiest to type from a mobile mail client) with a 72h expiry.
--   2. activate_account email goes out via Resend; user enters code OR clicks
--      the link → /api/auth/activate sets activated_at + clears the code.
--   3. login() rejects rows with activated_at IS NULL ("account_not_activated")
--      and the UI then shows the resend + entry path.
--   4. A scheduled cleanup (called from the cron handler) purges users with
--      activated_at IS NULL AND activation_expires_at < now() so abandoned
--      signups don't squat on the email address forever.
--
-- Phone: signup now collects country dial code + national number separately
-- so we can format / validate per region without re-parsing.

ALTER TABLE users ADD COLUMN activated_at           TEXT;       -- ISO8601 when the user verified
ALTER TABLE users ADD COLUMN activation_code        TEXT;       -- 6-digit numeric, NULL once consumed
ALTER TABLE users ADD COLUMN activation_expires_at  TEXT;       -- ISO8601 deadline
ALTER TABLE users ADD COLUMN activation_sent_at     TEXT;       -- ISO8601 last activation/reminder send
ALTER TABLE users ADD COLUMN phone_country          TEXT;       -- e.g. "+82"
ALTER TABLE users ADD COLUMN phone_national         TEXT;       -- digits only, no formatting

CREATE INDEX IF NOT EXISTS idx_users_activated     ON users(activated_at);
CREATE INDEX IF NOT EXISTS idx_users_activation_exp ON users(activation_expires_at);

-- Backfill: every existing account is treated as already activated so the
-- gate doesn't suddenly lock everyone out on deploy. Use email_verified as
-- a hint when present (legacy 24h verify flow); otherwise stamp now().
UPDATE users
   SET activated_at = COALESCE(activated_at,
                               CASE WHEN email_verified = 1 THEN updated_at ELSE updated_at END);
