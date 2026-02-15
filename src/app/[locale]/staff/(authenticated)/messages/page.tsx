'use client';

import { useEffect, useState, useRef } from 'react';

interface Conversation {
  id: string;
  room: string;
  guest_name: string;
  channel_label_en: string;
  status: string;
  assigned_staff_first_name?: string;
  assigned_staff_last_name?: string;
  unread_count: number;
  updated_at: string;
}

interface Message {
  id: string;
  sender_type: 'guest' | 'staff';
  body: string;
  is_internal_note: boolean;
  created_at: string;
  read_at: string | null;
}

const CONV_STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  assigned: 'bg-blue-100 text-blue-800',
  resolved: 'bg-gray-100 text-gray-600',
};

export default function StaffMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      markRead(selectedId);
      const interval = setInterval(() => loadMessages(selectedId), 8000);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/conversations${q}`);
    const data = await res.json();
    setConversations(data.conversations || []);
    setLoading(false);
  }

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
      await updateConvStatus(selectedId, 'assigned');
    }
  }

  async function updateConvStatus(id: string, status: string) {
    await fetch('/api/conversations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await loadConversations();
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-xl overflow-hidden border border-gray-200">
      {/* Left: conversation list */}
      <div className="w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-2">Messages</h2>
          <div className="flex gap-1">
            {['open', 'assigned', 'resolved', ''].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && <div className="p-4 text-gray-400 text-sm text-center">Loading…</div>}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedId === conv.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {conv.guest_name || 'Guest'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Room {conv.room} · {conv.channel_label_en}
                  </div>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${CONV_STATUS_COLORS[conv.status] || 'bg-gray-100 text-gray-600'}`}>
                  {conv.status}
                </span>
              </div>
            </button>
          ))}
          {!loading && conversations.length === 0 && (
            <div className="p-4 text-gray-400 text-sm text-center">No conversations.</div>
          )}
        </div>
      </div>

      {/* Right: message thread */}
      {selectedId && selected ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Thread header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">{selected.guest_name || 'Guest'}</span>
              <span className="text-gray-500 text-sm ml-2">
                Room {selected.room} · {selected.channel_label_en}
              </span>
            </div>
            <div className="flex gap-2">
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateConvStatus(selectedId, 'resolved')}
                  className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Resolve
                </button>
              )}
              {selected.status === 'resolved' && (
                <button
                  onClick={() => updateConvStatus(selectedId, 'open')}
                  className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 text-sm ${
                    msg.is_internal_note
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : msg.sender_type === 'staff'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {msg.is_internal_note && (
                    <div className="text-xs font-semibold mb-1 text-amber-700">Internal note</div>
                  )}
                  {msg.body}
                  <div className={`text-xs mt-1 ${msg.sender_type === 'staff' && !msg.is_internal_note ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender_type === 'staff' && msg.read_at && ' · Read'}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="bg-white border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                Internal note (not visible to guest)
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
                placeholder="Type a message… (Enter to send)"
                rows={2}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim()}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Select a conversation
        </div>
      )}
    </div>
  );
}
