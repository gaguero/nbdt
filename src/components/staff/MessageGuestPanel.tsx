'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { sendGuestMessage, getDefaultChannelId } from '@/lib/messaging';

interface MessageGuestPanelProps {
  guestId: string;
  guestName?: string;
}

export function MessageGuestPanel({ guestId, guestName }: MessageGuestPanelProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && channels.length === 0) {
      fetch('/api/conversations/channels')
        .then(r => r.json())
        .then(d => {
          const ch = d.channels ?? [];
          setChannels(ch);
          if (ch.length > 0 && !channelId) {
            const concierge = ch.find((c: any) =>
              c.name?.toLowerCase().includes('concierge') ||
              c.display_name_en?.toLowerCase().includes('concierge')
            );
            setChannelId(concierge?.id ?? ch[0]?.id ?? '');
          }
        });
    }
  }, [open]);

  const handleSend = async () => {
    if (!message.trim() || !channelId || !guestId) return;
    setSending(true);
    setError('');
    try {
      const result = await sendGuestMessage(guestId, channelId, message.trim());
      if (result.ok) {
        setSent(true);
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      } else {
        setError(result.error ?? 'Failed to send');
      }
    } finally {
      setSending(false);
    }
  };

  if (!guestId) return null;

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          {ls('Message Guest', 'Enviar Mensaje al Huésped')}
          {guestName && <span className="text-gray-500 font-normal">({guestName})</span>}
        </button>
      ) : (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {ls('Message Guest', 'Enviar Mensaje al Huésped')}
              {guestName && <span className="text-blue-500 font-normal">— {guestName}</span>}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {channels.length > 1 && (
            <select
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.display_name_en ?? c.name}</option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={ls('Type a message...', 'Escribe un mensaje...')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              disabled={sending}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim() || !channelId}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>

          {sent && (
            <p className="text-xs text-green-600 font-medium">{ls('Message sent!', '¡Mensaje enviado!')}</p>
          )}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
