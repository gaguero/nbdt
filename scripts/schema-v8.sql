-- Schema v8: Add fingerprint column to guests for duplicate detection
-- This column stores a normalized version of the full_name to speed up duplicate scanning

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_guests_fingerprint ON guests(fingerprint);
CREATE INDEX IF NOT EXISTS idx_guests_fingerprint_email ON guests(fingerprint, email);

-- Update existing guests with their fingerprints
-- Note: this might be slow for very large tables, but should be fine for a few thousand rows
UPDATE guests
SET fingerprint = (
  SELECT string_agg(ch, '') 
  FROM (
    SELECT unnest(string_to_array(LOWER(REPLACE(REPLACE(full_name, ' ', ''), ',', '')), NULL)) as ch 
    ORDER BY ch
  ) s
)
WHERE fingerprint IS NULL;
