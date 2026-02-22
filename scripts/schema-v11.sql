-- v11: add logo_url and location fields to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS location_lon NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS location_label TEXT;
