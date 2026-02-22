-- Schema v12: Guest Login, Fleet Management (Boats, Captains, Assignments)
-- Run AFTER schema-v11.sql

-- ============================================================================
-- BOATS — Fleet vessel registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS boats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'speedboat' CHECK (type IN ('speedboat', 'catamaran', 'panga', 'yacht', 'other')),
    capacity INT NOT NULL DEFAULT 12,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service')),
    photo_url TEXT,
    home_dock TEXT,
    registration_number TEXT,
    gps_device_id TEXT,
    notes TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boats_property ON boats(property_id);
CREATE INDEX IF NOT EXISTS idx_boats_status ON boats(status);

-- ============================================================================
-- CAPTAIN SKILLS — Staff certifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS captain_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    certified_at DATE,
    expires_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, skill)
);

CREATE INDEX IF NOT EXISTS idx_captain_skills_staff ON captain_skills(staff_id);
CREATE INDEX IF NOT EXISTS idx_captain_skills_skill ON captain_skills(skill);

-- ============================================================================
-- CAPTAIN SCHEDULES — Weekly availability patterns
-- ============================================================================

CREATE TABLE IF NOT EXISTS captain_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_schedules_staff ON captain_schedules(staff_id);

-- ============================================================================
-- CAPTAIN TIME-OFF
-- ============================================================================

CREATE TABLE IF NOT EXISTS captain_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES staff_users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_time_off_staff ON captain_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_captain_time_off_dates ON captain_time_off(date_from, date_to);

-- ============================================================================
-- FLEET ASSIGNMENTS — Links schedules/transfers to boats+captains
-- ============================================================================

CREATE TABLE IF NOT EXISTS fleet_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('tour', 'transfer')),
    tour_schedule_id UUID REFERENCES tour_schedules(id) ON DELETE SET NULL,
    transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'departed', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_assignments_boat ON fleet_assignments(boat_id);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_captain ON fleet_assignments(captain_id);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_date ON fleet_assignments(date);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_status ON fleet_assignments(status);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_tour ON fleet_assignments(tour_schedule_id) WHERE tour_schedule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_transfer ON fleet_assignments(transfer_id) WHERE transfer_id IS NOT NULL;

-- ============================================================================
-- BOAT MAINTENANCE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS boat_maintenance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('routine', 'repair', 'inspection', 'fuel')),
    description TEXT,
    cost DECIMAL(10,2),
    performed_by TEXT,
    date DATE NOT NULL,
    next_due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_maintenance_boat ON boat_maintenance_log(boat_id);

-- ============================================================================
-- ALTER EXISTING TABLES — Add fleet-related columns
-- ============================================================================

-- Tour products: fleet integration + guest portal
ALTER TABLE tour_products
    ADD COLUMN IF NOT EXISTS requires_boat BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS default_boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_internal_operation BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS guest_visible BOOLEAN DEFAULT TRUE;

-- Tour schedules: boat/captain assignment
ALTER TABLE tour_schedules
    ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS captain_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fleet_assignment_id UUID REFERENCES fleet_assignments(id) ON DELETE SET NULL;

-- Transfers: boat flag
ALTER TABLE transfers
    ADD COLUMN IF NOT EXISTS requires_boat BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fleet_assignment_id UUID REFERENCES fleet_assignments(id) ON DELETE SET NULL;

-- Expand staff role constraint to include fleet_supervisor and captain
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
    CHECK (role IN ('admin', 'manager', 'staff', 'kitchen', 'bar', 'delivery', 'front_desk', 'concierge', 'supervisor', 'fleet_supervisor', 'captain', 'logistics', 'waiter', 'housekeeping', 'maintenance'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER update_boats_updated_at BEFORE UPDATE ON boats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_captain_time_off_updated_at BEFORE UPDATE ON captain_time_off
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fleet_assignments_updated_at BEFORE UPDATE ON fleet_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
