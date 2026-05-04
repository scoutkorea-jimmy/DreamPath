-- Tie applications to users (optional) and add a receipt token + paid_at
ALTER TABLE applications ADD COLUMN user_id TEXT;
ALTER TABLE applications ADD COLUMN receipt_token TEXT;
ALTER TABLE applications ADD COLUMN paid_at TEXT;
ALTER TABLE applications ADD COLUMN currency TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_receipt_token ON applications(receipt_token);
