'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { ClipboardDocumentCheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface SpecialRequest {
  id: string;
  guest_id: string;
  guest_name: string;
  request: string;
  department: string;
  status: string;
  date: string;
  time: string;
}

export function PendingRequestsWidget({ limit = 5 }: { limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [requests, setRequests] = useState<SpecialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/special-requests?status=pending')
      .then(r => r.json())
      .then(d => {
        setRequests((d.special_requests ?? []).slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  if (!loading && requests.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('Pending Requests', 'Solicitudes')}</h2>
        </div>
        <Link 
          href={`/${locale}/staff/special-requests?status=pending`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('View All', 'Ver Todo')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => openGuest(r.guest_id)}
                      className="font-bold text-[10px] text-blue-600 hover:underline mb-1 block uppercase tracking-tighter"
                    >
                      {r.guest_name}
                    </button>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{r.request}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {r.department}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 italic">
                        {new Date(r.date).toLocaleDateString()} {r.time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
