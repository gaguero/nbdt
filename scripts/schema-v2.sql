-- Nayara Ordering System — Schema v2
-- Phase 1.1: Full Hospitality Operations Platform Expansion
-- Run AFTER schema.sql (or as a migration on top of it)
-- Safe: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS

-- ============================================================================
-- GUESTS & RESERVATIONS (Opera PMS sync)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    opera_profile_id TEXT,
    email TEXT,
    phone TEXT,
    nationality TEXT,
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opera_resv_id TEXT UNIQUE NOT NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'RESERVED',
    short_status TEXT,
    room TEXT,
    arrival DATE,
    departure DATE,
    nights INT,
    persons INT,
    no_of_rooms INT DEFAULT 1,
    room_category TEXT,
    rate_code TEXT,
    guarantee_code TEXT,
    guarantee_code_desc TEXT,
    group_name TEXT,
    travel_agent TEXT,
    company TEXT,
    share_amount DECIMAL(10,2),
    share_amount_per_stay DECIMAL(10,2),
    insert_user TEXT,
    insert_date DATE,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (status IN ('CHECKED IN', 'CHECKED OUT', 'RESERVED', 'CANCELLED'))
);

-- ============================================================================
-- VENDORS & PARTNER HOTELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type TEXT NOT NULL DEFAULT 'transfer',
    color_code TEXT DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (type IN ('transfer', 'tour', 'spa', 'restaurant', 'other'))
);

CREATE TABLE IF NOT EXISTS vendor_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    num_passengers INT DEFAULT 1,
    origin TEXT,
    destination TEXT,
    flight_number TEXT,
    transfer_type TEXT DEFAULT 'arrival',
    guest_status TEXT DEFAULT 'pending',
    vendor_status TEXT DEFAULT 'pending',
    billed_date DATE,
    paid_date DATE,
    price DECIMAL(10,2),
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (transfer_type IN ('arrival', 'departure', 'inter_hotel', 'activity')),
    CHECK (guest_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    CHECK (vendor_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'))
);

CREATE TABLE IF NOT EXISTS transfer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SPECIAL REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS special_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    request TEXT NOT NULL,
    department TEXT DEFAULT 'concierge',
    status TEXT DEFAULT 'pending',
    check_in DATE,
    check_out DATE,
    assigned_to UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (department IN ('concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management')),
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- ============================================================================
-- OTHER HOTEL BOOKINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS other_hotel_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    hotel_id UUID REFERENCES partner_hotels(id) ON DELETE SET NULL,
    num_guests INT DEFAULT 1,
    checkin DATE,
    checkout DATE,
    guest_status TEXT DEFAULT 'pending',
    vendor_status TEXT DEFAULT 'pending',
    billed_date DATE,
    paid_date DATE,
    price DECIMAL(10,2),
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (guest_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    CHECK (vendor_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'))
);

CREATE TABLE IF NOT EXISTS other_hotel_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES other_hotel_bookings(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROMANTIC DINNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS romantic_dinners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    num_guests INT DEFAULT 2,
    location TEXT,
    status TEXT DEFAULT 'pending',
    price DECIMAL(10,2),
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- ============================================================================
-- TOUR PRODUCTS & SCHEDULING
-- ============================================================================

CREATE TABLE IF NOT EXISTS tour_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description_en TEXT,
    description_es TEXT,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'tour' CHECK (type IN ('tour', 'spa', 'restaurant', 'experience', 'transfer')),
    booking_mode TEXT NOT NULL DEFAULT 'either' CHECK (booking_mode IN ('private', 'shared', 'either')),
    max_capacity_shared INT DEFAULT 12,
    max_capacity_private INT DEFAULT 20,
    duration_minutes INT DEFAULT 60,
    price_private DECIMAL(10,2),
    price_shared DECIMAL(10,2),
    price_per_person DECIMAL(10,2),
    requires_minimum_guests INT DEFAULT 1,
    max_guests_per_booking INT DEFAULT 10,
    location TEXT,
    meeting_point_en TEXT,
    meeting_point_es TEXT,
    cancellation_policy_hours INT DEFAULT 24,
    scheduling_mode TEXT NOT NULL DEFAULT 'fixed_slots' CHECK (scheduling_mode IN ('fixed_slots', 'flexible', 'on_request')),
    is_active BOOLEAN DEFAULT TRUE,
    images JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES tour_products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    capacity_total INT NOT NULL DEFAULT 12,
    capacity_remaining INT NOT NULL DEFAULT 12,
    is_available BOOLEAN DEFAULT TRUE,
    override_price DECIMAL(10,2),
    notes_internal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (capacity_remaining >= 0),
    CHECK (capacity_remaining <= capacity_total)
);

CREATE TABLE IF NOT EXISTS tour_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES tour_schedules(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES tour_products(id) ON DELETE RESTRICT,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    booking_mode TEXT NOT NULL DEFAULT 'shared',
    num_guests INT NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2),
    guest_status TEXT DEFAULT 'pending',
    vendor_status TEXT DEFAULT 'pending',
    special_requests TEXT,
    billed_date DATE,
    paid_date DATE,
    notes TEXT,
    legacy_appsheet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (booking_mode IN ('private', 'shared')),
    CHECK (guest_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    CHECK (vendor_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'))
);

CREATE TABLE IF NOT EXISTS tour_booking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES tour_bookings(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORDERS — Extend existing table
-- ============================================================================

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'room_service',
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS station TEXT,
    ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;

-- Add constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
            CHECK (order_type IN ('room_service', 'restaurant', 'bar', 'pool', 'minibar'));
    END IF;
END$$;

-- ============================================================================
-- ORDER ITEMS — Extend existing table
-- ============================================================================

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS station TEXT,
    ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_items_item_status_check'
    ) THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_item_status_check
            CHECK (item_status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));
    END IF;
END$$;

-- ============================================================================
-- ORDER STATUS LOG (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_status_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    station TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name_en TEXT NOT NULL,
    display_name_es TEXT NOT NULL,
    icon TEXT DEFAULT 'message',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES conversation_channels(id) ON DELETE RESTRICT,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    room TEXT,
    status TEXT DEFAULT 'open',
    assigned_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (status IN ('open', 'assigned', 'resolved'))
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_id UUID,
    body TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (sender_type IN ('guest', 'staff'))
);

-- ============================================================================
-- STAFF USERS — Extend existing table
-- ============================================================================

ALTER TABLE staff_users
    ADD COLUMN IF NOT EXISTS station TEXT,
    ADD COLUMN IF NOT EXISTS can_access_channels TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pin_hash TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_users_station_check'
    ) THEN
        ALTER TABLE staff_users ADD CONSTRAINT staff_users_station_check
            CHECK (station IS NULL OR station IN ('kitchen', 'bar', 'delivery', 'front_desk', 'supervisor', 'concierge', 'management'));
    END IF;
END$$;

-- Expand role check to include new roles
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
    CHECK (role IN ('admin', 'manager', 'staff', 'kitchen', 'bar', 'delivery', 'front_desk', 'concierge', 'supervisor'));

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

-- Guests
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests(full_name);
CREATE INDEX IF NOT EXISTS idx_guests_opera_profile ON guests(opera_profile_id) WHERE opera_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_last_name ON guests(last_name);

-- Reservations
CREATE INDEX IF NOT EXISTS idx_reservations_opera_id ON reservations(opera_resv_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_arrival ON reservations(arrival);
CREATE INDEX IF NOT EXISTS idx_reservations_departure ON reservations(departure);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room);
CREATE INDEX IF NOT EXISTS idx_reservations_arrival_status ON reservations(arrival, status);

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor ON vendor_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_email ON vendor_users(email);

-- Transfers
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);
CREATE INDEX IF NOT EXISTS idx_transfers_guest ON transfers(guest_id);
CREATE INDEX IF NOT EXISTS idx_transfers_vendor ON transfers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(guest_status, vendor_status);
CREATE INDEX IF NOT EXISTS idx_transfer_history_transfer ON transfer_history(transfer_id);

-- Special Requests
CREATE INDEX IF NOT EXISTS idx_special_requests_date ON special_requests(date);
CREATE INDEX IF NOT EXISTS idx_special_requests_guest ON special_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_special_requests_status ON special_requests(status);
CREATE INDEX IF NOT EXISTS idx_special_requests_dept ON special_requests(department);

-- Other Hotel Bookings
CREATE INDEX IF NOT EXISTS idx_other_hotel_bookings_date ON other_hotel_bookings(date);
CREATE INDEX IF NOT EXISTS idx_other_hotel_bookings_guest ON other_hotel_bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_other_hotel_history_booking ON other_hotel_history(booking_id);

-- Romantic Dinners
CREATE INDEX IF NOT EXISTS idx_romantic_dinners_date ON romantic_dinners(date);
CREATE INDEX IF NOT EXISTS idx_romantic_dinners_guest ON romantic_dinners(guest_id);

-- Tour Products
CREATE INDEX IF NOT EXISTS idx_tour_products_type ON tour_products(type);
CREATE INDEX IF NOT EXISTS idx_tour_products_vendor ON tour_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tour_products_active ON tour_products(is_active);

-- Tour Schedules
CREATE INDEX IF NOT EXISTS idx_tour_schedules_product ON tour_schedules(product_id);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_date ON tour_schedules(date);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_product_date ON tour_schedules(product_id, date);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_available ON tour_schedules(date, is_available) WHERE is_available = TRUE;

-- Tour Bookings
CREATE INDEX IF NOT EXISTS idx_tour_bookings_schedule ON tour_bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_product ON tour_bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_guest ON tour_bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_status ON tour_bookings(guest_status, vendor_status);
CREATE INDEX IF NOT EXISTS idx_tour_booking_history_booking ON tour_booking_history(booking_id);

-- Order Status Log
CREATE INDEX IF NOT EXISTS idx_order_status_log_order ON order_status_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_log_created ON order_status_log(created_at DESC);

-- Messaging
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guest ON conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_users_updated_at BEFORE UPDATE ON vendor_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_hotels_updated_at BEFORE UPDATE ON partner_hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_requests_updated_at BEFORE UPDATE ON special_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_other_hotel_bookings_updated_at BEFORE UPDATE ON other_hotel_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_romantic_dinners_updated_at BEFORE UPDATE ON romantic_dinners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_products_updated_at BEFORE UPDATE ON tour_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_schedules_updated_at BEFORE UPDATE ON tour_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_bookings_updated_at BEFORE UPDATE ON tour_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Conversation Channels
-- ============================================================================

INSERT INTO conversation_channels (name, display_name_en, display_name_es, sort_order)
VALUES
    ('room_service', 'Room Service', 'Servicio a la Habitación', 1),
    ('guest_experience', 'Guest Experience', 'Experiencia del Huésped', 2),
    ('spa', 'Spa', 'Spa', 3),
    ('front_desk', 'Front Desk', 'Recepción', 4),
    ('concierge', 'Concierge', 'Conserjería', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MIGRATION: Add Opera guest name tracking to reservations
-- ============================================================================

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS opera_guest_name TEXT;
