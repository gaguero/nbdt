export interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string;
  department: string | null;
  sync_status: 'disconnected' | 'active' | 'error' | 'paused';
  sync_error: string | null;
  last_sync_at: string | null;
  watch_expiration: string | null;
  auto_assign_default_user_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailAlias {
  id: number;
  alias_address: string;
  display_name: string | null;
  account_id: number;
  assigned_user_id: number | null;
  assigned_user_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailThread {
  id: number;
  gmail_thread_id: string;
  account_id: number;
  subject: string | null;
  last_message_at: string | null;
  message_count: number;
  assigned_to: number | null;
  assigned_user_name?: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  guest_id: number | null;
  reservation_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  account_email?: string;
  account_display_name?: string;
  latest_snippet?: string;
  latest_from?: string;
}

export interface EmailMessage {
  id: number;
  gmail_message_id: string;
  gmail_thread_id: string;
  account_id: number;
  thread_id: number;
  from_address: string;
  from_name: string | null;
  to_addresses: Array<{ email: string; name?: string }>;
  cc_addresses: Array<{ email: string; name?: string }>;
  bcc_addresses: Array<{ email: string; name?: string }>;
  reply_to: string | null;
  subject: string | null;
  delivered_to: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  gmail_labels: string[];
  gmail_internal_date: string;
  message_id_header: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  assigned_to: number | null;
  is_read: boolean;
  is_draft: boolean;
  is_sent: boolean;
  direction: 'inbound' | 'outbound';
  has_attachments: boolean;
  attachment_count: number;
  synced_at: string;
  created_at: string;
}

export interface EmailAttachment {
  id: number;
  message_id: number;
  gmail_attachment_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_type: 'pending' | 'db' | 'disk';
  content_hash: string | null;
  created_at: string;
}

export interface EmailSyncLog {
  id: number;
  account_id: number;
  sync_type: 'cron' | 'push' | 'manual' | 'initial';
  started_at: string;
  completed_at: string | null;
  messages_fetched: number;
  messages_new: number;
  errors: number;
  history_id_start: string | null;
  history_id_end: string | null;
  error_details: string | null;
  status: 'running' | 'completed' | 'failed';
}

export interface EmailActivity {
  id: number;
  thread_id: number;
  message_id: number | null;
  action: string;
  performed_by: number | null;
  performer_name?: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CreateAccountPayload {
  display_name: string;
  department?: string;
  auto_assign_default_user_id?: number;
}

export interface CreateAliasPayload {
  alias_address: string;
  display_name?: string;
  assigned_user_id?: number;
}
