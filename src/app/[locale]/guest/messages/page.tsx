'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

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

const CHANNEL_ICONS: Record<string, string> = {
  room_service: 'M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  guest_experience: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  spa: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  front_desk: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  concierge: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
};

export default function GuestMessagesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isEs = locale === 'es';
  const { guest } = useGuestAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [convMap, setConvMap] = useState<Record<string, Conversation>>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guest) loadChannels();
  }, [guest]);

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

  async function loadChannels() {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
      if (guest?.guest_id) {
        const cRes = await fetch(`/api/conversations/guest?guest_id=${guest.guest_id}`);
        if (cRes.ok) {
          const cData = await cRes.json();
          const map: Record<string, Conversation> = {};
          for (const c of (cData.conversations || [])) {
            map[c.channel_id] = c;
          }
          setConvMap(map);
        }
      }
    } catch { /* silent */ }
  }

  async function openChannel(channel: Channel) {
    setActiveChannelId(channel.id);
    setMessages([]);

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

  if (!guest) return null;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {!activeChannelId ? (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#1a2e12', fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
              {isEs ? 'Mensajes' : 'Messages'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7F5A' }}>
              {isEs
                ? 'Elija un canal para conversar con nuestro equipo.'
                : 'Choose a channel to chat with our team.'}
            </p>
          </div>

          {channels.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>
              {isEs ? 'Cargando canales...' : 'Loading channels...'}
            </div>
          )}

          <div className="space-y-2">
            {channels.map((ch) => {
              const iconPath = CHANNEL_ICONS[ch.name];
              const hasConv = !!convMap[ch.id];
              return (
                <button
                  key={ch.id}
                  onClick={() => openChannel(ch)}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.99]"
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e2db',
                    boxShadow: '0 2px 8px rgba(78,94,62,0.06)',
                    transition: 'transform 0.1s',
                  }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(78,94,62,0.1)' }}>
                    {iconPath ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#4E5E3E">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#4E5E3E">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: '#1a2e12' }}>
                      {isEs ? ch.display_name_es : ch.display_name_en}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {hasConv
                        ? (isEs ? 'Conversacion activa' : 'Active conversation')
                        : (isEs ? 'Toca para chatear' : 'Tap to chat with our team')
                      }
                    </div>
                  </div>
                  {hasConv && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4E5E3E' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 108px)' }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ background: '#fff', borderBottom: '1px solid #e5e2db' }}>
            <button
              onClick={() => setActiveChannelId(null)}
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: '#4E5E3E' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {isEs ? 'Atras' : 'Back'}
            </button>
            <div className="flex-1 text-center">
              <span className="font-semibold text-sm" style={{ color: '#1a2e12' }}>
                {isEs ? activeChannel?.display_name_es : activeChannel?.display_name_en}
              </span>
            </div>
            <div className="w-12" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>
                {isEs
                  ? 'Inicia la conversacion. Solemos responder en minutos.'
                  : 'Start a conversation. We typically reply within a few minutes.'}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'guest' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                  style={msg.sender_type === 'guest'
                    ? { background: '#4E5E3E', color: '#fff' }
                    : { background: '#fff', color: '#1a2e12', border: '1px solid #e5e2db' }
                  }
                >
                  {msg.body}
                  <div className="text-[10px] mt-1" style={{
                    color: msg.sender_type === 'guest' ? 'rgba(255,255,255,0.5)' : '#9CA3AF'
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex gap-2"
            style={{ background: '#fff', borderTop: '1px solid #e5e2db' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={isEs ? 'Escriba un mensaje...' : 'Type a message...'}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: '1px solid #e5e2db', color: '#1a2e12', background: '#FAFAF7' }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40"
              style={{ background: '#4E5E3E', color: '#fff' }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
