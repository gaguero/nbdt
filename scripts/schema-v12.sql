-- schema-v12.sql: Email module enhancements
-- Starred, archived, snoozed threads + custom labels system

-- ============================================================
-- Add starred/archived/snoozed to email_threads
-- ============================================================
ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_email_threads_starred ON email_threads(assigned_to) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_email_threads_archived ON email_threads(assigned_to) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_email_threads_snoozed ON email_threads(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- ============================================================
-- Custom Labels (user-created, per-property)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_labels (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',  -- hex color

    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES staff_users(id),

    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,  -- system labels can't be deleted

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(name, property_id)
);

-- ============================================================
-- Thread <-> Label junction
-- ============================================================
CREATE TABLE IF NOT EXISTS email_thread_labels (
    id SERIAL PRIMARY KEY,

    thread_id INTEGER NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES email_labels(id) ON DELETE CASCADE,

    applied_by INTEGER REFERENCES staff_users(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(thread_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_email_thread_labels_thread ON email_thread_labels(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_thread_labels_label ON email_thread_labels(label_id);

-- ============================================================
-- Add email configuration to staff_users
-- ============================================================
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS email_type VARCHAR(10) DEFAULT NULL;
-- 'private' = full GSuite account, 'alias' = shared dept alias, NULL = no email

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS email_account_id INTEGER REFERENCES email_accounts(id);
-- For 'private' users: their dedicated email_account
-- For 'alias' users: the shared account their alias belongs to

-- ============================================================
-- Add folder concept to email_threads (inbox, sent, drafts, trash)
-- ============================================================
ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS folder VARCHAR(20) DEFAULT 'inbox';

CREATE INDEX IF NOT EXISTS idx_email_threads_folder ON email_threads(folder, assigned_to);
