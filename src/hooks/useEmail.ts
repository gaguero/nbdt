'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Types ──

export interface Thread {
  id: number;
  gmail_thread_id: string;
  account_id: number;
  subject: string | null;
  last_message_at: string | null;
  message_count: number;
  assigned_to: number | null;
  assigned_user_name: string | null;
  status: string;
  priority: string;
  tags: string[];
  account_email: string;
  account_display_name: string;
  latest_snippet: string | null;
  latest_from: string | null;
  latest_from_name: string | null;
  guest_id: number | null;
  is_starred: boolean;
  is_archived: boolean;
  folder: string;
  has_unread: boolean;
  label_ids: number[];
  label_names: string[];
  label_colors: string[];
}

export interface ThreadsResponse {
  threads: Thread[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ThreadFilters {
  accountId?: number;
  status?: string;
  search?: string;
  page?: number;
  folder?: string;
  starred?: boolean;
  archived?: boolean;
  labelId?: number;
}

export interface Message {
  id: number;
  gmail_message_id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: Array<{ email: string; name?: string }>;
  cc_addresses: Array<{ email: string; name?: string }>;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  gmail_internal_date: string;
  is_read: boolean;
  is_sent: boolean;
  direction: string;
  has_attachments: boolean;
  attachment_count: number;
  attachments: Array<{ id: number; filename: string; mime_type: string; size_bytes: number }> | null;
}

export interface Activity {
  id: number;
  action: string;
  performer_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ThreadDetail {
  thread: Thread & {
    guest_name: string | null;
    guest_email: string | null;
    account_email: string;
  };
  messages: Message[];
  activity: Activity[];
}

export interface EmailLabel {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_system: boolean;
}

// ── Contact Context ──

export interface ContactContext {
  contact: {
    email: string;
    name: string | null;
    type: 'guest' | 'vendor' | 'staff' | 'external';
  };
  guest: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    notes: string | null;
    vip: boolean;
  } | null;
  reservation: {
    id: number;
    opera_resv_id: string | null;
    status: string;
    room: string | null;
    arrival: string;
    departure: string;
    nights: number | null;
    persons: number | null;
    room_category: string | null;
    rate_code: string | null;
    group_name: string | null;
  } | null;
  pastReservations: Array<{
    id: number;
    status: string;
    room: string | null;
    arrival: string;
    departure: string;
  }>;
  transfers: Array<{
    id: number;
    transfer_date: string;
    time: string;
    origin: string;
    destination: string;
    status: string;
    pax: number;
    vendor_name: string | null;
  }>;
  tours: Array<{
    id: number;
    activity_name: string;
    tour_date: string;
    start_time: string | null;
    status: string;
    num_guests: number;
    vendor_name: string | null;
  }>;
  specialRequests: Array<{
    id: number;
    request: string;
    department: string | null;
    status: string;
    created_at: string;
  }>;
  emailHistory: Array<{
    thread_id: number;
    subject: string | null;
    last_message_at: string | null;
    status: string;
    message_count: number;
  }>;
  stats: {
    totalEmails: number;
    totalStays: number;
    totalTours: number;
    totalTransfers: number;
  };
}

// ── Hooks ──

export function useEmailThreads(filters: ThreadFilters) {
  const [data, setData] = useState<ThreadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.accountId) params.set('accountId', String(filters.accountId));
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.folder) params.set('folder', filters.folder);
      if (filters.starred) params.set('starred', 'true');
      if (filters.archived) params.set('archived', 'true');
      if (filters.labelId) params.set('labelId', String(filters.labelId));

      const res = await fetch(`/api/email/threads?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || 'Failed to load threads');
    } catch {
      setError('Failed to load threads');
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.status, filters.search, filters.page, filters.folder, filters.starred, filters.archived, filters.labelId]);

  useEffect(() => { void fetchThreads(); }, [fetchThreads]);

  return { data, loading, error, refetch: fetchThreads };
}

export function useEmailThread(threadId: number | null) {
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email/threads/${threadId}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || 'Failed to load thread');
    } catch {
      setError('Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { void fetchThread(); }, [fetchThread]);

  return { data, loading, error, refetch: fetchThread };
}

export function useEmailContext(threadId: number | null) {
  const [data, setData] = useState<ContactContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!threadId) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email/threads/${threadId}/context`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setData(null); // Context might not be available, that's ok
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { void fetchContext(); }, [fetchContext]);

  return { data, loading, error, refetch: fetchContext };
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/email/unread-count');
      const json = await res.json();
      if (res.ok) setCount(json.count || 0);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    void fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState<Array<{
    id: number;
    email_address: string;
    display_name: string;
    department: string | null;
    sync_status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/email/accounts')
      .then(res => res.json())
      .then(data => { if (data.accounts) setAccounts(data.accounts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { accounts, loading };
}

export function useEmailLabels() {
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/email/labels');
      const json = await res.json();
      if (res.ok) setLabels(json.labels || []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchLabels(); }, [fetchLabels]);

  return { labels, loading, refetch: fetchLabels };
}

export function useEmailActions() {
  const reply = async (threadId: number, body: {
    to: string[];
    cc?: string[];
    bodyHtml: string;
    bodyText: string;
    fromAlias?: string;
    messageId?: number;
  }) => {
    const res = await fetch(`/api/email/threads/${threadId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send reply');
    return data;
  };

  const compose = async (body: {
    accountId: number;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    fromAlias?: string;
  }) => {
    const res = await fetch('/api/email/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send email');
    return data;
  };

  const updateThread = async (threadId: number, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/email/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update thread');
    return data;
  };

  const markRead = async (messageId: number, isRead: boolean) => {
    await fetch(`/api/email/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: isRead }),
    });
  };

  const toggleStar = async (threadId: number, starred: boolean) => {
    return updateThread(threadId, { is_starred: starred });
  };

  const archiveThread = async (threadId: number) => {
    return updateThread(threadId, { is_archived: true });
  };

  const unarchiveThread = async (threadId: number) => {
    return updateThread(threadId, { is_archived: false });
  };

  const snoozeThread = async (threadId: number, until: string) => {
    return updateThread(threadId, { snoozed_until: until });
  };

  const addLabel = async (threadId: number, labelId: number) => {
    const res = await fetch(`/api/email/threads/${threadId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelId }),
    });
    if (!res.ok) throw new Error('Failed to add label');
  };

  const removeLabel = async (threadId: number, labelId: number) => {
    const res = await fetch(`/api/email/threads/${threadId}/labels`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelId }),
    });
    if (!res.ok) throw new Error('Failed to remove label');
  };

  return {
    reply, compose, updateThread, markRead,
    toggleStar, archiveThread, unarchiveThread, snoozeThread,
    addLabel, removeLabel,
  };
}
