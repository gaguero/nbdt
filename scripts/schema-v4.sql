-- Nayara Ordering System — Schema v4
-- Tour bookings: add start_time + legacy_vendor_id

-- start_time stores the per-booking time from the legacy "Hora" column (e.g. 09:30:00)
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS start_time TIME;

-- legacy_vendor_id preserves the original AppSheet vendor ID (e.g. "e85dc51f", "vnd017")
-- so we can trace which legacy vendor was assigned even after vendor normalization
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS legacy_vendor_id TEXT;
