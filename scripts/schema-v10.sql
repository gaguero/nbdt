-- schema-v10.sql: Email module tables
-- Department Email Accounts, Aliases, Threads, Messages, Attachments, Sync & Activity logs

-- ============================================================
-- Department Email Accounts (connected via OAuth2)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_accounts (
    id SERIAL PRIMARY KEY,

    -- Account identity
    email_address VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),

    -- OAuth2 credentials (encrypted at rest via application layer)
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    oauth_scopes TEXT,

    -- Sync state
    last_history_id VARCHAR(50),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'disconnected',
    sync_error TEXT,

    -- Pub/Sub state
    watch_expiration TIMESTAMP WITH TIME ZONE,
    pubsub_topic VARCHAR(255),

    -- Config
    auto_assign_default_user_id INTEGER REFERENCES staff_users(id),
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by INTEGER REFERENCES staff_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active) WHERE is_active = true;

-- ============================================================
-- Alias → User Mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS email_aliases (
    id SERIAL PRIMARY KEY,

    alias_address VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),

    account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    assigned_user_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,

    is_active BOOLEAN DEFAULT true,

    created_by INTEGER REFERENCES staff_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_aliases_account ON email_aliases(account_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_user ON email_aliases(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_address ON email_aliases(alias_address);

-- ============================================================
-- Email Threads (maps to Gmail thread_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_threads (
    id SERIAL PRIMARY KEY,

    gmail_thread_id VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

    subject TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,

    assigned_to INTEGER REFERENCES staff_users(id),
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(10) DEFAULT 'normal',

    guest_id INTEGER,
    reservation_id INTEGER,

    tags TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(gmail_thread_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_email_threads_account ON email_threads(account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_assigned ON email_threads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_email_threads_status ON email_threads(status);
CREATE INDEX IF NOT EXISTS idx_email_threads_guest ON email_threads(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_threads_last_msg ON email_threads(last_message_at DESC);

-- ============================================================
-- Individual Email Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS email_messages (
    id SERIAL PRIMARY KEY,

    gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
    gmail_thread_id VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    thread_id INTEGER REFERENCES email_threads(id) ON DELETE CASCADE,

    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_addresses JSONB NOT NULL DEFAULT '[]',
    cc_addresses JSONB DEFAULT '[]',
    bcc_addresses JSONB DEFAULT '[]',
    reply_to VARCHAR(255),
    subject TEXT,

    delivered_to VARCHAR(255),

    body_text TEXT,
    body_html TEXT,
    snippet TEXT,

    gmail_labels TEXT[],
    gmail_internal_date TIMESTAMP WITH TIME ZONE,
    message_id_header VARCHAR(500),
    in_reply_to VARCHAR(500),
    references_header TEXT,

    assigned_to INTEGER REFERENCES staff_users(id),

    is_read BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    direction VARCHAR(10) DEFAULT 'inbound',

    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,

    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_assigned ON email_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_email_messages_gmail_thread ON email_messages(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_date ON email_messages(gmail_internal_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_delivered ON email_messages(delivered_to);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);

-- ============================================================
-- Attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS email_attachments (
    id SERIAL PRIMARY KEY,

    message_id INTEGER NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,

    gmail_attachment_id VARCHAR(255),

    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    size_bytes INTEGER NOT NULL,

    storage_type VARCHAR(10) DEFAULT 'pending',
    content_base64 TEXT,
    file_path VARCHAR(500),

    content_hash VARCHAR(64),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON email_attachments(message_id);

-- ============================================================
-- Sync Log
-- ============================================================
CREATE TABLE IF NOT EXISTS email_sync_log (
    id SERIAL PRIMARY KEY,

    account_id INTEGER REFERENCES email_accounts(id) ON DELETE CASCADE,
    sync_type VARCHAR(20) NOT NULL,

    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    messages_fetched INTEGER DEFAULT 0,
    messages_new INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,

    history_id_start VARCHAR(50),
    history_id_end VARCHAR(50),

    error_details TEXT,

    status VARCHAR(20) DEFAULT 'running'
);

CREATE INDEX IF NOT EXISTS idx_email_sync_log_account ON email_sync_log(account_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_log_started ON email_sync_log(started_at DESC);

-- ============================================================
-- Email Activity Log
-- ============================================================
CREATE TABLE IF NOT EXISTS email_activity (
    id SERIAL PRIMARY KEY,

    thread_id INTEGER REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES email_messages(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    performed_by INTEGER REFERENCES staff_users(id),

    details JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_activity_thread ON email_activity(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_activity_date ON email_activity(created_at DESC);
