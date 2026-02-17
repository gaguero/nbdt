'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { HeartIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { RomanticDinnerModal } from '../../romantic-dinners/RomanticDinnerModal';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-pink-100 text-pink-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function TodayDinners({ date, limit = 10 }: { date: string; limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [dinners, setDinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDinner, setSelectedDinner] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDinners = () => {
    setLoading(true);
    fetch(`/api/romantic-dinners?date_from=${date}&date_to=${date}`)
      .then(r => r.json())
      .then(d => {
        setDinners((d.romantic_dinners ?? []).slice(0, limit));
        setLoading(false);
      });
  };

  useEffect(() => { fetchDinners(); }, [date, limit]);

  const handleEdit = (dinner: any) => {
    setSelectedDinner(dinner);
    setModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-50 rounded-lg">
            <HeartIcon className="h-5 w-5 text-pink-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('Romantic Dinners', 'Cenas Románticas')}</h2>
        </div>
        <Link
          href={`/${locale}/staff/romantic-dinners`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('View All', 'Ver Todo')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : dinners.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">{ls('No dinners for this date', 'Sin cenas para esta fecha')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-tighter text-gray-400 border-b border-gray-50">
                <th className="px-6 py-3">{ls('Time', 'Hora')}</th>
                <th className="px-6 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-3">{ls('Location', 'Ubicación')}</th>
                <th className="px-6 py-3">{ls('Pax', 'Pax')}</th>
                <th className="px-6 py-3">{ls('Status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dinners.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleEdit(d)}>
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{d.time?.slice(0, 5) || '—'}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{d.guest_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{d.location || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{d.num_guests}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RomanticDinnerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dinner={selectedDinner}
        onSuccess={fetchDinners}
      />
    </div>
  );
}
