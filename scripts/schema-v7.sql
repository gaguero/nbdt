-- Schema v7: Add legacy_profiles JSONB column to guests
-- This column stores archived data from merged duplicate profiles

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS legacy_profiles JSONB NOT NULL DEFAULT '[]';
