-- Nayara Ordering System — Schema v4
-- Tour bookings: add missing fields from legacy CSV

-- activity_date: the date the tour takes place (from CSV "Fecha" column)
-- Was previously used only for row validation but never stored — critical operational field
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS activity_date DATE;

-- start_time stores the per-booking time from the legacy "Hora" column (e.g. 09:30:00)
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS start_time TIME;

-- legacy_vendor_id preserves the original AppSheet vendor ID (e.g. "e85dc51f", "vnd017")
-- so we can trace which legacy vendor was assigned even after vendor normalization
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS legacy_vendor_id TEXT;

-- legacy_activity_name preserves the original tour name string from the CSV
-- (e.g. "ZAPATILLA TOUR", "green acress") before it was normalized into a product_id
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS legacy_activity_name TEXT;
