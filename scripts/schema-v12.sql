-- v12: add per-user settings JSONB column to staff_users
-- Stores dashboard_layout, widget preferences, and other user-specific settings
ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add room_units (individual room numbers/codes per category) to property_config
-- This extends the existing settings->'rooms'->'categories' array items
-- Each category can now have a "units" array of { number, code } objects
-- Migration handled via JSONB path, no table change needed
