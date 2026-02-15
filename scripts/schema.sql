-- Nayara Ordering System Database Schema
-- PostgreSQL Database for Multi-Property Hospitality Ordering & Booking Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- PROPERTIES & ROOMS
-- ============================================================================

-- TABLA DE PROPIEDADES
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- Short code for property identification (e.g., 'NAYARA', 'ALTA')
    timezone TEXT NOT NULL DEFAULT 'America/Costa_Rica',
    currency TEXT NOT NULL DEFAULT 'USD',
    settings JSONB DEFAULT '{}', -- Property-specific settings (hours, policies, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE HABITACIONES
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_type TEXT, -- e.g., 'suite', 'villa', 'standard'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, room_number)
);

-- ============================================================================
-- MENU STRUCTURE
-- ============================================================================

-- TABLA DE CATEGORÍAS DE MENÚ
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, slug)
);

-- TABLA DE SUBCATEGORÍAS DE MENÚ
CREATE TABLE menu_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

-- TABLA DE ITEMS DE MENÚ
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID NOT NULL REFERENCES menu_subcategories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description_en TEXT,
    description_es TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    item_type TEXT NOT NULL DEFAULT 'product', -- 'product', 'service', 'experience'
    dietary_tags TEXT[] DEFAULT '{}', -- e.g., ['vegan', 'gluten-free', 'vegetarian']
    allergens TEXT[] DEFAULT '{}', -- e.g., ['nuts', 'dairy', 'shellfish']
    requires_booking BOOLEAN DEFAULT FALSE, -- True for experiences/services
    duration_minutes INT, -- For bookable items
    max_capacity INT, -- For experiences with capacity limits
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (price >= 0),
    CHECK (item_type IN ('product', 'service', 'experience'))
);

-- TABLA DE MODIFICADORES DE ITEMS
CREATE TABLE item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORDERS
-- ============================================================================

-- TABLA DE ÓRDENES
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE, -- Human-readable order number (e.g., 'ORD-20260207-001')
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    CHECK (subtotal >= 0),
    CHECK (tax >= 0),
    CHECK (total >= 0)
);

-- TABLA DE ITEMS DE ORDEN
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    modifiers JSONB DEFAULT '[]', -- Array of selected modifiers with prices
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (subtotal >= 0)
);

-- ============================================================================
-- BOOKINGS
-- ============================================================================

-- TABLA DE RESERVAS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    booking_number TEXT NOT NULL UNIQUE, -- Human-readable booking number (e.g., 'BKG-20260207-001')
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    booking_date DATE NOT NULL,
    booking_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ GENERATED ALWAYS AS (
        booking_time + (INTERVAL '1 minute' * COALESCE((SELECT duration_minutes FROM menu_items WHERE id = item_id), 60))
    ) STORED,
    number_of_guests INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    CHECK (number_of_guests > 0),
    -- Prevent double-booking: same item cannot be booked at overlapping times
    EXCLUDE USING gist (
        item_id WITH =,
        tsrange(booking_time, end_time) WITH &&
    )
);

-- ============================================================================
-- STAFF & AUTHENTICATION
-- ============================================================================

-- TABLA DE USUARIOS DEL STAFF
CREATE TABLE staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    permissions TEXT[] DEFAULT '{}', -- Array of permission strings (e.g., ['view_orders', 'manage_menu'])
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (role IN ('admin', 'manager', 'staff', 'kitchen', 'front_desk'))
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- TABLA DE AUDITORÍA
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Properties & Rooms
CREATE INDEX idx_properties_code ON properties(code);
CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_active ON rooms(property_id, is_active);

-- Menu structure
CREATE INDEX idx_menu_categories_property ON menu_categories(property_id);
CREATE INDEX idx_menu_categories_active ON menu_categories(property_id, is_active, sort_order);
CREATE INDEX idx_menu_subcategories_category ON menu_subcategories(category_id);
CREATE INDEX idx_menu_subcategories_active ON menu_subcategories(category_id, is_active, sort_order);
CREATE INDEX idx_menu_items_subcategory ON menu_items(subcategory_id);
CREATE INDEX idx_menu_items_type ON menu_items(item_type);
CREATE INDEX idx_menu_items_bookable ON menu_items(requires_booking) WHERE requires_booking = TRUE;
CREATE INDEX idx_item_modifiers_item ON item_modifiers(item_id);

-- Orders
CREATE INDEX idx_orders_property ON orders(property_id);
CREATE INDEX idx_orders_room ON orders(room_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_property_status ON orders(property_id, status, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);

-- Bookings
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_item ON bookings(item_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_time ON bookings(booking_time);
CREATE INDEX idx_bookings_property_date ON bookings(property_id, booking_date, booking_time);

-- Staff
CREATE INDEX idx_staff_users_property ON staff_users(property_id);
CREATE INDEX idx_staff_users_email ON staff_users(email);
CREATE INDEX idx_staff_users_active ON staff_users(property_id, is_active);

-- Audit
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================================

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_subcategories_updated_at BEFORE UPDATE ON menu_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_modifiers_updated_at BEFORE UPDATE ON item_modifiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA / SEED DATA (Optional)
-- ============================================================================

-- Example: Insert default property (can be removed if not needed)
-- INSERT INTO properties (name, code, timezone, currency)
-- VALUES ('Nayara Springs', 'NAYARA', 'America/Costa_Rica', 'USD');
