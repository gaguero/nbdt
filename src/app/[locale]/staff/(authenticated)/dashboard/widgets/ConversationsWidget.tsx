'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { ChatBubbleLeftRightIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  guest_id: string;
  guest_name: string;
  room: string;
  status: string;
  unread_count: number;
  channel_label_en: string;
  channel_label_es: string;
  updated_at: string;
}

export function ConversationsWidget({ limit = 5 }: { limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/conversations?status=open')
      .then(r => r.json())
      .then(d => {
        setConversations((d.conversations ?? []).slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  if (!loading && conversations.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('Open Chats', 'Mensajes Abiertos')}</h2>
        </div>
        <Link 
          href={`/${locale}/staff/messages`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('Inbox', 'Ir al Inbox')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map(c => (
              <Link 
                key={c.id} 
                href={`/${locale}/staff/messages?id=${c.id}`}
                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs">
                    {c.room || '??'}
                  </div>
                  {parseInt(String(c.unread_count)) > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {c.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{c.guest_name || ls('Anonymous Guest', 'Huésped Anónimo')}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{locale === 'es' ? c.channel_label_es : c.channel_label_en}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
