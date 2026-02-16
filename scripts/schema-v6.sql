-- schema-v6.sql: Add profile_type column for non-guest profiles

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'guest';

CREATE INDEX IF NOT EXISTS idx_guests_profile_type ON guests(profile_type);
