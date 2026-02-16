-- Nayara Ordering System — Schema v5
-- CRM & Opera Metadata Expansion

-- Add CRM fields to Guests
ALTER TABLE guests 
    ADD COLUMN IF NOT EXISTS companion_name TEXT,
    ADD COLUMN IF NOT EXISTS crm_metadata JSONB DEFAULT '{}';

-- Add Opera-specific operational fields to Reservations
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS is_vip INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS email_opera TEXT,
    ADD COLUMN IF NOT EXISTS phone_opera TEXT,
    ADD COLUMN IF NOT EXISTS opera_metadata JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_vip ON reservations(is_vip) WHERE is_vip > 0;
