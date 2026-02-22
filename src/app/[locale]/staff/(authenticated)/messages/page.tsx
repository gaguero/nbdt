'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface StaffMember { id: string; first_name: string; last_name: string; role: string; }
interface Channel { id: string; name: string; display_name_en: string; }

interface Conversation {
  id: string;
  room: string;
  guest_name: string;
  channel_label_en: string;
  channel_name: string;
  status: string;
  assigned_staff_id: string | null;
  assigned_first_name: string | null;
  assigned_last_name: string | null;
  unread_count: number;
  last_message: string | null;
  last_sender: string | null;
  updated_at: string;
}

interface Message {
  id: string;
  sender_type: 'guest' | 'staff';
  sender_id: string | null;
  body: string;
  is_internal_note: boolean;
  created_at: string;
  read_at: string | null;
}

type ViewFilter = 'all' | 'mine' | 'unassigned' | 'unanswered';
type StatusFilter = '' | 'open' | 'assigned' | 'resolved';

export default function StaffMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [channelFilter, setChannelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load staff and channels for assignment
    fetch('/api/staff-users').then(r => r.json()).then(d => setStaffList(d.staff || [])).catch(() => {});
    fetch('/api/conversations/channels').then(r => r.json()).then(d => setChannels(d.channels || [])).catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (channelFilter) params.set('channel_id', channelFilter);
    if (viewFilter === 'mine') params.set('assigned_to', 'me');
    if (viewFilter === 'unassigned') params.set('assigned_to', 'unassigned');
    if (viewFilter === 'unanswered') params.set('filter', 'unanswered');

    const q = params.toString() ? `?${params}` : '';
    try {
      const res = await fetch(`/api/conversations${q}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [statusFilter, channelFilter, viewFilter]);

  useEffect(() => {
    setLoading(true);
    loadConversations();
    const interval = setInterval(loadConversations, 12000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      markRead(selectedId);
      const interval = setInterval(() => loadMessages(selectedId), 6000);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(id: string) {
    const res = await fetch(`/api/messages?conversation_id=${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function markRead(id: string) {
    await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: id, reader_type: 'staff' }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  }

  async function sendReply() {
    if (!reply.trim() || !selectedId) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: selectedId,
        sender_type: 'staff',
        sender_id: null,
        body: reply.trim(),
        is_internal: isInternal,
        is_internal_note: isInternal,
      }),
    });
    setReply('');
    await loadMessages(selectedId);
    if (!isInternal) {
      await updateConv(selectedId, { status: 'assigned' });
    }
  }

  async function updateConv(id: string, updates: { status?: string; assigned_staff_id?: string | null }) {
    await fetch('/api/conversations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    await loadConversations();
  }

  async function assignConversation(staffId: string | null) {
    if (!selectedId) return;
    await updateConv(selectedId, { assigned_staff_id: staffId });
    setShowAssignModal(false);
  }

  const selected = conversations.find((c) => c.id === selectedId);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const VIEW_FILTERS: { key: ViewFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Assigned to Me' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'unanswered', label: 'Unanswered' },
  ];

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: '', label: 'Any Status' },
    { key: 'open', label: 'Open' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'resolved', label: 'Resolved' },
  ];

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    open: { bg: 'rgba(78,94,62,0.1)', text: 'var(--sage)' },
    assigned: { bg: 'rgba(78,150,200,0.1)', text: '#4E96C8' },
    resolved: { bg: 'var(--elevated)', text: 'var(--muted-dim)' },
  };

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--separator)', background: 'var(--surface)' }}>

      {/* Left: conversation list */}
      <div className="w-[340px] shrink-0 flex flex-col" style={{ background: '#fff', borderRight: '1px solid var(--separator)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--separator)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'var(--charcoal)' }}>
              Messages
              {totalUnread > 0 && (
                <span className="ml-2 text-xs font-sans not-italic px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--terra)' }}>
                  {totalUnread}
                </span>
              )}
            </h2>
          </div>

          {/* View filter tabs */}
          <div className="flex gap-1 flex-wrap mb-2">
            {VIEW_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setViewFilter(f.key)}
                className="px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors"
                style={viewFilter === f.key
                  ? { background: 'var(--gold)', color: '#fff' }
                  : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status + Channel filters */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="nayara-input text-xs flex-1 !py-1"
            >
              {STATUS_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="nayara-input text-xs flex-1 !py-1"
            >
              <option value="">All Channels</option>
              {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.display_name_en}</option>)}
            </select>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading && <div className="p-4 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>Loading...</div>}
          {conversations.map((conv) => {
            const st = STATUS_COLORS[conv.status] || STATUS_COLORS.open;
            const isActive = selectedId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full text-left p-3 transition-colors"
                style={{
                  background: isActive ? 'rgba(78,94,62,0.06)' : 'transparent',
                  borderBottom: '1px solid var(--separator)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--charcoal)' }}>
                        {conv.guest_name || 'Guest'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center shrink-0"
                          style={{ background: 'var(--terra)' }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                      Room {conv.room} · {conv.channel_label_en}
                    </div>
                    {conv.last_message && (
                      <div className="text-xs mt-1 truncate" style={{ color: conv.last_sender === 'guest' ? 'var(--charcoal)' : 'var(--muted-dim)' }}>
                        {conv.last_sender === 'staff' && <span style={{ color: 'var(--muted-dim)' }}>You: </span>}
                        {conv.last_message}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>
                      {timeAgo(conv.updated_at)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: st.bg, color: st.text }}>
                      {conv.status}
                    </span>
                  </div>
                </div>
                {conv.assigned_first_name && (
                  <div className="text-[10px] mt-1" style={{ color: '#4E96C8' }}>
                    Assigned: {conv.assigned_first_name} {conv.assigned_last_name?.charAt(0)}.
                  </div>
                )}
              </button>
            );
          })}
          {!loading && conversations.length === 0 && (
            <div className="p-6 text-center text-sm italic" style={{ color: 'var(--muted-dim)' }}>
              No conversations match these filters.
            </div>
          )}
        </div>
      </div>

      {/* Right: message thread */}
      {selectedId && selected ? (
        <div className="flex-1 flex flex-col" style={{ background: 'var(--elevated)' }}>
          {/* Thread header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: '#fff', borderBottom: '1px solid var(--separator)' }}>
            <div>
              <span className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>
                {selected.guest_name || 'Guest'}
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--muted-dim)' }}>
                Room {selected.room} · {selected.channel_label_en}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Assign button */}
              <button
                onClick={() => setShowAssignModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--separator)', color: selected.assigned_staff_id ? '#4E96C8' : 'var(--muted-dim)' }}
              >
                {selected.assigned_first_name
                  ? `${selected.assigned_first_name} ${selected.assigned_last_name?.charAt(0) || ''}.`
                  : 'Assign'
                }
              </button>

              {selected.status !== 'resolved' ? (
                <button
                  onClick={() => updateConv(selectedId, { status: 'resolved' })}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(78,94,62,0.1)', color: 'var(--sage)' }}
                >
                  Resolve
                </button>
              ) : (
                <button
                  onClick={() => updateConv(selectedId, { status: 'open' })}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}
                >
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm"
                  style={
                    msg.is_internal_note
                      ? { background: 'rgba(217,170,60,0.12)', color: '#8B6F1E', border: '1px solid rgba(217,170,60,0.25)' }
                      : msg.sender_type === 'staff'
                      ? { background: 'var(--sage)', color: '#fff' }
                      : { background: '#fff', color: 'var(--charcoal)', border: '1px solid var(--separator)' }
                  }
                >
                  {msg.is_internal_note && (
                    <div className="text-[10px] font-semibold mb-1" style={{ color: '#B8941E' }}>Internal note</div>
                  )}
                  {msg.body}
                  <div className="text-[10px] mt-1" style={{
                    color: msg.is_internal_note ? '#B8941E'
                      : msg.sender_type === 'staff' ? 'rgba(255,255,255,0.6)' : 'var(--muted-dim)'
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender_type === 'staff' && msg.read_at && ' · Read'}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="p-3" style={{ background: '#fff', borderTop: '1px solid var(--separator)' }}>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: isInternal ? '#B8941E' : 'var(--muted-dim)' }}>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                Internal note
              </label>
            </div>
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                placeholder={isInternal ? 'Write an internal note...' : 'Type a message... (Enter to send)'}
                rows={2}
                className="nayara-input flex-1 resize-none"
                style={isInternal ? { background: 'rgba(217,170,60,0.06)', borderColor: 'rgba(217,170,60,0.3)' } : {}}
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim()}
                className="nayara-btn nayara-btn-primary disabled:opacity-40 self-end"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--muted-dim)' }}>
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm italic">Select a conversation to view messages</p>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAssignModal(false)}>
          <div className="nayara-card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--separator)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--charcoal)' }}>Assign Conversation</h3>
            </div>
            <div className="max-h-64 overflow-auto custom-scrollbar">
              <button
                onClick={() => assignConversation(null)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                style={{ borderBottom: '1px solid var(--separator)', color: 'var(--muted-dim)' }}
              >
                Unassign
              </button>
              {staffList.filter(s => s.role !== 'kitchen' && s.role !== 'bar').map((s) => (
                <button
                  key={s.id}
                  onClick={() => assignConversation(s.id)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                  style={{
                    borderBottom: '1px solid var(--separator)',
                    color: selected?.assigned_staff_id === s.id ? 'var(--sage)' : 'var(--charcoal)',
                    fontWeight: selected?.assigned_staff_id === s.id ? 600 : 400,
                  }}
                >
                  <span>{s.first_name} {s.last_name}</span>
                  <span className="text-[10px] capitalize px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}>
                    {s.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
