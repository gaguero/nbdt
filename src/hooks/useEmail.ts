'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Threads ──

interface Thread {
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
  guest_id: number | null;
}

interface ThreadsResponse {
  threads: Thread[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useEmailThreads(filters: {
  accountId?: number;
  status?: string;
  search?: string;
  page?: number;
}) {
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

      const res = await fetch(`/api/email/threads?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || 'Failed to load threads');
    } catch {
      setError('Failed to load threads');
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.status, filters.search, filters.page]);

  useEffect(() => { void fetchThreads(); }, [fetchThreads]);

  return { data, loading, error, refetch: fetchThreads };
}

// ── Single Thread ──

interface Message {
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

interface Activity {
  id: number;
  action: string;
  performer_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface ThreadDetail {
  thread: Thread & {
    guest_name: string | null;
    guest_email: string | null;
    account_email: string;
  };
  messages: Message[];
  activity: Activity[];
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

// ── Unread Count ──

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
    const interval = setInterval(fetchCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}

// ── Accounts ──

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

// ── Actions ──

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

  return { reply, compose, updateThread, markRead };
}
