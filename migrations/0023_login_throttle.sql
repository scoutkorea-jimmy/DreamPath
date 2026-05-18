-- Add failed login tracking and exponential lockout to protect against brute-force password guessing.
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_locked_until TEXT DEFAULT NULL;
