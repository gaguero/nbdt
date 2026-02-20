-- schema-v9.sql: Expand role check constraint to include all operational roles
-- This allows assigning granular roles to staff members across different departments

-- 1. Drop existing constraint if it exists
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;

-- 2. Create the new, expanded constraint
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
    CHECK (role IN (
        'admin', 
        'manager', 
        'staff', 
        'kitchen', 
        'front_desk', 
        'concierge', 
        'bar', 
        'waiter', 
        'logistics', 
        'captain', 
        'housekeeping', 
        'maintenance'
    ));
