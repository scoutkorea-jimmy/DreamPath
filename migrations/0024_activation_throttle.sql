-- Activation-code brute-force defence. 6-digit numeric codes = 1M combinations,
-- previously unprotected. Same pattern as login throttle (migration 0023).
ALTER TABLE users ADD COLUMN failed_activation_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_activation_locked_until TEXT DEFAULT NULL;
