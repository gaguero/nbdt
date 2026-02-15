'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Channel {
  id: string;
  name: string;
  display_name_en: string;
  display_name_es: string;
}

interface Message {
  id: string;
  sender_type: 'guest' | 'staff';
  body: string;
  is_internal_note: boolean;
  created_at: string;
}

interface Conversation { id: string; channel_id: string; status: string; }
interface GuestInfo { guest_id: string; reservation_id: string; guest_name: string; first_name: string; room: string; }

const CHANNEL_ICONS: Record<string, string> = {
  room_service: '🍽️',
  guest_experience: '⭐',
  spa: '💆',
  front_desk: '🏨',
  concierge: '🔑',
};

export default function GuestMessagesPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [convMap, setConvMap] = useState<Record<string, Conversation>>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = JSON.parse(localStorage.getItem('nayara_guest') || 'null');
    setGuest(g);
    loadChannels(g);
  }, []);

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);
      const interval = setInterval(() => loadMessages(activeChannelId), 8000);
      return () => clearInterval(interval);
    }
  }, [activeChannelId, convMap]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChannels(g: GuestInfo | null) {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
      // Also load existing conversations for this guest
      if (g?.guest_id) {
        const cRes = await fetch(`/api/conversations/guest?guest_id=${g.guest_id}`);
        if (cRes.ok) {
          const cData = await cRes.json();
          const map: Record<string, Conversation> = {};
          for (const c of (cData.conversations || [])) {
            map[c.channel_id] = c;
          }
          setConvMap(map);
        }
      }
    } catch {}
  }

  async function openChannel(channel: Channel) {
    setActiveChannelId(channel.id);
    setMessages([]);

    // Find or create conversation
    let conv = convMap[channel.id];
    if (!conv && guest) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channel.id,
          guest_id: guest.guest_id,
          reservation_id: guest.reservation_id,
          room: guest.room,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        conv = data.conversation;
        setConvMap((prev) => ({ ...prev, [channel.id]: conv! }));
      }
    }

    if (conv) {
      const res = await fetch(`/api/messages?conversation_id=${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).filter((m: Message) => !m.is_internal_note));
      }
      await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conv.id, reader_type: 'guest' }),
      });
    }
  }

  async function loadMessages(channelId: string) {
    const conv = convMap[channelId];
    if (!conv) return;
    const res = await fetch(`/api/messages?conversation_id=${conv.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages((data.messages || []).filter((m: Message) => !m.is_internal_note));
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !guest || !activeChannelId) return;
    const conv = convMap[activeChannelId];
    if (!conv) return;

    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conv.id,
          sender_type: 'guest',
          sender_id: guest.guest_id,
          body: newMessage.trim(),
          is_internal: false,
          is_internal_note: false,
        }),
      });
      setNewMessage('');
      await loadMessages(activeChannelId);
    } finally {
      setSending(false);
    }
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="min-h-screen bg-gray-50">
      {guest && (
        <div className="bg-green-700 text-white text-center py-2 text-sm">
          {guest.first_name || guest.guest_name} — Room {guest.room}
        </div>
      )}

      {!activeChannelId ? (
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'es' ? '¿En qué podemos ayudarle?' : 'How can we help?'}
          </h1>
          <p className="text-gray-500 text-sm">
            {locale === 'es'
              ? 'Elija un canal para iniciar una conversación con nuestro equipo.'
              : 'Choose a channel to start a conversation with our team.'}
          </p>

          {channels.length === 0 && (
            <div className="text-center text-gray-400 py-8">Loading…</div>
          )}

          <div className="space-y-2">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => openChannel(ch)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 text-left hover:shadow-sm transition-shadow"
              >
                <span className="text-3xl">{CHANNEL_ICONS[ch.name] || '💬'}</span>
                <div>
                  <div className="font-semibold text-gray-900">
                    {locale === 'es' ? ch.display_name_es : ch.display_name_en}
                  </div>
                  <div className="text-xs text-gray-500">
                    {locale === 'es' ? 'Toca para chatear' : 'Tap to chat with our team'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          {/* Chat header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setActiveChannelId(null)}
              className="text-green-700 font-medium text-sm"
            >
              ← Back
            </button>
            <span className="text-lg">{CHANNEL_ICONS[activeChannel?.name || ''] || '💬'}</span>
            <span className="font-semibold text-gray-900">
              {locale === 'es' ? activeChannel?.display_name_es : activeChannel?.display_name_en}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                {locale === 'es'
                  ? 'Inicia la conversación. Solemos responder en minutos.'
                  : 'Start a conversation. We typically reply within a few minutes.'}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'guest' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    msg.sender_type === 'guest'
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {msg.body}
                  <div className={`text-xs mt-1 ${msg.sender_type === 'guest' ? 'text-green-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder={locale === 'es' ? 'Escriba un mensaje…' : 'Type a message…'}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-green-800"
            >
              {locale === 'es' ? 'Enviar' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
