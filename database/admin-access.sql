-- Additive change for existing external databases. No accounts are auto-promoted.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
